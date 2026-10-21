import clsx from "clsx"
import { Array, Option, pipe } from "effect"
import { createLazy, type Html, type HtmlBuilder } from "foldkit/html"

import { Button } from "@foldkit/ui"

import { canvasView } from "./canvas.view.ts"
import { errorDialogView, gridSizeConfirmDialogView } from "./dialog.view.ts"
import { isGridEmpty } from "./grid.ts"
import { historyPanelView } from "./history.view.ts"
import { ClickedExport, type PixelArtMessage } from "./message.ts"
import type { PixelArtModel } from "./model.ts"
import { currentPaletteTheme } from "./palette.ts"
import { toolPanelView } from "./toolbar.view.ts"

// Four memoized slots. The canvas is deliberately not one of them: it changes
// on every pointer move, so a cache there would only ever miss. These four are
// untouched by most strokes, and skipping them is the difference between
// rebuilding three panels per pixel and rebuilding one.
const lazyToolPanel = createLazy()
const lazyHistoryPanel = createLazy()
const lazyErrorDialog = createLazy()
const lazyGridSizeConfirmDialog = createLazy()

const downloadIcon = <ParentMessage>(
    className: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.svg(
        [
            h.AriaHidden(true),
            h.Class(className),
            h.Xmlns("http://www.w3.org/2000/svg"),
            h.Fill("none"),
            h.ViewBox("0 0 24 24"),
            h.StrokeWidth("1.5"),
            h.Stroke("currentColor"),
        ],
        [
            h.path([
                h.StrokeLinecap("round"),
                h.StrokeLinejoin("round"),
                h.D(
                    "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                ),
            ]),
        ]
    )

const headerView = <ParentMessage>(
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex items-center justify-between gap-4 pb-3 mb-4 border-b-(length:--surface-border-width) border-border"
            ),
        ],
        [
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Draw, then undo through the history strip. The canvas is saved to this browser and read back as a Flag before the first render.",
                ]
            ),
            Button.view(
                {
                    onClick: toParentMessage(ClickedExport()),
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    clsx(
                                        "flex items-center gap-2 px-3 py-1.5 rounded text-sm shrink-0 cursor-pointer [box-shadow:var(--shadow-control)]",
                                        "bg-muted text-foreground hover:bg-accent hover:text-accent-foreground",
                                        "transition motion-reduce:transition-none"
                                    )
                                ),
                            ],
                            [
                                downloadIcon("w-4 h-4", h),
                                h.span([], ["Export PNG"]),
                            ]
                        ),
                },
                h
            ),
        ]
    )

const contentView = <ParentMessage>(
    model: PixelArtModel,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const theme = currentPaletteTheme(model)

    return h.div(
        [
            h.Class(
                "grid gap-6 grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-[auto_1fr_auto] md:items-start w-full"
            ),
        ],
        [
            lazyToolPanel(toolPanelView, [
                model.mirrorMode,
                model.tool,
                model.gridSize,
                model.selectedColorIndex,
                isGridEmpty(model.grid),
                theme,
                model.paletteThemeIndex,
                model.themeListbox,
                toParentMessage,
                h,
            ]),
            h.div(
                [
                    h.Class(
                        "col-span-full min-[480px]:col-span-full md:col-span-1 -order-1 md:order-none min-w-0"
                    ),
                ],
                [canvasView(model, theme, toParentMessage, h)]
            ),
            // Mid-stroke the grid is still changing, so the strip shows the
            // snapshot the stroke started from. Otherwise "Current" would flip
            // on every pixel and the panel would rebuild with it.
            lazyHistoryPanel(historyPanelView, [
                model.undoStack,
                model.redoStack,
                model.isDrawing
                    ? pipe(
                          Array.last(model.undoStack),
                          Option.getOrElse(() => model.grid)
                      )
                    : model.grid,
                model.gridSize,
                theme,
                toParentMessage,
                h,
            ]),
        ]
    )
}

export const pixelArtView = <ParentMessage>(
    model: PixelArtModel,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-col")],
        [
            headerView(toParentMessage, h),
            contentView(model, toParentMessage, h),
            lazyErrorDialog(errorDialogView, [
                model.errorDialog,
                model.maybeExportError,
                toParentMessage,
                h,
            ]),
            lazyGridSizeConfirmDialog(gridSizeConfirmDialogView, [
                model.gridSizeConfirmDialog,
                model.maybePendingGridSize,
                toParentMessage,
                h,
            ]),
        ]
    )
