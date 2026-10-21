import { Schema as S } from "effect"

export const Model = S.Struct({
    isOpen: S.Boolean,
    query: S.String,
})

export type Model = typeof Model.Type
