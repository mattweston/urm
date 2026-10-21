import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const FocusedPreview = taggedStruct("FocusedPreview")
export const HoveredPreview = taggedStruct("HoveredPreview")
export const ClickedPreview = taggedStruct("ClickedPreview")
export const LoadedPlayer = taggedStruct("LoadedPlayer")
export const RetriedHandshake = taggedStruct("RetriedHandshake", {
    attempt: S.Number,
})
export const ReceivedPlayerEvent = taggedStruct("ReceivedPlayerEvent", {
    raw: S.String,
    playerState: S.optional(S.Number),
    currentTimeSeconds: S.optional(S.Number),
    durationSeconds: S.optional(S.Number),
})
export const ReceivedPlayerError = taggedStruct("ReceivedPlayerError", {
    raw: S.String,
    code: S.Number,
})
export const ClickedPlay = taggedStruct("ClickedPlay")
export const ClickedPause = taggedStruct("ClickedPause")
export const ClickedSeek = taggedStruct("ClickedSeek", { seconds: S.Number })
export const CompletedPlayerCommand = taggedStruct("CompletedPlayerCommand")

export const ToggledDebugger = taggedStruct("ToggledDebugger")
export const ChangedSeekInput = taggedStruct("ChangedSeekInput", {
    value: S.String,
})
export const SubmittedSeek = taggedStruct("SubmittedSeek")
export const ToggledDebugFilter = taggedStruct("ToggledDebugFilter", {
    label: S.String,
})
export const ClearedDebugFilters = taggedStruct("ClearedDebugFilters")

export const Message = S.Union([
    FocusedPreview,
    HoveredPreview,
    ClickedPreview,
    LoadedPlayer,
    RetriedHandshake,
    ReceivedPlayerEvent,
    ReceivedPlayerError,
    ClickedPlay,
    ClickedPause,
    ClickedSeek,
    CompletedPlayerCommand,
    ToggledDebugger,
    ChangedSeekInput,
    SubmittedSeek,
    ToggledDebugFilter,
    ClearedDebugFilters,
])

export type Message = typeof Message.Type
