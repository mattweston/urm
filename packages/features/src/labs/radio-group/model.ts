import { Option, Schema as S } from "effect"

import { Plan } from "./message.ts"

export const Model = S.Struct({
    horizontal: S.Option(Plan),
    vertical: S.Option(Plan),
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({
    horizontal: Option.none(),
    vertical: Option.none(),
})
