import { Match as M } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import type { Message } from "./message.ts"
import { initialModel, type Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [initialModel, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ToggledQuotes: ({ isShown }) => [
                evo(model, { showQuotes: () => isShown }),
                [],
            ],
        })
    )
