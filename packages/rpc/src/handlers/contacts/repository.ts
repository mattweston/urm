import { ContactWriteError } from "@urm/domain/contacts"
import { createHash, randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { Sql, query_rows } from "@urm/database/sql"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import {
    ContactDetails,
    ContactRecord,
    CreateContactCommand,
    ImportContactsCommand,
} from "@urm/domain/contacts"
import {
    ImportedContact,
    contact_import_errors,
    normalize_contact,
} from "@urm/domain/contact-import"

export interface ContactsPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const unavailable = () =>
    new ContactWriteError({
        message: "Contact operation unavailable or access denied",
    })
const Id = Schema.Struct({ id: Schema.String })

const check_scope = Effect.fn("Contacts.checkScope")(function* (
    principal: ContactsPrincipal,
    domain_id: string,
    write = false
) {
    if (domain_id !== principal.domain_id)
        return yield* Effect.fail(unavailable())
    yield* require_account_domain(principal, domain_id, write)
})

const load_contacts = Effect.fn("Contacts.load")(function* (
    principal: ContactsPrincipal,
    ids: ReadonlyArray<string>
) {
    yield* check_scope(principal, principal.domain_id)
    if (ids.length === 0) return []
    return yield* query_rows(
        ContactRecord,
        sql`
        SELECT dc.id,c.id AS contact_id,dc.domain_id,c.name,c.tel,c.title,c.company,e.email,c.updated_at::float8 AS updated_at,
            COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'email',a.email,'is_primary',a.is_primary) ORDER BY a.is_primary DESC,a.email)
                FROM contact_email_addresses a WHERE a.contact_id=c.id),'[]'::jsonb) AS email_addresses
        FROM domain_contacts dc JOIN contacts c ON c.id=dc.contact_id
        LEFT JOIN contact_email_addresses e ON e.contact_id=c.id AND e.is_primary=true
        WHERE dc.domain_id=${principal.domain_id} AND dc.id IN (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`,`
        )})
            AND dc.status='active' AND dc.deleted_at IS NULL AND c.deleted_at IS NULL`
    )
})

const lock_contact = Effect.fn("Contacts.lock")(function* (
    principal: ContactsPrincipal,
    id: string
) {
    yield* check_scope(principal, principal.domain_id, true)
    const rows = yield* query_rows(
        Id,
        sql`SELECT c.id FROM contacts c JOIN domain_contacts dc ON dc.contact_id=c.id
        WHERE dc.id=${id} AND dc.domain_id=${principal.domain_id} AND dc.deleted_at IS NULL AND dc.status='active' AND c.deleted_at IS NULL FOR UPDATE OF c`
    )
    const row = rows[0]
    if (row === undefined) return yield* Effect.fail(unavailable())
    return row.id
})

const replace_emails = Effect.fn("Contacts.replaceEmails")(function* (
    contact_id: string,
    details: ContactDetails,
    now: number
) {
    const db = yield* Sql
    // Preserve IDs and verification for retained addresses, and clear the old primary before swapping.
    yield* db.query(
        sql`UPDATE contact_email_addresses SET is_primary=false WHERE contact_id=${contact_id}`
    )
    yield* db.query(sql`DELETE FROM contact_email_addresses WHERE contact_id=${contact_id}
        AND email NOT IN (${sql.join(
            details.email_addresses.map((item) => sql`${item.email}`),
            sql`,`
        )})`)
    for (const email of details.email_addresses) {
        const existing = yield* query_rows(
            Id,
            sql`SELECT id FROM contact_email_addresses WHERE contact_id=${contact_id} AND email=${email.email}`
        )
        if (existing[0] === undefined) {
            yield* db.query(sql`INSERT INTO contact_email_addresses (id,contact_id,email,is_primary,created_at,updated_at)
                VALUES (${randomUUID()},${contact_id},${email.email},${email.is_primary},${now},${now})`)
        } else {
            yield* db.query(
                sql`UPDATE contact_email_addresses SET is_primary=${email.is_primary},updated_at=${now} WHERE id=${existing[0].id}`
            )
        }
    }
})

const insert_contact = Effect.fn("Contacts.insert")(function* (
    domain_id: string,
    id: string,
    details: ContactDetails,
    source: string
) {
    const db = yield* Sql
    const now = Date.now()
    yield* db.query(sql`INSERT INTO contacts (id,name,tel,title,company,created_at,updated_at)
        VALUES (${id},${details.name},${details.tel},${details.title},${details.company},${now},${now})`)
    yield* replace_emails(id, details, now)
    yield* db.query(sql`INSERT INTO domain_contacts (id,domain_id,contact_id,status,source,created_at,updated_at)
        VALUES (${id},${domain_id},${id},'active',${source},${now},${now})`)
})
const details_key = (details: ContactDetails | ContactRecord) =>
    JSON.stringify({
        name: details.name,
        tel: details.tel,
        title: details.title,
        company: details.company,
        emails: details.email_addresses
            .map(({ email, is_primary }) => ({ email, is_primary }))
            .sort((a, b) => a.email.localeCompare(b.email)),
    })

const create_contact = Effect.fn("Contacts.create")(function* (
    principal: ContactsPrincipal,
    input: CreateContactCommand
) {
    const details = yield* Schema.decodeUnknownEffect(ContactDetails)({
        name: input.name,
        email_addresses: input.email_addresses ?? [
            { email: input.email, is_primary: true },
        ],
        tel: input.tel ?? null,
        title: input.title ?? null,
        company: input.company ?? null,
    })
    if (
        details.email_addresses.find((item) => item.is_primary)?.email !==
        input.email
    )
        return yield* Effect.fail(
            new ContactWriteError({
                message: "Primary email does not match the contact",
            })
        )
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const db = yield* Sql
            yield* check_scope(principal, input.domain_id, true)
            yield* db.query(
                sql`SELECT id FROM domains WHERE id=${input.domain_id} FOR UPDATE`
            )
            const existing = yield* load_contacts(principal, [input.id])
            if (existing[0] === undefined)
                yield* insert_contact(
                    input.domain_id,
                    input.id,
                    details,
                    "remote"
                )
            else if (details_key(existing[0]) !== details_key(details))
                return yield* Effect.fail(unavailable())
            return yield* load_contacts(principal, [input.id])
        })
    )
})

