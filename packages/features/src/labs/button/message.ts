import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedButton = taggedStruct("ClickedButton")

export const Message = S.Union([ClickedButton])
export type Message = typeof Message.Type
