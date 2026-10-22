import { Match as M, Number, Option } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import { ComputeSquare } from "./command.ts"
import {
    EngineBooting,
    EngineFailed,
    EngineOff,
    EngineReady,
    type EngineService,
} from "./engine.ts"
import type { ManagedResourceLayerMessage as Message } from "./message.ts"
import { initialModel, type Model } from "./model.ts"

type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, EngineService>>,
]

export const init = (): UpdateReturn => [initialModel, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ClickedStartComputeEngine: () => [
                modifyFields(model, { engine: () => EngineBooting() }),
                [],
            ],
            ClickedStopComputeEngine: () => [
                modifyFields(model, { engine: () => EngineOff() }),
                [],
            ],
            StartedComputeEngine: ({ engineId }) => [
                modifyFields(model, { engine: () => EngineReady({ engineId }) }),
                [],
            ],
            StoppedComputeEngine: () => [model, []],
            FailedStartComputeEngine: ({ reason }) => [
                modifyFields(model, { engine: () => EngineFailed({ reason }) }),
                [],
            ],
            ClickedComputeSquare: () => {
                const computeCount = Number.increment(model.computeCount)
                return [
                    modifyFields(model, { computeCount: () => computeCount }),
                    [ComputeSquare({ value: computeCount })],
                ]
            },
            CompletedComputeSquare: ({ result }) => [
                modifyFields(model, {
                    maybeSquareResult: () => Option.some(result),
                }),
                [],
            ],
            SkippedComputeSquare: () => [model, []],
        })
    )
