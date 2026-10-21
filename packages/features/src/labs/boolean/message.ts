import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ToggledCheckbox = taggedStruct("ToggledCheckbox", {
    isChecked: S.Boolean,
})
export const ToggledNot = taggedStruct("ToggledNot", { isChecked: S.Boolean })
export const ToggledOperandA = taggedStruct("ToggledOperandA", {
    isChecked: S.Boolean,
})
export const ToggledOperandB = taggedStruct("ToggledOperandB", {
    isChecked: S.Boolean,
})
export const ToggledListA = taggedStruct("ToggledListA", {
    isChecked: S.Boolean,
})
export const ToggledListB = taggedStruct("ToggledListB", {
    isChecked: S.Boolean,
})
export const ToggledListC = taggedStruct("ToggledListC", {
    isChecked: S.Boolean,
})

export const Message = S.Union([
    ToggledCheckbox,
    ToggledNot,
    ToggledOperandA,
    ToggledOperandB,
    ToggledListA,
    ToggledListB,
    ToggledListC,
])
export type Message = typeof Message.Type
