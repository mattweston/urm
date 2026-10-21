import { HttpRouter } from "effect/http"
import { Layer, ManagedRuntime } from "effect"
import { DatabaseLive } from "@urm/database"
import { SqlLive } from "@urm/database/sql"
import { EmailSqlLive } from "@urm/email/postgres"
import { NewsletterImagePublisherLive } from "@urm/rpc/handlers/mail"
import { ServerConfigLive } from "@urm/env/server"
import { RuntimeEmailTransportLive } from "../runtime-email-transport.ts"
import { RpcApi } from "@urm/contracts/rpc"
import { api_request_layer } from "@urm/rpc/api"
import {
    rpc_http_layer,
    rpc_request_rejection,
    rpc_response,
} from "@urm/rpc/http"
import { AppLayer, AppRpcs } from "./layer.ts"
import { RpcErrorLogMiddlewareLive } from "./error-log.ts"

export const rpc_runtime = ManagedRuntime.make(
    Layer.mergeAll(
        AppLayer,
        SqlLive.pipe(Layer.provide(DatabaseLive)),
        // The Remote newsletter repository sends through `@urm/email`, so the
        // transport and its ledger connection are part of the request context.
        EmailSqlLive.pipe(Layer.provide(DatabaseLive)),
        RuntimeEmailTransportLive,
        NewsletterImagePublisherLive,
        ServerConfigLive,
        RpcErrorLogMiddlewareLive
    ).pipe(Layer.orDie)
)

const group = AppRpcs.merge(RpcApi)
export const rpcHandler = async (request: Request): Promise<Response> => {
    const rejected = rpc_request_rejection(request)
    if (rejected !== null) return rejected
    const services = await rpc_runtime.context()
    const layer = rpc_http_layer(group).pipe(
        Layer.provide(api_request_layer(request)),
        Layer.provide(Layer.succeedContext(services))
    )
    const { handler, dispose } = HttpRouter.toWebHandler(layer, {
        disableLogger: true,
    })
    return rpc_response(request, handler, dispose)
}
