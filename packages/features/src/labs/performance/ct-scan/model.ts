import { Schema as S } from "effect"

export const Model = S.Struct({
    is_active: S.Boolean,
})

export type Model = typeof Model.Type

export const initialModel: Model = Model.make({ is_active: false })
