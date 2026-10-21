import { Context, Effect, Layer, Schema } from "effect"
import { sql } from "drizzle-orm"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/db/sql"
import {
    IssueCatalogRecord,
    IssueActions,
    IssueWriteError,
} from "@urm/domain/issues"
export interface IssuesPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = () =>
    new IssueWriteError({
        message: "Issue or tag unavailable, changed or access denied.",
    })
const authorize_issues = Effect.fn("Issues.authorize")(function* (
    principal: IssuesPrincipal,
    domain_id: string,
    write = false
) {
    if (domain_id !== principal.domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write, "Issues")
})
const load_catalog = Effect.fn("Issues.load")(function* (
    principal: IssuesPrincipal
) {
    yield* authorize_issues(principal, principal.domain_id)
    const d = principal.domain_id
    const rows = yield* query_rows(
        Schema.Struct({ catalog: IssueCatalogRecord }),
        sql`
        SELECT jsonb_build_object('id', ${d}::text,
          'issues', (SELECT coalesce(jsonb_agg(jsonb_strip_nulls(to_jsonb(i) - 'domain_id' - 'created_at') || jsonb_build_object('labels',
            (SELECT coalesce(jsonb_agg(e.tag_id ORDER BY e.tag_id), '[]')::text FROM entity_tags e JOIN tags t ON t.id=e.tag_id AND t.domain_id=e.domain_id AND t.deleted_at IS NULL
             WHERE e.domain_id=${d} AND e.entity_type='issue' AND e.entity_id=i.id))), '[]') FROM (SELECT * FROM issues WHERE domain_id=${d} ORDER BY order_position,id LIMIT 51) i),
          'tags', (SELECT coalesce(jsonb_agg(jsonb_strip_nulls(to_jsonb(t) - 'domain_id' - 'created_at')), '[]') FROM (SELECT * FROM tags WHERE domain_id=${d} AND deleted_at IS NULL ORDER BY name,id LIMIT 101) t)
        ) AS catalog`
    )
    const catalog = rows[0]?.catalog
    if (!catalog) return yield* Effect.fail(denied())
    if (catalog.issues.length > 50 || catalog.tags.length > 100)
        return yield* Effect.fail(
            new IssueWriteError({
                message:
                    "This workspace exceeds the supported Issues catalog size (50 issues, 100 tags).",
            })
        )
    return catalog
})
const change_issues = Effect.fn("Issues.change")(function* (
    principal: IssuesPrincipal,
    input: typeof IssueActions.Type
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const d = principal.domain_id
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${d} FOR UPDATE`
            )
            yield* authorize_issues(principal, d, true)
            const actions =
                yield* Schema.decodeUnknownEffect(IssueActions)(input)
            const current = yield* load_catalog(principal)
            const ids = new Set(current.issues.map((issue) => issue.id))
            const now = Date.now()
            for (const action of actions) {
                if (action._tag !== "create" && !ids.has(action.id))
                    return yield* Effect.fail(denied())
                if (action._tag === "delete") {
                    yield* tx.query(
                        sql`DELETE FROM entity_tags WHERE domain_id=${d} AND entity_type='issue' AND entity_id=${action.id}`
                    )
                    yield* tx.query(
                        sql`DELETE FROM issues WHERE domain_id=${d} AND id=${action.id}`
                    )
                    ids.delete(action.id)
                    continue
                }
                if (
                    action.tag_ids.some(
                        (id) => !current.tags.some((tag) => tag.id === id)
                    )
                )
                    return yield* Effect.fail(denied())
                if (action._tag === "create") {
                    if (ids.size >= 50)
                        return yield* Effect.fail(
                            new IssueWriteError({
                                message:
                                    "This workspace supports up to 50 issues.",
                            })
                        )
                    yield* tx.query(
                        sql`INSERT INTO issues (id,domain_id,title,description,content,status,priority,assignee_id,order_position,created_at,updated_at) VALUES (${action.id},${d},${action.title},${action.description},${action.content},${action.status},${action.priority},${action.assignee_id},${action.order_position},${now},${now})`
                    )
                    ids.add(action.id)
                } else {
                    yield* tx.query(
                        sql`UPDATE issues SET title=${action.title},description=${action.description},content=${action.content},status=${action.status},priority=${action.priority},assignee_id=${action.assignee_id},order_position=${action.order_position},updated_at=${now} WHERE domain_id=${d} AND id=${action.id}`
                    )
                }
                yield* tx.query(
                    sql`DELETE FROM entity_tags WHERE domain_id=${d} AND entity_type='issue' AND entity_id=${action.id}`
                )
                for (const tag_id of new Set(action.tag_ids))
                    yield* tx.query(
                        sql`INSERT INTO entity_tags (id,domain_id,entity_type,entity_id,tag_id,created_at,updated_at) VALUES (${crypto.randomUUID()},${d},'issue',${action.id},${tag_id},${now},${now})`
                    )
            }
            return yield* load_catalog(principal)
        })
    )
})
const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize_issues: (...args: Parameters<typeof authorize_issues>) =>
            authorize_issues(...args).pipe(Effect.provideService(Sql, db)),
        load_catalog: (...args: Parameters<typeof load_catalog>) =>
            load_catalog(...args).pipe(Effect.provideService(Sql, db)),
        change_issues: (...args: Parameters<typeof change_issues>) =>
            change_issues(...args).pipe(Effect.provideService(Sql, db)),
    }
})
export class IssuesLibraryRepository extends Context.Service<
    IssuesLibraryRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/IssuesLibraryRepository") {}
export const IssuesLibraryRepositoryLive = Layer.effect(
    IssuesLibraryRepository,
    make
)
