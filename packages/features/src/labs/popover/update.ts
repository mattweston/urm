import { Match as M } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import { Popover } from "@foldkit/ui"

import { GotAnimatedMessage, GotBasicMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [
    {
        basic: Popover.init({ id: "labs-popover-basic" }),
        animated: Popover.init({ id: "labs-popover-animated" }),
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotBasicMessage: ({ message }) => {
                const { model: basic, commands = [] } = Popover.update(
                    model.basic,
                    message
                )
                return [
                    evo(model, { basic: () => basic }),
                    Command.mapMessages(commands, (message) =>
                        GotBasicMessage({ message })
                    ),
                ]
            },
            GotAnimatedMessage: ({ message }) => {
                const { model: animated, commands = [] } = Popover.update(
                    model.animated,
                    message
                )
                return [
                    evo(model, { animated: () => animated }),
                    Command.mapMessages(commands, (message) =>
                        GotAnimatedMessage({ message })
                    ),
                ]
            },
        })
    )
