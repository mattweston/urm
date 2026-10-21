import { Array, Match as M, Option } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import { Dialog, Listbox } from "@foldkit/ui"

import { ExportPng, saveCanvas } from "./command.ts"
import { DEFAULT_COLOR_INDEX } from "./constant.ts"
import {
    createEmptyGrid,
    erasePixels,
    floodFill,
    getMirroredPositions,
    isGridEmpty,
    pushHistory,
    setPixels,
} from "./grid.ts"
import { ThemeListbox } from "./listbox.ts"
import {
    GotErrorDialogMessage,
    GotGridSizeConfirmDialogMessage,
    GotThemeListboxMessage,
    type PixelArtMessage,
} from "./message.ts"
import type { PixelArtModel } from "./model.ts"
import { PALETTE_THEMES } from "./palette.ts"

type UpdateReturn = readonly [
    PixelArtModel,
    ReadonlyArray<Command.Command<PixelArtMessage>>,
]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const applyEraser = (model: PixelArtModel, x: number, y: number) =>
    erasePixels(
        model.grid,
        getMirroredPositions(x, y, model.gridSize, model.mirrorMode)
    )

const applyBrush = (model: PixelArtModel, x: number, y: number) =>
    setPixels(
        model.grid,
        getMirroredPositions(x, y, model.gridSize, model.mirrorMode),
        model.selectedColorIndex
    )

// Fill ignores the mirror: flooding both halves from one click fills the whole
// canvas more often than not.
const applyFill = (model: PixelArtModel, x: number, y: number) =>
    Array.reduce(
        getMirroredPositions(x, y, model.gridSize, "None"),
        model.grid,
        (currentGrid, [fillX, fillY]) =>
            floodFill(currentGrid, fillX, fillY, model.selectedColorIndex)
    )

const applyGridSizeChange = (
    model: PixelArtModel,
    size: number
): UpdateReturn => [
    evo(model, {
        grid: () => createEmptyGrid(size),
        gridSize: () => size,
        undoStack: () => [],
        redoStack: () => [],
        isDrawing: () => false,
        maybeHoveredCell: () => Option.none(),
    }),
    [],
]

// Resizing throws the drawing away, so an occupied canvas asks first. An empty
// one has nothing to lose and resizes immediately.
const requestGridSizeChange = (
    model: PixelArtModel,
    size: number
): UpdateReturn => {
    if (size === model.gridSize) {
        return [model, []]
    }

    if (isGridEmpty(model.grid)) {
        return applyGridSizeChange(model, size)
    }

    const { model: nextDialog, commands: dialogCommands = [] } = Dialog.open(
        model.gridSizeConfirmDialog
    )

    return [
        evo(model, {
            maybePendingGridSize: () => Option.some(size),
            gridSizeConfirmDialog: () => nextDialog,
        }),
        Command.mapMessages(dialogCommands, (dialogMessage) =>
            GotGridSizeConfirmDialogMessage({ message: dialogMessage })
        ),
    ]
}

