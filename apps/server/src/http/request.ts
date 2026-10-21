import type { IncomingMessage, ServerResponse } from "node:http"
import { pipeline } from "node:stream/promises"
import {
    applyHttpRequestContextHeaders,
    REQUEST_ID_HEADER,
    type HttpRequestContext,
} from "./context.ts"
import { isDemoAllowedOrigin } from "../demo-runtime.ts"

// Where the dev servers are browsed. TAILSCALE_URL is scheme + host with no
// port and no trailing slash (e.g. http://urmdev.test) — each app
// appends its own port. The scheme is part of the value because Tailscale can
// serve the MagicDNS name over HTTPS. Defaults to localhost so a fresh clone
// works with no setup; a shared dev box sets it in root .env.local, and every
// dev URL follows: CORS origins, auth/RPC URLs, the app configs' allowedHosts.
//
// Read lazily. main.ts loads dotenv in its module body, which ESM runs only
// after every import has been evaluated — so anything read at module scope in
// this file predates .env.local and would always see the fallback.
export const devOrigin = (): string =>
    (process.env.TAILSCALE_URL ?? "http://localhost").replace(/\/+$/, "")

const DEV_APP_PORTS = [1234, 1420, 4321, 4322, 4324, 5001, 5173, 5174]

// TAILSCALE_URL is the suffix root; the platform is `app.` above it. A tenant
// host needs no entry — the dev proxy strips its Origin and asserts the domain
// instead — but the platform keeps its Origin, so it must be allowed by name.
const devCentralOrigin = (): string => {
    const origin = devOrigin()

    return origin === "http://localhost"
        ? origin
        : origin.replace(/^([a-z]+:\/\/)?/, "$1app.")
}

// Variable 'defaultAllowedOrigins' is declared but never used. Unused variables should start with a '_'.
// help: Consider removing this declaration.
const defaultAllowedOrigins = (): ReadonlyArray<string> => [
    ...new Set([
        "http://localhost:1420",
        "http://app.localhost:1420",
        "http://127.0.0.1:1420",
        "http://urm.test:1420",
        "http://localhost:4321",
        "http://localhost:5173",
        "http://localhost:5001",
        "http://127.0.0.1:4321",
        "http://127.0.0.1:5001",
        "http://192.168.0.129:4321",
        "http://192.168.0.128:4321",
        "http://192.168.0.129:4322",
        "http://192.168.0.129:5001",
        "http://192.168.0.128:5001",
        "http://100.113.94.35:5173",
        // Overlaps the entries above when TAILSCALE_URL is unset, hence the Set.
        ...DEV_APP_PORTS.map((port) => `${devOrigin()}:${port}`),
        ...DEV_APP_PORTS.map((port) => `${devCentralOrigin()}:${port}`),
    ]),
]

const CORS_ALLOWED_HEADERS = [
    "Content-Type",
    "x-requested-with",
    "X-Requested-With",
    "x-urm-public-chat-session",
    "traceparent",
    "tracestate",
    "b3",
    "baggage",
    "x-b3-traceid",
    "x-b3-spanid",
    "x-b3-parentspanid",
    "x-b3-sampled",
    "x-b3-flags",
].join(", ")

const parsePositiveInteger = (
    value: string | undefined,
    fallback: number
): number => {
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export const getMaxRequestBodyBytes = (): number =>
    parsePositiveInteger(process.env.MAX_REQUEST_BODY_BYTES, 1_048_576)

export const getHttpServerTimeouts = (): Readonly<{
    request_timeout_ms: number
    headers_timeout_ms: number
    keep_alive_timeout_ms: number
}> => ({
    request_timeout_ms: parsePositiveInteger(
        process.env.REQUEST_TIMEOUT_MS,
        30_000
    ),
    headers_timeout_ms: parsePositiveInteger(
        process.env.HEADERS_TIMEOUT_MS,
        15_000
    ),
    keep_alive_timeout_ms: parsePositiveInteger(
        process.env.KEEP_ALIVE_TIMEOUT_MS,
        5_000
    ),
})

export const requestContentLengthExceedsLimit = (
    content_length: string | undefined,
    max_body_bytes: number
): boolean => {
    if (content_length === undefined) {
        return false
    }

    const parsed = Number(content_length)
    return (
        !Number.isSafeInteger(parsed) || parsed < 0 || parsed > max_body_bytes
    )
}

const isAllowedOriginValue = (origin: string): boolean => {
    try {
        const url = new URL(origin)
        return (
            (url.protocol === "http:" || url.protocol === "https:") &&
            url.origin === origin
        )
    } catch {
        return false
    }
}

export const parseAllowedOrigins = (
    configuredAllowedOrigins: string | undefined,
    production = false
): ReadonlyArray<string> =>
    configuredAllowedOrigins === undefined
        ? production
            ? []
            : defaultAllowedOrigins()
        : configuredAllowedOrigins
              .split(",")
              .map((origin) => origin.trim())
              .filter(isAllowedOriginValue)

export const getConfiguredAllowedOrigins = (
    is_demo = false
): ReadonlyArray<string> => {
    const production = process.env.NODE_ENV === "production"
    const configured = process.env.ALLOWED_ORIGINS ?? process.env.CORS_ORIGIN
    // In production the configured list is the whole policy. In dev it augments
    // the local/tailnet defaults — otherwise setting ALLOWED_ORIGINS to add one
    // origin silently drops every dev origin, TAILSCALE_URL's included.
    const allowed_origins = production
        ? parseAllowedOrigins(configured, true)
        : [
              ...new Set([
                  ...defaultAllowedOrigins(),
                  ...parseAllowedOrigins(configured, false),
              ]),
          ]

    return is_demo
        ? allowed_origins.filter(isDemoAllowedOrigin)
        : allowed_origins
}

export const isOriginAllowed = (
    origin: string | undefined,
    allowedOrigins: ReadonlyArray<string>
): boolean => {
    if (!origin) {
        return true
    }

    return allowedOrigins.includes(origin)
}

export const handleCors = (
    req: IncomingMessage,
    res: ServerResponse,
    allowedOrigins: ReadonlyArray<string>
): boolean => {
    const origin = req.headers.origin

    if (!isOriginAllowed(origin, allowedOrigins)) {
        res.writeHead(403, { "Content-Type": "text/plain" })
        res.end("Origin not allowed")
        return false
    }

    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin)
        res.setHeader("Access-Control-Allow-Credentials", "true")
        res.setHeader("Vary", "Origin")
    }

    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        res.setHeader("Access-Control-Allow-Headers", CORS_ALLOWED_HEADERS)
        res.setHeader("Access-Control-Max-Age", "600")
        res.writeHead(204)
        res.end()
        return false
    }

    return true
}

