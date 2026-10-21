import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const CompletedRenderedAbc = taggedStruct("CompletedRenderedAbc", {
    abcNotation: S.String,
})

export const ClickedExample = taggedStruct("ClickedExample", {
    abcNotation: S.String,
})

export const ClickedPlay = taggedStruct("ClickedPlay")

export const ClickedStop = taggedStruct("ClickedStop")

export const CompletedPlayback = taggedStruct("CompletedPlayback")

export const CompletedStopPlayback = taggedStruct("CompletedStopPlayback")

export const ToggledTablature = taggedStruct("ToggledTablature")

export const Message = S.Union([
    CompletedRenderedAbc,
    ClickedExample,
    ClickedPlay,
    ClickedStop,
    CompletedPlayback,
    CompletedStopPlayback,
    ToggledTablature,
])

export type Message = typeof Message.Type
