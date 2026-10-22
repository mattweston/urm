import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ChangedInputValue = taggedStruct("ChangedInputValue", {
    value: S.String,
})

export const Message = S.Union([ChangedInputValue])
export type Message = typeof Message.Type
