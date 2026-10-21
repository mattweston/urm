import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const UpdatedOtpFieldValue = taggedStruct("UpdatedOtpFieldValue", {
    value: S.String,
})

export const Message = S.Union([UpdatedOtpFieldValue])

export type Message = typeof Message.Type
