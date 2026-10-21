import { Schema as S } from "effect"
import { Field } from "foldkit/fieldValidation"

export const Model = S.Struct({
    name: Field(S.String),
    email: Field(S.String),
    message: Field(S.String),
    ready_for_backend: S.Boolean,
})

export type Model = typeof Model.Type
