import { Match as M } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import type { Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [{ isOpen: false }, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ToggledOpen: ({ isOpen }) => [
                evo(model, { isOpen: () => isOpen }),
                [],
            ],
        })
    )
