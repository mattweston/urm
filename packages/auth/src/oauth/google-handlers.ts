/**
 * # Google OAuth Handlers
 *
 * GET /auth/google/authorize and GET /auth/google/callback.
 */
import { createHash } from "node:crypto"
import { generateState, generateCodeVerifier, OAuth2RequestError } from "arctic"
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { Effect, Metric, Redacted, Schema } from "effect"
import { AuthConfig, ServerConfig } from "@urm/env/server"
import { DB } from "@urm/db"
import { schema } from "@urm/db"
import {
    recordAuditEvent,
    type AuditEventInput,
    type AuditEventReasonClass,
} from "../audit-events.ts"
import { recordObservabilityLog } from "../observability-logs.ts"
import { makeGoogle } from "./oauth-google.ts"
import { getOrCreateContactFromDatabase } from "../contacts.ts"
import { parseCookies } from "../cookies/parse-cookies.ts"
import {
    PKCE_COOKIE_CLEAR,
    PKCE_COOKIE_OPTS,
    cookieHeader,
} from "../cookies/cookie-opts.ts"
import { encodePkce, decodePkce, GOOGLE_OAUTH_COOKIE } from "./pkce.ts"
import {
    createContactAuthSessionFromHeaders,
    upsertContactAuthAccount,
} from "../sessions.ts"
import { ensurePublicDomainPresence } from "../domain-presence.ts"
import {
    createDomainSessionHandoff,
    domainSessionOrigin,
    isTrustedDomainWorkerRequest,
    resolveDomainSessionScope,
} from "../domain-sessions.ts"
import {
    verifyDomainLoginIntent,
    type DomainLoginIntent,
} from "../domain-login-intent.ts"
import {
    authRateLimitKey,
    checkAuthRateLimit,
    type AuthRateLimitDecision,
} from "../rate-limiter.ts"
import {
    consumeOAuthState,
    createOAuthState,
    type ConsumedOAuthState,
} from "../oauth-states.ts"
import {
    configuredOAuthDestination,
    oauthDestinationFromUnknown,
    oauthDestinationLoginUrl,
    oauthDestinationUrl,
} from "./destinations.ts"

const REQUEST_ID_HEADER = "x-request-id"
const CLIENT_IP_HASH_HEADER = "x-urm-client-ip-hash"
const USER_AGENT_HASH_HEADER = "x-urm-user-agent-hash"
const OAUTH_AUTHORIZE_RATE_LIMIT_WINDOW_SECONDS = 300
const OAUTH_AUTHORIZE_RATE_LIMIT_BLOCK_SECONDS = 900
const OAUTH_AUTHORIZE_RATE_LIMIT_MAX_ATTEMPTS = 20
const OAUTH_CALLBACK_FAILURE_RATE_LIMIT_WINDOW_SECONDS = 300
const OAUTH_CALLBACK_FAILURE_RATE_LIMIT_BLOCK_SECONDS = 900
const OAUTH_CALLBACK_FAILURE_RATE_LIMIT_MAX_ATTEMPTS = 10
const OAUTH_DESTINATION_QUERY_PARAMETER = "destination"

type OAuthRateLimitRoute = "oauth-authorize" | "oauth-callback-failure"

type OAuthRateLimitConfig = Readonly<{
    limit: number
    window_seconds: number
    block_seconds: number
}>

const hashedAuditValue = (value: string): string =>
    createHash("sha256").update(value).digest("hex")

const authOAuthAuthorizeStartedTotal = Metric.counter(
    "auth_oauth_authorize_started_total"
).pipe(Metric.withConstantInput(1))
const authOAuthCallbackTotal = Metric.counter("auth_oauth_callback_total").pipe(
    Metric.withConstantInput(1)
)

const incrementOAuthAuthorizeStarted = () =>
    Effect.track(
        Effect.void,
        authOAuthAuthorizeStartedTotal.pipe(
            Metric.withAttributes({
                provider: "google",
            })
        )
    )

const incrementOAuthCallback = (
    result: "succeeded" | "failed",
    reason_class: string
) =>
    Effect.track(
        Effect.void,
        authOAuthCallbackTotal.pipe(
            Metric.withAttributes({
                provider: "google",
                result,
                reason_class,
            })
        )
    )

