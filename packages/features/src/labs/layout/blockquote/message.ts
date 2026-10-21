import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ToggledQuotes = taggedStruct("ToggledQuotes", {
    isShown: S.Boolean,
})

export const Message = S.Union([ToggledQuotes])
export type Message = typeof Message.Type
