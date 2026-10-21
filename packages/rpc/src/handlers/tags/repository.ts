import { upsert_directory_tag } from "./directory.ts"
import { TagsWriteError } from "@urm/domain/tags"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/db/sql"
import { TagCatalogRecord, type TagAction } from "@urm/domain/tags"

export interface TagsPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = () =>
    new TagsWriteError({
        message: "Tag operation unavailable or access denied",
    })
const Id = Schema.Struct({ id: Schema.String })
const authorize_tags = Effect.fn("Tags.authorize")(function* (
    principal: TagsPrincipal,
    domain_id: string,
    write = false
) {
    if (principal.domain_id !== domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write, "Tags")
})
const load_catalog = Effect.fn("Tags.load")(function* (
    principal: TagsPrincipal
) {
    yield* authorize_tags(principal, principal.domain_id)
    const rows = yield* query_rows(
        Schema.Struct({ catalog: TagCatalogRecord }),
        sql`
        SELECT jsonb_build_object('id', ${principal.domain_id}::text,
            'tags', (SELECT coalesce(jsonb_agg(jsonb_strip_nulls(to_jsonb(t) - 'domain_id' - 'created_at')), '[]') FROM (SELECT * FROM tags WHERE domain_id=${principal.domain_id} ORDER BY updated_at DESC,id LIMIT 100) t),
            'entity_tags', (SELECT coalesce(jsonb_agg(to_jsonb(e) - 'domain_id' - 'created_at'), '[]') FROM (SELECT * FROM entity_tags WHERE domain_id=${principal.domain_id} ORDER BY updated_at DESC,id LIMIT 500) e)
        ) AS catalog`
    )
    if (rows[0] === undefined) return yield* Effect.fail(denied())
    return rows[0].catalog
})

const sync_directory = Effect.fn("Tags.syncDirectory")(function* (
    domain_id: string
) {
    for (const [role, color] of [
        ["owner", "var(--primary)"],
        ["admin", "var(--chart-1)"],
        ["sysadmin", "var(--chart-3)"],
        ["member", "var(--chart-2)"],
    ]) {
        if (role === undefined || color === undefined) continue
        yield* upsert_directory_tag(
            domain_id,
            `role:${role}`,
            "role",
            `@${role}`,
            color,
            `Everyone with the ${role} workspace role`
        )
    }
    const people = yield* query_rows(
        Schema.Struct({
            id: Schema.String,
            name: Schema.NullOr(Schema.String),
            email: Schema.NullOr(Schema.String),
            role: Schema.String,
        }),
        sql`SELECT u.id,u.name,u.email,m.role FROM organization_members m
        JOIN domains d ON d.organization_id=m.organization_id JOIN users u ON u.id=m.user_id
        WHERE d.id=${domain_id} AND m.status='active' AND m.deleted_at IS NULL AND u.deleted_at IS NULL
        ORDER BY m.created_at,m.id LIMIT 100`
    )
    for (const person of people)
        yield* upsert_directory_tag(
            domain_id,
            `user:${person.id}`,
            "person",
            `@${person.name ?? person.email ?? person.id}`,
            "var(--chart-4)",
            [person.role, person.email]
                .filter((value) => value !== null)
                .join(" · ")
        )
})

const change_tags = Effect.fn("Tags.change")(function* (
    principal: TagsPrincipal,
    action: TagAction
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const d = principal.domain_id
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${d} FOR UPDATE`
            )
            yield* authorize_tags(
                principal,
                d,
                action._tag !== "sync_directory"
            )
            const now = Date.now()
            switch (action._tag) {
                case "sync_directory":
                    yield* sync_directory(d)
                    break
                case "create": {
                    yield* tx.query(sql`INSERT INTO tags (id,domain_id,name,color,description,kind,created_at,updated_at)
                    VALUES (${action.id},${d},${action.name},${action.color},${action.description},'custom',${now},${now}) ON CONFLICT(id) DO NOTHING`)
                    const same = yield* query_rows(
                        Id,
                        sql`SELECT id FROM tags WHERE id=${action.id} AND domain_id=${d} AND name=${action.name} AND color=${action.color} AND description IS NOT DISTINCT FROM ${action.description}::text AND kind='custom'`
                    )
                    if (same.length !== 1) return yield* Effect.fail(denied())
                    break
                }
                case "update":
                case "delete": {
                    const rows = yield* query_rows(
                        Schema.Struct({
                            id: Schema.String,
                            kind: Schema.NullOr(Schema.String),
                        }),
                        sql`SELECT id,kind FROM tags WHERE id=${action.id} AND domain_id=${d}`
                    )
                    const tag = rows[0]
                    if (
                        tag === undefined ||
                        tag.kind === "role" ||
                        tag.kind === "person"
                    )
                        return yield* Effect.fail(denied())
                    if (action._tag === "update")
                        yield* tx.query(
                            sql`UPDATE tags SET name=${action.name},color=${action.color},description=${action.description},updated_at=${now} WHERE id=${action.id} AND domain_id=${d}`
                        )
                    else {
                        const links = yield* query_rows(
                            Id,
                            sql`SELECT id FROM entity_tags WHERE domain_id=${d} AND tag_id=${action.id} LIMIT 501`
                        )
                        if (links.length > 500)
                            return yield* Effect.fail(denied())
                        yield* tx.query(
                            sql`DELETE FROM entity_tags WHERE domain_id=${d} AND tag_id=${action.id}`
                        )
                        yield* tx.query(
                            sql`DELETE FROM tags WHERE id=${action.id} AND domain_id=${d}`
                        )
                    }
                    break
                }
            }
            return yield* load_catalog(principal)
        })
    )
})

const make_repository = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize_tags: (...args: Parameters<typeof authorize_tags>) =>
            authorize_tags(...args).pipe(Effect.provideService(Sql, db)),
        load_catalog: (...args: Parameters<typeof load_catalog>) =>
            load_catalog(...args).pipe(Effect.provideService(Sql, db)),
        change_tags: (...args: Parameters<typeof change_tags>) =>
            change_tags(...args).pipe(Effect.provideService(Sql, db)),
    }
})

export class TagsRepository extends Context.Service<
    TagsRepository,
    Effect.Success<typeof make_repository>
>()("@urm/rpc/TagsRepository") {}
export const TagsRepositoryLive = Layer.effect(TagsRepository, make_repository)
