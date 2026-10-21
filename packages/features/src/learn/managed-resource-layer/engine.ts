import { Context, Crypto, Effect, Layer, Schema as S } from "effect"
import { ManagedResource } from "foldkit"
import { taggedStruct } from "foldkit/schema"

import { BrowserCrypto } from "@effect/platform-browser"

export interface ComputeEngine {
    readonly engineId: string
    readonly square: (value: number) => number
}

export class ComputeEngineService extends Context.Service<
    ComputeEngineService,
    ComputeEngine
>()("ComputeEngineService") {}

// The point of the example: the resource is built by an Effect Layer, so
// acquisition and teardown are whatever acquireRelease already does.
export const engineLayer: Layer.Layer<ComputeEngineService> = Layer.effect(
    ComputeEngineService,
    Effect.acquireRelease(
        Effect.gen(function* () {
            const crypto = yield* Crypto.Crypto
            const id = yield* Effect.orDie(crypto.randomUUIDv4)
            const engineId = `engine-${id.slice(0, 8)}`
            return { engineId, square: (value: number) => value * value }
        }).pipe(Effect.provide(BrowserCrypto.layer)),
        ({ engineId }) => Effect.log(`Tore down ${engineId}`)
    )
)

export const Engine = ManagedResource.tag<ComputeEngine>()("ComputeEngine")
export type EngineService = ManagedResource.ServiceOf<typeof Engine>

export const EngineOff = taggedStruct("EngineOff")
export const EngineBooting = taggedStruct("EngineBooting")
export const EngineReady = taggedStruct("EngineReady", { engineId: S.String })
export const EngineFailed = taggedStruct("EngineFailed", { reason: S.String })

export const EngineState = S.Union([
    EngineOff,
    EngineBooting,
    EngineReady,
    EngineFailed,
])
export type EngineState = typeof EngineState.Type

export const isEngineReady = (engine: EngineState): boolean =>
    engine._tag === "EngineReady"
