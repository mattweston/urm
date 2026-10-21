import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedRunFold = taggedStruct("ClickedRunFold")
export const ClickedReset = taggedStruct("ClickedReset")

export const Message = S.Union([ClickedRunFold, ClickedReset])

export type Message = typeof Message.Type
