export type DomainHandoffWorkerConfig = Readonly<{
    api_url: string
    domain_worker_token: string
}>

const HANDOFF_PATH = "/auth/handoff"
const API_HANDOFF_PATH = "/auth/domain/handoff"
const DOMAIN_LOGIN_INTENT_PATH = "/auth/domain/login-intent"

const isPath = (pathname: string, expected: string): boolean =>
    pathname === expected || pathname === `${expected}/`

const notFoundResponse = (): Response =>
    new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
    })

const target_route_from_unknown = (
    value: unknown,
    request_url: URL
): string | undefined => {
    if (
        typeof value !== "object" ||
        value === null ||
        !("target_route" in value) ||
        typeof value.target_route !== "string"
    ) {
        return undefined
    }

    const target_url = new URL(value.target_route, request_url)

    if (target_url.origin !== request_url.origin) {
        return undefined
    }

    return `${target_url.pathname}${target_url.search}${target_url.hash}`
}

const has_required_config = (config: DomainHandoffWorkerConfig): boolean =>
    config.api_url !== "" && config.domain_worker_token !== ""

const serviceUnavailableResponse = (): Response =>
    new Response(null, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
    })

const request_body = async (
    request: Request
): Promise<ArrayBuffer | undefined> =>
    request.method === "GET" || request.method === "HEAD"
        ? undefined
        : request.arrayBuffer()

const domain_login_destination = (
    value: string | null
): DomainLoginDestination | undefined =>
    value === "admin" || value === "marketing" ? value : undefined

const base64url = (value: ArrayBuffer): string => {
    const bytes = new Uint8Array(value)
    let binary = ""

    for (const byte of bytes) {
        binary += String.fromCharCode(byte)
    }

    return btoa(binary)
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, "")
}

const signed_domain_login_intent = async (
    hostname: string,
    destination: DomainLoginDestination,
    expires_at: number,
    domain_worker_token: string
): Promise<string> => {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(domain_worker_token),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    )
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(
            domainLoginIntentPayload(hostname, destination, expires_at)
        )
    )

    return base64url(signature)
}

/** Issue a short-lived browser-safe assertion for a domain login start. */
export const handle_domain_login_intent_worker_request = async (
    request: Request,
    config: DomainHandoffWorkerConfig
): Promise<Response> => {
    const request_url = new URL(request.url)
    const destination = domain_login_destination(
        request_url.searchParams.get("destination")
    )

    if (
        request.method !== "GET" ||
        !isPath(request_url.pathname, DOMAIN_LOGIN_INTENT_PATH) ||
        destination === undefined ||
        !has_required_config(config)
    ) {
        return notFoundResponse()
    }

    const expires_at = Date.now() + DOMAIN_LOGIN_INTENT_TTL_MS
    const signature = await signed_domain_login_intent(
        request_url.hostname,
        destination,
        expires_at,
        config.domain_worker_token
    ).catch(() => undefined)

    if (signature === undefined) {
        return serviceUnavailableResponse()
    }

    return Response.json(
        {
            hostname: request_url.hostname,
            destination,
            expires_at,
            signature,
        },
        { headers: { "Cache-Control": "no-store" } }
    )
}

type ProxyApiOptions = Readonly<{
    /**
     * Path to request on the API. Defaults to the incoming request's own, which
     * is what a route mounted at the same path as the API wants. A route mounted
     * elsewhere — the app's /api/auth/* answering for the API's /auth/* — passes
     * the API's path here rather than rebuilding the Request, which would have
     * to re-stream the body.
     */
    readonly api_pathname?: string
    /**
     * Whether the API's `Set-Cookie` survives onto the response. Off for data
     * requests, where a cookie coming back would be a leak; on for credential
     * exchanges, where the cookie is the entire point.
     */
    readonly preserve_set_cookie: boolean
}>

