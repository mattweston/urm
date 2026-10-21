import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedStart = taggedStruct("ClickedStart")
export const DeterminedStartTime = taggedStruct("DeterminedStartTime", {
    startTime: S.Number,
})
export const ClickedStop = taggedStruct("ClickedStop")
export const ClickedReset = taggedStruct("ClickedReset")
export const Ticked = taggedStruct("Ticked")
export const DeterminedTickTime = taggedStruct("DeterminedTickTime", {
    elapsedMs: S.Number,
})

export const Message = S.Union([
    ClickedStart,
    DeterminedStartTime,
    ClickedStop,
    ClickedReset,
    Ticked,
    DeterminedTickTime,
])

export type Message = typeof Message.Type
