import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const GotCalendarMessage = taggedStruct("GotCalendarMessage", {
    message: Ui.Calendar.Message,
})

export const Message = S.Union([GotCalendarMessage])
export type Message = typeof Message.Type
