import { Schema as S } from "effect"

export const Model = S.Struct({
    selectedTemplateId: S.Option(S.String),
})

export type Model = typeof Model.Type
