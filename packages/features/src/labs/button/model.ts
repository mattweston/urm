import { Schema as S } from "effect"

export const Model = S.Struct({
    clickCount: S.Number,
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({ clickCount: 0 })
