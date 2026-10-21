import { Effect, Queue, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"
import {
    Disconnected,
    FailedConnect,
    ReceivedMessage,
    type Message,
} from "./chat.message.ts"
import type { Model } from "./chat.model.ts"
import { ChatSocket, type ChatSocketService } from "./chat.resource.ts"

export const SubscriptionDependencies = S.Struct({
    isConnected: S.Boolean,
})

export const subscriptions = Subscription.make<
    Model,
    Message,
    ChatSocketService
>()((entry) => ({
    isConnected: entry(
        { isConnected: S.Boolean },
        {
            modelToDependencies: (model) => ({
                isConnected: model.connection._tag === "ConnectionConnected",
            }),
            dependenciesToStream: ({ isConnected }) =>
                Stream.when(
                    Stream.unwrap(
                        ChatSocket.get.pipe(
                            Effect.map((socket) =>
                                Stream.callback<
                                    | typeof ReceivedMessage.Type
                                    | typeof Disconnected.Type
                                    | typeof FailedConnect.Type
                                >((queue) =>
                                    Effect.acquireRelease(
                                        Effect.sync(() => {
                                            const handleMessage = (
                                                event: MessageEvent
                                            ) => {
                                                Queue.offerUnsafe(
                                                    queue,
                                                    ReceivedMessage({
                                                        text: event.data,
                                                    })
                                                )
                                            }

                                            const handleClose = () => {
                                                Queue.offerUnsafe(
                                                    queue,
                                                    Disconnected()
                                                )
                                                Queue.endUnsafe(queue)
                                            }

                                            const handleError = () => {
                                                Queue.offerUnsafe(
                                                    queue,
                                                    FailedConnect({
                                                        error: "Connection error",
                                                    })
                                                )
                                                Queue.endUnsafe(queue)
                                            }

                                            socket.addEventListener(
                                                "message",
                                                handleMessage
                                            )
                                            socket.addEventListener(
                                                "close",
                                                handleClose
                                            )
                                            socket.addEventListener(
                                                "error",
                                                handleError
                                            )

                                            return {
                                                handleMessage,
                                                handleClose,
                                                handleError,
                                            }
                                        }),
                                        ({
                                            handleMessage,
                                            handleClose,
                                            handleError,
                                        }) =>
                                            Effect.sync(() => {
                                                socket.removeEventListener(
                                                    "message",
                                                    handleMessage
                                                )
                                                socket.removeEventListener(
                                                    "close",
                                                    handleClose
                                                )
                                                socket.removeEventListener(
                                                    "error",
                                                    handleError
                                                )
                                            })
                                    ).pipe(Effect.flatMap(() => Effect.never))
                                )
                            ),
                            Effect.catchTag("ResourceNotAvailable", () =>
                                Effect.succeed(Stream.empty)
                            )
                        )
                    ),
                    Effect.sync(() => isConnected)
                ),
        }
    ),
}))
