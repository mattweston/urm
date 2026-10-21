import { Context, Effect, Layer, Match as M, Option, Schema as S } from "effect"
import { ManagedResource } from "foldkit"
import { ComputeEngineService, Engine, engineLayer } from "./engine.ts"
import {
    FailedStartComputeEngine,
    StartedComputeEngine,
    StoppedComputeEngine,
    type ManagedResourceLayerMessage as Message,
} from "./message.ts"
import type { Model } from "./model.ts"

export const managedResources = ManagedResource.make<Model, Message>()(
    (entry) => ({
        computeEngine: entry(S.Option(S.Null), {
            resource: Engine,
            modelToMaybeRequirements: (model) =>
                M.value(model.engine).pipe(
                    M.tag("EngineBooting", "EngineReady", () =>
                        Option.some(null)
                    ),
                    M.tag("EngineOff", "EngineFailed", () => Option.none()),
                    M.exhaustive
                ),
            acquire: () =>
                Layer.build(engineLayer).pipe(
                    Effect.map((context) =>
                        Context.get(context, ComputeEngineService)
                    )
                ),
            release: () => Effect.void,
            onAcquired: ({ engineId }) => StartedComputeEngine({ engineId }),
            onReleased: () => StoppedComputeEngine(),
            onAcquireError: (error) =>
                FailedStartComputeEngine({ reason: String(error) }),
        }),
    })
)
