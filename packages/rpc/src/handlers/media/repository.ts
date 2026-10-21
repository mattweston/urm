import { MediaWriteError } from "@urm/domain/media"
import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/db/sql"
import { LibraryRecord, type MediaAction } from "@urm/domain/media"
export interface MediaPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = () =>
    new MediaWriteError({
        message: "Media operation unavailable or access denied",
    })
const Id = Schema.Struct({ id: Schema.String })
const authorize_media = Effect.fn("Media.authorize")(function* (
    principal: MediaPrincipal,
    domain_id: string,
    write = false
) {
    if (principal.domain_id !== domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write, "Media")
})
const load_library = Effect.fn("Media.load")(function* (
    principal: MediaPrincipal
) {
    yield* authorize_media(principal, principal.domain_id)
    const rows = yield* query_rows(
        Schema.Struct({ library: LibraryRecord }),
        sql`
        SELECT jsonb_build_object('id', ${principal.domain_id}::text,
            'images', (SELECT coalesce(jsonb_agg(jsonb_strip_nulls(to_jsonb(i) - 'domain_id' - 'created_at')), '[]') FROM (SELECT * FROM images WHERE domain_id=${principal.domain_id} ORDER BY updated_at DESC,id LIMIT 100) i),
            'videos', (SELECT coalesce(jsonb_agg(to_jsonb(v) - 'domain_id' - 'created_at'), '[]') FROM (SELECT * FROM videos WHERE domain_id=${principal.domain_id} ORDER BY order_position,id LIMIT 100) v),
            'tags', (SELECT coalesce(jsonb_agg(jsonb_strip_nulls(to_jsonb(t) - 'domain_id' - 'created_at')), '[]') FROM (SELECT * FROM tags WHERE domain_id=${principal.domain_id} ORDER BY updated_at DESC,id LIMIT 100) t),
            'entity_tags', (SELECT coalesce(jsonb_agg(to_jsonb(e) - 'domain_id' - 'created_at'), '[]') FROM (SELECT * FROM entity_tags WHERE domain_id=${principal.domain_id} AND entity_type='images' ORDER BY entity_id,id LIMIT 500) e)
        ) AS library`
    )
    const row = rows[0]
    if (row === undefined) return yield* Effect.fail(denied())
    return row.library
})
const change_media = Effect.fn("Media.change")(function* (
    principal: MediaPrincipal,
    action: MediaAction
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const d = principal.domain_id
            // Serialize edits in a workspace, including tag count checks and reorder batches.
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${d} FOR UPDATE`
            )
            yield* authorize_media(principal, principal.domain_id, true)
            const now = Date.now()
            const require_row = (
                table: "images" | "videos" | "tags" | "entity_tags",
                id: string
            ) =>
                query_rows(
                    Id,
                    sql`SELECT id FROM ${sql.identifier(table)} WHERE id=${id} AND domain_id=${d}`
                ).pipe(
                    Effect.flatMap((rows) =>
                        rows.length === 1 ? Effect.void : Effect.fail(denied())
                    )
                )
            switch (action._tag) {
                case "create_image": {
                    yield* tx.query(
                        sql`INSERT INTO images (id,domain_id,url,alt,text,width,height,category,order_position,created_at,updated_at) VALUES (${action.id},${d},${action.url},${action.alt},${action.text},${action.width},${action.height},${action.category},${action.order_position},${now},${now}) ON CONFLICT (id) DO NOTHING`
                    )
                    const same = yield* query_rows(
                        Id,
                        sql`SELECT id FROM images WHERE id=${action.id} AND domain_id=${d} AND url=${action.url} AND alt=${action.alt} AND text=${action.text} AND width IS NOT DISTINCT FROM ${action.width}::float8 AND height IS NOT DISTINCT FROM ${action.height}::float8 AND category IS NOT DISTINCT FROM ${action.category}::text AND order_position=${action.order_position}`
                    )
                    if (same.length !== 1) return yield* Effect.fail(denied())
                    break
                }
                case "update_image":
                    yield* require_row("images", action.id)
                    yield* tx.query(
                        sql`UPDATE images SET alt=${action.alt},text=${action.text},category=${action.category},updated_at=${now} WHERE id=${action.id} AND domain_id=${d}`
                    )
                    break
                case "delete_image": {
                    const links = yield* query_rows(
                        Id,
                        sql`SELECT id FROM entity_tags WHERE domain_id=${d} AND entity_type='images' AND entity_id=${action.id} LIMIT 51`
                    )
                    if (links.length > 50) return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`DELETE FROM entity_tags WHERE domain_id=${d} AND entity_type='images' AND entity_id=${action.id}`
                    )
                    yield* tx.query(
                        sql`DELETE FROM images WHERE id=${action.id} AND domain_id=${d}`
                    )
                    break
                }
                case "reorder_images":
                case "reorder_videos": {
                    const table =
                        action._tag === "reorder_images" ? "images" : "videos"
                    if (
                        new Set(action.positions.map((p) => p.id)).size !==
                        action.positions.length
                    )
                        return yield* Effect.fail(denied())
                    for (const position of action.positions)
                        yield* require_row(table, position.id)
                    for (const position of action.positions)
                        yield* tx.query(
                            sql`UPDATE ${sql.identifier(table)} SET order_position=${position.order_position},updated_at=${now} WHERE domain_id=${d} AND id=${position.id}`
                        )
                    break
                }
                case "create_video": {
                    yield* tx.query(
                        sql`INSERT INTO videos (id,domain_id,slug,title,embed_url,thumbnail_src,youtube_id,order_position,created_at,updated_at) VALUES (${action.id},${d},${action.slug},${action.title},${action.embed_url},${action.thumbnail_src},${action.youtube_id},${action.order_position},${now},${now}) ON CONFLICT (id) DO NOTHING`
                    )
                    const same = yield* query_rows(
                        Id,
                        sql`SELECT id FROM videos WHERE id=${action.id} AND domain_id=${d} AND slug=${action.slug} AND title=${action.title} AND embed_url=${action.embed_url} AND thumbnail_src=${action.thumbnail_src} AND youtube_id IS NOT DISTINCT FROM ${action.youtube_id}::text AND order_position=${action.order_position}`
                    )
                    if (same.length !== 1) return yield* Effect.fail(denied())
                    break
                }
                case "update_video":
                    yield* require_row("videos", action.id)
                    yield* tx.query(
                        sql`UPDATE videos SET slug=${action.slug},title=${action.title},embed_url=${action.embed_url},thumbnail_src=${action.thumbnail_src},youtube_id=${action.youtube_id},updated_at=${now} WHERE id=${action.id} AND domain_id=${d}`
                    )
                    break
                case "delete_video":
                    yield* tx.query(
                        sql`DELETE FROM videos WHERE id=${action.id} AND domain_id=${d}`
                    )
                    break
                case "add_tag":
                case "create_tag": {
                    yield* require_row("images", action.image_id)
                    let tag_id: string
                    if (action._tag === "create_tag") {
                        const rows = yield* query_rows(
                            Id,
                            sql`INSERT INTO tags (id,domain_id,name,color,created_at,updated_at) VALUES (${randomUUID()},${d},${action.name},${action.color},${now},${now}) ON CONFLICT (domain_id,name) DO UPDATE SET name=EXCLUDED.name RETURNING id`
                        )
                        if (rows[0] === undefined)
                            return yield* Effect.fail(denied())
                        tag_id = rows[0].id
                    } else {
                        tag_id = action.tag_id
                        yield* require_row("tags", tag_id)
                    }
                    const links = yield* query_rows(
                        Schema.Struct({
                            id: Schema.String,
                            tag_id: Schema.String,
                        }),
                        sql`SELECT id,tag_id FROM entity_tags WHERE domain_id=${d} AND entity_type='images' AND entity_id=${action.image_id} LIMIT 51`
                    )
                    if (!links.some((link) => link.tag_id === tag_id)) {
                        if (links.length >= 50)
                            return yield* Effect.fail(denied())
                        yield* tx.query(
                            sql`INSERT INTO entity_tags (id,domain_id,entity_type,entity_id,tag_id,created_at,updated_at) VALUES (${randomUUID()},${d},'images',${action.image_id},${tag_id},${now},${now})`
                        )
                    }
                    break
                }
                case "remove_tag":
                    yield* tx.query(
                        sql`DELETE FROM entity_tags WHERE id=${action.id} AND domain_id=${d} AND entity_type='images'`
                    )
                    break
            }
            return yield* load_library(principal)
        })
    )
})

const make_repository = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize_media: (...args: Parameters<typeof authorize_media>) =>
            authorize_media(...args).pipe(Effect.provideService(Sql, db)),
        load_library: (...args: Parameters<typeof load_library>) =>
            load_library(...args).pipe(Effect.provideService(Sql, db)),
        change_media: (...args: Parameters<typeof change_media>) =>
            change_media(...args).pipe(Effect.provideService(Sql, db)),
    }
})

export class MediaRepository extends Context.Service<
    MediaRepository,
    Effect.Success<typeof make_repository>
>()("@urm/rpc/MediaRepository") {}
export const MediaRepositoryLive = Layer.effect(
    MediaRepository,
    make_repository
)
