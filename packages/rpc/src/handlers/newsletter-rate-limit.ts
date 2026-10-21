import { type AuthPersistence } from "@urm/auth/auth-persistence"
import { authRateLimitKey, checkAuthRateLimit } from "@urm/auth/rate-limiter"
import { Effect } from "effect"

const NEWSLETTER_SEND_LIMIT = 3
const NEWSLETTER_SEND_WINDOW_SECONDS = 60 * 60

export const allowNewsletterSend = (
    route: string,
    scope: string,
    contact_id: string
): Effect.Effect<boolean, never, AuthPersistence> =>
    checkAuthRateLimit({
        route,
        key: authRateLimitKey(["newsletter", scope, contact_id]),
        limit: NEWSLETTER_SEND_LIMIT,
        window_seconds: NEWSLETTER_SEND_WINDOW_SECONDS,
        block_seconds: NEWSLETTER_SEND_WINDOW_SECONDS,
    }).pipe(
        Effect.map((decision) => decision.allowed),
        Effect.catch(() => Effect.succeed(false))
    )
