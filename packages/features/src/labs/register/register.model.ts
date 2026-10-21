import { Schema as S } from "effect"
import { Field } from "foldkit/fieldValidation"

export const RegisterModel = S.Struct({
    email: Field(S.String),
    password: Field(S.String),
    isSubmitting: S.Boolean,
})

export type Model = typeof RegisterModel.Type
