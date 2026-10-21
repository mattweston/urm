import { Match as M } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import { determineStartTime, determineTickTime } from "./stopwatch.command.ts"
import type { Model } from "./stopwatch.model.ts"
import { type Message } from "./stopwatch.message.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [
    {
        elapsedMs: 0,
        isRunning: false,
        startTime: 0,
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ClickedStart: () => [model, [determineStartTime(model.elapsedMs)]],
            DeterminedStartTime: ({ startTime }) => [
                modifyFields(model, {
                    isRunning: () => true,
                    startTime: () => startTime,
                }),
                [],
            ],
            ClickedStop: () => [
                modifyFields(model, {
                    isRunning: () => false,
                }),
                [],
            ],
            ClickedReset: () => [
                modifyFields(model, {
                    elapsedMs: () => 0,
                    isRunning: () => false,
                    startTime: () => 0,
                }),
                [],
            ],
            Ticked: () => [model, [determineTickTime(model.startTime)]],
            DeterminedTickTime: ({ elapsedMs }) => [
                modifyFields(model, {
                    elapsedMs: () => elapsedMs,
                }),
                [],
            ],
        })
    )
