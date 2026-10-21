import { Match as M, String } from "effect"
import { Command } from "foldkit"
import {
    SendMessage,
    timestampReceivedMessage,
    timestampSentMessage,
} from "./chat.command.ts"
import type { Message } from "./chat.message.ts"
import type { Model } from "./chat.model.ts"
import {
    ChatMessage,
    ConnectionConnected,
    ConnectionConnecting,
    ConnectionDisconnected,
    ConnectionError,
} from "./chat.model.ts"
import type { ChatSocketService } from "./chat.resource.ts"

type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, ChatSocketService>>,
]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [
    {
        connection: ConnectionDisconnected(),
        messages: [],
        messageInput: "",
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ClickedConnect: () => [
                {
                    ...model,
                    connection: ConnectionConnecting(),
                },
                [],
            ],
            Connected: () => [
                {
                    ...model,
                    connection: ConnectionConnected(),
                },
                [],
            ],
            Disconnected: () => [
                {
                    ...model,
                    connection: ConnectionDisconnected(),
                    messages: [],
                },
                [],
            ],
            FailedConnect: ({ error }) => [
                {
                    ...model,
                    connection: ConnectionError({ error }),
                },
                [],
            ],
            UpdatedMessageInput: ({ value }) => [
                {
                    ...model,
                    messageInput: value,
                },
                [],
            ],
            SubmittedMessage: () => {
                const trimmedMessage = String.trim(model.messageInput)

                if (String.isEmpty(trimmedMessage)) {
                    return [model, []]
                }

                return M.value(model.connection).pipe(
                    withUpdateReturn,
                    M.tag("ConnectionConnected", () => [
                        {
                            ...model,
                            messageInput: "",
                        },
                        [SendMessage({ text: trimmedMessage })],
                    ]),
                    M.orElse(() => [model, []])
                )
            },
            SucceededSendMessage: ({ text }) => [
                model,
                [timestampSentMessage(text)],
            ],
            ReceivedMessage: ({ text }) => [
                model,
                [timestampReceivedMessage(text)],
            ],
            TimestampedMessage: ({ text, zoned, isSent }) => [
                {
                    ...model,
                    messages: [
                        ...model.messages,
                        ChatMessage.make({ text, zoned, isSent }),
                    ],
                },
                [],
            ],
        })
    )
