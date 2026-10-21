import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
export const GotDatePickerMessage = taggedStruct("GotDatePickerMessage", {
    message: Ui.DatePicker.Message,
})
export const Message = S.Union([GotDatePickerMessage])
export type Message = typeof Message.Type
