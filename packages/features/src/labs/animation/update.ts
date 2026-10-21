import * as Ui from "@foldkit/ui"
import { Command } from "foldkit"
import { Match as M } from "effect"
import { evo } from "foldkit/struct"
import {
    GotAnimationDemoMessage,
    type AnimationDemoMessage,
} from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<AnimationDemoMessage>>,
]

const mapAnimationCommands = (
    commands: ReadonlyArray<Command.Command<Ui.Animation.Message>>
) =>
    Command.mapMessages(commands, (message) =>
        GotAnimationDemoMessage({ message })
    )

export const init = (): UpdateReturn => [
    {
        animation: Ui.Animation.init({ id: "labs-animation" }),
        isShowing: false,
    },
    [],
]

export const update = (
    model: Model,
    message: AnimationDemoMessage
): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotAnimationDemoMessage: ({ message: animationMessage }) => {
                const { model: animation, commands = [] } = Ui.Animation.update(
                    model.animation,
                    animationMessage
                )

                return [
                    evo(model, { animation: () => animation }),
                    mapAnimationCommands(commands),
                ]
            },
            ToggledAnimationDemo: () => {
                const isShowing = !model.isShowing
                const { model: animation, commands = [] } = Ui.Animation.update(
                    model.animation,
                    isShowing
                        ? Ui.Animation.Message.Showed()
                        : Ui.Animation.Message.Hid()
                )

                return [
                    evo(model, {
                        animation: () => animation,
                        isShowing: () => isShowing,
                    }),
                    mapAnimationCommands(commands),
                ]
            },
            CompletedMountedThreeJsDemo: () => [model, []],
        })
    )
