import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const GotBasicMessage = taggedStruct("GotBasicMessage", {
    message: Ui.Menu.Message,
})
export const GotAnimatedMessage = taggedStruct("GotAnimatedMessage", {
    message: Ui.Menu.Message,
})

export const Message = S.Union([GotBasicMessage, GotAnimatedMessage])

export type Message = typeof Message.Type
