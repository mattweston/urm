import { Clock, Effect, Schema as S } from "effect"
import { Command } from "foldkit"
import { DeterminedStartTime, DeterminedTickTime } from "./stopwatch.message.ts"

const DetermineStartTime = Command.define("DetermineStartTime", {
    args: { elapsedMs: S.Number },
    messages: [DeterminedStartTime],
    execute: ({ elapsedMs }) =>
        Effect.gen(function* () {
            const now = yield* Clock.currentTimeMillis

            return DeterminedStartTime({ startTime: now - elapsedMs })
        }),
})

const DetermineTickTime = Command.define("DetermineTickTime", {
    args: { startTime: S.Number },
    messages: [DeterminedTickTime],
    execute: ({ startTime }) =>
        Effect.gen(function* () {
            const now = yield* Clock.currentTimeMillis

            return DeterminedTickTime({ elapsedMs: now - startTime })
        }),
})

export const determineStartTime = (elapsedMs: number) =>
    DetermineStartTime({ elapsedMs })

export const determineTickTime = (startTime: number) =>
    DetermineTickTime({ startTime })
