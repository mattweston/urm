import { taggedStruct } from "foldkit/schema"
import { Schema as S } from "effect"

import { PreviewShape } from "./model.ts"

export const ClickedAddBox = taggedStruct("ClickedAddBox")
export const ClickedRemoveBox = taggedStruct("ClickedRemoveBox")
export const SelectedPreviewShape = taggedStruct("SelectedPreviewShape", {
    preview_shape: PreviewShape,
})

export const Message = S.Union([
    ClickedAddBox,
    ClickedRemoveBox,
    SelectedPreviewShape,
])

export type Message = typeof Message.Type
