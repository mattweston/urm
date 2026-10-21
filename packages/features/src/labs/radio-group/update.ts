import { Match as M, Option } from "effect"
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
            SelectedHorizontal: ({ value }) => [
                evo(model, { horizontal: () => Option.some(value) }),
                [],
            ],
            SelectedVertical: ({ value }) => [
                evo(model, { vertical: () => Option.some(value) }),
                [],
            ],
        })
    )
