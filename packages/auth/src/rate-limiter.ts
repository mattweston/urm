/**
 * # Rate Limiter
 *
 * Database-backed fixed-window counter, so limits hold across processes.
 */
import { createHash } from "node:crypto"
import { Duration, Effect, Metric } from "effect"
import { AuthPersistence } from "./auth-persistence.ts"

export type AuthRateLimitDecision =
    | Readonly<{ allowed: true }>
    | Readonly<{
          allowed: false
          retry_after_seconds: number
      }>

export type AuthRateLimitInput = Readonly<{
    route: string
    key: string
    limit: number
    window_seconds: number
    block_seconds: number
}>

// Hashing keeps identifiers out of the bucket table — an email becomes opaque
// hex rather than a list of who has been trying to log in. Parts are joined
// with ":" before hashing, so ["a:b", "c"] and ["a", "b:c"] collide; keep
// separators out of the parts or put the variable-length one last.
export const authRateLimitKey = (parts: ReadonlyArray<string>): string =>
    createHash("sha256").update(parts.join(":"), "utf8").digest("hex")

// Aligned to the epoch rather than to first use, so every process computes the
// same bucket for a request without coordinating. Fixed windows reset rather
// than slide, which allows a double-limit burst across a boundary —
// block_seconds is what contains that, so keep it longer than window_seconds.
export const authRateLimitWindowStart = (
    now: number,
    window_seconds: number
): number => {
    const windowMs = window_seconds * 1000
    return Math.floor(now / windowMs) * windowMs
}

// Floors at 1 so a sub-second remainder never becomes Retry-After: 0, which
// would invite an immediate retry.
const retryAfterSeconds = (blocked_until: number, now: number): number =>
    Math.max(1, Math.ceil((blocked_until - now) / 1000))

const rateLimitCheckDuration = Metric.timer("auth_rate_limit_check_duration_ms")

export const checkAuthRateLimit = (input: AuthRateLimitInput) =>
    Effect.withLogSpan(
        Effect.withSpan(
            Effect.gen(function* () {
                yield* Effect.annotateLogs({
                    auth_route: input.route,
                    rate_limit_key_hash: input.key,
                })(Effect.void)
                yield* Effect.annotateSpans({
                    auth_route: input.route,
                    rate_limit_key_hash: input.key,
                })(Effect.void)
                const persistence = yield* AuthPersistence
                const start = Date.now()
                const now = Date.now()
                const window_start = authRateLimitWindowStart(
                    now,
                    input.window_seconds
                )
                const bucket = yield* persistence.findRateLimitBucket(
                    input.key,
                    input.route,
                    window_start
                )

                if (
                    bucket?.blocked_until !== null &&
                    bucket?.blocked_until !== undefined &&
                    bucket.blocked_until > now
                ) {
                    yield* Metric.update(
                        rateLimitCheckDuration,
                        Duration.millis(Date.now() - start)
                    )
                    yield* persistence
                        .recordRateLimitDenied(
                            input.route,
                            retryAfterSeconds(bucket.blocked_until, now)
                        )
                        .pipe(Effect.catch(() => Effect.void))
                    return {
                        allowed: false,
                        retry_after_seconds: retryAfterSeconds(
                            bucket.blocked_until,
                            now
                        ),
                    } satisfies AuthRateLimitDecision
                }

                if (bucket === undefined) {
                    yield* persistence.createRateLimitBucket({
                        key: input.key,
                        route: input.route,
                        window_start,
                        window_seconds: input.window_seconds,
                        now,
                    })

                    yield* Metric.update(
                        rateLimitCheckDuration,
                        Duration.millis(Date.now() - start)
                    )
                    return { allowed: true } satisfies AuthRateLimitDecision
                }

                const nextCount = bucket.count + 1
                const blockedUntil =
                    nextCount > input.limit
                        ? now + input.block_seconds * 1000
                        : null

                yield* persistence.updateRateLimitBucket(
                    bucket.id,
                    nextCount,
                    blockedUntil ?? undefined,
                    now
                )

                yield* Metric.update(
                    rateLimitCheckDuration,
                    Duration.millis(Date.now() - start)
                )

                if (blockedUntil !== null) {
                    yield* persistence
                        .recordRateLimitDenied(
                            input.route,
                            retryAfterSeconds(blockedUntil, now)
                        )
                        .pipe(Effect.catch(() => Effect.void))
                    return {
                        allowed: false,
                        retry_after_seconds: retryAfterSeconds(
                            blockedUntil,
                            now
                        ),
                    } satisfies AuthRateLimitDecision
                }

                return { allowed: true } satisfies AuthRateLimitDecision
            }),
            "auth.rate_limit.check"
        ),
        "auth.rate_limit.check"
    )
