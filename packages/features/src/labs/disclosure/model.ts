import { Schema as S } from "effect"

export const Model = S.Struct({
    isOpen: S.Boolean,
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({ isOpen: false })
