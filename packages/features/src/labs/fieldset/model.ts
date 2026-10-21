import { Schema as S } from "effect"

export const Model = S.Struct({
    checkbox: S.Boolean,
    inputValue: S.String,
    textareaValue: S.String,
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({
    checkbox: false,
    inputValue: "",
    textareaValue: "",
})
