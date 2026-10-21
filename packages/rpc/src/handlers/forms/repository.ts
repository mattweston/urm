/** # Forms contracts */
import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/db/sql"
import {
    FormsAction,
    FormsWriteError,
    StoredForm,
    StoredFormField,
    StoredFormTemplate,
} from "@urm/domain/forms"
import { type FormDefinition } from "@urm/domain/schemas/forms"

export interface FormsPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = (message = "Form unavailable, changed, or access denied") =>
    new FormsWriteError({ message })
const Id = Schema.Struct({ id: Schema.String })
const Domain = Schema.Struct({
    id: Schema.String,
    organization_id: Schema.String,
})
const Count = Schema.Struct({ count: Schema.Number })

const authorize = Effect.fn("Forms.authorize")(function* (
    principal: FormsPrincipal,
    domain_id: string,
    write = false
) {
    if (principal.domain_id !== domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write, null)
})
/**
 * Resolves the form workspace's organization for template ownership. A reusable
 * template must belong to that organization; knowing its id does not authorize
 * copying it into another tenant's form.
 */
const organization = Effect.fn("Forms.organization")(function* (
    domain_id: string
) {
    const rows = yield* query_rows(
        Domain,
        sql`SELECT id,organization_id FROM domains WHERE id=${domain_id}`
    )
    if (!rows[0]) return yield* Effect.fail(denied())
    return rows[0].organization_id
})
const load_catalog = Effect.fn("Forms.loadCatalog")(function* (
    principal: FormsPrincipal
) {
    yield* authorize(principal, principal.domain_id)
    const domain_id = principal.domain_id
    const organization_id = yield* organization(domain_id)
    const forms = yield* query_rows(
        StoredForm,
        sql`SELECT id,domain_id,title,slug,status,submission_count,template_source,updated_at::float8 AS updated_at FROM forms WHERE domain_id=${domain_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
    const templates = yield* query_rows(
        StoredFormTemplate,
        sql`SELECT id,organization_id,name,description,tags,fields,revision,created_by_user_id,updated_by_user_id,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM form_templates WHERE organization_id=${organization_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
    if (forms.length > 100 || templates.length > 100)
        return yield* Effect.fail(
            denied("Forms catalog exceeds its 100-item limit")
        )
    const can_write = yield* authorize(principal, domain_id, true).pipe(
        Effect.as(true),
        Effect.catch(() => Effect.succeed(false))
    )
    return { id: domain_id, can_write, forms, templates }
})
const load_detail = Effect.fn("Forms.loadDetail")(function* (
    principal: FormsPrincipal,
    slug: string
) {
    yield* authorize(principal, principal.domain_id)
    const domain_id = principal.domain_id
    const forms = yield* query_rows(
        StoredForm,
        sql`SELECT id,domain_id,title,slug,status,submission_count,template_source,updated_at::float8 AS updated_at FROM forms WHERE domain_id=${domain_id} AND slug=${slug}`
    )
    const form = forms[0] ?? null
    const fields =
        form === null
            ? []
            : yield* query_rows(
                  StoredFormField,
                  sql`SELECT id,domain_id,form_id,component_id,kind,href,name,label,description,placeholder,required,options,order_position,updated_at::float8 AS updated_at FROM form_fields WHERE domain_id=${domain_id} AND form_id=${form.id} ORDER BY order_position,id LIMIT 101`
              )
    if (fields.length > 100)
        return yield* Effect.fail(
            denied("A form cannot have more than 100 fields")
        )
    return { id: `${domain_id}:${slug}`, domain_id, form, fields }
})
const insert_fields = Effect.fn("Forms.insertFields")(function* (
    domain_id: string,
    form_id: string,
    fields: FormDefinition,
    now: number
) {
    const tx = yield* Sql
    for (
        let order_position = 0;
        order_position < fields.length;
        order_position++
    ) {
        const field = fields[order_position]
        if (!field) continue
        yield* tx.query(
            sql`INSERT INTO form_fields (id,domain_id,form_id,component_id,kind,href,name,label,description,placeholder,required,options,order_position,updated_at) VALUES (${randomUUID()},${domain_id},${form_id},${field.id},${field.kind},${field.kind === "link" ? field.href : null},${field.name},${field.label},${field.description},${field.placeholder},${field.required},${JSON.stringify(field.options)}::jsonb,${order_position},${now})`
        )
    }
})
const change = Effect.fn("Forms.change")(function* (
    principal: FormsPrincipal,
    value: FormsAction
) {
    const action = yield* Schema.decodeUnknownEffect(FormsAction)(value).pipe(
        Effect.mapError(() => denied("Check the form fields and try again"))
    )
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const domain_id = principal.domain_id
            const locked = yield* query_rows(
                Domain,
                sql`SELECT id,organization_id FROM domains WHERE id=${domain_id} FOR UPDATE`
            )
            const organization_id = locked[0]?.organization_id
            if (!organization_id) return yield* Effect.fail(denied())
            yield* authorize(principal, domain_id, true)
            if (
                action._tag === "SaveTemplate" ||
                action._tag === "RemoveTemplate"
            )
                yield* query_rows(
                    Id,
                    sql`SELECT id FROM organizations WHERE id=${organization_id} FOR UPDATE`
                )
            const now = Date.now()
            if (action._tag === "CreateForm") {
                const count = yield* query_rows(
                    Count,
                    sql`SELECT count(*)::int AS count FROM forms WHERE domain_id=${domain_id}`
                )
                if ((count[0]?.count ?? 0) >= 100)
                    return yield* Effect.fail(
                        denied("A domain cannot contain more than 100 forms")
                    )
                const existing = yield* query_rows(
                    Id,
                    sql`SELECT id FROM forms WHERE domain_id=${domain_id} AND slug=${action.slug}`
                )
                if (existing[0])
                    return yield* Effect.fail(
                        denied("A form already uses this slug")
                    )
                const template =
                    action.template_id === null
                        ? null
                        : (yield* query_rows(
                              StoredFormTemplate,
                              sql`SELECT id,organization_id,name,description,tags,fields,revision,created_by_user_id,updated_by_user_id,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM form_templates WHERE id=${action.template_id} AND organization_id=${organization_id}`
                          ))[0]
                if (action.template_id !== null && !template)
                    return yield* Effect.fail(denied())
                const form_id = randomUUID()
                const source = template
                    ? {
                          template_id: `organization.form.${template.id}`,
                          template_version: template.revision,
                          provenance: "organization",
                      }
                    : {
                          template_id: "form.blank",
                          template_version: 1,
                          provenance: "builtin",
                      }
                yield* tx.query(
                    sql`INSERT INTO forms (id,domain_id,title,slug,status,submission_count,template_source,updated_at) VALUES (${form_id},${domain_id},${action.title},${action.slug},'draft',0,${JSON.stringify(source)}::jsonb,${now})`
                )
                if (template)
                    yield* insert_fields(
                        domain_id,
                        form_id,
                        template.fields,
                        now
                    )
                return { changed_id: form_id, slug: action.slug }
            }
            if (action._tag === "SaveDefinition") {
                const form = (yield* query_rows(
                    StoredForm,
                    sql`SELECT id,domain_id,title,slug,status,submission_count,template_source,updated_at::float8 AS updated_at FROM forms WHERE domain_id=${domain_id} AND id=${action.form_id} FOR UPDATE`
                ))[0]
                if (!form) return yield* Effect.fail(denied())
                yield* tx.query(
                    sql`DELETE FROM form_fields WHERE domain_id=${domain_id} AND form_id=${form.id}`
                )
                yield* insert_fields(domain_id, form.id, action.fields, now)
                yield* tx.query(
                    sql`UPDATE forms SET updated_at=${now} WHERE id=${form.id}`
                )
                return { changed_id: form.id, slug: form.slug }
            }
            if (action._tag === "SaveTemplate") {
                const tags = [
                    ...new Set(action.tags.map((tag) => tag.toLowerCase())),
                ]
                if (action.template_id === null) {
                    const count = yield* query_rows(
                        Count,
                        sql`SELECT count(*)::int AS count FROM form_templates WHERE organization_id=${organization_id}`
                    )
                    if ((count[0]?.count ?? 0) >= 100)
                        return yield* Effect.fail(
                            denied(
                                "An organization cannot contain more than 100 form templates"
                            )
                        )
                    const template_id = randomUUID()
                    yield* tx.query(
                        sql`INSERT INTO form_templates (id,organization_id,name,description,tags,fields,revision,created_by_user_id,updated_by_user_id,created_at,updated_at) VALUES (${template_id},${organization_id},${action.name},${action.description},ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(tags)}::jsonb)),${JSON.stringify(action.fields)}::jsonb,1,${principal.account_id},${principal.account_id},${now},${now})`
                    )
                    return { changed_id: template_id, slug: "" }
                }
                const template = (yield* query_rows(
                    StoredFormTemplate,
                    sql`SELECT id,organization_id,name,description,tags,fields,revision,created_by_user_id,updated_by_user_id,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM form_templates WHERE id=${action.template_id} AND organization_id=${organization_id} FOR UPDATE`
                ))[0]
                if (!template) return yield* Effect.fail(denied())
                if (template.revision !== action.expected_revision)
                    return yield* Effect.fail(
                        denied(
                            "This form template changed elsewhere; reload before saving"
                        )
                    )
                yield* tx.query(
                    sql`UPDATE form_templates SET name=${action.name},description=${action.description},tags=ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(tags)}::jsonb)),fields=${JSON.stringify(action.fields)}::jsonb,revision=revision+1,updated_by_user_id=${principal.account_id},updated_at=${now} WHERE id=${template.id}`
                )
                return { changed_id: template.id, slug: "" }
            }
            const template = (yield* query_rows(
                Id,
                sql`SELECT id FROM form_templates WHERE id=${action.template_id} AND organization_id=${organization_id}`
            ))[0]
            if (!template) return yield* Effect.fail(denied())
            yield* tx.query(
                sql`DELETE FROM form_templates WHERE id=${template.id}`
            )
            return { changed_id: template.id, slug: "" }
        })
    )
})
const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize: (
            principal: FormsPrincipal,
            domain_id: string,
            write = false
        ) =>
            authorize(principal, domain_id, write).pipe(
                Effect.provideService(Sql, db)
            ),
        load_catalog: (principal: FormsPrincipal) =>
            load_catalog(principal).pipe(Effect.provideService(Sql, db)),
        load_detail: (principal: FormsPrincipal, slug: string) =>
            load_detail(principal, slug).pipe(Effect.provideService(Sql, db)),
        change: (principal: FormsPrincipal, action: FormsAction) =>
            change(principal, action).pipe(Effect.provideService(Sql, db)),
    }
})
export class FormsRepository extends Context.Service<
    FormsRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/FormsRepository") {}
export const FormsRepositoryLive = Layer.effect(FormsRepository, make)
