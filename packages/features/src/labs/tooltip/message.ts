import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

export const GotBasicMessage = taggedStruct("GotBasicMessage", {
    message: Ui.Tooltip.Message,
})
export const GotNoDelayMessage = taggedStruct("GotNoDelayMessage", {
    message: Ui.Tooltip.Message,
})

export const Message = S.Union([GotBasicMessage, GotNoDelayMessage])
export type Message = typeof Message.Type
