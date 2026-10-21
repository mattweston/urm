import { BookmarksWriteError } from "@urm/domain/bookmarks"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/database/sql"
import { Bookmark, type BookmarkAction } from "@urm/domain/bookmarks"

export interface BookmarksPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = () =>
    new BookmarksWriteError({
        message: "Bookmark operation unavailable or access denied",
    })
const authorize_bookmarks = Effect.fn("Bookmarks.authorize")(function* (
    principal: BookmarksPrincipal,
    domain_id: string,
    write = false
) {
    if (principal.domain_id !== domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write, "Documents")
})
const load_catalog = Effect.fn("Bookmarks.load")(function* (
    principal: BookmarksPrincipal
) {
    yield* authorize_bookmarks(principal, principal.domain_id)
    const bookmarks = yield* query_rows(
        Bookmark,
        sql`SELECT id,title,href,tags,updated_at::float8 AS updated_at FROM bookmarks WHERE domain_id=${principal.domain_id} ORDER BY title,id LIMIT 200`
    )
    return { id: principal.domain_id, bookmarks }
})
const Id = Schema.Struct({ id: Schema.String })
const change_bookmarks = Effect.fn("Bookmarks.change")(function* (
    principal: BookmarksPrincipal,
    action: BookmarkAction
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const d = principal.domain_id
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${d} FOR UPDATE`
            )
            yield* authorize_bookmarks(principal, d, true)
            const now = Date.now()
            if (action._tag === "create") {
                yield* tx.query(sql`INSERT INTO bookmarks (id,domain_id,title,href,tags,created_at,updated_at)
                VALUES (${action.id},${d},${action.title},${action.href},ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(action.tags)}::jsonb)),${now},${now}) ON CONFLICT(id) DO NOTHING`)
            } else {
                const rows = yield* query_rows(
                    Id,
                    sql`SELECT id FROM bookmarks WHERE id=${action.id} AND domain_id=${d}`
                )
                if (rows.length !== 1) return yield* Effect.fail(denied())
                if (action._tag === "update")
                    yield* tx.query(
                        sql`UPDATE bookmarks SET title=${action.title},href=${action.href},tags=ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(action.tags)}::jsonb)),updated_at=${now} WHERE id=${action.id} AND domain_id=${d}`
                    )
                else
                    yield* tx.query(
                        sql`DELETE FROM bookmarks WHERE id=${action.id} AND domain_id=${d}`
                    )
            }
            if (action._tag === "create") {
                const same = yield* query_rows(
                    Id,
                    sql`SELECT id FROM bookmarks WHERE id=${action.id} AND domain_id=${d} AND title=${action.title} AND href=${action.href} AND tags=ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(action.tags)}::jsonb))`
                )
                if (same.length !== 1) return yield* Effect.fail(denied())
            }
            return yield* load_catalog(principal)
        })
    )
})

const make_repository = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize_bookmarks: (
            ...args: Parameters<typeof authorize_bookmarks>
        ) => authorize_bookmarks(...args).pipe(Effect.provideService(Sql, db)),
        load_catalog: (...args: Parameters<typeof load_catalog>) =>
            load_catalog(...args).pipe(Effect.provideService(Sql, db)),
        change_bookmarks: (...args: Parameters<typeof change_bookmarks>) =>
            change_bookmarks(...args).pipe(Effect.provideService(Sql, db)),
    }
})

export class BookmarksRepository extends Context.Service<
    BookmarksRepository,
    Effect.Success<typeof make_repository>
>()("@urm/rpc/BookmarksRepository") {}
export const BookmarksRepositoryLive = Layer.effect(
    BookmarksRepository,
    make_repository
)
