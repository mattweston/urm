import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedToggle = taggedStruct("ClickedToggle")
export const LoadedPreference = taggedStruct("LoadedPreference", {
    isActive: S.Boolean,
})
export const CompletedSavePreference = taggedStruct("CompletedSavePreference")

export const Message = S.Union([
    ClickedToggle,
    LoadedPreference,
    CompletedSavePreference,
])

export type Message = typeof Message.Type