const proxy_api_request = async (
    request: Request,
    config: DomainHandoffWorkerConfig,
    options: ProxyApiOptions,
    fetchImplementation: typeof fetch = fetch
): Promise<Response> => {
    if (!has_required_config(config)) {
        return notFoundResponse()
    }

    const request_url = new URL(request.url)
    const api_url = new URL(
        `${options.api_pathname ?? request_url.pathname}${request_url.search}`,
        config.api_url
    )
    const headers = new Headers(request.headers)
    headers.delete("Content-Length")
    headers.delete("Origin")
    headers.delete("x-urm-domain-worker-token")
    headers.delete("x-urm-original-host")
    headers.set("x-urm-domain-worker-token", config.domain_worker_token)
    headers.set("x-urm-original-host", request_url.hostname)
    headers.set("x-urm-original-origin", request_url.origin)

    const body = await request_body(request)
    const response = await fetchImplementation(api_url, {
        method: request.method,
        headers,
        ...(body === undefined ? {} : { body }),
        redirect: "manual",
    }).catch(() => undefined)

    if (response === undefined) {
        return serviceUnavailableResponse()
    }

    const response_headers = new Headers(response.headers)
    // Always dropped first: the Headers constructor folds repeated Set-Cookie
    // into a single comma-joined value, and an Expires date contains a comma,
    // so a folded pair cannot be split apart again.
    response_headers.delete("Set-Cookie")

    if (options.preserve_set_cookie) {
        for (const cookie of response.headers.getSetCookie()) {
            response_headers.append("Set-Cookie", cookie)
        }
    }

    response_headers.set("Cache-Control", "no-store")

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response_headers,
    })
}

/** Proxy an authenticated domain app API request with an original-host assertion. */
export const proxy_domain_api_request = (
    request: Request,
    config: DomainHandoffWorkerConfig,
    fetchImplementation: typeof fetch = fetch
): Promise<Response> =>
    proxy_api_request(
        request,
        config,
        { preserve_set_cookie: false },
        fetchImplementation
    )

/**
 * Proxy a credential request, keeping the session cookie the API sets.
 *
 * Reaching auth through the app's own origin is what makes that cookie
 * first-party — the alternative, posting straight at the API host, needs
 * `SameSite=None` and a CORS allow-list. `api_pathname` is the path the API
 * serves the route at, which is not the path the app answers on.
 */
export const proxy_auth_request = (
    request: Request,
    config: DomainHandoffWorkerConfig,
    api_pathname: string,
    fetchImplementation: typeof fetch = fetch
): Promise<Response> =>
    proxy_api_request(
        request,
        config,
        { api_pathname, preserve_set_cookie: true },
        fetchImplementation
    )

/** @deprecated Use {@link proxy_domain_api_request}; retained for existing RPC callers. */
export const proxy_domain_rpc_request = proxy_domain_api_request

/**
 * Exchange a one-time central-auth handoff code from a domain app worker.
 *
 * The browser receives only the scoped session cookie and a redirect to the
 * stored relative route. The worker token and handoff code never reach page
 * JavaScript.
 */
export const handle_domain_handoff_worker_request = async (
    request: Request,
    config: DomainHandoffWorkerConfig,
    fetchImplementation: typeof fetch = fetch
): Promise<Response> => {
    const request_url = new URL(request.url)
    const code = request_url.searchParams.get("code")

    if (
        request.method !== "GET" ||
        !isPath(request_url.pathname, HANDOFF_PATH) ||
        code === null ||
        code === "" ||
        !has_required_config(config)
    ) {
        return notFoundResponse()
    }

    const api_url = new URL(API_HANDOFF_PATH, config.api_url)
    const response = await fetchImplementation(api_url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-urm-domain-worker-token": config.domain_worker_token,
            "x-urm-original-host": request_url.hostname,
        },
        body: JSON.stringify({ code }),
    }).catch(() => undefined)

    if (response === undefined || !response.ok) {
        return notFoundResponse()
    }

    const target_route = target_route_from_unknown(
        await response.json().catch(() => undefined),
        request_url
    )
    const cookie = response.headers.get("Set-Cookie")

    if (target_route === undefined || cookie === null || cookie === "") {
        return notFoundResponse()
    }

    return new Response(null, {
        status: 303,
        headers: {
            Location: target_route,
            "Set-Cookie": cookie,
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
        },
    })
}
import {
    DOMAIN_LOGIN_INTENT_TTL_MS,
    domainLoginIntentPayload,
    type DomainLoginDestination,
} from "./domain-login-intent-payload.ts"
