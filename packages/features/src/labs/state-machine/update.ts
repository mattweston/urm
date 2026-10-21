import { Array, Match as M, Number, pipe } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"

import {
    TRANSITION_LOG_LIMIT,
    checkoutMachine,
    resultToTransitionSummary,
    type TransitionLogEntry,
} from "./machine.ts"
import {
    GotCheckoutMachineMessage,
    type StateMachineDemoMessage,
} from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<StateMachineDemoMessage>>,
]

export const init = (): UpdateReturn => [
    {
        checkout: checkoutMachine.initial,
        transitionLog: [],
        nextTransitionLogId: 0,
    },
    [],
]

export const update = (
    model: Model,
    message: StateMachineDemoMessage
): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotCheckoutMachineMessage: ({ message }) => {
                const result = checkoutMachine.step(model.checkout, message)
                const commands = M.value(result).pipe(
                    M.tagsExhaustive({
                        Transitioned: ({ commands }) => commands,
                        Ignored: () => [],
                    })
                )
                const entry: TransitionLogEntry = {
                    id: model.nextTransitionLogId,
                    summary: resultToTransitionSummary(result),
                }
                return [
                    modifyFields(model, {
                        checkout: () => result.state,
                        transitionLog: () =>
                            pipe(
                                model.transitionLog,
                                Array.prepend(entry),
                                Array.take(TRANSITION_LOG_LIMIT)
                            ),
                        nextTransitionLogId: Number.increment,
                    }),
                    Command.mapMessages(commands, (message) =>
                        GotCheckoutMachineMessage({ message })
                    ),
                ]
            },
        })
    )
