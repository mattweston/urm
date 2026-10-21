import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedConnect = taggedStruct("ClickedConnect")
export const Connected = taggedStruct("Connected")
export const Disconnected = taggedStruct("Disconnected")
export const FailedConnect = taggedStruct("FailedConnect", { error: S.String })
export const UpdatedMessageInput = taggedStruct("UpdatedMessageInput", {
    value: S.String,
})
export const SubmittedMessage = taggedStruct("SubmittedMessage")
export const SucceededSendMessage = taggedStruct("SucceededSendMessage", {
    text: S.String,
})
export const ReceivedMessage = taggedStruct("ReceivedMessage", {
    text: S.String,
})
export const TimestampedMessage = taggedStruct("TimestampedMessage", {
    text: S.String,
    zoned: S.DateTimeZoned,
    isSent: S.Boolean,
})

export const Message = S.Union([
    ClickedConnect,
    Connected,
    Disconnected,
    FailedConnect,
    UpdatedMessageInput,
    SubmittedMessage,
    SucceededSendMessage,
    ReceivedMessage,
    TimestampedMessage,
])

export type Message = typeof Message.Type
