import * as Ui from "@foldkit/ui"
import { Array, Effect, Match as M, Option, pipe } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"
import type { DemoColumn } from "./columns.ts"
import { GotDragAndDropMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const reorderColumns = (
    columns: ReadonlyArray<DemoColumn>,
    itemId: string,
    fromContainerId: string,
    toContainerId: string,
    toIndex: number
): ReadonlyArray<DemoColumn> => {
    const maybeCard = pipe(
        columns,
        Array.findFirst(({ id }) => id === fromContainerId),
        Option.flatMap((column) =>
            Array.findFirst(column.cards, ({ id }) => id === itemId)
        )
    )

    return Option.match(maybeCard, {
        onNone: () => columns,
        onSome: (card) =>
            Array.map(columns, (column) => {
                const withRemoved =
                    column.id === fromContainerId
                        ? Array.filter(column.cards, ({ id }) => id !== itemId)
                        : column.cards

                if (column.id !== toContainerId) {
                    return evo(column, { cards: () => withRemoved })
                }

                return evo(column, {
                    cards: () => [
                        ...Array.take(withRemoved, toIndex),
                        card,
                        ...Array.drop(withRemoved, toIndex),
                    ],
                })
            }),
    })
}

export const init = (): UpdateReturn => [
    {
        dragAndDrop: Ui.DragAndDrop.init({ id: "labs-drag-and-drop" }),
        columns: [
            {
                id: "backlog",
                label: "Backlog",
                cards: [
                    { id: "card-1", label: "Design API" },
                    { id: "card-2", label: "Write tests" },
                    { id: "card-3", label: "Build docs" },
                ],
            },
            {
                id: "done",
                label: "Done",
                cards: [
                    { id: "card-4", label: "Set up repo" },
                    { id: "card-5", label: "Add CI" },
                ],
            },
        ],
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotDragAndDropMessage: ({ message: childMessage }) => {
                const {
                    model: dragAndDrop,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.DragAndDrop.update(model.dragAndDrop, childMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const columns = pipe(
                    maybeOutMessage,
                    Option.flatMap((outMessage) =>
                        M.value(outMessage).pipe(
                            M.tag(
                                "Reordered",
                                ({
                                    itemId,
                                    fromContainerId,
                                    toContainerId,
                                    toIndex,
                                }) =>
                                    Option.some(
                                        reorderColumns(
                                            model.columns,
                                            itemId,
                                            fromContainerId,
                                            toContainerId,
                                            toIndex
                                        )
                                    )
                            ),
                            M.orElse(() => Option.none())
                        )
                    ),
                    Option.getOrElse(() => model.columns)
                )

                return [
                    evo(model, {
                        dragAndDrop: () => dragAndDrop,
                        columns: () => columns,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotDragAndDropMessage({ message })
                            )
                        )
                    ),
                ]
            },
        })
    )
