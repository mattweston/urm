/**
 * # Runtime RPC Util
 *
 */
import "../env.ts"
import {
    FetchHttpClient,
    HttpClient,
    HttpClientRequest,
} from "effect/http"
import { RpcClient, RpcSerialization } from "effect/rpc"
import { Effect, Layer, ManagedRuntime } from "effect"
import { RPC_CSRF_HEADER_NAME, RPC_CSRF_HEADER_VALUE } from "./csrf.ts"

const RPC_PATH = "/api/rpc"

type BrowserGlobal = typeof globalThis &
    Readonly<{
        location?: Readonly<{
            origin: string
        }>
    }>

const browser_global: BrowserGlobal = globalThis

const browser_origin = (): string | undefined => browser_global.location?.origin

// Allow explicit RPC URL override via environment
// Astro exposes PUBLIC_ variables and Vite exposes VITE_ variables.
const configured_rpc_url = (): string | undefined =>
    import.meta.env?.VITE_RPC_URL ||
    import.meta.env?.PUBLIC_RPC_URL ||
    import.meta.env?.RPC_URL ||
    undefined

const hostname_of = (url: string): string | undefined => {
    try {
        return new URL(url).hostname
    } catch {
        return undefined
    }
}

/*
 * Whether to reach the API through this app's own origin rather than calling it
 * directly.
 *
 * The question is not which surface the host serves — a platform host proxies
 * too — it is whether the app and the API share an origin. They do not whenever
 * the app is browsed by a name of its own, and a cross-site POST would not carry
 * the session cookie, which is SameSite=Lax. Served from the API's own origin
 * there is nothing to proxy.
 */
const use_same_origin_rpc = (): boolean => {
    const origin = browser_origin()

    if (origin === undefined) {
        return false
    }

    const rpc_url = configured_rpc_url()

    return (
        rpc_url === undefined ||
        new URL(origin).hostname !== hostname_of(rpc_url)
    )
}

// The proxy route is the app's own /api/rpc, which forwards to the API and adds
// the domain assertion when the caller is a tenant host. Every host the app is
// served from has that route, the platform host included — an earlier comment
// here claimed otherwise, and acting on it sent the platform's calls cross-site,
// where the SameSite=Lax session cookie is not sent.
//
// VITE_DOMAIN_RPC_PROXY / PUBLIC_DOMAIN_RPC_PROXY are not consulted: sharing an
// origin with the API is a fact about the deployment, not a preference. They
// still gate the login-intent proxy and media URLs.
const FetchHttpClientWithCredentialsLive = FetchHttpClient.layer.pipe(
    Layer.provide(
        Layer.succeed(FetchHttpClient.RequestInit, {
            credentials: "include",
        })
    )
)

const resolve_rpc_url = (): string => {
    const origin = browser_origin()

    if (origin !== undefined && use_same_origin_rpc()) {
        return new URL(RPC_PATH, origin).toString()
    }

    const explicitUrl = configured_rpc_url()

    if (explicitUrl) {
        return explicitUrl
    }

    throw new Error(
        "No RPC endpoint configured. Set VITE_RPC_URL or PUBLIC_RPC_URL, or serve the client from the API origin."
    )
}

// Layer.unwrap, not a plain layer: the URL is resolved when the layer is built,
// not when this module is imported. On the client that import happens before
// `location` is meaningful during hydration.
export const RpcProtocolLive = Layer.unwrap(
    Effect.sync(() => {
        const url = resolve_rpc_url()
        return RpcClient.layerProtocolHttp({
            url,
            transformClient: (client) =>
                HttpClient.mapRequest(client, (request) => {
                    const requestWithCsrf = HttpClientRequest.setHeader(
                        request,
                        RPC_CSRF_HEADER_NAME,
                        RPC_CSRF_HEADER_VALUE
                    )
                    return requestWithCsrf
                }),
        }).pipe(
            Layer.provide(FetchHttpClientWithCredentialsLive),
            Layer.provide(RpcSerialization.layerNdjson)
        )
    })
)

// One runtime per process, shared by every call. Building it per call would
// open a new HTTP connection pool each time.
export const rpcRuntime = ManagedRuntime.make(RpcProtocolLive)

export type RpcRuntimeContext = ManagedRuntime.ManagedRuntime.Services<
    typeof rpcRuntime
>

export const runRpcPromise = <A, E, R extends RpcRuntimeContext>(
    effect: Effect.Effect<A, E, R>,
    options?: { readonly signal?: AbortSignal }
) => rpcRuntime.runPromise(effect, options)
