import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const SelectedTemplateChanged = taggedStruct("SelectedTemplateChanged", {
    templateId: S.String,
})

export const ClosedTemplatePreview = taggedStruct("ClosedTemplatePreview")

export const Message = S.Union([SelectedTemplateChanged, ClosedTemplatePreview])

export type Message = typeof Message.Type