const update_contact = Effect.fn("Contacts.update")(function* (
    principal: ContactsPrincipal,
    id: string,
    details: ContactDetails
) {
    const valid = yield* Schema.decodeUnknownEffect(ContactDetails)(details)
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const db = yield* Sql
            const contact_id = yield* lock_contact(principal, id)
            const now = Date.now()
            yield* db.query(
                sql`UPDATE contacts SET name=${valid.name},tel=${valid.tel},title=${valid.title},company=${valid.company},updated_at=${now} WHERE id=${contact_id}`
            )
            yield* replace_emails(contact_id, valid, now)
            return yield* load_contacts(principal, [id])
        })
    )
})

const rename_contact = Effect.fn("Contacts.rename")(function* (
    principal: ContactsPrincipal,
    id: string,
    name: string
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const db = yield* Sql
            const contact_id = yield* lock_contact(principal, id)
            yield* db.query(
                sql`UPDATE contacts SET name=${name},updated_at=${Date.now()} WHERE id=${contact_id}`
            )
            return yield* load_contacts(principal, [id])
        })
    )
})

const delete_contact = Effect.fn("Contacts.removeDomainLink")(function* (
    principal: ContactsPrincipal,
    id: string
) {
    const db = yield* Sql
    yield* db.transaction(
        Effect.gen(function* () {
            const db = yield* Sql
            yield* check_scope(principal, principal.domain_id, true)
            const links = yield* query_rows(
                Schema.Struct({
                    contact_id: Schema.String,
                    deleted_at: Schema.NullOr(Schema.Number),
                }),
                sql`SELECT dc.contact_id,dc.deleted_at::float8 AS deleted_at FROM domain_contacts dc JOIN contacts c ON c.id=dc.contact_id
                WHERE dc.id=${id} AND dc.domain_id=${principal.domain_id} FOR UPDATE OF c`
            )
            const link = links[0]
            if (link === undefined) return yield* Effect.fail(unavailable())
            if (link.deleted_at !== null) return
            const now = Date.now()
            yield* db.query(
                sql`UPDATE domain_contacts SET status='archived',deleted_at=${now},updated_at=${now} WHERE id=${id} AND domain_id=${principal.domain_id}`
            )
            const remaining = yield* query_rows(
                Id,
                sql`SELECT id FROM domain_contacts WHERE contact_id=${link.contact_id} AND deleted_at IS NULL LIMIT 1`
            )
            if (remaining.length === 0) {
                yield* db.query(
                    sql`DELETE FROM contact_email_addresses WHERE contact_id=${link.contact_id}`
                )
                yield* db.query(
                    sql`UPDATE contacts SET deleted_at=${now},updated_at=${now} WHERE id=${link.contact_id}`
                )
            }
        })
    )
})

