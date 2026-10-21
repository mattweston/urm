import * as Ui from "@foldkit/ui"
import { Effect, Match as M } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import { GotAnimatedMessage, GotBasicMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const Menu = Ui.Menu.create<string>()

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [
    {
        basic: Ui.Menu.init({ id: "labs-menu-basic" }),
        animated: Ui.Menu.init({
            id: "labs-menu-animated",
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
                const { model: basic, commands = [] } = Menu.update(
                    model.basic,
                    childMessage
                )
                return [
                    modifyFields(model, { basic: () => basic }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotBasicMessage({ message })
                            )
                        )
                    ),
                ]
            },
            GotAnimatedMessage: ({ message: childMessage }) => {
                const { model: animated, commands = [] } = Menu.update(
                    model.animated,
                    childMessage
                )
                return [
                    modifyFields(model, { animated: () => animated }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotAnimatedMessage({ message })
                            )
                        )
                    ),
                ]
            },
        })
    )
