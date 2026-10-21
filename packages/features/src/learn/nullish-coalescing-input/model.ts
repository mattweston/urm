import { Schema as S } from "effect"

export const Model = S.Struct({
    input_value: S.NullOr(S.String),
})
export type Model = typeof Model.Type

export const initial_model: Model = Model.make({
    input_value: null,
})
