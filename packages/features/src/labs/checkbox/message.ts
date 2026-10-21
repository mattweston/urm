import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ToggledBasic = taggedStruct("ToggledBasic", {
    isChecked: S.Boolean,
})
export const ToggledAll = taggedStruct("ToggledAll", { isChecked: S.Boolean })
export const ToggledOptionA = taggedStruct("ToggledOptionA", {
    isChecked: S.Boolean,
})
export const ToggledOptionB = taggedStruct("ToggledOptionB", {
    isChecked: S.Boolean,
})

export const Message = S.Union([
    ToggledBasic,
    ToggledAll,
    ToggledOptionA,
    ToggledOptionB,
])
export type Message = typeof Message.Type