type GoogleUserInfo = Readonly<{
    email: string
    sub: string
    name?: string
    picture?: string
    email_verified?: boolean
}>

class OAuthProviderError extends Schema.TaggedError<OAuthProviderError>()(
    "OAuthProviderError",
    {
        operation: Schema.String,
        cause: Schema.Defect(),
    }
) {}

function getGoogleUserInfo(data: unknown): GoogleUserInfo | undefined {
    if (typeof data !== "object" || data === null) return undefined

    const sub = "sub" in data ? data.sub : undefined
    const email = "email" in data ? data.email : undefined

    if (typeof sub !== "string" || typeof email !== "string") return undefined

    const name =
        "name" in data && typeof data.name === "string"
            ? data.name
            : "given_name" in data && typeof data.given_name === "string"
              ? data.given_name
              : undefined
    const picture =
        "picture" in data && typeof data.picture === "string"
            ? data.picture
            : undefined
    const email_verified =
        "email_verified" in data && typeof data.email_verified === "boolean"
            ? data.email_verified
            : undefined

    return {
        sub,
        email,
        ...(name === undefined ? {} : { name }),
        ...(picture === undefined ? {} : { picture }),
        ...(email_verified === undefined ? {} : { email_verified }),
    }
}

function redirectWithError(appUrl: string, error: string, clearPkce = false) {
    const location = `${appUrl}?auth_error=${encodeURIComponent(error)}`
    const clear_pkce = cookieHeader(GOOGLE_OAUTH_COOKIE, "", PKCE_COOKIE_CLEAR)

    return redirectResponse(location, clearPkce ? [clear_pkce] : [])
}

function redirectWithRateLimit(
    appUrl: string,
    retryAfterSeconds: number,
    clearPkce = false
) {
    const location = `${appUrl}?auth_error=rate_limited`
    const clear_pkce = cookieHeader(GOOGLE_OAUTH_COOKIE, "", PKCE_COOKIE_CLEAR)
    return redirectResponse(location, clearPkce ? [clear_pkce] : [], {
        "Retry-After": String(retryAfterSeconds),
    })
}

function redirectResponse(
    location: string,
    cookies: ReadonlyArray<string>,
    extraHeaders: Readonly<Record<string, string>> = {}
) {
    const headers = new Headers(extraHeaders)
    headers.set("Location", location)

    for (const cookie of cookies) {
        headers.append("Set-Cookie", cookie)
    }

    return HttpServerResponse.fromWeb(
        new Response(null, { status: 302, headers })
    )
}

const requestHeader = (
    headers: Record<string, string | ReadonlyArray<string> | undefined>,
    name: string
): string | undefined => {
    const value = headers[name]
    if (value === undefined) {
        return undefined
    }

    return headerValue(value)
}

const oauthAuditMetadata = (
    request: HttpServerRequest.HttpServerRequest,
    auth_route: "authorize" | "callback",
    extra: Record<string, string> = {}
): Record<string, string> => {
    const metadata: Record<string, string> = {
        auth_provider: "google",
        auth_route,
        ...extra,
    }
    const host = requestHeader(request.headers, "host")
    const client_ip_hash = requestHeader(request.headers, CLIENT_IP_HASH_HEADER)
    const user_agent_hash = requestHeader(
        request.headers,
        USER_AGENT_HASH_HEADER
    )

    if (host !== undefined) {
        metadata.host = host
    }

    if (client_ip_hash !== undefined) {
        metadata.client_ip_hash = client_ip_hash
    }

    if (user_agent_hash !== undefined) {
        metadata.user_agent_hash = user_agent_hash
    }

    return metadata
}

const requestId = (
    request: HttpServerRequest.HttpServerRequest
): string | undefined => requestHeader(request.headers, REQUEST_ID_HEADER)

const requestUrl = (request: HttpServerRequest.HttpServerRequest): URL =>
    new URL(request.url, `http://${request.headers["host"] ?? "localhost"}`)

