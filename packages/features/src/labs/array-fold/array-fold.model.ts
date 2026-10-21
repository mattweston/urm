import { Schema as S } from "effect"

export const Model = S.Struct({
    step: S.Number,
    total: S.Number,
})

export type Model = typeof Model.Type
