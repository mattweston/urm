import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ToggledCheckbox = taggedStruct("ToggledCheckbox", {
    isChecked: S.Boolean,
})
export const UpdatedInputValue = taggedStruct("UpdatedInputValue", {
    value: S.String,
})
export const UpdatedTextareaValue = taggedStruct("UpdatedTextareaValue", {
    value: S.String,
})

export const Message = S.Union([
    ToggledCheckbox,
    UpdatedInputValue,
    UpdatedTextareaValue,
])
export type Message = typeof Message.Type