const oauthDestinationFromRequest = (
    request: HttpServerRequest.HttpServerRequest
) =>
    oauthDestinationFromUnknown(
        requestUrl(request).searchParams.get(OAUTH_DESTINATION_QUERY_PARAMETER)
    )

const oauthRateLimitConfig = (
    route: OAuthRateLimitRoute
): OAuthRateLimitConfig => {
    switch (route) {
        case "oauth-authorize":
            return {
                limit: OAUTH_AUTHORIZE_RATE_LIMIT_MAX_ATTEMPTS,
                window_seconds: OAUTH_AUTHORIZE_RATE_LIMIT_WINDOW_SECONDS,
                block_seconds: OAUTH_AUTHORIZE_RATE_LIMIT_BLOCK_SECONDS,
            }
        case "oauth-callback-failure":
            return {
                limit: OAUTH_CALLBACK_FAILURE_RATE_LIMIT_MAX_ATTEMPTS,
                window_seconds:
                    OAUTH_CALLBACK_FAILURE_RATE_LIMIT_WINDOW_SECONDS,
                block_seconds: OAUTH_CALLBACK_FAILURE_RATE_LIMIT_BLOCK_SECONDS,
            }
    }
}

const recordOAuthAuditEvent = (input: AuditEventInput) =>
    recordAuditEvent(input).pipe(
        Effect.catch(() => Effect.logWarning("auth.oauth.audit.write_failed"))
    )

const auditOAuthCallbackFailed = (
    request: HttpServerRequest.HttpServerRequest,
    reason_class: AuditEventReasonClass,
    error: string
) =>
    Effect.gen(function* () {
        yield* Effect.logWarning("auth.oauth.callback.failed", {
            reason_class,
            error,
        })
        yield* recordOAuthAuditEvent({
            action: "auth.oauth.callback.failed",
            entity_type: "auth.oauth",
            request_id: requestId(request),
            result: "failed",
            reason_class,
            metadata: oauthAuditMetadata(request, "callback", { error }),
        })
        yield* recordObservabilityLog({
            level: "warning",
            message: "auth.oauth.callback.failed",
            source: "google-oauth",
            request_id: requestId(request),
            metadata: { reason_class, error },
        }).pipe(Effect.catch(() => Effect.void))
        yield* incrementOAuthCallback("failed", reason_class)
    })

const checkOAuthRateLimit = (
    request: HttpServerRequest.HttpServerRequest,
    route: OAuthRateLimitRoute,
    keyParts: ReadonlyArray<string>,
    metadata: Record<string, string> = {}
) =>
    Effect.gen(function* () {
        const clientIpHash =
            requestHeader(request.headers, CLIENT_IP_HASH_HEADER) ??
            "unknown_ip"
        const key = authRateLimitKey([route, clientIpHash, ...keyParts])
        const config = oauthRateLimitConfig(route)
        const decision = yield* checkAuthRateLimit({
            route,
            key,
            limit: config.limit,
            window_seconds: config.window_seconds,
            block_seconds: config.block_seconds,
        }).pipe(
            Effect.catch(() =>
                Effect.gen(function* () {
                    yield* Effect.logWarning(
                        "auth.oauth.rate_limit.check_failed",
                        { auth_route: route }
                    )
                    return { allowed: true } satisfies AuthRateLimitDecision
                })
            )
        )

        if (decision.allowed) {
            return undefined
        }

        yield* Effect.logWarning("auth.oauth.rate_limited", {
            route,
            key_hash: key,
        })
        yield* recordOAuthAuditEvent({
            action: "auth.rate_limit.blocked",
            entity_type: "auth.rate_limit",
            request_id: requestId(request),
            result: "blocked",
            reason_class: "rate_limited",
            metadata: oauthAuditMetadata(
                request,
                route === "oauth-authorize" ? "authorize" : "callback",
                {
                    ...metadata,
                    key_hash: key,
                }
            ),
        })

        return decision.retry_after_seconds
    })

const headerValue = (value: string | ReadonlyArray<string>): string =>
    typeof value === "string" ? value : value.join(", ")

const requestHeaders = (
    headers: Record<string, string | ReadonlyArray<string> | undefined>
): Headers =>
    new Headers(
        Object.entries(headers).flatMap<[string, string]>(([key, value]) =>
            value === undefined ? [] : [[key, headerValue(value)]]
        )
    )

