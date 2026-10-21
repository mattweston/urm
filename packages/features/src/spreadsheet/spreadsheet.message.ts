import { Schema as S } from "effect"
import { VirtualList } from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

const CellAddress = S.Struct({ row: S.Number, column: S.Number })

export const GotRowsMessage = taggedStruct("GotRowsMessage", {
    message: VirtualList.Message,
})
export const SelectedCell = taggedStruct("SelectedCell", {
    address: CellAddress,
})
export const DoubleClickedCell = taggedStruct("DoubleClickedCell", {
    address: CellAddress,
})
export const UpdatedEditorDraft = taggedStruct("UpdatedEditorDraft", {
    value: S.String,
})
export const CommittedEditor = taggedStruct("CommittedEditor")
export const SubmittedEditor = taggedStruct("SubmittedEditor")
export const CancelledEditor = taggedStruct("CancelledEditor")
export const CompletedFocusEditor = taggedStruct("CompletedFocusEditor")
export const CompletedFocusCell = taggedStruct("CompletedFocusCell")
export const PressedGridKey = taggedStruct("PressedGridKey", { key: S.String })
export const UpdatedNameDraft = taggedStruct("UpdatedNameDraft", {
    value: S.String,
})
export const SubmittedName = taggedStruct("SubmittedName")
export const ScrolledColumns = taggedStruct("ScrolledColumns", {
    scrollLeft: S.Number,
    viewportWidth: S.Number,
})
export const SucceededLoadWorkbook = taggedStruct("SucceededLoadWorkbook", {
    cells: S.Record(S.String, S.String),
})
export const FailedLoadWorkbook = taggedStruct("FailedLoadWorkbook")
export const SucceededSaveWorkbook = taggedStruct("SucceededSaveWorkbook")
export const FailedSaveWorkbook = taggedStruct("FailedSaveWorkbook")

export const Message = S.Union([
    GotRowsMessage,
    SelectedCell,
    DoubleClickedCell,
    UpdatedEditorDraft,
    CommittedEditor,
    SubmittedEditor,
    CancelledEditor,
    CompletedFocusEditor,
    CompletedFocusCell,
    PressedGridKey,
    UpdatedNameDraft,
    SubmittedName,
    ScrolledColumns,
    SucceededLoadWorkbook,
    FailedLoadWorkbook,
    SucceededSaveWorkbook,
    FailedSaveWorkbook,
])

export type Message = typeof Message.Type
