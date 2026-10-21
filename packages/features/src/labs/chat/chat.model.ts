import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ChatMessage = S.Struct({
    text: S.String,
    zoned: S.DateTimeZoned,
    isSent: S.Boolean,
})

export type ChatMessage = typeof ChatMessage.Type

export const ConnectionDisconnected = taggedStruct("ConnectionDisconnected")
export const ConnectionConnecting = taggedStruct("ConnectionConnecting")
export const ConnectionConnected = taggedStruct("ConnectionConnected")
export const ConnectionError = taggedStruct("ConnectionError", {
    error: S.String,
})

export const ConnectionState = S.Union([
    ConnectionDisconnected,
    ConnectionConnecting,
    ConnectionConnected,
    ConnectionError,
])

export type ConnectionState = typeof ConnectionState.Type

export const Model = S.Struct({
    connection: ConnectionState,
    messages: S.Array(ChatMessage),
    messageInput: S.String,
})

export type Model = typeof Model.Type
