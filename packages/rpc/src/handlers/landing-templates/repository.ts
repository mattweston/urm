import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/database/sql"
import {
    LandingTemplateCatalog,
    LandingTemplateError,
    LandingTemplateRecord,
    SaveLandingTemplateInput,
} from "@urm/domain/landing-templates"
import type { LandingPageDocument } from "@urm/domain/schemas/landing-pages"

export interface LandingTemplatesPrincipal extends AccountPrincipal {
    readonly domain_id: string
}

const Domain = Schema.Struct({ organization_id: Schema.String })
const Count = Schema.Struct({ count: Schema.Number })
const Id = Schema.Struct({ id: Schema.String })
const denied = (message = "Landing template unavailable or access denied") =>
    new LandingTemplateError({ message })

const unique_tags = (tags: ReadonlyArray<string>): ReadonlyArray<string> =>
    tags.reduce<ReadonlyArray<string>>((unique, tag) => {
        const normalized = tag.toLocaleLowerCase()
        return unique.includes(normalized) ? unique : [...unique, normalized]
    }, [])

const portable_document = (
    document: LandingPageDocument
): LandingPageDocument => ({
    ...document,
    blocks: document.blocks.map((block) => {
        if (block._tag === "Hero") {
            const { image: _image, ...hero } = block
            return hero
        }
        if (block._tag === "LogoGrid") return { ...block, logos: [] }
        if (block._tag === "RichText")
            return {
                ...block,
                document: {
                    ...block.document,
                    children: block.document.children.filter(
                        (child) => child.type !== "image"
                    ),
                },
            }
        return block
    }),
})

const organization = Effect.fn("LandingTemplates.organization")(function* (
    principal: LandingTemplatesPrincipal,
    write: boolean
) {
    yield* require_account_domain(principal, principal.domain_id, write, null)
    const rows = yield* query_rows(
        Domain,
        sql`SELECT organization_id FROM domains WHERE id=${principal.domain_id}`
    )
    if (!rows[0]) return yield* Effect.fail(denied())
    return rows[0].organization_id
})

const load_catalog = Effect.fn("LandingTemplates.loadCatalog")(function* (
    principal: LandingTemplatesPrincipal
) {
    const organization_id = yield* organization(principal, false)
    const templates = yield* query_rows(
        LandingTemplateRecord,
        sql`SELECT id,organization_id,name,description,category,COALESCE(tags,ARRAY[]::text[]) AS tags,document,revision,created_by_user_id,updated_by_user_id,created_at::float8 AS created_at,updated_at::float8 AS updated_at
            FROM landing_templates WHERE organization_id=${organization_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
    if (templates.length > 100)
        return yield* Effect.fail(
            denied(
                "An organization cannot contain more than 100 landing templates"
            )
        )
    return LandingTemplateCatalog.make({ id: principal.domain_id, templates })
})

const save = Effect.fn("LandingTemplates.save")(function* (
    principal: LandingTemplatesPrincipal,
    input: typeof SaveLandingTemplateInput.Type
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const organization_id = yield* organization(principal, true)
            const tx = yield* Sql
            const now = Date.now()
            const document = JSON.stringify(portable_document(input.document))
            let changed_id: string
            if (input.template_id === null) {
                if (input.expected_revision !== 0)
                    return yield* Effect.fail(
                        denied("A new template must start at revision zero")
                    )
                yield* query_rows(
                    Id,
                    sql`SELECT id FROM organizations WHERE id=${organization_id} FOR UPDATE`
                )
                const counts = yield* query_rows(
                    Count,
                    sql`SELECT count(*)::int AS count FROM landing_templates WHERE organization_id=${organization_id}`
                )
                if ((counts[0]?.count ?? 0) >= 100)
                    return yield* Effect.fail(
                        denied(
                            "An organization cannot contain more than 100 landing templates"
                        )
                    )
                changed_id = randomUUID()
                const tags = JSON.stringify(unique_tags(input.tags ?? []))
                yield* tx.query(
                    sql`INSERT INTO landing_templates (id,organization_id,name,description,category,tags,document,revision,created_by_user_id,updated_by_user_id,created_at,updated_at)
                        VALUES (${changed_id},${organization_id},${input.name},${input.description ?? "Reusable landing-page template."},${input.category ?? "Web"},ARRAY(SELECT jsonb_array_elements_text(${tags}::jsonb)),${document}::jsonb,1,${principal.account_id},${principal.account_id},${now},${now})`
                )
            } else {
                const rows = yield* query_rows(
                    LandingTemplateRecord,
                    sql`SELECT id,organization_id,name,description,category,COALESCE(tags,ARRAY[]::text[]) AS tags,document,revision,created_by_user_id,updated_by_user_id,created_at::float8 AS created_at,updated_at::float8 AS updated_at
                        FROM landing_templates WHERE id=${input.template_id} AND organization_id=${organization_id} FOR UPDATE`
                )
                const previous = rows[0]
                if (!previous) return yield* Effect.fail(denied())
                if (previous.revision !== input.expected_revision)
                    return yield* Effect.fail(
                        denied(
                            "This landing template changed elsewhere; reload before saving"
                        )
                    )
                changed_id = previous.id
                const tags = JSON.stringify(
                    unique_tags(input.tags ?? previous.tags)
                )
                yield* tx.query(
                    sql`UPDATE landing_templates SET name=${input.name},description=${input.description ?? previous.description},category=${input.category ?? previous.category},tags=ARRAY(SELECT jsonb_array_elements_text(${tags}::jsonb)),document=${document}::jsonb,revision=${previous.revision + 1},updated_by_user_id=${principal.account_id},updated_at=${now} WHERE id=${changed_id} AND organization_id=${organization_id}`
                )
            }
            return { changed_id, catalog: yield* load_catalog(principal) }
        })
    )
})

const remove = Effect.fn("LandingTemplates.remove")(function* (
    principal: LandingTemplatesPrincipal,
    template_id: string
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const organization_id = yield* organization(principal, true)
            const deleted = yield* query_rows(
                Id,
                sql`DELETE FROM landing_templates WHERE id=${template_id} AND organization_id=${organization_id} RETURNING id`
            )
            if (!deleted[0]) return yield* Effect.fail(denied())
            return {
                changed_id: deleted[0].id,
                catalog: yield* load_catalog(principal),
            }
        })
    )
})

const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        load: (principal: LandingTemplatesPrincipal) =>
            load_catalog(principal).pipe(Effect.provideService(Sql, db)),
        save: (
            principal: LandingTemplatesPrincipal,
            input: typeof SaveLandingTemplateInput.Type
        ) => save(principal, input).pipe(Effect.provideService(Sql, db)),
        remove: (principal: LandingTemplatesPrincipal, template_id: string) =>
            remove(principal, template_id).pipe(Effect.provideService(Sql, db)),
    }
})

export class LandingTemplatesRepository extends Context.Service<
    LandingTemplatesRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/LandingTemplatesRepository") {}
export const LandingTemplatesRepositoryLive = Layer.effect(
    LandingTemplatesRepository,
    make
)
