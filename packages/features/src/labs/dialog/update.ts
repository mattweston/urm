import * as Ui from "@foldkit/ui"
import { Match as M } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import { GotAnimatedMessage, GotBasicMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [
    {
        basic: Ui.Dialog.init({ id: "labs-dialog-basic" }),
        animated: Ui.Dialog.init({
            id: "labs-dialog-animated",
            isAnimated: true,
        }),
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotBasicMessage: ({ message: childMessage }) => {
                const { model: basic, commands = [] } = Ui.Dialog.update(
                    model.basic,
                    childMessage
                )
                return [
                    modifyFields(model, { basic: () => basic }),
                    Command.mapMessages(commands, (message) =>
                        GotBasicMessage({ message })
                    ),
                ]
            },
            GotAnimatedMessage: ({ message: childMessage }) => {
                const { model: animated, commands = [] } = Ui.Dialog.update(
                    model.animated,
                    childMessage
                )
                return [
                    modifyFields(model, { animated: () => animated }),
                    Command.mapMessages(commands, (message) =>
                        GotAnimatedMessage({ message })
                    ),
                ]
            },
        })
    )
