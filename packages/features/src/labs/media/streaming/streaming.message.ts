import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedToggleStream = taggedStruct("ClickedToggleStream")
export const StartedStream = taggedStruct("StartedStream")
export const FailedStream = taggedStruct("FailedStream", {
    errorMessage: S.String,
})

export const Message = S.Union([
    ClickedToggleStream,
    StartedStream,
    FailedStream,
])

export type Message = typeof Message.Type
