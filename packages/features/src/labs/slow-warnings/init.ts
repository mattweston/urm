import type { Message } from "./message.ts"
import { Model } from "./model.ts"

type InitReturn = readonly [Model, ReadonlyArray<never>]

export const init = (): InitReturn => [
    Model.make({
        activeWorkload: "Idle",
        nextWarningId: 1,
        warnings: [],
        patchRows: 0,
        patchRun: 0,
    }),
    [],
]

export type InitMessage = Message
