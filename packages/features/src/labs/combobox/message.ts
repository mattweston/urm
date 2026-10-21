import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const GotBasicMessage = taggedStruct("GotBasicMessage", {
    message: Ui.Combobox.Message,
})
export const GotNullableMessage = taggedStruct("GotNullableMessage", {
    message: Ui.Combobox.Message,
})
export const GotSelectOnFocusMessage = taggedStruct("GotSelectOnFocusMessage", {
    message: Ui.Combobox.Message,
})
export const GotMultiMessage = taggedStruct("GotMultiMessage", {
    message: Ui.Combobox.Message,
})

export const Message = S.Union([
    GotBasicMessage,
    GotNullableMessage,
    GotSelectOnFocusMessage,
    GotMultiMessage,
])
export type Message = typeof Message.Type
