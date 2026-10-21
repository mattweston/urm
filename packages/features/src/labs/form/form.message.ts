import { Schema as S } from "effect"
import { Field } from "foldkit/fieldValidation"
import { taggedStruct } from "foldkit/schema"

export const UpdatedName = taggedStruct("UpdatedName", { value: S.String })
export const UpdatedEmail = taggedStruct("UpdatedEmail", { value: S.String })
export const ValidatedEmail = taggedStruct("ValidatedEmail", {
    validationId: S.Number,
    field: Field(S.String),
})
export const UpdatedMessage = taggedStruct("UpdatedMessage", {
    value: S.String,
})
export const ClickedFormSubmit = taggedStruct("ClickedFormSubmit")
export const SubmittedForm = taggedStruct("SubmittedForm", {
    success: S.Boolean,
    name: S.String,
    email: S.String,
    body: S.String,
})

export const Message = S.Union([
    UpdatedName,
    UpdatedEmail,
    ValidatedEmail,
    UpdatedMessage,
    ClickedFormSubmit,
    SubmittedForm,
])

export type Message = typeof Message.Type
