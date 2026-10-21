/**
 * # OAuth Callback Handlers
 *
 * Login-url, session, and logout endpoints. The Google authorize/callback pair
 * lives in ./google-handlers.ts.
 */
import { HttpServerRequest, HttpServerResponse } from "effect/http"
import { Effect } from "effect"
import { AuthConfig, ServerConfig } from "@urm/env/server"
import { Redacted } from "effect"
import {
    AUTH_COOKIE_OPTS,
    cookieHeader,
    parseCookies,
    signCookie,
    verifyCookie,
} from "../cookies/index.ts"
import { oauthDestinationFromUnknown } from "./destinations.ts"

// Server-only file: import cookie functions only here, not exported from main
// This keeps crypto module from being bundled into browser
// async function getCookieUtils() {
//     return import("../cookies/index.ts")
// }

const COOKIE_CLEAR_BASE = "Path=/; SameSite=Lax; Max-Age=0"
function cookie_clear_with_domain(_domain: string): string {
    return COOKIE_CLEAR_BASE
}

export const handleLoginUrl = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const config = yield* ServerConfig
    const requestUrl = new URL(
        request.url,
        `http://${request.headers["host"] ?? "localhost"}`
    )
    const destination = oauthDestinationFromUnknown(
        requestUrl.searchParams.get("destination")
    )

    if (destination === undefined) {
        return yield* HttpServerResponse.json(
            { error: "Invalid OAuth destination" },
            { status: 400 }
        )
    }

    const url = new URL("/auth/google/authorize", config.apiUrl)
    url.searchParams.set("destination", destination)

    return yield* HttpServerResponse.json({ url: url.toString() })
})

export const handleLogout = Effect.gen(function* () {
    yield* HttpServerRequest.HttpServerRequest
    const config = yield* ServerConfig
    const clear_opts = cookie_clear_with_domain(config.cookieDomain)
    const clear_auth = `auth=; ${clear_opts}`
    const location = `${config.appUrl}/auth/login`

    return HttpServerResponse.empty({
        status: 302,
        headers: {
            Location: location,
            "Set-Cookie": clear_auth,
        } as unknown as Record<string, string>,
    })
})

// The only caller (handleSession) always passes email: undefined, because email
// is deliberately not stored in the auth cookie. So the ADMIN_EMAILS branch can
// never match there and only ADMIN_CONTACT_IDS grants admin in practice.
function roleFromEnv(
    email: string | undefined,
    contact_id: string
): "admin" | "member" {
    const admin_emails = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    if (email && admin_emails.includes(email.toLowerCase())) return "admin"
    const admin_ids = (process.env.ADMIN_CONTACT_IDS ?? "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
    if (admin_ids.includes(contact_id)) return "admin"
    return "member"
}

function sessionJson(
    body: {
        contactID: string | null
        email: null
        role: "admin" | "member" | null
    },
    extra?: { headers?: Record<string, string> }
) {
    return HttpServerResponse.json(body, { status: 200, ...extra })
}

export const handleSession = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const authConfig = yield* AuthConfig
    const secret = Redacted.value(authConfig.authSecret)
    const cookie_header_val = request.headers["cookie"]
    const cookies = parseCookies(cookie_header_val)
    const signed_value = cookies["auth"]

    if (!signed_value) {
        return yield* sessionJson({ contactID: null, email: null, role: null })
    }

    const contact_id = verifyCookie(signed_value, secret)
    if (!contact_id) {
        return yield* sessionJson({ contactID: null, email: null, role: null })
    }

    const role = roleFromEnv(undefined, contact_id)
    const signed = signCookie(contact_id, secret)
    // Refresh with the same attributes login used (HttpOnly, Secure in prod, domain)
    // so the cookie's protection is never downgraded by a session check.
    const set_auth = cookieHeader("auth", signed, AUTH_COOKIE_OPTS)

    return yield* sessionJson(
        { contactID: contact_id, email: null, role },
        { headers: { "Set-Cookie": set_auth } as Record<string, string> }
    )
})
