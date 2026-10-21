import { Layer } from "effect"
import { Rpc, RpcGroup, RpcSerialization, RpcServer } from "effect/unstable/rpc"
import { hasRpcCsrfHeader } from "@urm/utils"

export const rpc_request_rejection = (request: Request): Response | null => {
    if (new URL(request.url).pathname.replace(/\/$/, "") !== "/api/rpc")
        return new Response(null, { status: 404 })
    if (request.method !== "POST")
        return new Response(null, { status: 405, headers: { Allow: "POST" } })
    if (!hasRpcCsrfHeader(request)) return new Response(null, { status: 403 })
    return null
}
export const rpc_http_layer = <Rpcs extends Rpc.Any>(
    group: RpcGroup.RpcGroup<Rpcs>
) =>
    RpcServer.layerHttp({ group, path: "/api/rpc", protocol: "http" }).pipe(
        Layer.provide(RpcSerialization.layerNdjson)
    )

/** Keep request-scoped services alive until the streaming response finishes. */
export const rpc_response = async (
    request: Request,
    handler: (request: Request) => Promise<Response>,
    dispose: () => Promise<void>
): Promise<Response> => {
    let disposed: Promise<void> | undefined
    const release = () => (disposed ??= dispose())
    try {
        const response = await handler(request)
        const headers = new Headers(response.headers)
        headers.set("Cache-Control", "no-store")
        if (response.body === null) {
            await release()
            return new Response(null, { status: response.status, headers })
        }
        const reader = response.body.getReader()
        const body = new ReadableStream<Uint8Array>({
            async pull(controller) {
                try {
                    const chunk = await reader.read()
                    if (chunk.done) {
                        await release()
                        controller.close()
                    } else {
                        controller.enqueue(chunk.value)
                    }
                } catch (error) {
                    await release()
                    controller.error(error)
                }
            },
            async cancel(reason) {
                try {
                    await reader.cancel(reason)
                } finally {
                    await release()
                }
            },
        })
        return new Response(body, { status: response.status, headers })
    } catch (error) {
        await release()
        throw error
    }
}
