import { Schema as S } from "effect"

export const Model = S.Struct({
    checkbox: S.Boolean,
    not: S.Boolean,
    operandA: S.Boolean,
    operandB: S.Boolean,
    listA: S.Boolean,
    listB: S.Boolean,
    listC: S.Boolean,
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({
    checkbox: false,
    not: false,
    operandA: false,
    operandB: false,
    listA: false,
    listB: false,
    listC: false,
})
