import { Schema as S } from "effect"
import { Field } from "foldkit/fieldValidation"
import { taggedStruct } from "foldkit/schema"

export const NotSubmitted = taggedStruct("NotSubmitted")
export const Submitting = taggedStruct("Submitting")
export const SubmitSuccess = taggedStruct("SubmitSuccess", {
    message: S.String,
})
export const SubmitError = taggedStruct("SubmitError", { error: S.String })

export const Submission = S.Union([
    NotSubmitted,
    Submitting,
    SubmitSuccess,
    SubmitError,
])

export type Submission = typeof Submission.Type

export const Model = S.Struct({
    name: Field(S.String),
    email: Field(S.String),
    emailValidationId: S.Number,
    message: Field(S.String),
    submission: Submission,
})

export type Model = typeof Model.Type
