import { Schema as S } from "effect"

export const Model = S.Struct({
    basic: S.Boolean,
    optionA: S.Boolean,
    optionB: S.Boolean,
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({
    basic: false,
    optionA: false,
    optionB: false,
})
