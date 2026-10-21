import { Match as M, Option } from "effect"
import { Command } from "foldkit"

import type { Message } from "./streaming.message.ts"
import type { Model } from "./streaming.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): Model => ({
    status: "Idle",
    errorMessage: Option.none(),
})

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ClickedToggleStream: () => [
                {
                    status: model.status === "Idle" ? "Starting" : "Idle",
                    errorMessage: Option.none(),
                },
                [],
            ],
            StartedStream: () => [
                { status: "Streaming", errorMessage: Option.none() },
                [],
            ],
            FailedStream: ({ errorMessage }) => [
                { status: "Idle", errorMessage: Option.some(errorMessage) },
                [],
            ],
        })
    )
