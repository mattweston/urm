import { Schema as S } from "effect"

export const Model = S.Struct({
    isActive: S.Boolean,
})

export type Model = typeof Model.Type
