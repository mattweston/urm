import clsx from "clsx"
import { Array, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import { Button } from "@foldkit/ui"

import { THUMBNAIL_CELL_SIZE, VISIBLE_HISTORY_COUNT } from "./constant.ts"
import {
    ClickedHistoryStep,
    ClickedRedo,
    ClickedRedoStep,
    ClickedUndo,
    type PixelArtMessage,
} from "./message.ts"
import type { Grid } from "./model.ts"
import { resolveColor, type PaletteTheme } from "./palette.ts"

const sectionLabel = <ParentMessage>(
    text: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2"
            ),
        ],
        [text]
    )

const stepButton = <ParentMessage>(
    label: string,
    shortcut: string,
    isEnabled: boolean,
    message: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Button.view(
        {
            onClick: message,
            isDisabled: !isEnabled,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            clsx(
                                "flex items-center justify-between px-3 py-1.5 rounded text-sm transition motion-reduce:transition-none bg-muted w-full",
                                {
                                    "text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer":
                                        isEnabled,
                                    "text-muted-foreground opacity-40 cursor-not-allowed":
                                        !isEnabled,
                                }
                            )
                        ),
                    ],
                    [
                        h.span([], [label]),
                        h.span([h.Class("opacity-70")], [shortcut]),
                    ]
                ),
        },
        h
    )

// Each entry renders the whole grid it stands for, so the panel is a strip of
// the drawing at every point it has been. Clicking one is a jump, not a
// sequence of undos.
const thumbnailEntry = <ParentMessage>(
    grid: Grid,
    gridSize: number,
    isActive: boolean,
    label: string,
    maybeOnClick: Option.Option<ParentMessage>,
    theme: PaletteTheme,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                clsx("flex items-center gap-2 px-2 py-1.5 rounded", {
                    "bg-primary text-primary-foreground": isActive,
                    "bg-muted cursor-pointer hover:bg-accent hover:text-accent-foreground":
                        !isActive,
                })
            ),
            ...Array.fromOption(Option.map(maybeOnClick, h.OnClick)),
            ...Array.fromOption(
                Option.map(maybeOnClick, (clickMessage) =>
                    h.OnKeyDownPreventDefault((key) =>
                        key === "Enter" || key === " "
                            ? Option.some(clickMessage)
                            : Option.none()
                    )
                )
            ),
            ...(Option.isSome(maybeOnClick)
                ? [h.Role("button"), h.Tabindex(0)]
                : []),
        ],
        [
            h.div(
                [
                    h.Class("flex-shrink-0"),
                    h.Style({
                        display: "grid",
                        "grid-template-columns": `repeat(${gridSize}, ${THUMBNAIL_CELL_SIZE}px)`,
                    }),
                ],
                Array.flatMap(grid, (row) =>
                    Array.map(row, (cell) =>
                        h.div([
                            h.Style({
                                width: `${THUMBNAIL_CELL_SIZE}px`,
                                height: `${THUMBNAIL_CELL_SIZE}px`,
                                backgroundColor: resolveColor(cell, theme),
                            }),
                        ])
                    )
                )
            ),
            h.span(
                [
                    h.Class(
                        clsx("text-[10px] truncate", {
                            "opacity-90": isActive,
                            "text-muted-foreground": !isActive,
                        })
                    ),
                ],
                [label]
            ),
        ]
    )

export const historyPanelView = <ParentMessage>(
    undoStack: ReadonlyArray<Grid>,
    redoStack: ReadonlyArray<Grid>,
    grid: Grid,
    gridSize: number,
    theme: PaletteTheme,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const undoCount = undoStack.length
    const redoCount = redoStack.length
    const visibleUndoEntries = Array.takeRight(undoStack, VISIBLE_HISTORY_COUNT)
    const hiddenUndoCount = undoCount - visibleUndoEntries.length

    return h.div(
        [h.Class("w-full md:w-44 flex flex-col flex-shrink-0")],
        [
            sectionLabel("History", h),
            h.div(
                [h.Class("flex flex-col gap-1.5")],
                [
                    stepButton(
                        "Undo",
                        "⌘Z",
                        undoCount > 0,
                        toParentMessage(ClickedUndo()),
                        h
                    ),
                    stepButton(
                        "Redo",
                        "⌘⇧Z",
                        redoCount > 0,
                        toParentMessage(ClickedRedo()),
                        h
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex flex-col gap-1.5 overflow-y-auto max-h-[420px] mt-3"
                    ),
                ],
                [
                    ...Array.map(redoStack, (entryGrid, index) =>
                        thumbnailEntry(
                            entryGrid,
                            gridSize,
                            false,
                            `Forward ${redoCount - index}`,
                            Option.some(
                                toParentMessage(
                                    ClickedRedoStep({ stepIndex: index })
                                )
                            ),
                            theme,
                            h
                        )
                    ),
                    thumbnailEntry(
                        grid,
                        gridSize,
                        true,
                        "Current",
                        Option.none(),
                        theme,
                        h
                    ),
                    ...Array.map(
                        Array.reverse(visibleUndoEntries),
                        (entryGrid, index) =>
                            thumbnailEntry(
                                entryGrid,
                                gridSize,
                                false,
                                `Back ${index + 1}`,
                                Option.some(
                                    toParentMessage(
                                        ClickedHistoryStep({
                                            stepIndex: undoCount - 1 - index,
                                        })
                                    )
                                ),
                                theme,
                                h
                            )
                    ),
                    ...(hiddenUndoCount > 0
                        ? [
                              h.div(
                                  [
                                      h.Class(
                                          "text-[10px] text-muted-foreground text-center py-1"
                                      ),
                                  ],
                                  [`${hiddenUndoCount} more…`]
                              ),
                          ]
                        : []),
                ]
            ),
        ]
    )
}
