import { type AuthPersistence } from "@urm/auth/auth-persistence"
import { authRateLimitKey, checkAuthRateLimit } from "@urm/auth/rate-limiter"
import { Effect } from "effect"

const WEATHER_LIMIT = 60
const WEATHER_WINDOW_SECONDS = 60

export const allowWeatherRequest = (
    route: string,
    principal: string
): Effect.Effect<boolean, never, AuthPersistence> =>
    checkAuthRateLimit({
        route,
        key: authRateLimitKey(["weather", route, principal]),
        limit: WEATHER_LIMIT,
        window_seconds: WEATHER_WINDOW_SECONDS,
        block_seconds: WEATHER_WINDOW_SECONDS,
    }).pipe(
        Effect.map((decision) => decision.allowed),
        Effect.catch(() => Effect.succeed(false))
    )
