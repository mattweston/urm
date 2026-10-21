import { Match as M, Option } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { modifyFields } from "foldkit/struct"

import {
    GotSelectionSubmodelsListboxMessage,
    type SelectionSubmodelsMessage,
} from "./message.ts"
import type { Model } from "./model.ts"
import type { Plan } from "./plan.ts"

const PlanListbox = Ui.Listbox.create<Plan>()

type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<SelectionSubmodelsMessage>>,
]

export const update = (
    model: Model,
    message: SelectionSubmodelsMessage
): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotSelectionSubmodelsListboxMessage: ({ message }) => {
                const {
                    model: listbox,
                    commands = [],
                    outMessage: maybeOut_value,
                } = PlanListbox.update(model.listbox, message)
                const maybeOut = Option.fromUndefinedOr(maybeOut_value)

                return [
                    modifyFields(model, {
                        listbox: () => listbox,
                        maybeSelectedPlan: () =>
                            Option.match(maybeOut, {
                                onNone: () => model.maybeSelectedPlan,
                                onSome: ({ value }) => Option.some(value),
                            }),
                    }),
                    Command.mapMessages(commands, (message) =>
                        GotSelectionSubmodelsListboxMessage({ message })
                    ),
                ]
            },
            RestoredSelectionSubmodelsPlan: ({ plan }) => [
                modifyFields(model, {
                    maybeSelectedPlan: () => Option.some(plan),
                }),
                [],
            ],
            ClickedClearSelectionSubmodelsPlan: () => [
                modifyFields(model, {
                    maybeSelectedPlan: () => Option.none(),
                }),
                [],
            ],
        })
    )
