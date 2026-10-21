import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ToggledGuides = taggedStruct("ToggledGuides", {
    isShown: S.Boolean,
})

export const Message = S.Union([ToggledGuides])
export type Message = typeof Message.Type
