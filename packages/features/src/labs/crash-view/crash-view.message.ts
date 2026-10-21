import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedCrash = taggedStruct("ClickedCrash")

export const Message = S.Union([ClickedCrash])

export type Message = typeof Message.Type
