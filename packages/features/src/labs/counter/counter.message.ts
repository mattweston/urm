import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedDecrement = taggedStruct("ClickedDecrement")
export const ClickedIncrement = taggedStruct("ClickedIncrement")
export const ClickedReset = taggedStruct("ClickedReset")

export const Message = S.Union([
    ClickedDecrement,
    ClickedIncrement,
    ClickedReset,
])

export type Message = typeof Message.Type