const headersFromIncomingMessage = (req: IncomingMessage): Headers =>
    new globalThis.Headers(
        Object.entries(req.headers)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [
                key,
                Array.isArray(value) ? value.join(", ") : String(value),
            ])
    )

const readRequestBody = (
    req: IncomingMessage,
    max_body_bytes: number
): Promise<Uint8Array<ArrayBuffer> | undefined> =>
    new Promise((resolve, reject) => {
        const chunks: Array<Uint8Array> = []
        let received_bytes = 0
        let settled = false

        const finish = (body: Uint8Array<ArrayBuffer> | undefined): void => {
            if (!settled) {
                settled = true
                resolve(body)
            }
        }

        req.on("data", (chunk: Uint8Array) => {
            if (settled) {
                return
            }

            received_bytes += chunk.byteLength

            if (received_bytes > max_body_bytes) {
                finish(undefined)
                req.resume()
                return
            }

            chunks.push(chunk)
        })
        req.once("error", (error) => {
            if (!settled) {
                settled = true
                reject(error)
            }
        })
        req.once("end", () => {
            if (settled) {
                return
            }

            const body = new Uint8Array(received_bytes)
            let offset = 0

            for (const chunk of chunks) {
                body.set(chunk, offset)
                offset += chunk.byteLength
            }

            finish(body)
        })
    })

export const requestFromIncomingMessage = (
    req: IncomingMessage,
    url: URL,
    requestContext: HttpRequestContext,
    max_body_bytes: number
): Promise<Request | undefined> => {
    const method = req.method

    if (method === undefined) {
        return Promise.resolve(undefined)
    }

    if (method === "GET" || method === "HEAD") {
        return Promise.resolve(
            new Request(url, {
                method,
                headers: applyHttpRequestContextHeaders(
                    headersFromIncomingMessage(req),
                    requestContext
                ),
            })
        )
    }

    return readRequestBody(req, max_body_bytes).then((body) => {
        if (body === undefined) {
            return undefined
        }

        return new Request(url, {
            method,
            headers: applyHttpRequestContextHeaders(
                headersFromIncomingMessage(req),
                requestContext
            ),
            body,
        })
    })
}

export const sendResponse = async (
    res: ServerResponse,
    response: Response,
    requestContext: HttpRequestContext
): Promise<void> => {
    const responseHeaders = new Headers(response.headers)
    responseHeaders.set(REQUEST_ID_HEADER, requestContext.request_id)
    responseHeaders.set("X-Content-Type-Options", "nosniff")
    responseHeaders.set("X-Frame-Options", "DENY")
    responseHeaders.set("Referrer-Policy", "no-referrer")
    responseHeaders.set(
        "Permissions-Policy",
        "camera=(), geolocation=(), microphone=()"
    )
    responseHeaders.set(
        "Content-Security-Policy",
        "default-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    )

    if (process.env.NODE_ENV === "production") {
        responseHeaders.set(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains"
        )
    }

    if (res.getHeader("access-control-allow-origin")) {
        responseHeaders.set(
            "access-control-allow-origin",
            String(res.getHeader("access-control-allow-origin"))
        )
        responseHeaders.set("access-control-allow-credentials", "true")
    }

    const responseSetCookies = responseHeaders.getSetCookie()
    const pendingSetCookie = res.getHeader("set-cookie")
    const pendingSetCookies =
        typeof pendingSetCookie === "string"
            ? [pendingSetCookie]
            : Array.isArray(pendingSetCookie)
              ? pendingSetCookie.filter(
                    (value): value is string => typeof value === "string"
                )
              : []
    const setCookies = [...responseSetCookies, ...pendingSetCookies]

    responseHeaders.delete("set-cookie")
    const headers: Record<string, string | string[]> = Object.fromEntries(
        responseHeaders.entries()
    )

    if (setCookies.length > 0) {
        headers["set-cookie"] = setCookies
    }

    res.writeHead(response.status, headers)

    if (response.body) {
        await pipeline(response.body, res)
        return
    }

    res.end()
}
