import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedNext = taggedStruct("ClickedNext")
export const ClickedPrevious = taggedStruct("ClickedPrevious")
export const ClickedRestart = taggedStruct("ClickedRestart")
export const CompletedPlayNote = taggedStruct("CompletedPlayNote")

export const Message = S.Union([
    ClickedNext,
    ClickedPrevious,
    ClickedRestart,
    CompletedPlayNote,
])

export type Message = typeof Message.Type
