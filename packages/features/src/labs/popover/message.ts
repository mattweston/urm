import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { Popover } from "@foldkit/ui"

export const GotBasicMessage = taggedStruct("GotBasicMessage", {
    message: Popover.Message,
})
export const GotAnimatedMessage = taggedStruct("GotAnimatedMessage", {
    message: Popover.Message,
})

export const Message = S.Union([GotBasicMessage, GotAnimatedMessage])
export type Message = typeof Message.Type
