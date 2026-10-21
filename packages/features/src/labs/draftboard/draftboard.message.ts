import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { BoardId, Document, Tool } from "./draftboard.model.ts"

export const ChangedBoard = taggedStruct("ChangedBoard", { id: BoardId })
export const SelectedTool = taggedStruct("SelectedTool", { tool: Tool })
export const ClickedShape = taggedStruct("ClickedShape", {
    id: S.String,
    is_additive: S.Boolean,
})
export const ClickedCanvas = taggedStruct("ClickedCanvas")
export const AddedRectangle = taggedStruct("AddedRectangle")
export const NudgedSelection = taggedStruct("NudgedSelection", {
    delta_x: S.Number,
    delta_y: S.Number,
})
export const DeletedSelection = taggedStruct("DeletedSelection")
export const ChangedShapeLabel = taggedStruct("ChangedShapeLabel", {
    id: S.String,
    value: S.String,
})
export const ClickedUndo = taggedStruct("ClickedUndo")
export const ClickedRedo = taggedStruct("ClickedRedo")
export const ChangedZoom = taggedStruct("ChangedZoom", { amount: S.Number })
export const ToggledOnline = taggedStruct("ToggledOnline")
export const CompletedSave = taggedStruct("CompletedSave", {
    revision: S.Number,
    document: Document,
    is_success: S.Boolean,
})
export const Message = S.Union([
    ChangedBoard,
    SelectedTool,
    ClickedShape,
    ClickedCanvas,
    AddedRectangle,
    NudgedSelection,
    DeletedSelection,
    ChangedShapeLabel,
    ClickedUndo,
    ClickedRedo,
    ChangedZoom,
    ToggledOnline,
    CompletedSave,
])
export type Message = typeof Message.Type
