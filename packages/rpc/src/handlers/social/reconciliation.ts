import { sql } from "drizzle-orm"
import { Effect, Schema } from "effect"
import { query_rows } from "@urm/db/sql"
import { ZernioProvider, ZernioProviderError } from "./provider.ts"
import { SocialStore } from "./store.ts"

const Candidate = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    provider_post_id: Schema.NullOr(Schema.String),
    provider_profile_id: Schema.String,
    test_mode: Schema.Boolean,
})

const provider_status = (status: string) =>
    status === "publishing"
        ? "submitting"
        : status === "draft" ||
            status === "scheduled" ||
            status === "published" ||
            status === "partial" ||
            status === "failed" ||
            status === "cancelled"
          ? status
          : "submitting"

const reconcile_candidate = Effect.fn("Social.reconcileCandidate")(function* (
    candidate: typeof Candidate.Type
) {
    const provider = yield* ZernioProvider
    const store = yield* SocialStore
    if (candidate.provider_post_id !== null) {
        const current = yield* provider
            .get_post(candidate.provider_post_id)
            .pipe(
                Effect.catch((error) =>
                    error instanceof ZernioProviderError && error.status === 404
                        ? Effect.succeed(null)
                        : Effect.fail(error)
                )
            )
        if (current === null) {
            yield* store.mark_provider_missing(
                candidate.domain_id,
                candidate.id,
                candidate.provider_post_id
            )
            return
        }
        if (candidate.test_mode && current.status === "draft") {
            yield* query_rows(
                Schema.Struct({ id: Schema.String }),
                sql`UPDATE social_posts SET updated_at=${Date.now()} WHERE id=${candidate.id} AND domain_id=${candidate.domain_id} AND status='submitting' RETURNING id`
            )
            return
        }
        if (candidate.test_mode) {
            const status = provider_status(current.status)
            yield* store.record_draft_publication(
                candidate.domain_id,
                candidate.id,
                current._id,
                status === "draft" ? "submitting" : status
            )
            return
        }
        yield* store.refresh_provider_status(
            candidate.domain_id,
            candidate.id,
            current._id,
            provider_status(current.status)
        )
        return
    }
    const found = yield* provider.find_post_by_local_id(
        candidate.provider_profile_id,
        candidate.id
    )
    if (found !== null) {
        yield* store.record_provider_result(
            candidate.domain_id,
            candidate.id,
            found._id,
            provider_status(found.status)
        )
        return
    }
    yield* query_rows(
        Schema.Struct({ id: Schema.String }),
        sql`UPDATE social_posts SET updated_at=${Date.now()} WHERE id=${candidate.id} AND domain_id=${candidate.domain_id} AND status='submitting' AND provider_post_id IS NULL RETURNING id`
    )
})

export const reconcile_social_posts = Effect.fn("Social.reconcileDuePosts")(
    function* () {
        const now = Date.now()
        const candidates = yield* query_rows(
            Candidate,
            sql`SELECT p.id,p.domain_id,p.provider_post_id,sp.provider_profile_id,p.test_mode FROM social_posts p JOIN social_provider_profiles sp ON sp.domain_id=p.domain_id WHERE p.updated_at<${now - 60_000} AND (p.status='submitting' OR (p.status='scheduled' AND p.scheduled_for<=${now})) AND NOT (p.status='submitting' AND p.provider_post_id IS NOT NULL AND EXISTS (SELECT 1 FROM social_post_edits e WHERE e.domain_id=p.domain_id AND e.post_id=p.id AND e.test_mode=true)) ORDER BY p.updated_at,p.id LIMIT 50`
        )
        yield* Effect.forEach(
            candidates,
            (candidate) =>
                reconcile_candidate(candidate).pipe(
                    Effect.catch((error) =>
                        Effect.logWarning(
                            `Social reconciliation failed for ${candidate.id}`,
                            error
                        )
                    )
                ),
            { concurrency: 2, discard: true }
        )
        return candidates.length
    }
)
