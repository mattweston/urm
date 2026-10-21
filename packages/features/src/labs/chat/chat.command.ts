import { DateTime, Effect, Schema as S } from "effect"
import { Command } from "foldkit"
import {
    FailedConnect,
    SucceededSendMessage,
    TimestampedMessage,
} from "./chat.message.ts"
import { ChatSocket } from "./chat.resource.ts"

const getZonedTime = Effect.map(DateTime.now, (utc) =>
    DateTime.setZone(utc, DateTime.zoneMakeLocal())
)

const TimestampSentMessage = Command.define("TimestampSentMessage", {
    args: { text: S.String },
    messages: [TimestampedMessage],
    execute: ({ text }) =>
        Effect.map(getZonedTime, (zoned) =>
            TimestampedMessage({ text, zoned, isSent: true })
        ),
})

const TimestampReceivedMessage = Command.define("TimestampReceivedMessage", {
    args: { text: S.String },
    messages: [TimestampedMessage],
    execute: ({ text }) =>
        Effect.map(getZonedTime, (zoned) =>
            TimestampedMessage({ text, zoned, isSent: false })
        ),
})

export const SendMessage = Command.define("SendMessage", {
    args: { text: S.String },
    messages: [SucceededSendMessage, FailedConnect],
    execute: ({ text }) =>
        ChatSocket.get.pipe(
            Effect.flatMap((socket) =>
                Effect.sync(() => {
                    socket.send(text)
                    return SucceededSendMessage({ text })
                })
            ),
            Effect.catchTag("ResourceNotAvailable", () =>
                Effect.succeed(FailedConnect({ error: "Socket unavailable" }))
            )
        ),
})

export const timestampSentMessage = (text: string) =>
    TimestampSentMessage({ text })

export const timestampReceivedMessage = (text: string) =>
    TimestampReceivedMessage({ text })