const domainLoginIntentFromRequest = (
    request: HttpServerRequest.HttpServerRequest,
    destination: DomainLoginIntent["destination"]
): DomainLoginIntent | undefined => {
    const url = new URL(
        request.url,
        `http://${request.headers["host"] ?? "localhost"}`
    )
    const hostname = url.searchParams.get("domain_hostname")
    const expires_at = url.searchParams.get("domain_expires_at")
    const signature = url.searchParams.get("domain_signature")

    if (hostname === null || expires_at === null || signature === null) {
        return undefined
    }

    const parsed_expires_at = Number(expires_at)

    if (!Number.isSafeInteger(parsed_expires_at)) {
        return undefined
    }

    return {
        hostname,
        destination,
        expires_at: parsed_expires_at,
        signature,
    }
}

type GoogleCallbackStateSuccess = Readonly<{
    code: string
    state: string
    code_verifier: string
    oauth_state: ConsumedOAuthState
}>

type GoogleCallbackStateResult =
    | Readonly<{
          _tag: "failure"
          response: HttpServerResponse.HttpServerResponse
      }>
    | Readonly<{
          _tag: "success"
          value: GoogleCallbackStateSuccess
      }>

const googleCallbackStateFailure = (
    response: HttpServerResponse.HttpServerResponse
): GoogleCallbackStateResult => ({
    _tag: "failure",
    response,
})

const googleCallbackStateSuccess = (
    value: GoogleCallbackStateSuccess
): GoogleCallbackStateResult => ({
    _tag: "success",
    value,
})

export const validateGoogleCallbackState = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const serverConfig = yield* ServerConfig
    const url = new URL(
        request.url,
        `http://${request.headers["host"] ?? "localhost"}`
    )
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const cookies = parseCookies(request.headers["cookie"])
    const pkce_raw = cookies[GOOGLE_OAUTH_COOKIE]
    const pkce = pkce_raw ? decodePkce(pkce_raw) : null
    const stored_state = pkce?.state
    const stored_verifier = pkce?.code_verifier

    if (
        !code ||
        !state ||
        !stored_state ||
        !stored_verifier ||
        state !== stored_state
    ) {
        yield* Effect.logWarning("auth.oauth.callback.failed", {
            reason_class: "invalid_oauth_state",
            host: request.headers["host"] ?? "missing_host",
            has_pkce_cookie: String(Boolean(pkce)),
            state_match: String(state === stored_state),
        })
        const stateHash =
            state === null ? "missing_state" : hashedAuditValue(state)
        const rateLimitRetryAfter = yield* checkOAuthRateLimit(
            request,
            "oauth-callback-failure",
            [stateHash],
            { state_hash: stateHash, failure_reason: "invalid_state" }
        )

        if (rateLimitRetryAfter !== undefined) {
            return googleCallbackStateFailure(
                redirectWithRateLimit(
                    serverConfig.appUrl,
                    rateLimitRetryAfter,
                    true
                )
            )
        }

        yield* auditOAuthCallbackFailed(
            request,
            "invalid_oauth_state",
            "invalid_state"
        )
        return googleCallbackStateFailure(
            redirectWithError(serverConfig.appUrl, "invalid_state", true)
        )
    }

    const consumedOAuthState = yield* consumeOAuthState(
        "google",
        state,
        stored_verifier
    ).pipe(
        Effect.catchCause(() =>
            Effect.logError(
                "auth.oauth.callback.state_consumption_failed"
            ).pipe(Effect.as(null))
        )
    )

    if (consumedOAuthState === null) {
        yield* auditOAuthCallbackFailed(
            request,
            "internal_error",
            "state_consumption_failed"
        )
        return googleCallbackStateFailure(
            redirectWithError(serverConfig.appUrl, "callback_failed", true)
        )
    }

    if (consumedOAuthState === undefined) {
        const stateHash = hashedAuditValue(state)
        const rateLimitRetryAfter = yield* checkOAuthRateLimit(
            request,
            "oauth-callback-failure",
            [stateHash],
            { state_hash: stateHash, failure_reason: "state_replay_or_expired" }
        )

        if (rateLimitRetryAfter !== undefined) {
            return googleCallbackStateFailure(
                redirectWithRateLimit(
                    serverConfig.appUrl,
                    rateLimitRetryAfter,
                    true
                )
            )
        }

        yield* auditOAuthCallbackFailed(
            request,
            "invalid_oauth_state",
            "state_replay_or_expired"
        )
        return googleCallbackStateFailure(
            redirectWithError(serverConfig.appUrl, "invalid_state", true)
        )
    }

    return googleCallbackStateSuccess({
        code,
        state,
        code_verifier: stored_verifier,
        oauth_state: consumedOAuthState,
    })
})

