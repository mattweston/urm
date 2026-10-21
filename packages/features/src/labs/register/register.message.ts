import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ChangedEmail = taggedStruct("ChangedEmail", { value: S.String })
export const ChangedPassword = taggedStruct("ChangedPassword", {
    value: S.String,
})
export const SubmittedRegister = taggedStruct("SubmittedRegister")

export const Message = S.Union([
    ChangedEmail,
    ChangedPassword,
    SubmittedRegister,
])

export type Message = typeof Message.Type
