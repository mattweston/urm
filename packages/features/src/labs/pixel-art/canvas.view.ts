import { Array, Equal, Option, pipe } from "effect"
import { createKeyedLazy, type Html, type HtmlBuilder } from "foldkit/html"

import { EMPTY_COLOR } from "./constant.ts"
import { floodFill, getMirroredPositions } from "./grid.ts"
import {
    EnteredCell,
    LeftCanvas,
    PressedCell,
    type PixelArtMessage,
} from "./message.ts"
import type {
    Cell,
    Grid,
    HexColor,
    PaletteIndex,
    PixelArtModel,
} from "./model.ts"
import { resolveColor, type PaletteTheme } from "./palette.ts"

const lazyRow = createKeyedLazy()

// One shared empty array rather than a fresh literal per render: the row lazy
// compares its arguments by reference, and a new [] every frame would miss on
// every untouched row.
export const EMPTY_PREVIEW_POSITIONS: ReadonlyArray<readonly [number, number]> =
    []

export const computeFillPreview = (
    grid: Grid,
    startX: number,
    startY: number,
    fillColorIndex: PaletteIndex
): ReadonlyArray<readonly [number, number]> => {
    const filledGrid = floodFill(grid, startX, startY, fillColorIndex)
    const positions: Array<readonly [number, number]> = []

    Array.forEach(filledGrid, (row, y) => {
        Array.forEach(row, (cell, x) => {
            if (
                !Equal.equals(
                    cell,
                    pipe(
                        Array.get(grid, y),
                        Option.flatMap(Array.get(x)),
                        Option.getOrElse(() => Option.none<PaletteIndex>())
                    )
                )
            ) {
                positions.push([x, y])
            }
        })
    })

    return Array.isArrayEmpty(positions) ? EMPTY_PREVIEW_POSITIONS : positions
}

// The preview is what the current tool would do from where the pointer is. It
// is derived on every render rather than stored, so nothing in the Model can
// disagree with the grid.
export const computePreviewPositions = (
    model: PixelArtModel
): ReadonlyArray<readonly [number, number]> => {
    if (model.isDrawing) {
        return EMPTY_PREVIEW_POSITIONS
    }

    return Option.match(model.maybeHoveredCell, {
        onNone: () => EMPTY_PREVIEW_POSITIONS,
        onSome: ({ x, y }) => {
            if (model.tool === "Brush" || model.tool === "Eraser") {
                return getMirroredPositions(
                    x,
                    y,
                    model.gridSize,
                    model.mirrorMode
                )
            }

            if (model.tool === "Fill") {
                return computeFillPreview(
                    model.grid,
                    x,
                    y,
                    model.selectedColorIndex
                )
            }

            return EMPTY_PREVIEW_POSITIONS
        },
    })
}

export const rowView = <ParentMessage>(
    row: ReadonlyArray<Cell>,
    y: number,
    previewColor: HexColor,
    previewPositions: ReadonlyArray<readonly [number, number]>,
    theme: PaletteTheme,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Style({ display: "flex", flex: "1" })],
        Array.map(row, (cell, x) => {
            const isPreview = previewPositions.some(
                ([previewX, previewY]) => previewX === x && previewY === y
            )
            const displayColor = isPreview
                ? previewColor
                : resolveColor(cell, theme)

            return h.div([
                h.OnMouseDown(toParentMessage(PressedCell({ x, y }))),
                h.OnMouseEnter(toParentMessage(EnteredCell({ x, y }))),
                h.Style({ flex: "1", backgroundColor: displayColor }),
            ])
        })
    )

export const canvasView = <ParentMessage>(
    model: PixelArtModel,
    theme: PaletteTheme,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const previewPositions = computePreviewPositions(model)
    const previewColor =
        model.tool === "Eraser"
            ? EMPTY_COLOR
            : (theme.colors[model.selectedColorIndex] ?? EMPTY_COLOR)

    return h.div(
        [h.Class("flex flex-col items-center gap-4 min-w-0 self-start")],
        [
            h.div(
                [
                    h.OnMouseLeave(toParentMessage(LeftCanvas())),
                    h.Class("w-full max-w-lg"),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "cursor-crosshair select-none w-full aspect-square rounded-[var(--radius-surface)] overflow-hidden border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                            ),
                            h.Style({
                                display: "flex",
                                "flex-direction": "column",
                                backgroundColor: EMPTY_COLOR,
                            }),
                        ],
                        Array.map(model.grid, (row, y) => {
                            const rowPreviewPositions = pipe(
                                previewPositions,
                                Array.filter(
                                    ([, positionY]) => positionY === y
                                ),
                                Array.match({
                                    onEmpty: () => EMPTY_PREVIEW_POSITIONS,
                                    onNonEmpty: (filtered) => filtered,
                                })
                            )

                            // A fixed positional grid, so the row index is the
                            // stable identity: row 3 is row 3 for the lifetime
                            // of this canvas size.
                            // oxlint-disable-next-line foldkit/no-array-index-view-keys
                            return lazyRow(`${y}`, rowView, [
                                row,
                                y,
                                previewColor,
                                rowPreviewPositions,
                                theme,
                                toParentMessage,
                                h,
                            ])
                        })
                    ),
                ]
            ),
        ]
    )
}
