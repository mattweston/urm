import { Schema as S } from "effect"
import { Model as CounterModel } from "../counter/counter.model.ts"

export const Row = S.Struct({
    id: S.String,
    counter: CounterModel,
})

export type Row = typeof Row.Type

export const Model = S.Struct({
    rows: S.Array(Row),
    nextRowId: S.Number,
})

export type Model = typeof Model.Type
