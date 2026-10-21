import { Match as M, Number, Option } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"
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
                evo(model, { engine: () => EngineBooting() }),
                [],
            ],
            ClickedStopComputeEngine: () => [
                evo(model, { engine: () => EngineOff() }),
                [],
            ],
            StartedComputeEngine: ({ engineId }) => [
                evo(model, { engine: () => EngineReady({ engineId }) }),
                [],
            ],
            StoppedComputeEngine: () => [model, []],
            FailedStartComputeEngine: ({ reason }) => [
                evo(model, { engine: () => EngineFailed({ reason }) }),
                [],
            ],
            ClickedComputeSquare: () => {
                const computeCount = Number.increment(model.computeCount)
                return [
                    evo(model, { computeCount: () => computeCount }),
                    [ComputeSquare({ value: computeCount })],
                ]
            },
            CompletedComputeSquare: ({ result }) => [
                evo(model, {
                    maybeSquareResult: () => Option.some(result),
                }),
                [],
            ],
            SkippedComputeSquare: () => [model, []],
        })
    )
