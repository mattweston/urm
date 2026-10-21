import { Schema as S } from "effect"

export const Model = S.Struct({
    isSummarized: S.Boolean,
    total: S.Number,
})

export type Model = typeof Model.Type
