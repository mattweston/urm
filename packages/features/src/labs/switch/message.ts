import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ToggledChecked = taggedStruct("ToggledChecked", {
    isChecked: S.Boolean,
})

export const Message = S.Union([ToggledChecked])
export type Message = typeof Message.Type