export const pixelArtUpdate = (
    model: PixelArtModel,
    message: PixelArtMessage
): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            // Brush and Eraser start a stroke that EnteredCell extends, so the
            // save waits for ReleasedMouse. Fill is one discrete act and saves
            // straight away.
            PressedCell: ({ x, y }) =>
                M.value(model.tool).pipe(
                    withUpdateReturn,
                    M.when("Brush", () => [
                        evo(model, {
                            grid: () => applyBrush(model, x, y),
                            undoStack: () =>
                                pushHistory(model.undoStack, model.grid),
                            redoStack: () => [],
                            isDrawing: () => true,
                        }),
                        [],
                    ]),
                    M.when("Fill", () => {
                        const nextModel = evo(model, {
                            grid: () => applyFill(model, x, y),
                            undoStack: () =>
                                pushHistory(model.undoStack, model.grid),
                            redoStack: () => [],
                        })

                        return [nextModel, [saveCanvas(nextModel)]]
                    }),
                    M.when("Eraser", () => [
                        evo(model, {
                            grid: () => applyEraser(model, x, y),
                            undoStack: () =>
                                pushHistory(model.undoStack, model.grid),
                            redoStack: () => [],
                            isDrawing: () => true,
                        }),
                        [],
                    ]),
                    M.exhaustive
                ),

            EnteredCell: ({ x, y }) => {
                const withHover = evo(model, {
                    maybeHoveredCell: () => Option.some({ x, y }),
                })

                if (model.isDrawing && model.tool === "Brush") {
                    return [
                        evo(withHover, { grid: () => applyBrush(model, x, y) }),
                        [],
                    ]
                }

                if (model.isDrawing && model.tool === "Eraser") {
                    return [
                        evo(withHover, {
                            grid: () => applyEraser(model, x, y),
                        }),
                        [],
                    ]
                }

                return [withHover, []]
            },

            LeftCanvas: () => [
                evo(model, { maybeHoveredCell: () => Option.none() }),
                [],
            ],

            ReleasedMouse: () => {
                if (!model.isDrawing) {
                    return [model, []]
                }

                const nextModel = evo(model, { isDrawing: () => false })

                return [nextModel, [saveCanvas(nextModel)]]
            },

            SelectedColor: ({ colorIndex }) => {
                const nextModel = evo(model, {
                    selectedColorIndex: () => colorIndex,
                })

                return [nextModel, [saveCanvas(nextModel)]]
            },

            SelectedTool: ({ tool }) => [evo(model, { tool: () => tool }), []],

            SelectedGridSize: ({ size }) => requestGridSizeChange(model, size),

            ToggledMirrorHorizontal: () => {
                const nextMirrorMode = M.value(model.mirrorMode).pipe(
                    M.withReturnType<PixelArtModel["mirrorMode"]>(),
                    M.when("None", () => "Horizontal"),
                    M.when("Horizontal", () => "None"),
                    M.when("Vertical", () => "Both"),
                    M.when("Both", () => "Vertical"),
                    M.exhaustive
                )

                return [evo(model, { mirrorMode: () => nextMirrorMode }), []]
            },

            ToggledMirrorVertical: () => {
                const nextMirrorMode = M.value(model.mirrorMode).pipe(
                    M.withReturnType<PixelArtModel["mirrorMode"]>(),
                    M.when("None", () => "Vertical"),
                    M.when("Vertical", () => "None"),
                    M.when("Horizontal", () => "Both"),
                    M.when("Both", () => "Horizontal"),
                    M.exhaustive
                )

                return [evo(model, { mirrorMode: () => nextMirrorMode }), []]
            },

            // Undo and redo are a pair of stacks over whole-grid snapshots.
            // Nothing is recomputed on the way back: the previous grid is the
            // value that was already there.
            ClickedUndo: () =>
                Array.match(model.undoStack, {
                    onEmpty: () => [model, []],
                    onNonEmpty: (nonEmptyUndoStack) => {
                        const nextModel = evo(model, {
                            grid: () => Array.lastNonEmpty(nonEmptyUndoStack),
                            undoStack: () =>
                                Array.initNonEmpty(nonEmptyUndoStack),
                            redoStack: () => [...model.redoStack, model.grid],
                        })

                        return [nextModel, [saveCanvas(nextModel)]]
                    },
                }),

            ClickedRedo: () =>
                Array.match(model.redoStack, {
                    onEmpty: () => [model, []],
                    onNonEmpty: (nonEmptyRedoStack) => {
                        const nextModel = evo(model, {
                            grid: () => Array.lastNonEmpty(nonEmptyRedoStack),
                            undoStack: () => [...model.undoStack, model.grid],
                            redoStack: () =>
                                Array.initNonEmpty(nonEmptyRedoStack),
                        })

                        return [nextModel, [saveCanvas(nextModel)]]
                    },
                }),

            // Jumping back several steps is undo applied repeatedly: everything
            // skipped over moves onto the redo stack in reverse, so a jump
            // forward again lands where it started.
            ClickedHistoryStep: ({ stepIndex }) =>
                Option.match(Array.get(model.undoStack, stepIndex), {
                    onNone: () => [model, []],
                    onSome: (targetGrid) => {
                        const statesAfterTarget = Array.drop(
                            model.undoStack,
                            stepIndex + 1
                        )

                        const nextModel = evo(model, {
                            grid: () => targetGrid,
                            undoStack: () =>
                                Array.take(model.undoStack, stepIndex),
                            redoStack: () => [
                                ...model.redoStack,
                                model.grid,
                                ...Array.reverse(statesAfterTarget),
                            ],
                        })

                        return [nextModel, [saveCanvas(nextModel)]]
                    },
                }),

            ClickedRedoStep: ({ stepIndex }) =>
                Option.match(Array.get(model.redoStack, stepIndex), {
                    onNone: () => [model, []],
                    onSome: (targetGrid) => {
                        const statesBetweenCurrentAndTarget = Array.drop(
                            model.redoStack,
                            stepIndex + 1
                        )

                        const nextModel = evo(model, {
                            grid: () => targetGrid,
                            undoStack: () => [
                                ...model.undoStack,
                                model.grid,
                                ...Array.reverse(statesBetweenCurrentAndTarget),
                            ],
                            redoStack: () =>
                                Array.take(model.redoStack, stepIndex),
                        })

                        return [nextModel, [saveCanvas(nextModel)]]
                    },
                }),

            ClickedClear: () => {
                const nextModel = evo(model, {
                    grid: () => createEmptyGrid(model.gridSize),
                    undoStack: () => pushHistory(model.undoStack, model.grid),
                    redoStack: () => [],
                })

                return [nextModel, [saveCanvas(nextModel)]]
            },

            ClickedExport: () => [
                model,
                [
                    ExportPng({
                        grid: model.grid,
                        gridSize: model.gridSize,
                        paletteThemeIndex: model.paletteThemeIndex,
                    }),
                ],
            ],

            SucceededExportPng: () => [model, []],

            CompletedSaveCanvas: () => [model, []],

            FailedExportPng: ({ error }) => {
                const {
                    model: nextErrorDialog,
                    commands: errorDialogCommands = [],
                } = Dialog.open(model.errorDialog)

                return [
                    evo(model, {
                        maybeExportError: () => Option.some(error),
                        errorDialog: () => nextErrorDialog,
                    }),
                    Command.mapMessages(errorDialogCommands, (dialogMessage) =>
                        GotErrorDialogMessage({ message: dialogMessage })
                    ),
                ]
            },

            GotErrorDialogMessage: ({ message }) => {
                const {
                    model: nextErrorDialog,
                    commands: errorDialogCommands = [],
                    outMessage: maybeOutMessage_value,
                } = Dialog.update(model.errorDialog, message)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const mappedCommands = Command.mapMessages(
                    errorDialogCommands,
                    (dialogMessage) =>
                        GotErrorDialogMessage({ message: dialogMessage })
                )

                return Option.match(maybeOutMessage, {
                    onNone: () => [
                        evo(model, { errorDialog: () => nextErrorDialog }),
                        mappedCommands,
                    ],
                    onSome: M.type<Dialog.OutMessage>().pipe(
                        withUpdateReturn,
                        M.tagsExhaustive({
                            Opened: () => [
                                evo(model, {
                                    errorDialog: () => nextErrorDialog,
                                }),
                                mappedCommands,
                            ],
                            Closed: () => [
                                evo(model, {
                                    errorDialog: () => nextErrorDialog,
                                    maybeExportError: () => Option.none(),
                                }),
                                mappedCommands,
                            ],
                        })
                    ),
                })
            },

            GotThemeListboxMessage: ({ message }) => {
                const {
                    model: nextThemeListbox,
                    commands: themeListboxCommands = [],
                    outMessage: maybeOutMessage_value,
                } = ThemeListbox.update(model.themeListbox, message)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const mappedCommands = Command.mapMessages(
                    themeListboxCommands,
                    (listboxMessage) =>
                        GotThemeListboxMessage({ message: listboxMessage })
                )

                return Option.match(maybeOutMessage, {
                    onNone: () => [
                        evo(model, { themeListbox: () => nextThemeListbox }),
                        mappedCommands,
                    ],
                    onSome: M.type<Listbox.OutMessage>().pipe(
                        withUpdateReturn,
                        M.tagsExhaustive({
                            Selected: ({ value }) => {
                                const themeIndex = Number(value)

                                return Option.match(
                                    Array.get(PALETTE_THEMES, themeIndex),
                                    {
                                        onNone: () => [
                                            evo(model, {
                                                themeListbox: () =>
                                                    nextThemeListbox,
                                            }),
                                            mappedCommands,
                                        ],
                                        onSome: () => {
                                            // The colour index means a
                                            // different colour under the new
                                            // theme, so the selection resets
                                            // rather than silently changing
                                            // what the brush paints.
                                            const nextModel = evo(model, {
                                                paletteThemeIndex: () =>
                                                    themeIndex,
                                                selectedColorIndex: () =>
                                                    DEFAULT_COLOR_INDEX,
                                                themeListbox: () =>
                                                    nextThemeListbox,
                                            })

                                            return [
                                                nextModel,
                                                [
                                                    ...mappedCommands,
                                                    saveCanvas(nextModel),
                                                ],
                                            ]
                                        },
                                    }
                                )
                            },
                        })
                    ),
                })
            },

            ConfirmedGridSizeChange: () =>
                Option.match(model.maybePendingGridSize, {
                    onNone: () => [model, []],
                    onSome: (pendingSize) => {
                        const {
                            model: nextDialog,
                            commands: dialogCommands = [],
                        } = Dialog.close(model.gridSizeConfirmDialog)
                        const mappedDialogCommands = Command.mapMessages(
                            dialogCommands,
                            (dialogMessage) =>
                                GotGridSizeConfirmDialogMessage({
                                    message: dialogMessage,
                                })
                        )
                        const [resizedModel] = applyGridSizeChange(
                            model,
                            pendingSize
                        )
                        const nextModel = evo(resizedModel, {
                            gridSizeConfirmDialog: () => nextDialog,
                            maybePendingGridSize: () => Option.none(),
                        })

                        return [
                            nextModel,
                            [...mappedDialogCommands, saveCanvas(nextModel)],
                        ]
                    },
                }),

            GotGridSizeConfirmDialogMessage: ({ message }) => {
                const {
                    model: nextDialog,
                    commands: dialogCommands = [],
                    outMessage: maybeOutMessage_value,
                } = Dialog.update(model.gridSizeConfirmDialog, message)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const mappedCommands = Command.mapMessages(
                    dialogCommands,
                    (dialogMessage) =>
                        GotGridSizeConfirmDialogMessage({
                            message: dialogMessage,
                        })
                )

                return Option.match(maybeOutMessage, {
                    onNone: () => [
                        evo(model, {
                            gridSizeConfirmDialog: () => nextDialog,
                        }),
                        mappedCommands,
                    ],
                    onSome: M.type<Dialog.OutMessage>().pipe(
                        withUpdateReturn,
                        M.tagsExhaustive({
                            Opened: () => [
                                evo(model, {
                                    gridSizeConfirmDialog: () => nextDialog,
                                }),
                                mappedCommands,
                            ],
                            Closed: () => [
                                evo(model, {
                                    gridSizeConfirmDialog: () => nextDialog,
                                    maybePendingGridSize: () => Option.none(),
                                }),
                                mappedCommands,
                            ],
                        })
                    ),
                })
            },
        })
    )
