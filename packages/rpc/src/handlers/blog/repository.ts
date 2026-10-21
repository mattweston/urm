import { BlogWriteError } from "@urm/domain/blog"
import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/db/sql"
import {
    BlogPost,
    BlogAssignment,
    BlogTemplate,
    blog_library_id,
    type BlogAction,
} from "@urm/domain/blog"
import { RichTextContent } from "@urm/domain/schemas/rich-text"

export interface BlogPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = () =>
    new BlogWriteError({
        message: "Blog operation unavailable, changed, or access denied",
    })
const Id = Schema.Struct({ id: Schema.String })
const authorize_blog = Effect.fn("Blog.authorize")(function* (
    principal: BlogPrincipal,
    domain_id: string,
    subdomain_slug: string | null,
    write = false
) {
    if (principal.domain_id !== domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write, "Blog")
    const organizations = yield* query_rows(
        Id,
        sql`SELECT organization_id AS id FROM domains WHERE id=${domain_id}`
    )
    const organization = organizations[0]
    if (organization === undefined) return yield* Effect.fail(denied())
    let subdomain_id: string | null = null
    if (subdomain_slug !== null) {
        const rows = yield* query_rows(
            Id,
            sql`SELECT id FROM subdomains WHERE domain_id=${domain_id} AND slug=${subdomain_slug} FOR SHARE`
        )
        const row = rows[0]
        if (row === undefined) return yield* Effect.fail(denied())
        subdomain_id = row.id
    }
    return { organization_id: organization.id, subdomain_id }
})
const load_library = Effect.fn("Blog.load")(function* (
    principal: BlogPrincipal,
    subdomain_slug: string | null
) {
    const owner = yield* authorize_blog(
        principal,
        principal.domain_id,
        subdomain_slug
    )
    const posts = yield* query_rows(
        BlogPost,
        sql`SELECT id,title,content,content_type,excerpt,seo_title,seo_description,editorial_state,template_source,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM blog_posts WHERE domain_id=${principal.domain_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
    const assignments = yield* query_rows(
        BlogAssignment,
        sql`SELECT id,blog_post_id,slug,publication_state,published_at::float8 AS published_at,is_featured,order_position,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM publication_blog_posts WHERE domain_id=${principal.domain_id} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id} ORDER BY order_position,id LIMIT 101`
    )
    const templates = yield* query_rows(
        BlogTemplate,
        sql`SELECT id,name,description,tags,title,content,content_type,excerpt,seo_title,seo_description,revision,created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM blog_templates WHERE organization_id=${owner.organization_id} ORDER BY updated_at DESC,id LIMIT 101`
    )
    if (
        posts.length > 100 ||
        assignments.length > 100 ||
        templates.length > 100
    )
        return yield* Effect.fail(denied())
    return {
        id: blog_library_id(principal.domain_id, subdomain_slug),
        posts,
        assignments,
        templates,
    }
})
const change_blog = Effect.fn("Blog.change")(function* (
    principal: BlogPrincipal,
    subdomain_slug: string | null,
    action: BlogAction
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const d = principal.domain_id
            const rows = yield* query_rows(
                Id,
                sql`SELECT organization_id AS id FROM domains WHERE id=${d} FOR UPDATE`
            )
            const organization = rows[0]
            if (organization === undefined) return yield* Effect.fail(denied())
            yield* tx.query(
                sql`SELECT id FROM organizations WHERE id=${organization.id} FOR UPDATE`
            )
            const owner = yield* authorize_blog(
                principal,
                d,
                subdomain_slug,
                true
            )
            const library = yield* load_library(principal, subdomain_slug)
            const now = Date.now()
            const actor = principal.account_id
            if ("content" in action && action.content_type === "rich_text_json")
                yield* Schema.decodeUnknownEffect(
                    Schema.fromJsonString(RichTextContent)
                )(action.content)
            if (action._tag === "save_template") {
                const existing = library.templates.find(
                    (item) => item.id === action.id
                )
                const tags = [
                    ...new Set(
                        action.tags.map((tag) => tag.toLocaleLowerCase())
                    ),
                ]
                if (existing === undefined) {
                    if (
                        action.expected_revision !== 0 ||
                        library.templates.length >= 100
                    )
                        return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`INSERT INTO blog_templates (id,organization_id,name,description,tags,title,content,content_type,excerpt,seo_title,seo_description,revision,created_by_user_id,updated_by_user_id,created_at,updated_at) VALUES (${action.id},${owner.organization_id},${action.name},${action.description},ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(tags)}::jsonb)),${action.title},${action.content},${action.content_type},${action.excerpt},${action.seo_title},${action.seo_description},1,${actor},${actor},${now},${now})`
                    )
                } else {
                    if (existing.revision !== action.expected_revision)
                        return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`UPDATE blog_templates SET name=${action.name},description=${action.description},tags=ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(tags)}::jsonb)),title=${action.title},content=${action.content},content_type=${action.content_type},excerpt=${action.excerpt},seo_title=${action.seo_title},seo_description=${action.seo_description},revision=revision+1,updated_by_user_id=${actor},updated_at=${now} WHERE id=${action.id} AND organization_id=${owner.organization_id}`
                    )
                }
            } else if (action._tag === "delete_template") {
                if (!library.templates.some((item) => item.id === action.id))
                    return yield* Effect.fail(denied())
                yield* tx.query(
                    sql`DELETE FROM blog_templates WHERE id=${action.id} AND organization_id=${owner.organization_id}`
                )
            } else if (action._tag === "remove_assignment") {
                if (!library.assignments.some((item) => item.id === action.id))
                    return yield* Effect.fail(denied())
                yield* tx.query(
                    sql`DELETE FROM publication_blog_posts WHERE id=${action.id} AND domain_id=${d} AND subdomain_id IS NOT DISTINCT FROM ${owner.subdomain_id}`
                )
            } else if (action._tag === "delete") {
                if (!library.posts.some((item) => item.id === action.id))
                    return yield* Effect.fail(denied())
                const assigned = yield* query_rows(
                    Id,
                    sql`SELECT id FROM publication_blog_posts WHERE blog_post_id=${action.id} LIMIT 1`
                )
                if (assigned.length !== 0) return yield* Effect.fail(denied())
                yield* tx.query(
                    sql`DELETE FROM blog_posts WHERE id=${action.id} AND domain_id=${d}`
                )
            } else {
                const existing = library.posts.find(
                    (item) => item.id === action.id
                )
                const template =
                    action._tag === "from_template"
                        ? library.templates.find(
                              (item) => item.id === action.template_id
                          )
                        : undefined
                const fields = action._tag === "save" ? action : template
                if (fields === undefined) return yield* Effect.fail(denied())
                const state =
                    action._tag === "save" && action.published
                        ? "published"
                        : "draft"
                const source =
                    template === undefined
                        ? {
                              template_id: "blog.blank",
                              template_version: 1,
                              provenance: "builtin",
                          }
                        : {
                              template_id: `organization.blog.${template.id}`,
                              template_version: template.revision,
                              provenance: "organization",
                          }
                if (existing === undefined) {
                    if (
                        (action._tag === "save" && !action.is_new) ||
                        library.posts.length >= 100
                    )
                        return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`INSERT INTO blog_posts (id,domain_id,title,content,content_type,excerpt,seo_title,seo_description,editorial_state,template_source,created_by_user_id,updated_by_user_id,created_at,updated_at) VALUES (${action.id},${d},${fields.title},${fields.content},${fields.content_type},${fields.excerpt},${fields.seo_title},${fields.seo_description},${state},${JSON.stringify(source)}::jsonb,${actor},${actor},${now},${now})`
                    )
                } else {
                    if (action._tag === "from_template" || action.is_new) {
                        if (
                            existing.title !== fields.title ||
                            existing.content !== fields.content ||
                            existing.content_type !== fields.content_type ||
                            existing.excerpt !== fields.excerpt ||
                            existing.seo_title !== fields.seo_title ||
                            existing.seo_description !==
                                fields.seo_description ||
                            existing.editorial_state !== state
                        )
                            return yield* Effect.fail(denied())
                    } else
                        yield* tx.query(
                            sql`UPDATE blog_posts SET title=${fields.title},content=${fields.content},content_type=${fields.content_type},excerpt=${fields.excerpt},seo_title=${fields.seo_title},seo_description=${fields.seo_description},editorial_state=${state},updated_by_user_id=${actor},updated_at=${now} WHERE id=${action.id} AND domain_id=${d}`
                        )
                }
                if (action._tag === "save") {
                    const assignment = library.assignments.find(
                        (item) => item.blog_post_id === action.id
                    )
                    if (
                        library.assignments.some(
                            (item) =>
                                item.slug === action.slug &&
                                item.blog_post_id !== action.id
                        )
                    )
                        return yield* Effect.fail(denied())
                    const published_at = action.published
                        ? (assignment?.published_at ?? now)
                        : null
                    if (assignment === undefined) {
                        if (library.assignments.length >= 100)
                            return yield* Effect.fail(denied())
                        yield* tx.query(
                            sql`INSERT INTO publication_blog_posts (id,domain_id,subdomain_id,blog_post_id,slug,publication_state,published_at,is_featured,order_position,created_at,updated_at) VALUES (${randomUUID()},${d},${owner.subdomain_id},${action.id},${action.slug},${state},${published_at},false,${library.assignments.length},${now},${now})`
                        )
                    } else
                        yield* tx.query(
                            sql`UPDATE publication_blog_posts SET slug=${action.slug},publication_state=${state},published_at=${published_at},updated_at=${now} WHERE id=${assignment.id} AND domain_id=${d}`
                        )
                }
            }
            return yield* load_library(principal, subdomain_slug)
        })
    )
})

const make_repository = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize_blog: (...args: Parameters<typeof authorize_blog>) =>
            authorize_blog(...args).pipe(Effect.provideService(Sql, db)),
        load_library: (...args: Parameters<typeof load_library>) =>
            load_library(...args).pipe(Effect.provideService(Sql, db)),
        change_blog: (...args: Parameters<typeof change_blog>) =>
            change_blog(...args).pipe(Effect.provideService(Sql, db)),
    }
})

export class BlogRepository extends Context.Service<
    BlogRepository,
    Effect.Success<typeof make_repository>
>()("@urm/rpc/BlogRepository") {}
export const BlogRepositoryLive = Layer.effect(BlogRepository, make_repository)
