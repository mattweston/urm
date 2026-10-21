import { Effect } from "effect"
import type { Sql } from "@urm/database/sql"
import {
    authenticate_token,
    account_profile,
    login_account,
    session_token,
    revoke_token,
    AuthError,
    list_account_domains,
    create_personal_domain,
    update_domain,
    delete_domain,
    check_email_breaches,
} from "@urm/auth"

const response = (body: unknown, status = 200, cookie?: string) =>
    Response.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
            ...(cookie === undefined ? {} : { "Set-Cookie": cookie }),
        },
    })

const cookie = (request: Request, token: string, clear = false) =>
    `urm_account=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${clear ? 0 : 2592000}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`
export const handle_auth_request = (
    request: Request
): Effect.Effect<Response, never, Sql> =>
    Effect.gen(function* () {
        const path = new URL(request.url).pathname.replace(/\/$/, "")
        if (
            request.method !== "GET" &&
            request.headers.get("x-requested-with") !== "XMLHttpRequest"
        )
            return response({ error: "Forbidden" }, 403)
        if (path === "/auth/login" && request.method === "POST") {
            const input: unknown = yield* Effect.tryPromise({
                try: () => request.json(),
                catch: () => new AuthError({ reason: "invalid_input" }),
            })
            const session = yield* login_account(input)
            return response(
                {
                    account_id: session.account_id,
                    session_id: session.session_id,
                },
                200,
                cookie(request, session.token)
            )
        }
        if (path === "/auth/me" && request.method === "GET") {
            const principal = yield* authenticate_token(session_token(request))
            return response({
                ...principal,
                profile: yield* account_profile(principal),
            })
        }
        if (path === "/auth/breach-check" && request.method === "POST") {
            const principal = yield* authenticate_token(session_token(request))
            const input: unknown = yield* Effect.tryPromise({
                try: () => request.json(),
                catch: () => new AuthError({ reason: "invalid_input" }),
            })
            return response(yield* check_email_breaches(principal, input))
        }
        if (path === "/auth/domains" && request.method === "GET") {
            const principal = yield* authenticate_token(session_token(request))
            return response({
                account_id: principal.account_id,
                domains: yield* list_account_domains(principal),
            })
        }
        if (
            request.method === "POST" &&
            (path === "/auth/domains/create" ||
                path === "/auth/domains/update" ||
                path === "/auth/domains/delete")
        ) {
            const principal = yield* authenticate_token(session_token(request))
            const input: unknown = yield* Effect.tryPromise({
                try: () => request.json(),
                catch: () => new AuthError({ reason: "invalid_input" }),
            })
            const domains =
                path === "/auth/domains/create"
                    ? yield* create_personal_domain(principal, input)
                    : path === "/auth/domains/update"
                      ? yield* update_domain(principal, input)
                      : yield* delete_domain(principal, input)
            return response({ account_id: principal.account_id, domains })
        }
        if (path === "/auth/logout" && request.method === "POST") {
            yield* revoke_token(session_token(request))
            return response({ success: true }, 200, cookie(request, "", true))
        }
        // Retained legacy OAuth, recovery and handoff handlers need account-aware ports.
        return response(
            {
                error: "This authentication operation is not available during the account migration",
            },
            503
        )
    }).pipe(
        Effect.catchTag("AuthError", (error) =>
            Effect.succeed(
                response(
                    { error: error.reason },
                    error.reason === "rate_limited"
                        ? 429
                        : error.reason === "invalid_input"
                          ? 400
                          : error.reason === "forbidden"
                            ? 403
                            : error.reason === "conflict"
                              ? 409
                              : 401
                )
            )
        ),
        Effect.catch(() =>
            Effect.succeed(
                response({ error: "Authentication service unavailable" }, 503)
            )
        )
    )
