import { EventRecord, EventMenuRecord } from "@urm/domain/events"
import {
    load_deployment_jobs,
    request_development,
    request_promotion,
    request_subdomain,
    cancel_development,
} from "./deployment.ts"
import { load_publication_configuration } from "../publication-config/repository.ts"
import { resolveSiteTheme } from "@urm/domain/schemas/site-appearance"
import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { Sql, query_rows } from "@urm/db/sql"
import {
    ReleaseRecord,
    PublishingError,
    PublicationOwnerRecord,
} from "@urm/domain/publishing"
import {
    PublicationReleaseSnapshot,
    type ArtifactChecksum,
} from "@urm/domain/schemas/publications"
import { capture_asset_resolver, reject_private_references } from "./assets.ts"
import { BlogPost, BlogAssignment } from "@urm/domain/blog"
import {
    PagesRepository,
    PagesRepositoryLive,
    type PagesPrincipal,
} from "../pages/repository.ts"

const denied = () =>
    new PublishingError({ message: "Publication unavailable or access denied" })
const release_columns = sql`id,status,snapshot,artifact_checksum,error_message,created_at::float8 AS created_at,completed_at::float8 AS completed_at`
const load_owners = Effect.fn("Publishing.loadOwners")(function* (
    principal: PagesPrincipal
) {
    const pages = yield* PagesRepository
    yield* pages.authorize_pages(principal, principal.domain_id, null)
    const subdomains = yield* query_rows(
        PublicationOwnerRecord,
        sql`SELECT id,domain_id,name,slug FROM subdomains WHERE domain_id=${principal.domain_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
    if (subdomains.length > 100)
        return yield* Effect.fail(
            new PublishingError({
                message: "This publication supports up to 100 subdomains.",
            })
        )
    return { id: principal.domain_id, subdomains }
})
const load_library = Effect.fn("Publishing.load")(function* (
    principal: PagesPrincipal,
    subdomain_slug: string | null
) {
    const pages = yield* PagesRepository
    const owner = yield* pages.authorize_pages(
        principal,
        principal.domain_id,
        subdomain_slug
    )
    const releases = yield* query_rows(
        ReleaseRecord,
        sql`SELECT ${release_columns} FROM publication_releases WHERE domain_id=${principal.domain_id} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id} ORDER BY created_at DESC,id LIMIT 100`
    )
    return { id: `${principal.domain_id}:${subdomain_slug ?? ""}`, releases }
})
const capture = Effect.fn("Publishing.capture")(function* (
    principal: PagesPrincipal,
    subdomain_slug: string | null,
    idempotency_key: string
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${principal.domain_id} FOR UPDATE`
            )
            const pages_repository = yield* PagesRepository
            const owner = yield* pages_repository.authorize_pages(
                principal,
                principal.domain_id,
                subdomain_slug,
                true
            )
            const existing = yield* query_rows(
                ReleaseRecord,
                sql`SELECT ${release_columns} FROM publication_releases WHERE domain_id=${principal.domain_id} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id} AND idempotency_key=${idempotency_key}`
            )
            if (existing[0] !== undefined)
                return {
                    release: existing[0],
                    created: false,
                    asset_sources: [],
                }
            const library = yield* Effect.flatMap(
                PagesRepository,
                (repository) =>
                    repository.load_library(principal, subdomain_slug)
            ).pipe(Effect.provide(PagesRepositoryLive))
            const published = library.pages.filter(
                (page) => page.publication_state === "published"
            )
            const homepages = library.pages.filter((page) => page.is_homepage)
            const published_homepages = homepages.filter(
                (page) => page.publication_state === "published"
            )
            if (published_homepages.length === 0)
                return yield* Effect.fail(
                    new PublishingError({
                        message:
                            homepages[0] === undefined
                                ? "No homepage is selected for this publication. In Web > Pages, choose the Homepage landing page and set Homepage publication state to published."
                                : `The homepage "${homepages[0].title}" is ${homepages[0].publication_state}. In Web > Pages, set Homepage publication state to published before building.`,
                    })
                )
            if (published_homepages.length > 1)
                return yield* Effect.fail(
                    new PublishingError({
                        message:
                            "More than one published page is marked as the homepage. Keep Homepage enabled on only one page in this publication.",
                    })
                )
            const missing_slug = published.find(
                (page) => !page.is_homepage && page.slug === null
            )
            if (missing_slug !== undefined)
                return yield* Effect.fail(
                    new PublishingError({
                        message:
                            missing_slug.content_type === "landing_json"
                                ? `The published landing page "${missing_slug.title}" has no URL because it is not the homepage. Make it the homepage or return it to Draft.`
                                : `The published page "${missing_slug.title}" has no URL slug. Add a slug in Web > Pages and save.`,
                    })
                )
            const assets = capture_asset_resolver(principal)
            const configuration = yield* load_publication_configuration(
                principal.domain_id,
                owner.subdomain_id
            )
            const blog_included =
                configuration.blog_included &&
                (owner.enabled_modules === null ||
                    owner.enabled_modules.includes("Blog"))
            const assignments = blog_included
                ? yield* query_rows(
                      BlogAssignment,
                      sql`SELECT id,blog_post_id,slug,publication_state,published_at::float8 AS published_at,is_featured,order_position,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM publication_blog_posts WHERE domain_id=${principal.domain_id} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id} ORDER BY order_position,id LIMIT 1001`
                  )
                : []
            if (assignments.length > 1000) return yield* Effect.fail(denied())
            const blog_posts = yield* Effect.forEach(
                assignments.filter(
                    (assignment) => assignment.publication_state === "published"
                ),
                (assignment) =>
                    Effect.gen(function* () {
                        const rows = yield* query_rows(
                            BlogPost,
                            sql`SELECT id,title,content,content_type,excerpt,seo_title,seo_description,editorial_state,template_source,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM blog_posts WHERE id=${assignment.blog_post_id} AND domain_id=${principal.domain_id}`
                        )
                        const post = rows[0]
                        if (
                            post === undefined ||
                            post.editorial_state !== "published"
                        )
                            return yield* Effect.fail(
                                new PublishingError({
                                    message:
                                        "Every assigned Blog post must be published",
                                })
                            )
                        return {
                            path: `/blog/${assignment.slug}/`,
                            title: post.title,
                            body: yield* assets.resolve_content(
                                post.content,
                                post.content_type
                            ),
                            content_type: post.content_type,
                            ...(post.excerpt === null
                                ? {}
                                : { excerpt: post.excerpt }),
                            ...(post.seo_title === null
                                ? {}
                                : { seo_title: post.seo_title }),
                            ...(post.seo_description === null
                                ? {}
                                : { seo_description: post.seo_description }),
                            ...(assignment.published_at === null
                                ? {}
                                : { published_at: assignment.published_at }),
                        }
                    })
            )
            const events_included =
                configuration.events_included === true &&
                (owner.enabled_modules === null ||
                    owner.enabled_modules.includes("Events"))
            const event_rows = events_included
                ? yield* query_rows(
                      EventRecord,
                      sql`SELECT id,domain_id,title,description,date::float8 AS date,start_time,end_time,venue_name,venue_url,latitude,longitude,tickets_url,image_url,published,updated_at::float8 AS updated_at FROM events WHERE domain_id=${principal.domain_id} AND published ORDER BY date,id LIMIT 51`
                  )
                : []
            const menu_rows = events_included
                ? yield* query_rows(
                      EventMenuRecord,
                      sql`SELECT m.id,m.domain_id,m.event_id,m.title,m.description,m.content,m.price,m.category,m.served_at,m.slug,m.image_url,m.dietary_labels,m.allergens,m.published,m.order_position,m.updated_at::float8 AS updated_at FROM event_menu_items m JOIN events e ON e.id=m.event_id AND e.domain_id=m.domain_id WHERE m.domain_id=${principal.domain_id} AND m.published AND e.published ORDER BY m.order_position,m.id LIMIT 101`
                  )
                : []
            if (event_rows.length > 50 || menu_rows.length > 100)
                return yield* Effect.fail(denied())
            const events = yield* Effect.forEach(event_rows, (event) =>
                Effect.gen(function* () {
                    return {
                        path: `/events/${encodeURIComponent(event.id)}/`,
                        title: event.title,
                        description: event.description,
                        date: event.date,
                        start_time: event.start_time,
                        ...(event.end_time === ""
                            ? {}
                            : { end_time: event.end_time }),
                        venue_name: event.venue_name,
                        venue_url: event.venue_url,
                        latitude: event.latitude,
                        longitude: event.longitude,
                        tickets_url: event.tickets_url,
                        ...(event.image_url === ""
                            ? {}
                            : {
                                  image_url: yield* assets.resolve_url(
                                      event.image_url
                                  ),
                              }),
                        menu_items: yield* Effect.forEach(
                            menu_rows.filter(
                                (item) => item.event_id === event.id
                            ),
                            (item) =>
                                Effect.gen(function* () {
                                    return {
                                        title: item.title,
                                        description: item.description,
                                        content: item.content,
                                        price: item.price,
                                        category: item.category,
                                        served_at: item.served_at,
                                        dietary_labels: item.dietary_labels,
                                        allergens: item.allergens,
                                        ...(item.image_url === ""
                                            ? {}
                                            : {
                                                  image_url:
                                                      yield* assets.resolve_url(
                                                          item.image_url
                                                      ),
                                              }),
                                    }
                                })
                        ),
                    }
                })
            )
            const stored_layout = configuration.layout
            const navigation_pages = published.filter(
                (page) => page.content_type !== "landing_json"
            )
            const navigation =
                configuration.navigation.length === 0
                    ? navigation_pages
                          .filter((page) => page.show_in_navigation)
                          .map((page) => ({
                              label: page.navigation_label || page.title,
                              path: page.is_homepage ? "/" : `/${page.slug}/`,
                          }))
                    : configuration.navigation.flatMap((item) => {
                          if (!item.visible) return []
                          if (
                              item.target._tag === "module" &&
                              item.target.module_id === "events"
                          )
                              return events.length > 0
                                  ? [
                                        {
                                            label: item.label || "Events",
                                            path: "/events/",
                                        },
                                    ]
                                  : []
                          if (item.target._tag === "module")
                              return blog_included && blog_posts.length > 0
                                  ? [
                                        {
                                            label: item.label || "Blog",
                                            path: "/blog/",
                                        },
                                    ]
                                  : []
                          const page = navigation_pages.find(
                              (page) =>
                                  item.target._tag === "page" &&
                                  page.id === item.target.page_id
                          )
                          return page === undefined
                              ? []
                              : [
                                    {
                                        label: item.label || page.title,
                                        path: page.is_homepage
                                            ? "/"
                                            : `/${page.slug}/`,
                                    },
                                ]
                      })
            const resolve_asset = (value: string | null | undefined) =>
                value == null ? Effect.succeed(null) : assets.resolve_url(value)
            const names = yield* query_rows(
                Schema.Struct({ name: Schema.String }),
                owner.subdomain_id === null
                    ? sql`SELECT name FROM domains WHERE id=${principal.domain_id}`
                    : sql`SELECT name FROM subdomains WHERE domain_id=${principal.domain_id} AND id=${owner.subdomain_id}`
            )
            const layout = {
                name: stored_layout?.site_title ?? names[0]?.name ?? owner.slug,
                show_site_title: stored_layout?.show_site_title ?? false,
                theme: resolveSiteTheme({
                    theme_id: stored_layout?.theme_id ?? "default",
                    appearance: stored_layout?.appearance ?? "system",
                }),
                social_links: stored_layout?.social_links ?? [],
                logo_light_url: yield* resolve_asset(
                    stored_layout?.logo_light_url
                ),
                logo_dark_url: yield* resolve_asset(
                    stored_layout?.logo_dark_url
                ),
                favicon_light_url: yield* resolve_asset(
                    stored_layout?.favicon_light_url
                ),
                favicon_dark_url: yield* resolve_asset(
                    stored_layout?.favicon_dark_url
                ),
                navigation,
            }
            const id = randomUUID()
            const snapshot = yield* Schema.decodeUnknownEffect(
                PublicationReleaseSnapshot
            )({
                schema_version: 1,
                release_id: id,
                publication_origin: `https://${subdomain_slug === null ? "" : `${subdomain_slug}.`}${owner.slug}.urm.dev`,
                pages: yield* Effect.forEach(published, (page) =>
                    Effect.gen(function* () {
                        return {
                            path: page.is_homepage ? "/" : `/${page.slug}/`,
                            title: page.title,
                            body: yield* assets.resolve_content(
                                page.content,
                                page.content_type
                            ),
                            content_type: page.content_type,
                            noindex: page.noindex,
                            ...(page.seo_title === null
                                ? {}
                                : { seo_title: page.seo_title }),
                            ...(page.seo_description === null
                                ? {}
                                : { seo_description: page.seo_description }),
                        }
                    })
                ),
                blog_posts,
                events,
                layout,
            })
            yield* reject_private_references(snapshot)
            const asset_sources = assets.sources()
            const now = Date.now()
            yield* tx.query(
                sql`INSERT INTO publication_releases (id,domain_id,subdomain_id,created_by_user_id,idempotency_key,status,snapshot,asset_sources,created_at) VALUES (${id},${principal.domain_id},${owner.subdomain_id},${principal.account_id},${idempotency_key},'building',${JSON.stringify(snapshot)}::jsonb,${JSON.stringify(asset_sources)}::jsonb,${now})`
            )
            return {
                release: {
                    id,
                    status: "building",
                    snapshot,
                    artifact_checksum: null,
                    error_message: null,
                    created_at: now,
                    completed_at: null,
                },
                created: true,
                asset_sources,
            }
        }).pipe(Effect.provide(PagesRepositoryLive))
    )
})
const finish = Effect.fn("Publishing.finish")(function* (
    principal: PagesPrincipal,
    subdomain_slug: string | null,
    release_id: string,
    checksum: ArtifactChecksum | null
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const repository = yield* PagesRepository
            const owner = yield* repository.authorize_pages(
                principal,
                principal.domain_id,
                subdomain_slug,
                true
            )
            yield* tx.query(
                sql`UPDATE publication_releases SET status=${checksum === null ? "failed" : "ready"},artifact_checksum=${checksum},error_message=${checksum === null ? "Site generation failed. Request a new build after correcting the content." : null},completed_at=${Date.now()} WHERE id=${release_id} AND domain_id=${principal.domain_id} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id} AND status='building'`
            )
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
        load_owners: (...args: Parameters<typeof load_owners>) =>
            provide(load_owners(...args)),
        request_subdomain: (...args: Parameters<typeof request_subdomain>) =>
            provide(request_subdomain(...args)),
        load_jobs: (...args: Parameters<typeof load_deployment_jobs>) =>
            provide(load_deployment_jobs(...args)),
        request_development: (
            ...args: Parameters<typeof request_development>
        ) => provide(request_development(...args)),
        request_promotion: (...args: Parameters<typeof request_promotion>) =>
            provide(request_promotion(...args)),
        cancel_development: (...args: Parameters<typeof cancel_development>) =>
            provide(cancel_development(...args)),
        load_library: (...args: Parameters<typeof load_library>) =>
            provide(load_library(...args)),
        capture: (...args: Parameters<typeof capture>) =>
            provide(capture(...args)),
        finish: (...args: Parameters<typeof finish>) =>
            provide(finish(...args)),
    }
})
export class PublishingRepository extends Context.Service<
    PublishingRepository,
    Effect.Success<typeof make_repository>
>()("@urm/rpc/PublishingRepository") {}
export const PublishingRepositoryLive = Layer.effect(
    PublishingRepository,
    make_repository
)
