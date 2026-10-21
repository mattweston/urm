/**
 * # `getContact`
 *
 * Authentication cookie extraction and verification for contact sessions.
 */
import { HttpServerRequest } from "effect/http"
import { Effect, Redacted } from "effect"
import { AuthConfig } from "@urm/env/server"
import { parseCookies } from "./parse-cookies.ts"
import { verifyCookie } from "./verify-cookie.ts"

// Yields undefined rather than failing, so a missing or forged cookie makes
// the request anonymous instead of an error. Callers that need authentication
// must check the result — this function never enforces it.
export function getContactID(
    request: HttpServerRequest.HttpServerRequest
): Effect.Effect<string | undefined, never, AuthConfig> {
    return Effect.gen(function* () {
        const config = yield* AuthConfig
        const cookieHeader = request.headers["cookie"]
        if (!cookieHeader) return undefined

        const cookies = parseCookies(cookieHeader)
        const authCookie = cookies.auth
        if (!authCookie) return undefined

        return verifyCookie(authCookie, Redacted.value(config.authSecret))
    })
}