const import_contacts = Effect.fn("Contacts.importRows")(function* (
    principal: ContactsPrincipal,
    input: ImportContactsCommand
) {
    const errors = contact_import_errors(input.rows)
    if (errors.length > 0)
        return yield* Effect.fail(
            new ContactWriteError({ message: errors.slice(0, 10).join("; ") })
        )
    const drafts = yield* Effect.forEach(input.rows, (row) =>
        Schema.decodeUnknownEffect(ImportedContact)(normalize_contact(row))
    )
    const payload_hash = createHash("sha256")
        .update(JSON.stringify(drafts))
        .digest("hex")
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const db = yield* Sql
            yield* check_scope(principal, input.domain_id, true)
            yield* db.query(
                sql`SELECT id FROM domains WHERE id=${input.domain_id} FOR UPDATE`
            )
            const receipts = yield* query_rows(
                Schema.Struct({
                    payload_hash: Schema.String,
                    imported: Schema.Number,
                }),
                sql`SELECT payload_hash,imported FROM contact_import_receipts WHERE domain_id=${input.domain_id} AND source_id=${input.source_id}`
            )
            if (receipts[0] !== undefined) {
                if (receipts[0].payload_hash !== payload_hash)
                    return yield* Effect.fail(
                        new ContactWriteError({
                            message:
                                "This upload was already imported with different data",
                        })
                    )
                return {
                    imported: receipts[0].imported,
                    already_imported: true,
                }
            }
            for (const draft of drafts)
                yield* insert_contact(
                    input.domain_id,
                    randomUUID(),
                    {
                        name: draft.name,
                        email_addresses: [
                            { email: draft.email, is_primary: true },
                        ],
                        tel: draft.tel || null,
                        title: draft.title || null,
                        company: draft.company || null,
                    },
                    "csv"
                )
            yield* db.query(sql`INSERT INTO contact_import_receipts (domain_id,source_id,payload_hash,imported,account_id,completed_at)
            VALUES (${input.domain_id},${input.source_id},${payload_hash},${drafts.length},${principal.account_id},${Date.now()})`)
            return { imported: drafts.length, already_imported: false }
        })
    )
})

const list_contacts = Effect.fn("Contacts.list")(function* (
    principal: ContactsPrincipal,
    domain_id: string,
    search_input: string | undefined,
    after: string | undefined,
    count: number
) {
    yield* check_scope(principal, domain_id)
    const search = (search_input ?? "").trim()
    const matches =
        search === ""
            ? sql`true`
            : sql`(
                strpos(lower(c.name),lower(${search})) > 0
                OR strpos(lower(COALESCE(c.tel,'')),lower(${search})) > 0
                OR strpos(lower(COALESCE(c.title,'')),lower(${search})) > 0
                OR strpos(lower(COALESCE(c.company,'')),lower(${search})) > 0
                OR EXISTS (SELECT 1 FROM contact_email_addresses a
                    WHERE a.contact_id=c.id AND strpos(lower(a.email),lower(${search})) > 0)
            )`
    const records = yield* query_rows(
        Id,
        sql`
        SELECT dc.id FROM domain_contacts dc JOIN contacts c ON c.id = dc.contact_id
        WHERE dc.domain_id = ${domain_id} AND dc.status = 'active' AND dc.deleted_at IS NULL AND c.deleted_at IS NULL
            AND ${matches}
            AND dc.id > ${after ?? ""} ORDER BY dc.id LIMIT ${count + 1}`
    )

    return records
})

const make_repository = Effect.gen(function* () {
    const db = yield* Sql
    return {
        check_scope: (...args: Parameters<typeof check_scope>) =>
            check_scope(...args).pipe(Effect.provideService(Sql, db)),
        load_contacts: (...args: Parameters<typeof load_contacts>) =>
            load_contacts(...args).pipe(Effect.provideService(Sql, db)),
        create_contact: (...args: Parameters<typeof create_contact>) =>
            create_contact(...args).pipe(Effect.provideService(Sql, db)),
        update_contact: (...args: Parameters<typeof update_contact>) =>
            update_contact(...args).pipe(Effect.provideService(Sql, db)),
        rename_contact: (...args: Parameters<typeof rename_contact>) =>
            rename_contact(...args).pipe(Effect.provideService(Sql, db)),
        delete_contact: (...args: Parameters<typeof delete_contact>) =>
            delete_contact(...args).pipe(Effect.provideService(Sql, db)),
        import_contacts: (...args: Parameters<typeof import_contacts>) =>
            import_contacts(...args).pipe(Effect.provideService(Sql, db)),
        list_contacts: (...args: Parameters<typeof list_contacts>) =>
            list_contacts(...args).pipe(Effect.provideService(Sql, db)),
    }
})

export class ContactsRepository extends Context.Service<
    ContactsRepository,
    Effect.Success<typeof make_repository>
>()("@urm/rpc/ContactsRepository") {}
export const ContactsRepositoryLive = Layer.effect(
    ContactsRepository,
    make_repository
)
