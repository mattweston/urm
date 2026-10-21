import { Schema as S } from "effect"

export const Model = S.Struct({
    query: S.String,
})
export type Model = typeof Model.Type
