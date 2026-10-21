import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const UpdatedValue = taggedStruct("UpdatedValue", { value: S.String })

export const Message = S.Union([UpdatedValue])
export type Message = typeof Message.Type
