import { createHash, randomUUID } from "node:crypto"
import type { IncomingMessage } from "node:http"

export const REQUEST_ID_HEADER = "x-request-id"
export const CLIENT_IP_HASH_HEADER = "x-urm-client-ip-hash"
export const USER_AGENT_HASH_HEADER = "x-urm-user-agent-hash"

export type HttpRequestContext = Readonly<{
    request_id: string
    client_ip_hash?: string
    user_agent_hash?: string
}>

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

const hashValue = (value: string): string =>
    createHash("sha256").update(value).digest("hex")

const normalizeHeaderValue = (value: string | null): string | undefined => {
    const normalized = value?.trim()

    if (normalized === undefined || normalized === "") {
        return undefined
    }

    return normalized
}

const firstForwardedValue = (value: string | null): string | undefined => {
    const first = normalizeHeaderValue(value)?.split(",")[0]?.trim()

    if (first === undefined || first === "") {
        return undefined
    }

    return first
}

const requestIdFromHeaders = (headers: Headers): string => {
    const requestId = normalizeHeaderValue(headers.get(REQUEST_ID_HEADER))

    if (requestId !== undefined && REQUEST_ID_PATTERN.test(requestId)) {
        return requestId
    }

    return randomUUID()
}

const clientIpFromHeaders = (
    headers: Headers,
    remoteAddress: string | undefined,
    trusted_proxy: boolean
): string | undefined =>
    trusted_proxy
        ? (firstForwardedValue(headers.get("x-forwarded-for")) ??
          normalizeHeaderValue(headers.get("x-real-ip")) ??
          remoteAddress)
        : remoteAddress

export const makeHttpRequestContext = (
    headers: Headers,
    remoteAddress: string | undefined,
    trusted_proxy = false
): HttpRequestContext => {
    const clientIp = clientIpFromHeaders(headers, remoteAddress, trusted_proxy)
    const userAgent = normalizeHeaderValue(headers.get("user-agent"))

    return {
        request_id: requestIdFromHeaders(headers),
        ...(clientIp === undefined
            ? {}
            : { client_ip_hash: hashValue(clientIp) }),
        ...(userAgent === undefined
            ? {}
            : { user_agent_hash: hashValue(userAgent) }),
    }
}

export const applyHttpRequestContextHeaders = (
    headers: Headers,
    context: HttpRequestContext
): Headers => {
    const contextualHeaders = new Headers(headers)
    contextualHeaders.set(REQUEST_ID_HEADER, context.request_id)

    if (context.client_ip_hash !== undefined) {
        contextualHeaders.set(CLIENT_IP_HASH_HEADER, context.client_ip_hash)
    }

    if (context.user_agent_hash !== undefined) {
        contextualHeaders.set(USER_AGENT_HASH_HEADER, context.user_agent_hash)
    }

    return contextualHeaders
}

const trustedProxyFromEnvironment = (): boolean =>
    process.env.TRUST_PROXY === "true"

export const requestContextFromIncomingMessage = (
    req: IncomingMessage
): HttpRequestContext =>
    makeHttpRequestContext(
        new Headers(
            Object.entries(req.headers)
                .filter(([, value]) => value !== undefined)
                .map(([key, value]) => [
                    key,
                    Array.isArray(value) ? value.join(", ") : String(value),
                ])
        ),
        req.socket.remoteAddress,
        trustedProxyFromEnvironment()
    )
