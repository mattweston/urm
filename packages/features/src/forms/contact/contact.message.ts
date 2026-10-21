import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ChangedName = taggedStruct("ChangedName", { value: S.String })
export const ChangedEmail = taggedStruct("ChangedEmail", { value: S.String })
export const ChangedMessage = taggedStruct("ChangedMessage", {
    value: S.String,
})
export const SubmittedContactForm = taggedStruct("SubmittedContactForm")

export const Message = S.Union([
    ChangedName,
    ChangedEmail,
    ChangedMessage,
    SubmittedContactForm,
])

export type Message = typeof Message.Type
