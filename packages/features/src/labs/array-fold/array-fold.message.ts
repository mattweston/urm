import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedFoldNext = taggedStruct("ClickedFoldNext")
export const ClickedReset = taggedStruct("ClickedReset")
export const CompletedPlayNote = taggedStruct("CompletedPlayNote")

export const Message = S.Union([
    ClickedFoldNext,
    ClickedReset,
    CompletedPlayNote,
])

export type Message = typeof Message.Type
