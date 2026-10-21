import { Effect, Schema as S } from "effect"
import { Command } from "foldkit"

import { Engine } from "./engine.ts"
import { CompletedComputeSquare, SkippedComputeSquare } from "./message.ts"

// Engine.get fails with ResourceNotAvailable when the resource is not held, so
// a compute issued while the engine is off reports a skip rather than crashing.
export const ComputeSquare = Command.define("ComputeSquare", {
    args: { value: S.Number },
    messages: [CompletedComputeSquare, SkippedComputeSquare],
    execute: ({ value }) =>
        Effect.gen(function* () {
            const engine = yield* Engine.get
            return CompletedComputeSquare({ result: engine.square(value) })
        }).pipe(
            Effect.catchTag("ResourceNotAvailable", () =>
                Effect.succeed(SkippedComputeSquare())
            )
        ),
})
