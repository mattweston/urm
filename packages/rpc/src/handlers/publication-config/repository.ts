import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { Sql, query_rows } from "@urm/database/sql"
import {
    PublicationConfiguration,
    PublicationConfigurationAction,
    PublicationConfigurationError,
    synchronize_publication_navigation,
    type PublicationNavigationRecord,
} from "@urm/domain/publication-config"
import {
    PagesRepository,
    PagesRepositoryLive,
    type PagesPrincipal,
} from "../pages/repository.ts"
import {
    capture_asset_resolver,
    reject_private_references,
} from "../publishing/assets.ts"

const denied = () =>
    new PublicationConfigurationError({
        message: "Publication configuration unavailable or invalid",
    })
export const load_publication_configuration = Effect.fn(
    "PublicationConfiguration.read"
)(function* (domain_id: string, subdomain_id: string | null) {
    const rows = yield* query_rows(
        PublicationConfiguration,
        sql`SELECT layout,navigation,blog_included,events_included FROM publication_configurations WHERE domain_id=${domain_id} AND subdomain_id IS NOT DISTINCT FROM ${subdomain_id}`
    )
    return (
        rows[0] ?? {
            layout: null,
            navigation: [],
            blog_included: true,
            events_included: false,
        }
    )
})
const load_library = Effect.fn("PublicationConfiguration.load")(function* (
    principal: PagesPrincipal,
    slug: string | null
) {
    const pages = yield* PagesRepository
    const owner = yield* pages.authorize_pages(
        principal,
        principal.domain_id,
        slug
    )
    return {
        id: `${principal.domain_id}:${slug ?? ""}`,
        ...(yield* load_publication_configuration(
            principal.domain_id,
            owner.subdomain_id
        )),
    }
})
const change = Effect.fn("PublicationConfiguration.change")(function* (
    principal: PagesPrincipal,
    slug: string | null,
    input: PublicationConfigurationAction
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${principal.domain_id} FOR UPDATE`
            )
            const pages = yield* PagesRepository
            const owner = yield* pages.authorize_pages(
                principal,
                principal.domain_id,
                slug,
                true
            )
            const action = yield* Schema.decodeUnknownEffect(
                PublicationConfigurationAction
            )(input)
            const previous = yield* load_publication_configuration(
                principal.domain_id,
                owner.subdomain_id
            )
            const library = yield* pages.load_library(principal, slug)
            let next: PublicationConfiguration = previous
            const navigation_pages = library.pages.filter(
                (page) => page.content_type !== "landing_json"
            )
            const fallback = (): ReadonlyArray<PublicationNavigationRecord> =>
                navigation_pages
                    .filter((page) => page.show_in_navigation)
                    .map((page, order_position) => ({
                        id: randomUUID(),
                        target: { _tag: "page", page_id: page.id },
                        label: page.navigation_label,
                        visible: true,
                        order_position,
                    }))
            switch (action._tag) {
                case "save_layout": {
                    const { _tag, ...layout } = action
                    if (
                        new Set(
                            layout.social_links.map((link) => link.platform)
                        ).size !== layout.social_links.length
                    )
                        return yield* Effect.fail(denied())
                    const resolver = capture_asset_resolver(principal)
                    for (const value of [
                        layout.logo_light_url,
                        layout.logo_dark_url,
                        layout.favicon_light_url,
                        layout.favicon_dark_url,
                    ]) {
                        if (value === null) continue
                        if (!value.startsWith("/api/uploads/"))
                            return yield* Effect.fail(denied())
                        yield* resolver.resolve_url(value)
                    }
                    yield* reject_private_references(layout.social_links)
                    next = { ...previous, layout }
                    break
                }
                case "save_module":
                    next =
                        action.module_id === "events"
                            ? { ...previous, events_included: action.included }
                            : { ...previous, blog_included: action.included }
                    break
                case "initialize_navigation": {
                    const navigation = [
                        ...synchronize_publication_navigation(
                            previous.navigation,
                            library.pages,
                            randomUUID
                        ),
                    ]
                    if (
                        previous.navigation.length === 0 &&
                        (owner.enabled_modules === null ||
                            owner.enabled_modules.includes("Blog"))
                    )
                        navigation.push({
                            id: randomUUID(),
                            target: { _tag: "module", module_id: "blog" },
                            label: "Blog",
                            visible: true,
                            order_position: navigation.length,
                        })
                    next = {
                        ...previous,
                        navigation: navigation.map((item, order_position) => ({
                            ...item,
                            order_position,
                        })),
                    }
                    break
                }
                case "save_navigation": {
                    const { _tag, ...item } = action
                    if (
                        item.target._tag === "page" &&
                        !navigation_pages.some(
                            (page) =>
                                item.target._tag === "page" &&
                                page.id === item.target.page_id
                        )
                    )
                        return yield* Effect.fail(denied())
                    const navigation =
                        previous.navigation.length === 0
                            ? fallback()
                            : previous.navigation
                    const duplicate = navigation.find(
                        (existing) =>
                            existing.id !== item.id &&
                            JSON.stringify(existing.target) ===
                                JSON.stringify(item.target)
                    )
                    if (duplicate !== undefined)
                        return yield* Effect.fail(denied())
                    next = {
                        ...previous,
                        navigation: [
                            ...navigation.filter(
                                (existing) => existing.id !== item.id
                            ),
                            item,
                        ].sort((a, b) => a.order_position - b.order_position),
                    }
                    break
                }
                case "remove_navigation": {
                    if (
                        !previous.navigation.some(
                            (item) => item.id === action.id
                        )
                    )
                        return yield* Effect.fail(denied())
                    next = {
                        ...previous,
                        navigation: previous.navigation.filter(
                            (item) => item.id !== action.id
                        ),
                    }
                    break
                }
                case "reorder_navigation": {
                    if (
                        new Set(action.ids).size !== action.ids.length ||
                        action.ids.length !== previous.navigation.length ||
                        action.ids.some(
                            (id) =>
                                !previous.navigation.some(
                                    (item) => item.id === id
                                )
                        )
                    )
                        return yield* Effect.fail(denied())
                    next = {
                        ...previous,
                        navigation: previous.navigation
                            .map((item) => ({
                                ...item,
                                order_position: action.ids.indexOf(item.id),
                            }))
                            .sort(
                                (a, b) => a.order_position - b.order_position
                            ),
                    }
                    break
                }
            }
            next = yield* Schema.decodeUnknownEffect(PublicationConfiguration)(
                next
            )
            yield* tx.query(
                sql`DELETE FROM publication_configurations WHERE domain_id=${principal.domain_id} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id}`
            )
            yield* tx.query(
                sql`INSERT INTO publication_configurations (id,domain_id,subdomain_id,layout,navigation,blog_included,events_included) VALUES (${randomUUID()},${principal.domain_id},${owner.subdomain_id},${next.layout === null ? null : JSON.stringify(next.layout)}::jsonb,${JSON.stringify(next.navigation)}::jsonb,${next.blog_included},${next.events_included ?? false})`
            )
            return { id: `${principal.domain_id}:${slug ?? ""}`, ...next }
        }).pipe(Effect.provide(PagesRepositoryLive))
    )
})
const make_repository = Effect.gen(function* () {
    const db = yield* Sql
    const pages = yield* PagesRepository
    const provide = <A, E>(
        effect: Effect.Effect<A, E, Sql | PagesRepository>
    ) =>
        effect.pipe(
            Effect.provideService(Sql, db),
            Effect.provideService(PagesRepository, pages)
        )
    return {
        load_library: (...args: Parameters<typeof load_library>) =>
            provide(load_library(...args)),
        change: (...args: Parameters<typeof change>) =>
            provide(change(...args)),
    }
})
export class PublicationConfigurationRepository extends Context.Service<
    PublicationConfigurationRepository,
    Effect.Success<typeof make_repository>
>()("@urm/rpc/PublicationConfigurationRepository") {}
export const PublicationConfigurationRepositoryLive = Layer.effect(
    PublicationConfigurationRepository,
    make_repository
)
