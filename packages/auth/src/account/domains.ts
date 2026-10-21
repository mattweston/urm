import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Effect, Schema } from "effect"
import { Sql, SqlError, query_rows } from "@urm/db/sql"
import {
    AccountPrincipal,
    AuthError,
    ensure_personal_organization,
    list_account_domains,
} from "./service.ts"

const DomainFields = Schema.Struct({
    name: Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
    slug: Schema.String.check(
        Schema.isPattern(/^[a-z0-9]+(-[a-z0-9]+)*$/),
        Schema.isMaxLength(255)
    ),
})
const CreateDomainInput = DomainFields
const UpdateDomainInput = Schema.Struct({
    domain_id: Schema.NonEmptyString,
    ...DomainFields.fields,
})
const DeleteDomainInput = Schema.Struct({
    domain_id: Schema.NonEmptyString,
})
const PersonalLimit = Schema.Struct({ max_domains: Schema.Number })
const DomainCount = Schema.Struct({ count: Schema.Number })
const DomainId = Schema.Struct({ id: Schema.String })
const ManagedDomain = Schema.Struct({
    id: Schema.String,
    organization_id: Schema.String,
    slug: Schema.String,
    development_release_id: Schema.NullOr(Schema.String),
    development_deployment_id: Schema.NullOr(Schema.String),
    staging_release_id: Schema.NullOr(Schema.String),
    staging_deployment_id: Schema.NullOr(Schema.String),
    production_release_id: Schema.NullOr(Schema.String),
    production_deployment_id: Schema.NullOr(Schema.String),
})
const TableName = Schema.Struct({ table_name: Schema.String })
const HasRows = Schema.Struct({ has_rows: Schema.Boolean })
const failure = (reason: AuthError["reason"]) => new AuthError({ reason })

const managed_domain = (principal: AccountPrincipal, domain_id: string) =>
    query_rows(
        ManagedDomain,
        sql`SELECT d.id,d.organization_id,d.slug,d.development_release_id,d.development_deployment_id,d.staging_release_id,d.staging_deployment_id,d.production_release_id,d.production_deployment_id
            FROM domains d JOIN organizations o ON o.id=d.organization_id
            JOIN organization_members m ON m.organization_id=o.id
            WHERE d.id=${domain_id} AND o.deleted_at IS NULL
                AND m.user_id=${principal.account_id} AND m.status='active'
                AND m.deleted_at IS NULL AND m.role IN ('owner','admin','sysadmin')
            FOR UPDATE OF d`
    ).pipe(
        Effect.flatMap((rows) =>
            rows[0] === undefined
                ? Effect.fail(failure("forbidden"))
                : Effect.succeed(rows[0])
        )
    )

/**
 * Creates a root domain in the signed-in account's personal organization.
 * The organization's domain limit is checked while its row is locked.
 */
export const create_personal_domain = Effect.fn("Auth.createPersonalDomain")(
    function* (principal: AccountPrincipal, value: unknown) {
        const input = yield* Schema.decodeUnknownEffect(CreateDomainInput)(
            value
        ).pipe(Effect.mapError(() => failure("invalid_input")))
        const organization_id = yield* ensure_personal_organization(principal)
        const db = yield* Sql
        yield* db
            .transaction(
                Effect.gen(function* () {
                    const limits = yield* query_rows(
                        PersonalLimit,
                        sql`SELECT o.max_domains FROM organizations o
                    JOIN organization_members m ON m.organization_id=o.id
                    WHERE o.id=${organization_id} AND o.kind='personal'
                        AND o.deleted_at IS NULL AND m.user_id=${principal.account_id}
                        AND m.role='owner' AND m.status='active' AND m.deleted_at IS NULL
                    FOR UPDATE OF o`
                    )
                    const limit = limits[0]
                    if (limit === undefined)
                        return yield* Effect.fail(failure("forbidden"))
                    const counts = yield* query_rows(
                        DomainCount,
                        sql`SELECT COUNT(*)::int AS count FROM domains WHERE organization_id=${organization_id}`
                    )
                    if (
                        (counts[0]?.count ?? limit.max_domains) >=
                        limit.max_domains
                    )
                        return yield* Effect.fail(failure("conflict"))
                    const id = randomUUID()
                    const now = Date.now()
                    const inserted = yield* query_rows(
                        DomainId,
                        sql`INSERT INTO domains (id,organization_id,created_by_user_id,name,slug,publication_status,publication_access,created_at,updated_at)
                    VALUES (${id},${organization_id},${principal.account_id},${input.name},${input.slug},'draft','public',${now},${now})
                    ON CONFLICT (slug) DO NOTHING RETURNING id`
                    )
                    if (inserted.length === 0)
                        return yield* Effect.fail(failure("conflict"))
                })
            )
            .pipe(
                Effect.mapError((error) =>
                    error instanceof SqlError && error.code === "23505"
                        ? failure("conflict")
                        : error
                )
            )
        return yield* list_account_domains(principal)
    }
)

