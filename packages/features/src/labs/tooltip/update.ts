import { Match as M } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { modifyFields } from "foldkit/struct"

import { GotBasicMessage, GotNoDelayMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [
    {
        basic: Ui.Tooltip.init({ id: "labs-tooltip-basic" }),
        noDelay: Ui.Tooltip.init({
            id: "labs-tooltip-no-delay",
            showDelay: 0,
        }),
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotBasicMessage: ({ message }) => {
                const { model: basic, commands = [] } = Ui.Tooltip.update(
                    model.basic,
                    message
                )
                return [
                    modifyFields(model, { basic: () => basic }),
                    Command.mapMessages(commands, (message) =>
                        GotBasicMessage({ message })
                    ),
                ]
            },
            GotNoDelayMessage: ({ message }) => {
                const { model: noDelay, commands = [] } = Ui.Tooltip.update(
                    model.noDelay,
                    message
                )
                return [
                    modifyFields(model, { noDelay: () => noDelay }),
                    Command.mapMessages(commands, (message) =>
                        GotNoDelayMessage({ message })
                    ),
                ]
            },
        })
    )
