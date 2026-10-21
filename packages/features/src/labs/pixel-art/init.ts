import { Option, Schema as S } from "effect"
import type { Command } from "foldkit"

import { Dialog, Listbox } from "@foldkit/ui"

import {
    DEFAULT_COLOR_INDEX,
    DEFAULT_GRID_SIZE,
    DEFAULT_PALETTE_THEME_INDEX,
} from "./constant.ts"
import { createEmptyGrid } from "./grid.ts"
import type { PixelArtMessage } from "./message.ts"
import {
    SavedCanvasJsonString,
    type PixelArtModel,
    type SavedCanvas,
} from "./model.ts"
import { STORAGE_KEY } from "./constant.ts"

export const savedCanvasFromLocalStorage = (): Option.Option<SavedCanvas> => {
    try {
        const value = globalThis.localStorage?.getItem(STORAGE_KEY)
        return value === null || value === undefined
            ? Option.none()
            : S.decodeUnknownOption(SavedCanvasJsonString)(value)
    } catch {
        return Option.none()
    }
}

export const ERROR_DIALOG_ID = "pixel-art-export-error-dialog"
export const GRID_SIZE_CONFIRM_DIALOG_ID = "pixel-art-grid-size-confirm-dialog"
export const THEME_LISTBOX_ID = "pixel-art-theme-picker"

// The saved canvas arrives as a Flag rather than through a Command: it is read
// before the first render, so the page never flashes an empty grid on the way
// to the drawing that was already there.
export const pixelArtInit = (
    maybeSavedCanvas: Option.Option<SavedCanvas>
): readonly [
    PixelArtModel,
    ReadonlyArray<Command.Command<PixelArtMessage>>,
] => [
    {
        grid: Option.match(maybeSavedCanvas, {
            onNone: () => createEmptyGrid(DEFAULT_GRID_SIZE),
            onSome: ({ grid }) => grid,
        }),
        undoStack: [],
        redoStack: [],
        selectedColorIndex: Option.match(maybeSavedCanvas, {
            onNone: () => DEFAULT_COLOR_INDEX,
            onSome: ({ selectedColorIndex }) => selectedColorIndex,
        }),
        gridSize: Option.match(maybeSavedCanvas, {
            onNone: () => DEFAULT_GRID_SIZE,
            onSome: ({ gridSize }) => gridSize,
        }),
        tool: "Brush",
        mirrorMode: "None",
        isDrawing: false,
        maybeHoveredCell: Option.none(),
        errorDialog: Dialog.init({ id: ERROR_DIALOG_ID }),
        maybeExportError: Option.none(),
        paletteThemeIndex: Option.match(maybeSavedCanvas, {
            onNone: () => DEFAULT_PALETTE_THEME_INDEX,
            onSome: ({ paletteThemeIndex }) => paletteThemeIndex,
        }),
        gridSizeConfirmDialog: Dialog.init({
            id: GRID_SIZE_CONFIRM_DIALOG_ID,
        }),
        maybePendingGridSize: Option.none(),
        themeListbox: Listbox.init({ id: THEME_LISTBOX_ID }),
    },
    [],
]
