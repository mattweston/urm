import { Array, Effect, Match as M, Option, String, pipe } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { modifyFields } from "foldkit/struct"
import { DEFAULT_COLUMNS } from "./kanban.constant.ts"
import { appendCard, reorder } from "./kanban.column.ts"
import {
    FocusAddCardInput,
    generateCardId,
    LoadBoard,
    saveBoard,
} from "./kanban.command.ts"
import { GotDragAndDropMessage, type Message } from "./kanban.message.ts"
import type { Model } from "./kanban.model.ts"
import { emptyModel } from "./kanban.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const findCardTitle = (
    columns: ReadonlyArray<Model["columns"][number]>,
    cardId: string
): string =>
    pipe(
        columns,
        Array.flatMap(({ cards }) => cards),
        Array.findFirst(({ id }) => id === cardId),
        Option.match({
            onNone: () => cardId,
            onSome: ({ title }) => title,
        })
    )

const findColumnName = (
    columns: ReadonlyArray<Model["columns"][number]>,
    columnId: string
): string =>
    pipe(
        columns,
        Array.findFirst(({ id }) => id === columnId),
        Option.match({
            onNone: () => columnId,
            onSome: ({ name }) => name,
        })
    )

const announceKeyboardDrag = (
    model: Model,
    nextDragAndDrop: Ui.DragAndDrop.Model
): string =>
    M.value(nextDragAndDrop.dragState).pipe(
        M.withReturnType<string>(),
        M.tag("KeyboardDragging", (nextState) => {
            const wasIdle = model.dragAndDrop.dragState._tag === "Idle"

            if (wasIdle) {
                const title = findCardTitle(model.columns, nextState.itemId)

                return `Picked up ${title}. Use arrow keys to move within column, Tab to move between columns, Space to drop, Escape to cancel.`
            }

            if (model.dragAndDrop.dragState._tag !== "KeyboardDragging") {
                return model.announcement
            }

            const prevState = model.dragAndDrop.dragState
            const columnName = findColumnName(
                model.columns,
                nextState.targetContainerId
            )

            if (prevState.targetContainerId !== nextState.targetContainerId) {
                return `Moved to ${columnName}, position ${nextState.targetIndex + 1}.`
            }

            if (prevState.targetIndex !== nextState.targetIndex) {
                return `Position ${nextState.targetIndex + 1} in ${columnName}.`
            }

            return model.announcement
        }),
        M.orElse(() => model.announcement)
    )

const screenReaderTextForDrop = (
    model: Model,
    outMessage: Ui.DragAndDrop.OutMessage
): string =>
    M.value(outMessage).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            Reordered: ({ itemId, toContainerId, toIndex }) => {
                const title = findCardTitle(model.columns, itemId)
                const columnName = findColumnName(model.columns, toContainerId)

                return `Dropped ${title} in position ${toIndex + 1} of ${columnName}.`
            },
            Cancelled: () =>
                Option.match(
                    Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop),
                    {
                        onNone: () => "Drag cancelled.",
                        onSome: (id) => {
                            const title = findCardTitle(model.columns, id)
                            return `Drag cancelled, ${title} returned to original position.`
                        },
                    }
                ),
        })
    )

export const init = (): UpdateReturn => [
    emptyModel(DEFAULT_COLUMNS),
    [LoadBoard()],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            GotDragAndDropMessage: ({ message: dragMessage }) => {
                const {
                    model: nextDragAndDrop,
                    commands: dragCommands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.DragAndDrop.update(model.dragAndDrop, dragMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const mappedCommands = dragCommands.map(
                    Command.mapEffect(
                        Effect.map(
                            (innerMessage): Message =>
                                GotDragAndDropMessage({ message: innerMessage })
                        )
                    )
                )

                return Option.match(maybeOutMessage, {
                    onNone: () => {
                        const announcement = announceKeyboardDrag(
                            model,
                            nextDragAndDrop
                        )

                        return [
                            modifyFields(model, {
                                dragAndDrop: () => nextDragAndDrop,
                                announcement: () => announcement,
                            }),
                            mappedCommands,
                        ]
                    },
                    onSome: (outMessage) =>
                        M.value(outMessage).pipe(
                            withUpdateReturn,
                            M.tagsExhaustive({
                                Reordered: ({
                                    itemId,
                                    fromContainerId,
                                    toContainerId,
                                    toIndex,
                                }) => {
                                    const nextColumns = reorder(
                                        model.columns,
                                        itemId,
                                        fromContainerId,
                                        toContainerId,
                                        toIndex
                                    )

                                    return [
                                        modifyFields(model, {
                                            columns: () => nextColumns,
                                            dragAndDrop: () => nextDragAndDrop,
                                            announcement: () =>
                                                screenReaderTextForDrop(
                                                    model,
                                                    outMessage
                                                ),
                                        }),
                                        [
                                            ...mappedCommands,
                                            saveBoard(nextColumns),
                                        ],
                                    ]
                                },
                                Cancelled: () => [
                                    modifyFields(model, {
                                        dragAndDrop: () => nextDragAndDrop,
                                        announcement: () =>
                                            screenReaderTextForDrop(
                                                model,
                                                outMessage
                                            ),
                                    }),
                                    mappedCommands,
                                ],
                            })
                        ),
                })
            },
            ClickedAddCard: ({ columnId }) => [
                modifyFields(model, {
                    maybeNewCardColumnId: () => Option.some(columnId),
                    newCardTitle: () => "",
                }),
                [FocusAddCardInput()],
            ],
            ChangedNewCardTitle: ({ value }) => [
                modifyFields(model, { newCardTitle: () => value }),
                [],
            ],
            SubmittedNewCard: () =>
                Option.match(model.maybeNewCardColumnId, {
                    onNone: () => [model, []],
                    onSome: (columnId) => {
                        const title = String.trim(model.newCardTitle)

                        if (String.isEmpty(title)) {
                            return [model, []]
                        }

                        return [model, [generateCardId(columnId, title)]]
                    },
                }),
            GeneratedCardId: ({ cardId, columnId, title }) => {
                const nextColumns = Array.map(model.columns, (column) => {
                    if (column.id !== columnId) {
                        return column
                    }

                    return appendCard(column, {
                        id: cardId,
                        title,
                        description: "",
                        sortKey: "",
                    })
                })

                return [
                    modifyFields(model, {
                        columns: () => nextColumns,
                        maybeNewCardColumnId: () => Option.none(),
                        newCardTitle: () => "",
                    }),
                    [saveBoard(nextColumns)],
                ]
            },
            LoadedBoard: ({ maybeSavedBoard }) => [
                modifyFields(model, {
                    columns: () =>
                        Option.match(maybeSavedBoard, {
                            onNone: () => model.columns,
                            onSome: ({ columns }) => columns,
                        }),
                }),
                [],
            ],
            CancelledNewCard: () => [
                modifyFields(model, {
                    maybeNewCardColumnId: () => Option.none(),
                    newCardTitle: () => "",
                }),
                [],
            ],
            CompletedSaveBoard: () => [model, []],
            CompletedFocusAddCardInput: () => [model, []],
        })
    )
