import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const GotBasicMessage = taggedStruct("GotBasicMessage", {
    message: Ui.Listbox.Message,
})
export const GotMultiMessage = taggedStruct("GotMultiMessage", {
    message: Ui.Listbox.Message,
})
export const GotGroupedMessage = taggedStruct("GotGroupedMessage", {
    message: Ui.Listbox.Message,
})

export const Message = S.Union([
    GotBasicMessage,
    GotMultiMessage,
    GotGroupedMessage,
])

export type Message = typeof Message.Type
