import { Schema as S } from "effect"

export const Model = S.Struct({
    prices: S.Array(S.String),
    sum: S.NullOr(S.Number),
})

export type Model = typeof Model.Type

export const initial_model: Model = Model.make({
    prices: ["1", "3", "5", "7", "9", "11"],
    sum: null,
})
