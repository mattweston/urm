import { Schema as S } from "effect"

export const Model = S.Struct({
    // toggles the ::before/::after quote marks, which is the whole point of
    // the technique -- off, the same markup renders with no punctuation
    showQuotes: S.Boolean,
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({ showQuotes: true })
