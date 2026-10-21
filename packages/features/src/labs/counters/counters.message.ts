import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Message as CounterMessageSchema } from "../counter/counter.message.ts"

export const ClickedAddRow = taggedStruct("ClickedAddRow")
export const ClickedRemoveRow = taggedStruct("ClickedRemoveRow", {
    id: S.String,
})
export const GotCounterMessage = taggedStruct("GotCounterMessage", {
    id: S.String,
    message: CounterMessageSchema,
})

export const Message = S.Union([
    ClickedAddRow,
    ClickedRemoveRow,
    GotCounterMessage,
])

export type Message = typeof Message.Type
