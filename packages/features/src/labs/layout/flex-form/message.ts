import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const UpdatedName = taggedStruct("UpdatedName", { value: S.String })
export const UpdatedEmail = taggedStruct("UpdatedEmail", { value: S.String })
export const SubmittedForm = taggedStruct("SubmittedForm")

export const Message = S.Union([UpdatedName, UpdatedEmail, SubmittedForm])
export type Message = typeof Message.Type
