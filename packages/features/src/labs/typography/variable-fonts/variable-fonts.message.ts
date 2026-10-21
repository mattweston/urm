import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const UpdatedWeight = taggedStruct("UpdatedWeight", { value: S.Number })
export const UpdatedSize = taggedStruct("UpdatedSize", { value: S.Number })
export const UpdatedSample = taggedStruct("UpdatedSample", { value: S.String })
export const SelectedSample = taggedStruct("SelectedSample", {
    value: S.String,
})
export const SelectedFont = taggedStruct("SelectedFont", { value: S.String })
export const ClickedNamedInstance = taggedStruct("ClickedNamedInstance", {
    weight: S.Number,
})
export const ToggledItalic = taggedStruct("ToggledItalic")
export const ToggledAnimation = taggedStruct("ToggledAnimation")
export const ClickedLoadStaticFonts = taggedStruct("ClickedLoadStaticFonts")

export const Message = S.Union([
    UpdatedWeight,
    UpdatedSize,
    UpdatedSample,
    SelectedSample,
    SelectedFont,
    ClickedNamedInstance,
    ToggledItalic,
    ToggledAnimation,
    ClickedLoadStaticFonts,
])
export type Message = typeof Message.Type
