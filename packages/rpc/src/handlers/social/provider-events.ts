import { sql } from "drizzle-orm"
import { Effect, Schema } from "effect"
import { Sql, query_rows } from "@urm/database/sql"
import { ZernioProvider, ZernioProviderError } from "./provider.ts"

const PendingEvent = Schema.Struct({
    id: Schema.String,
    provider_post_id: Schema.String,
})
const Post = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    provider_post_id: Schema.String,
    updated_at: Schema.Number,
})

export const record_social_provider_event = Effect.fn(
    "Social.recordProviderEvent"
)(function* (event: {
    readonly id: string
    readonly event_type: string
    readonly provider_post_id: string
    readonly occurred_at: number
}) {
    const db = yield* Sql
    yield* db.query(sql`INSERT INTO social_provider_events
        (id,event_type,provider_post_id,occurred_at,received_at)
        VALUES (${event.id},${event.event_type},${event.provider_post_id},${event.occurred_at},${Date.now()})
        ON CONFLICT (id) DO NOTHING`)
})

const reconcile_event = Effect.fn("Social.reconcileProviderEvent")(
    function* (event: typeof PendingEvent.Type) {
        const db = yield* Sql
        const posts = yield* query_rows(
            Post,
            sql`SELECT id,domain_id,provider_post_id,updated_at::float8 AS updated_at FROM social_posts
                WHERE provider_post_id=${event.provider_post_id} LIMIT 1`
        )
        const post = posts[0]
        const current = post === undefined ? null : yield* (
            yield* ZernioProvider
        ).get_post(post.provider_post_id).pipe(
            Effect.catch((error) =>
                error instanceof ZernioProviderError && error.status === 404
                    ? Effect.succeed(null)
                    : Effect.fail(error)
            )
        )
        return yield* db.transaction(
            Effect.gen(function* () {
                const tx = yield* Sql
                const locked = yield* query_rows(
                    PendingEvent,
                    sql`SELECT id,provider_post_id FROM social_provider_events
                        WHERE id=${event.id} AND applied_at IS NULL
                        FOR UPDATE SKIP LOCKED`
                )
                if (locked.length !== 1) return false
                if (post !== undefined) {
                    const status = current === null
                        ? "failed"
                        : current.status === "publishing"
                          ? "submitting"
                          : current.status
                    const now = Date.now()
                    yield* tx.query(sql`UPDATE social_posts p SET
                        status=CASE
                            WHEN p.test_mode AND ${status}='draft' THEN p.status
                            ELSE ${status} END,
                        test_mode=CASE
                            WHEN p.test_mode AND ${status}<>'draft' THEN false
                            ELSE p.test_mode END,
                        error_message=CASE
                            WHEN ${current === null} THEN 'Provider post not found'
                            ELSE NULL END,
                        updated_at=${now}
                        WHERE p.id=${post.id} AND p.domain_id=${post.domain_id}
                            AND p.provider_post_id=${event.provider_post_id}
                            AND p.updated_at=${post.updated_at}
                            AND p.status<>'cancelled'
                            AND (${current !== null} OR p.status IN ('submitting','scheduled'))
                            AND NOT EXISTS (SELECT 1 FROM social_post_edits e
                                WHERE e.domain_id=p.domain_id AND e.post_id=p.id
                                    AND e.test_mode=true)`)
                }
                yield* tx.query(sql`UPDATE social_provider_events
                    SET applied_at=${Date.now()} WHERE id=${event.id}`)
                return true
            })
        )
    }
)

export const reconcile_social_provider_events = Effect.fn(
    "Social.reconcileProviderEvents"
)(function* () {
    const pending = yield* query_rows(
        PendingEvent,
        sql`SELECT id,provider_post_id FROM social_provider_events
            WHERE applied_at IS NULL ORDER BY received_at,id LIMIT 50`
    )
    let applied = 0
    for (const event of pending) {
        const did_apply = yield* reconcile_event(event).pipe(
            Effect.catch((error) =>
                Effect.logWarning("Social provider event reconciliation failed", error)
                    .pipe(Effect.as(false))
            )
        )
        if (did_apply) applied++
    }
    return applied
})
