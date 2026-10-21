/**
 * # Call RPC Util
 *
 */
import { Effect } from "effect"
import { Rpc, RpcClient, RpcGroup } from "effect/unstable/rpc"
import { RpcClientError } from "effect/unstable/rpc/RpcClientError"
import { RPC_CSRF_HEADER } from "./csrf.ts"
import { rpcRuntime, runRpcPromise } from "./runtime.ts"

type GetRequestHeaders = () => Headers

let getRequestHeaders: GetRequestHeaders | undefined

/**
 * Register the incoming request's headers so server-rendered calls forward
 * them — auth cookies in particular — to the RPC service.
 *
 * Server code has to supply this: a call made while rendering has no ambient
 * access to the request it belongs to. Astro middleware is the usual caller,
 * where `context.request.headers` is in scope. Left unregistered, calls carry
 * CSRF headers only, which is correct for the browser.
 */
export const setRpcRequestHeaders = (
    provider: GetRequestHeaders | undefined
): void => {
    getRequestHeaders = provider
}

const getSSRHeaders = (): Record<string, string> | undefined => {
    if (getRequestHeaders === undefined) return undefined

    try {
        return Object.fromEntries(getRequestHeaders().entries())
    } catch (error) {
        rpcRuntime.runFork(
            Effect.logWarning(
                "Failed to read SSR request headers for RPC call"
            ).pipe(
                Effect.annotateLogs({
                    error:
                        error instanceof Error ? error.message : String(error),
                })
            )
        )
        return undefined
    }
}

// Returns a Promise, not an Effect — this is the boundary where Foldkit
// commands and Astro middleware consume RPC.
export const callRpc = <Rpcs extends Rpc.Any, A, E>(
    group: RpcGroup.RpcGroup<Rpcs>,
    f: (
        client: RpcClient.RpcClient<Rpcs, RpcClientError>
    ) => Effect.Effect<A, E>
) => {
    // Only set when a server context has registered a provider.
    const ssrHeaders = getSSRHeaders()

    const effect = Effect.gen(function* () {
        const client = yield* RpcClient.make(group)
        return yield* f(client)
    }).pipe(Effect.scoped)

    // Add headers (SSR headers if available, plus CSRF)
    const headers = {
        ...ssrHeaders,
        ...RPC_CSRF_HEADER,
    }

    return runRpcPromise(effect.pipe(RpcClient.withHeaders(headers)))
}