/**
 * Edits an authorized root domain. A published or deployed domain keeps its
 * slug because that slug may identify an existing release or provider resource.
 */
export const update_domain = Effect.fn("Auth.updateDomain")(function* (
    principal: AccountPrincipal,
    value: unknown
) {
    const input = yield* Schema.decodeUnknownEffect(UpdateDomainInput)(
        value
    ).pipe(Effect.mapError(() => failure("invalid_input")))
    const db = yield* Sql
    yield* db
        .transaction(
            Effect.gen(function* () {
                const domain = yield* managed_domain(principal, input.domain_id)
                if (domain.slug !== input.slug) {
                    if (
                        domain.development_release_id !== null ||
                        domain.development_deployment_id !== null ||
                        domain.staging_release_id !== null ||
                        domain.staging_deployment_id !== null ||
                        domain.production_release_id !== null ||
                        domain.production_deployment_id !== null
                    )
                        return yield* Effect.fail(failure("conflict"))
                    const releases = yield* query_rows(
                        DomainId,
                        sql`SELECT id FROM publication_releases WHERE domain_id=${domain.id} LIMIT 1`
                    )
                    if (releases.length > 0)
                        return yield* Effect.fail(failure("conflict"))
                }
                const updated = yield* query_rows(
                    DomainId,
                    sql`UPDATE domains SET name=${input.name},slug=${input.slug},updated_at=${Date.now()}
                        WHERE id=${domain.id} AND (
                            slug=${input.slug} OR NOT EXISTS (
                                SELECT 1 FROM domains WHERE slug=${input.slug} AND id<>${domain.id}
                            )
                        ) RETURNING id`
                )
                if (updated.length === 0)
                    return yield* Effect.fail(failure("conflict"))
            })
        )
        .pipe(
            Effect.mapError((error) =>
                error instanceof SqlError && error.code === "23505"
                    ? failure("conflict")
                    : error
            )
        )
    return yield* list_account_domains(principal)
})

/**
 * Deletes an empty root domain. The final domain in an organization, deployment
 * and release pointers, and any domain-scoped rows prevent deletion.
 */
export const delete_domain = Effect.fn("Auth.deleteDomain")(function* (
    principal: AccountPrincipal,
    value: unknown
) {
    const input = yield* Schema.decodeUnknownEffect(DeleteDomainInput)(
        value
    ).pipe(Effect.mapError(() => failure("invalid_input")))
    const db = yield* Sql
    yield* db
        .transaction(
            Effect.gen(function* () {
                const domain = yield* managed_domain(principal, input.domain_id)
                const organization = yield* query_rows(
                    DomainId,
                    sql`SELECT id FROM organizations WHERE id=${domain.organization_id} AND deleted_at IS NULL FOR UPDATE`
                )
                if (organization.length === 0)
                    return yield* Effect.fail(failure("forbidden"))
                const counts = yield* query_rows(
                    DomainCount,
                    sql`SELECT COUNT(*)::int AS count FROM domains WHERE organization_id=${domain.organization_id}`
                )
                if ((counts[0]?.count ?? 0) < 2)
                    return yield* Effect.fail(failure("conflict"))
                if (
                    domain.development_release_id !== null ||
                    domain.development_deployment_id !== null ||
                    domain.staging_release_id !== null ||
                    domain.staging_deployment_id !== null ||
                    domain.production_release_id !== null ||
                    domain.production_deployment_id !== null
                )
                    return yield* Effect.fail(failure("conflict"))

                const tables = yield* query_rows(
                    TableName,
                    sql`SELECT c.table_name FROM information_schema.columns c
                        JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name
                        WHERE c.table_schema='public' AND c.column_name='domain_id' AND t.table_type='BASE TABLE'`
                )
                for (const table of tables) {
                    const dependencies = yield* query_rows(
                        HasRows,
                        sql`SELECT EXISTS (SELECT 1 FROM ${sql.identifier(table.table_name)} WHERE domain_id=${domain.id}) AS has_rows`
                    )
                    if (dependencies[0]?.has_rows)
                        return yield* Effect.fail(failure("conflict"))
                }
                const deleted = yield* query_rows(
                    DomainId,
                    sql`DELETE FROM domains WHERE id=${domain.id} RETURNING id`
                )
                if (deleted.length === 0)
                    return yield* Effect.fail(failure("conflict"))
            })
        )
        .pipe(
            Effect.mapError((error) =>
                error instanceof SqlError && error.code === "23503"
                    ? failure("conflict")
                    : error
            )
        )
    return yield* list_account_domains(principal)
})