export const handleGoogleAuthorize = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const serverConfig = yield* ServerConfig
    const authConfig = yield* AuthConfig
    const destination = oauthDestinationFromRequest(request)

    if (destination === undefined) {
        return HttpServerResponse.empty({ status: 400 })
    }

    const redirectTo = oauthDestinationUrl(serverConfig, destination)
    const workerHeaders = requestHeaders(request.headers)
    const originalHostname = workerHeaders.get("x-urm-original-host")
    const trustedWorkerScope =
        isTrustedDomainWorkerRequest(
            workerHeaders,
            Redacted.value(authConfig.domainWorkerToken)
        ) && originalHostname !== null
            ? yield* resolveDomainSessionScope(originalHostname).pipe(
                  Effect.catch(() => Effect.succeed(undefined))
              )
            : undefined
    const domainLoginIntent = domainLoginIntentFromRequest(request, destination)
    const request_url = new URL(
        request.url,
        `http://${request.headers["host"] ?? "localhost"}`
    )
    const hasDomainLoginIntent = [
        request_url.searchParams.has("domain_hostname"),
        request_url.searchParams.has("domain_expires_at"),
        request_url.searchParams.has("domain_signature"),
    ].some(Boolean)
    const signedIntentScope =
        domainLoginIntent !== undefined &&
        verifyDomainLoginIntent(
            domainLoginIntent,
            Redacted.value(authConfig.domainWorkerToken)
        )
            ? yield* resolveDomainSessionScope(domainLoginIntent.hostname).pipe(
                  Effect.catch(() => Effect.succeed(undefined))
              )
            : undefined
    const domainScope = trustedWorkerScope ?? signedIntentScope

    if (hasDomainLoginIntent && domainScope === undefined) {
        return HttpServerResponse.empty({ status: 404 })
    }
    const host =
        domainScope?.hostname ??
        requestHeader(request.headers, "host") ??
        "unknown_host"
    const rateLimitRetryAfter = yield* checkOAuthRateLimit(
        request,
        "oauth-authorize",
        [host],
        { host }
    )

    if (rateLimitRetryAfter !== undefined) {
        yield* Effect.logWarning("auth.oauth.authorize.rate_limited", { host })
        return redirectWithRateLimit(
            oauthDestinationLoginUrl(serverConfig, destination),
            rateLimitRetryAfter
        )
    }

    const state = generateState()
    const code_verifier = generateCodeVerifier()
    yield* createOAuthState("google", state, code_verifier, {
        redirect_to: redirectTo,
        host,
        domain_id: domainScope?.domain_id,
        request_ip_hash: requestHeader(request.headers, CLIENT_IP_HASH_HEADER),
        user_agent_hash: requestHeader(request.headers, USER_AGENT_HASH_HEADER),
    })

    const oauthClient = makeGoogle(
        serverConfig.apiUrl,
        authConfig.googleClientId,
        Redacted.value(authConfig.googleClientSecret)
    )

    const url = oauthClient.google.createAuthorizationURL(
        state,
        code_verifier,
        ["openid", "profile", "email"]
    )
    const payload = encodePkce(state, code_verifier)
    const set_cookie = cookieHeader(
        GOOGLE_OAUTH_COOKIE,
        payload,
        PKCE_COOKIE_OPTS
    )

    yield* incrementOAuthAuthorizeStarted()
    yield* Effect.logInfo("auth.oauth.authorize.started", { host })
    yield* recordOAuthAuditEvent({
        action: "auth.oauth.authorize.started",
        entity_type: "auth.oauth",
        request_id: requestId(request),
        metadata: oauthAuditMetadata(request, "authorize"),
    })
    yield* recordObservabilityLog({
        level: "info",
        message: "auth.oauth.authorize.started",
        source: "google-oauth",
        request_id: requestId(request),
        metadata: { host },
    }).pipe(Effect.catch(() => Effect.void))

    return HttpServerResponse.empty({
        status: 302,
        headers: {
            Location: url.toString(),
            "Set-Cookie": set_cookie,
        },
    })
})

