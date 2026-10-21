import { randomUUID } from "node:crypto"
import {
    PublicationConfiguration,
    synchronize_publication_navigation,
} from "@urm/domain/publication-config"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/db/sql"
import {
    PageRecord,
    PagesWriteError,
    pages_library_id,
    PageAction,
} from "@urm/domain/pages"
import {
    RichTextContent,
    RichTextDocument,
} from "@urm/domain/schemas/rich-text"
import { decodeLandingPageContent } from "@urm/domain/schemas/landing-pages"

export interface PagesPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = () =>
    new PagesWriteError({
        message: "Page operation unavailable, changed, or access denied",
    })
const Owner = Schema.Struct({
    id: Schema.String,
    slug: Schema.String,
    enabled_modules: Schema.NullOr(Schema.Array(Schema.String)),
})
const Id = Schema.Struct({ id: Schema.String })
const authorize_pages = Effect.fn("Pages.authorize")(function* (
    principal: PagesPrincipal,
    domain_id: string,
    subdomain_slug: string | null,
    write = false
) {
    if (principal.domain_id !== domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write, null)
    const domains = yield* query_rows(
        Owner,
        sql`SELECT id,slug,enabled_modules::text[] AS enabled_modules FROM domains WHERE id=${domain_id}`
    )
    const domain = domains[0]
    if (domain === undefined) return yield* Effect.fail(denied())
    let subdomain_id: string | null = null
    if (subdomain_slug !== null) {
        const rows = yield* query_rows(
            Id,
            sql`SELECT id FROM subdomains WHERE domain_id=${domain_id} AND slug=${subdomain_slug} FOR SHARE`
        )
        if (rows[0] === undefined) return yield* Effect.fail(denied())
        subdomain_id = rows[0].id
    }
    return { ...domain, subdomain_id }
})
const load_library = Effect.fn("Pages.load")(function* (
    principal: PagesPrincipal,
    subdomain_slug: string | null
) {
    const owner = yield* authorize_pages(
        principal,
        principal.domain_id,
        subdomain_slug
    )
    const pages = yield* query_rows(
        PageRecord,
        sql`SELECT id,title,content,content_type,slug,navigation_label,show_in_navigation,order_position,is_homepage,publication_state,seo_title,seo_description,noindex,template_source,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM pages WHERE domain_id=${principal.domain_id} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id} ORDER BY order_position,id LIMIT 101`
    )
    if (pages.length > 100) return yield* Effect.fail(denied())
    return { id: pages_library_id(principal.domain_id, subdomain_slug), pages }
})
const change_pages = Effect.fn("Pages.change")(function* (
    principal: PagesPrincipal,
    subdomain_slug: string | null,
    input: PageAction
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const action = yield* Schema.decodeUnknownEffect(PageAction)(input)
            const d = principal.domain_id
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${d} FOR UPDATE`
            )
            const owner = yield* authorize_pages(
                principal,
                d,
                subdomain_slug,
                true
            )
            const library = yield* load_library(principal, subdomain_slug)
            const now = Date.now()
            if (action._tag === "select_homepage") {
                const selected = library.pages.find(
                    (page) => page.id === action.id
                )
                if (selected?.content_type !== "landing_json")
                    return yield* Effect.fail(denied())
                for (const previous of library.pages.filter(
                    (page) => page.is_homepage && page.id !== selected.id
                )) {
                    yield* tx.query(
                        sql`UPDATE pages SET is_homepage=false,publication_state='draft',slug=${previous.content_type === "landing_json" ? null : (previous.slug ?? previous.id)},updated_at=${now} WHERE id=${previous.id} AND domain_id=${d}`
                    )
                }
                yield* tx.query(
                    sql`UPDATE pages SET is_homepage=true,slug=NULL,show_in_navigation=false,updated_at=${now} WHERE id=${selected.id} AND domain_id=${d}`
                )
            } else if (action._tag === "set_publication_state") {
                const selected = library.pages.find(
                    (page) => page.id === action.id
                )
                if (
                    selected === undefined ||
                    (action.publication_state === "published" &&
                        selected.content_type === "landing_json" &&
                        !selected.is_homepage)
                )
                    return yield* Effect.fail(denied())
                yield* tx.query(
                    sql`UPDATE pages SET publication_state=${action.publication_state},updated_at=${now} WHERE id=${selected.id} AND domain_id=${d}`
                )
            } else if (action._tag === "reorder") {
                if (
                    new Set(action.positions.map((p) => p.id)).size !==
                        action.positions.length ||
                    action.positions.some(
                        (p) => !library.pages.some((page) => page.id === p.id)
                    )
                )
                    return yield* Effect.fail(denied())
                for (const position of action.positions)
                    yield* tx.query(
                        sql`UPDATE pages SET order_position=${position.order_position},updated_at=${now} WHERE id=${position.id} AND domain_id=${d}`
                    )
            } else {
                const existing = library.pages.find(
                    (page) => page.id === action.id
                )
                if (action._tag === "remove") {
                    if (existing === undefined)
                        return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`DELETE FROM pages WHERE id=${action.id} AND domain_id=${d}`
                    )
                } else {
                    if (
                        action.content_type === "landing_json" &&
                        library.pages.some(
                            (page) =>
                                page.id !== action.id &&
                                page.content_type === "landing_json"
                        )
                    )
                        return yield* Effect.fail(
                            new PagesWriteError({
                                message:
                                    "This publication already has a landing page",
                            })
                        )
                    if (
                        (action.is_homepage && action.slug !== null) ||
                        (action.content_type === "landing_json" &&
                            action.slug !== null) ||
                        (!action.is_homepage &&
                            action.content_type !== "landing_json" &&
                            action.slug === null)
                    )
                        return yield* Effect.fail(denied())
                    if (
                        library.pages.some(
                            (page) =>
                                page.id !== action.id &&
                                ((action.is_homepage && page.is_homepage) ||
                                    (action.slug !== null &&
                                        page.slug === action.slug))
                        )
                    )
                        return yield* Effect.fail(denied())
                    if (
                        (action.slug === "blog" &&
                            (owner.enabled_modules === null ||
                                owner.enabled_modules.includes("Blog"))) ||
                        (action.slug === "events" &&
                            (owner.enabled_modules === null ||
                                owner.enabled_modules.includes("Events")))
                    )
                        return yield* Effect.fail(denied())
                    if (action.content_type === "rich_text_json")
                        yield* Schema.decodeUnknownEffect(
                            Schema.fromJsonString(
                                Schema.Union([
                                    RichTextContent,
                                    Schema.Struct({
                                        document: RichTextDocument,
                                    }),
                                ])
                            )
                        )(action.content)
                    if (action.content_type === "landing_json") {
                        const document = yield* decodeLandingPageContent(
                            action.content
                        )
                        const images = document.blocks.flatMap((block) =>
                            block._tag === "Hero" && block.image !== undefined
                                ? [block.image]
                                : block._tag === "LogoGrid"
                                  ? block.logos.map((logo) => logo.image)
                                  : []
                        )
                        for (const image of images) {
                            if (image._tag === "BundledAsset") {
                                if (owner.slug !== "urm")
                                    return yield* Effect.fail(denied())
                            } else {
                                const rows = yield* query_rows(
                                    Id,
                                    sql`SELECT id FROM images WHERE id=${image.image_id} AND domain_id=${d}`
                                )
                                if (rows.length !== 1)
                                    return yield* Effect.fail(denied())
                            }
                        }
                    }
                    if (action._tag === "create") {
                        if (existing !== undefined) {
                            const fields = [
                                "title",
                                "content",
                                "content_type",
                                "slug",
                                "navigation_label",
                                "show_in_navigation",
                                "is_homepage",
                                "publication_state",
                                "seo_title",
                                "seo_description",
                                "noindex",
                            ]
                            const stored = yield* Schema.decodeUnknownEffect(
                                Schema.Record(Schema.String, Schema.Unknown)
                            )(existing)
                            const requested = yield* Schema.decodeUnknownEffect(
                                Schema.Record(Schema.String, Schema.Unknown)
                            )(action)
                            if (
                                fields.some(
                                    (key) => stored[key] !== requested[key]
                                ) ||
                                JSON.stringify(existing.template_source) !==
                                    JSON.stringify(action.template_source)
                            )
                                return yield* Effect.fail(denied())
                        } else {
                            if (library.pages.length >= 100)
                                return yield* Effect.fail(denied())
                            const position = library.pages.reduce(
                                (highest, page) =>
                                    Math.max(highest, page.order_position + 1),
                                0
                            )
                            yield* tx.query(
                                sql`INSERT INTO pages (id,domain_id,subdomain_id,title,content,content_type,slug,navigation_label,show_in_navigation,order_position,is_homepage,publication_state,seo_title,seo_description,noindex,template_source,created_at,updated_at) VALUES (${action.id},${d},${owner.subdomain_id},${action.title},${action.content},${action.content_type},${action.slug},${action.navigation_label},${action.show_in_navigation},${position},${action.is_homepage},${action.publication_state},${action.seo_title},${action.seo_description},${action.noindex},${JSON.stringify(action.template_source)}::jsonb,${now},${now})`
                            )
                        }
                    } else {
                        if (existing === undefined)
                            return yield* Effect.fail(denied())
                        yield* tx.query(
                            sql`UPDATE pages SET title=${action.title},content=${action.content},content_type=${action.content_type},slug=${action.slug},navigation_label=${action.navigation_label},show_in_navigation=${action.show_in_navigation},is_homepage=${action.is_homepage},publication_state=${action.publication_state},seo_title=${action.seo_title},seo_description=${action.seo_description},noindex=${action.noindex},updated_at=${now} WHERE id=${action.id} AND domain_id=${d}`
                        )
                    }
                }
            }
            const next_library = yield* load_library(principal, subdomain_slug)
            const configs = yield* query_rows(
                PublicationConfiguration,
                sql`SELECT layout,navigation,blog_included FROM publication_configurations WHERE domain_id=${d} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id}`
            )
            const configuration = configs[0]
            if (
                configuration !== undefined &&
                configuration.navigation.length > 0
            ) {
                const navigation = yield* Schema.decodeUnknownEffect(
                    PublicationConfiguration.fields.navigation
                )(
                    synchronize_publication_navigation(
                        configuration.navigation,
                        next_library.pages,
                        randomUUID
                    )
                )
                yield* tx.query(
                    sql`UPDATE publication_configurations SET navigation=${JSON.stringify(navigation)}::jsonb WHERE domain_id=${d} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id}`
                )
            }
            return next_library
        })
    )
})
const make_repository = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize_pages: (...args: Parameters<typeof authorize_pages>) =>
            authorize_pages(...args).pipe(Effect.provideService(Sql, db)),
        load_library: (...args: Parameters<typeof load_library>) =>
            load_library(...args).pipe(Effect.provideService(Sql, db)),
        change_pages: (...args: Parameters<typeof change_pages>) =>
            change_pages(...args).pipe(Effect.provideService(Sql, db)),
    }
})
export class PagesRepository extends Context.Service<
    PagesRepository,
    Effect.Success<typeof make_repository>
>()("@urm/rpc/PagesRepository") {}
export const PagesRepositoryLive = Layer.effect(
    PagesRepository,
    make_repository
)
