import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const SelectedGalleryImage = taggedStruct("SelectedGalleryImage", {
    id: S.String,
})
export const ClosedGalleryImage = taggedStruct("ClosedGalleryImage")
export const CompletedGalleryMasonry = taggedStruct("CompletedGalleryMasonry")

export const Message = S.Union([
    SelectedGalleryImage,
    ClosedGalleryImage,
    CompletedGalleryMasonry,
])
export type Message = typeof Message.Type