export const handleGoogleCallback = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const serverConfig = yield* ServerConfig
    const authConfig = yield* AuthConfig
    const callbackState = yield* validateGoogleCallbackState

    if (callbackState._tag === "failure") {
        return callbackState.response
    }

    const {
        code,
        state,
        code_verifier: stored_verifier,
        oauth_state: consumedOAuthState,
    } = callbackState.value

    const destination = configuredOAuthDestination(
        serverConfig,
        consumedOAuthState.redirect_to
    )

    if (destination === undefined) {
        yield* auditOAuthCallbackFailed(
            request,
            "invalid_oauth_state",
            "invalid_destination"
        )
        return redirectWithError(serverConfig.appUrl, "invalid_state", true)
    }

    const redirectTo = oauthDestinationUrl(serverConfig, destination)
    const loginUrl = oauthDestinationLoginUrl(serverConfig, destination)

    const oauthClient = makeGoogle(
        serverConfig.apiUrl,
        authConfig.googleClientId,
        Redacted.value(authConfig.googleClientSecret)
    )

    const tokens = yield* Effect.tryPromise({
        try: () =>
            oauthClient.google.validateAuthorizationCode(code, stored_verifier),
        catch: (cause) =>
            new OAuthProviderError({
                operation:
                    cause instanceof OAuth2RequestError
                        ? "validate_authorization_code"
                        : "validate_authorization_code_unexpected",
                cause,
            }),
    }).pipe(Effect.catch(() => Effect.succeed(null)))

    if (tokens === null) {
        const rateLimitRetryAfter = yield* checkOAuthRateLimit(
            request,
            "oauth-callback-failure",
            [hashedAuditValue(state)],
            {
                state_hash: hashedAuditValue(state),
                failure_reason: "exchange_failed",
            }
        )

        if (rateLimitRetryAfter !== undefined) {
            return redirectWithRateLimit(loginUrl, rateLimitRetryAfter, true)
        }

        yield* auditOAuthCallbackFailed(
            request,
            "oauth_provider_error",
            "exchange_failed"
        )
        return redirectWithError(loginUrl, "exchange_failed", true)
    }

    const access_token = tokens.accessToken()

    const userinfo_res = yield* Effect.tryPromise({
        try: () =>
            fetch("https://openidconnect.googleapis.com/v1/userinfo", {
                headers: { Authorization: `Bearer ${access_token}` },
            }),
        catch: (cause) =>
            new OAuthProviderError({ operation: "fetch_userinfo", cause }),
    }).pipe(Effect.catch(() => Effect.succeed(null)))

    if (userinfo_res === null) {
        const rateLimitRetryAfter = yield* checkOAuthRateLimit(
            request,
            "oauth-callback-failure",
            [hashedAuditValue(state)],
            {
                state_hash: hashedAuditValue(state),
                failure_reason: "userinfo_failed",
            }
        )

        if (rateLimitRetryAfter !== undefined) {
            return redirectWithRateLimit(loginUrl, rateLimitRetryAfter, true)
        }

        yield* auditOAuthCallbackFailed(
            request,
            "oauth_provider_error",
            "userinfo_failed"
        )
        return redirectWithError(loginUrl, "userinfo_failed", true)
    }

    const userinfo_json = yield* Effect.tryPromise({
        try: () => userinfo_res.json(),
        catch: (cause) =>
            new OAuthProviderError({ operation: "decode_userinfo", cause }),
    }).pipe(Effect.catch(() => Effect.succeed(null)))

    if (userinfo_json === null) {
        const rateLimitRetryAfter = yield* checkOAuthRateLimit(
            request,
            "oauth-callback-failure",
            [hashedAuditValue(state)],
            {
                state_hash: hashedAuditValue(state),
                failure_reason: "userinfo_failed",
            }
        )

        if (rateLimitRetryAfter !== undefined) {
            return redirectWithRateLimit(loginUrl, rateLimitRetryAfter, true)
        }

        yield* auditOAuthCallbackFailed(
            request,
            "oauth_provider_error",
            "userinfo_failed"
        )
        return redirectWithError(loginUrl, "userinfo_failed", true)
    }

    const google_user = getGoogleUserInfo(userinfo_json)
    if (!google_user) {
        const rateLimitRetryAfter = yield* checkOAuthRateLimit(
            request,
            "oauth-callback-failure",
            [hashedAuditValue(state)],
            {
                state_hash: hashedAuditValue(state),
                failure_reason: "userinfo_failed",
            }
        )

        if (rateLimitRetryAfter !== undefined) {
            return redirectWithRateLimit(loginUrl, rateLimitRetryAfter, true)
        }

        yield* auditOAuthCallbackFailed(
            request,
            "oauth_provider_error",
            "userinfo_failed"
        )
        return redirectWithError(loginUrl, "userinfo_failed", true)
    }

    if (google_user.email_verified === false) {
        const rateLimitRetryAfter = yield* checkOAuthRateLimit(
            request,
            "oauth-callback-failure",
            [hashedAuditValue(state)],
            {
                state_hash: hashedAuditValue(state),
                failure_reason: "email_not_verified",
            }
        )

        if (rateLimitRetryAfter !== undefined) {
            return redirectWithRateLimit(loginUrl, rateLimitRetryAfter, true)
        }

        yield* auditOAuthCallbackFailed(
            request,
            "unverified_email",
            "email_not_verified"
        )
        return redirectWithError(loginUrl, "email_not_verified", true)
    }

    const db = yield* DB
    const contact = yield* getOrCreateContactFromDatabase(
        db,
        schema.contacts,
        google_user.email,
        google_user.name ?? google_user.email,
        google_user.sub,
        google_user.picture,
        true
    ).pipe(Effect.catch(() => Effect.succeed(null)))

    if (contact === null) {
        const rateLimitRetryAfter = yield* checkOAuthRateLimit(
            request,
            "oauth-callback-failure",
            [hashedAuditValue(state)],
            {
                state_hash: hashedAuditValue(state),
                failure_reason: "contact_creation_failed",
            }
        )

        if (rateLimitRetryAfter !== undefined) {
            return redirectWithRateLimit(loginUrl, rateLimitRetryAfter, true)
        }

        yield* auditOAuthCallbackFailed(
            request,
            "internal_error",
            "contact_creation_failed"
        )
        return redirectWithError(loginUrl, "contact_creation_failed", true)
    }

    yield* upsertContactAuthAccount(
        contact.id,
        "google",
        google_user.sub,
        google_user.email
    ).pipe(Effect.catch(() => Effect.void))
    const domainScope =
        consumedOAuthState.domain_id === undefined ||
        consumedOAuthState.host === undefined
            ? undefined
            : yield* resolveDomainSessionScope(consumedOAuthState.host).pipe(
                  Effect.catch(() => Effect.succeed(undefined))
              )

    if (
        domainScope !== undefined &&
        domainScope.domain_id !== consumedOAuthState.domain_id
    ) {
        yield* auditOAuthCallbackFailed(
            request,
            "invalid_oauth_state",
            "domain_scope_mismatch"
        )
        return redirectWithError(loginUrl, "callback_failed", true)
    }

    const oauthDomain =
        domainScope === undefined
            ? yield* ensurePublicDomainPresence(
                  contact.id,
                  request.headers,
                  request.url,
                  "google_oauth"
              )
            : yield* ensurePublicDomainPresence(
                  contact.id,
                  new Headers({ host: domainScope.hostname }),
                  `https://${domainScope.hostname}/auth/handoff`,
                  "google_oauth"
              )

    if (oauthDomain !== undefined) {
        yield* Effect.annotateLogs({ domain_id: oauthDomain.id })(Effect.void)
        yield* Effect.annotateSpans({ domain_id: oauthDomain.id })(Effect.void)
    }

    const session = yield* createContactAuthSessionFromHeaders(
        contact.id,
        requestHeaders(request.headers)
    ).pipe(
        Effect.tapError(() =>
            Effect.logError("auth.oauth.callback.session_creation_failed")
        ),
        Effect.catch(() => Effect.succeed(undefined))
    )

    if (session === undefined) {
        const rateLimitRetryAfter = yield* checkOAuthRateLimit(
            request,
            "oauth-callback-failure",
            [hashedAuditValue(state)],
            {
                state_hash: hashedAuditValue(state),
                failure_reason: "session_creation_failed",
            }
        )

        if (rateLimitRetryAfter !== undefined) {
            return redirectWithRateLimit(loginUrl, rateLimitRetryAfter, true)
        }

        yield* auditOAuthCallbackFailed(
            request,
            "internal_error",
            "session_creation_failed"
        )
        return redirectWithError(loginUrl, "session_creation_failed", true)
    }

    yield* Effect.annotateLogs({
        contact_id: contact.id,
        session_id: session.session_id,
    })(Effect.void)
    yield* Effect.annotateSpans({
        contact_id: contact.id,
        session_id: session.session_id,
    })(Effect.void)
    const set_auth = session.cookie
    const clear_pkce = cookieHeader(GOOGLE_OAUTH_COOKIE, "", PKCE_COOKIE_CLEAR)

    yield* incrementOAuthCallback("succeeded", "none")
    yield* Effect.logInfo("auth.oauth.callback.succeeded", {
        contact_id: contact.id,
        session_id: session.session_id,
    })
    yield* Effect.logDebug("auth.session.created", {
        contact_id: contact.id,
        session_id: session.session_id,
    })
    yield* recordOAuthAuditEvent({
        action: "auth.oauth.callback.succeeded",
        entity_type: "contact",
        entity_id: contact.id,
        actor_contact_id: contact.id,
        contact_id: contact.id,
        session_id: session.session_id,
        request_id: requestId(request),
        metadata: oauthAuditMetadata(request, "callback", {
            oauth_state_id: consumedOAuthState.id,
        }),
    })
    yield* recordOAuthAuditEvent({
        action: "auth.oauth_account.linked",
        entity_type: "auth_account",
        actor_contact_id: contact.id,
        contact_id: contact.id,
        session_id: session.session_id,
        request_id: requestId(request),
        metadata: oauthAuditMetadata(request, "callback"),
    })
    yield* recordOAuthAuditEvent({
        action: "auth.session.created",
        entity_type: "auth.session",
        entity_id: session.session_id,
        actor_contact_id: contact.id,
        contact_id: contact.id,
        session_id: session.session_id,
        request_id: requestId(request),
        metadata: oauthAuditMetadata(request, "callback"),
    })
    yield* recordObservabilityLog({
        level: "info",
        message: "auth.oauth.callback.succeeded",
        source: "google-oauth",
        contact_id: contact.id,
        session_id: session.session_id,
        domain_id: oauthDomain?.id,
        request_id: requestId(request),
    }).pipe(Effect.catch(() => Effect.void))

    const domainHandoff =
        domainScope === undefined
            ? undefined
            : yield* createDomainSessionHandoff(
                  contact.id,
                  domainScope,
                  "/"
              ).pipe(Effect.catch(() => Effect.succeed(undefined)))

    if (domainScope !== undefined && domainHandoff === undefined) {
        yield* auditOAuthCallbackFailed(
            request,
            "internal_error",
            "domain_handoff_creation_failed"
        )
        return redirectWithError(loginUrl, "callback_failed", true)
    }

    const handoffRedirect =
        domainHandoff === undefined || domainScope === undefined
            ? redirectTo
            : new URL(
                  `/auth/handoff/?code=${encodeURIComponent(domainHandoff.code)}`,
                  domainSessionOrigin(domainScope.hostname, redirectTo)
              ).toString()

    return redirectResponse(handoffRedirect, [set_auth, clear_pkce])
})
