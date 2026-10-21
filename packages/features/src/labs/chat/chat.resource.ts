import { Data, Duration, Effect, Match as M, Option, Schema as S } from "effect"
import { ManagedResource } from "foldkit"
import {
    Connected,
    Disconnected,
    FailedConnect,
    type Message,
} from "./chat.message.ts"
import type { Model } from "./chat.model.ts"

const websocketUrl = "wss://ws.postman-echo.com/raw"
const connectionTimeout = Duration.millis(5000)

class ChatSocketError extends Data.TaggedError("ChatSocketError")<{
    readonly reason: string
}> {}

export const ChatSocket = ManagedResource.tag<WebSocket>()("ChatSocket")
export type ChatSocketService = ManagedResource.ServiceOf<typeof ChatSocket>

export const modelToMaybeChatSocketRequirements = (model: Model) =>
    M.value(model.connection).pipe(
        M.tag("ConnectionConnecting", () => Option.some(null)),
        M.tag("ConnectionConnected", () => Option.some(null)),
        M.orElse(() => Option.none())
    )

export const acquireChatSocket = () =>
    Effect.callback<WebSocket, ChatSocketError>((resume) => {
        const websocket = new WebSocket(websocketUrl)

        const handleOpen = () => {
            websocket.removeEventListener("error", handleError)
            resume(Effect.succeed(websocket))
        }

        const handleError = () => {
            websocket.removeEventListener("open", handleOpen)
            resume(
                Effect.fail(
                    new ChatSocketError({
                        reason: "Failed to connect to WebSocket",
                    })
                )
            )
        }

        websocket.addEventListener("open", handleOpen)
        websocket.addEventListener("error", handleError)

        return Effect.sync(() => {
            websocket.removeEventListener("open", handleOpen)
            websocket.removeEventListener("error", handleError)
        })
    }).pipe(
        Effect.timeout(connectionTimeout),
        Effect.catchTag("TimeoutError", () =>
            Effect.fail(new ChatSocketError({ reason: "Connection timeout" }))
        )
    )

export const releaseChatSocket = (socket: WebSocket) =>
    Effect.sync(() => {
        socket.close()
    })

export const chatSocketAcquireErrorToMessage = (error: unknown) =>
    FailedConnect({
        error:
            error instanceof ChatSocketError ? error.reason : "Unknown error",
    })

export const managedResources = ManagedResource.make<Model, Message>()(
    (entry) => ({
        chatSocket: entry(S.Option(S.Null), {
            resource: ChatSocket,
            modelToMaybeRequirements: modelToMaybeChatSocketRequirements,
            acquire: acquireChatSocket,
            release: releaseChatSocket,
            onAcquired: () => Connected(),
            onReleased: () => Disconnected(),
            onAcquireError: chatSocketAcquireErrorToMessage,
        }),
    })
)
