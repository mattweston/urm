import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { Dialog, Listbox } from "@foldkit/ui"

import { PaletteIndex, Tool } from "./model.ts"

export const PressedCell = taggedStruct("PressedCell", {
    x: S.Number,
    y: S.Number,
})
export const EnteredCell = taggedStruct("EnteredCell", {
    x: S.Number,
    y: S.Number,
})
export const LeftCanvas = taggedStruct("LeftCanvas")
export const ReleasedMouse = taggedStruct("ReleasedMouse")
export const SelectedColor = taggedStruct("SelectedColor", {
    colorIndex: PaletteIndex,
})
export const SelectedTool = taggedStruct("SelectedTool", { tool: Tool })
export const SelectedGridSize = taggedStruct("SelectedGridSize", {
    size: S.Number,
})
export const ToggledMirrorHorizontal = taggedStruct("ToggledMirrorHorizontal")
export const ToggledMirrorVertical = taggedStruct("ToggledMirrorVertical")
export const ClickedUndo = taggedStruct("ClickedUndo")
export const ClickedRedo = taggedStruct("ClickedRedo")
export const ClickedHistoryStep = taggedStruct("ClickedHistoryStep", {
    stepIndex: S.Number,
})
export const ClickedRedoStep = taggedStruct("ClickedRedoStep", {
    stepIndex: S.Number,
})
export const ClickedClear = taggedStruct("ClickedClear")
export const ClickedExport = taggedStruct("ClickedExport")
export const SucceededExportPng = taggedStruct("SucceededExportPng")
export const FailedExportPng = taggedStruct("FailedExportPng", {
    error: S.String,
})
export const GotErrorDialogMessage = taggedStruct("GotErrorDialogMessage", {
    message: Dialog.Message,
})
export const ConfirmedGridSizeChange = taggedStruct("ConfirmedGridSizeChange")
export const GotGridSizeConfirmDialogMessage = taggedStruct(
    "GotGridSizeConfirmDialogMessage",
    { message: Dialog.Message }
)
export const GotThemeListboxMessage = taggedStruct("GotThemeListboxMessage", {
    message: Listbox.Message,
})
export const CompletedSaveCanvas = taggedStruct("CompletedSaveCanvas")

export const PixelArtMessage = S.Union([
    PressedCell,
    EnteredCell,
    LeftCanvas,
    ReleasedMouse,
    SelectedColor,
    SelectedTool,
    SelectedGridSize,
    ToggledMirrorHorizontal,
    ToggledMirrorVertical,
    ClickedUndo,
    ClickedRedo,
    ClickedHistoryStep,
    ClickedRedoStep,
    ClickedClear,
    ClickedExport,
    SucceededExportPng,
    FailedExportPng,
    GotErrorDialogMessage,
    GotThemeListboxMessage,
    ConfirmedGridSizeChange,
    GotGridSizeConfirmDialogMessage,
    CompletedSaveCanvas,
])
export type PixelArtMessage = typeof PixelArtMessage.Type
