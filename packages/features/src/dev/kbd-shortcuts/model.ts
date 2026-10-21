import { Schema as S } from "effect"

export const Model = S.Struct({
    search: S.String,
})

export type Model = typeof Model.Type
