import { Schema as S } from "effect"

export const Model = S.Struct({
    value: S.String,
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({ value: "" })
