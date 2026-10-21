import { Effect, Layer, Stream } from "effect"
import {
    FetchHttpClient,
    HttpClient,
    HttpClientRequest,
} from "effect/http"
import { RpcClient, RpcSerialization } from "effect/rpc"
import {
    Remote,
    RemoteRpc,
    RemoteReadError,
    RemoteQueryError,
    RemoteMutationError,
    RemoteLiveError,
} from "foldkit-remote"

export const contacts_client_layer = (
    url: string,
    cookie: string,
    fetch_impl: typeof fetch = fetch
) => {
    const endpoint = new URL(url)
    const protocol = RpcClient.layerProtocolHttp({
        url: `${endpoint.origin}${endpoint.pathname}`,
        transformClient: (client) =>
            HttpClient.mapRequest(client, (request) =>
                request.pipe(
                    HttpClientRequest.setHeader(
                        "x-requested-with",
                        "XMLHttpRequest"
                    ),
                    HttpClientRequest.setHeader("cookie", cookie),
                    HttpClientRequest.setUrlParam(
                        "domain_id",
                        endpoint.searchParams.get("domain_id") ?? ""
                    )
                )
            ),
    }).pipe(
        Layer.provide(
            FetchHttpClient.layer.pipe(
                Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetch_impl))
            )
        ),
        Layer.provide(RpcSerialization.layerNdjson)
    )
    return Layer.unwrap(
        Effect.gen(function* () {
            const client = yield* RpcClient.make(RemoteRpc)
            return Remote.clientLayer({
                FoldkitRemoteRead: (input) =>
                    client
                        .FoldkitRemoteRead(input)
                        .pipe(
                            Effect.mapError(
                                () =>
                                    new RemoteReadError({
                                        message: "Contact read failed",
                                    })
                            )
                        ),
                FoldkitRemoteQuery: (input) =>
                    client
                        .FoldkitRemoteQuery(input)
                        .pipe(
                            Effect.mapError(
                                () =>
                                    new RemoteQueryError({
                                        message: "Contact query failed",
                                    })
                            )
                        ),
                FoldkitRemoteMutate: (input) =>
                    client
                        .FoldkitRemoteMutate(input)
                        .pipe(
                            Effect.mapError(
                                () =>
                                    new RemoteMutationError({
                                        message: "Contact write failed",
                                    })
                            )
                        ),
                FoldkitRemoteLive: () =>
                    Stream.fail(
                        new RemoteLiveError({
                            message:
                                "Live Contacts subscriptions are not yet enabled",
                        })
                    ),
            })
        })
    ).pipe(Layer.provide(protocol))
}
