import { Array, Effect, Match as M, Option } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"
import * as Counter from "../counter/counter.update.ts"
import type { Model } from "./counters.model.ts"
import { GotCounterMessage, type Message } from "./counters.message.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const createCounterModel = () => {
    const [counter] = Counter.init()

    return counter
}

export const init = (): UpdateReturn => [
    {
        rows: [
            { id: "counter-0", counter: createCounterModel() },
            { id: "counter-1", counter: createCounterModel() },
            { id: "counter-2", counter: createCounterModel() },
        ],
        nextRowId: 3,
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ClickedAddRow: () => [
                evo(model, {
                    rows: () => [
                        ...model.rows,
                        {
                            id: `counter-${model.nextRowId}`,
                            counter: createCounterModel(),
                        },
                    ],
                    nextRowId: (nextRowId) => nextRowId + 1,
                }),
                [],
            ],
            ClickedRemoveRow: ({ id }) => [
                evo(model, {
                    rows: () =>
                        Array.filter(
                            model.rows,
                            ({ id: rowId }) => rowId !== id
                        ),
                }),
                [],
            ],
            GotCounterMessage: ({ id, message }) =>
                Option.match(
                    Array.findFirst(
                        model.rows,
                        ({ id: rowId }) => rowId === id
                    ),
                    {
                        onNone: () => [model, []],
                        onSome: (row) => {
                            const [nextCounter, commands] = Counter.update(
                                row.counter,
                                message
                            )

                            return [
                                evo(model, {
                                    rows: () =>
                                        Array.map(model.rows, (existingRow) =>
                                            existingRow.id === id
                                                ? evo(existingRow, {
                                                      counter: () =>
                                                          nextCounter,
                                                  })
                                                : existingRow
                                        ),
                                }),
                                commands.map(
                                    Command.mapEffect(
                                        Effect.map((childMessage) =>
                                            GotCounterMessage({
                                                id,
                                                message: childMessage,
                                            })
                                        )
                                    )
                                ),
                            ]
                        },
                    }
                ),
        })
    )
