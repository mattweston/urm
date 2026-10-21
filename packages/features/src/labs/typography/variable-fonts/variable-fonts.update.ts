import { Match as M } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import { fontOptionFor } from "./variable-fonts.data.ts"
import type { Message } from "./variable-fonts.message.ts"
import type { Model } from "./variable-fonts.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedWeight: ({ value }) => [
                evo(model, { weight: () => value }),
                [],
            ],
            UpdatedSize: ({ value }) => [evo(model, { size: () => value }), []],
            UpdatedSample: ({ value }) => [
                evo(model, { sample: () => value }),
                [],
            ],
            SelectedSample: ({ value }) => [
                evo(model, { sample: () => value }),
                [],
            ],
            SelectedFont: ({ value }) => {
                const option = fontOptionFor(value)
                const weight = Math.max(
                    option.minimum,
                    Math.min(model.weight, option.maximum)
                )
                return [
                    evo(model, {
                        font: () => option.value,
                        weight: () => weight,
                        isItalic: () => option.supportsItalic && model.isItalic,
                    }),
                    [],
                ]
            },
            ClickedNamedInstance: ({ weight }) => [
                evo(model, { weight: () => weight }),
                [],
            ],
            ToggledItalic: () => [
                evo(model, {
                    isItalic: (isItalic) =>
                        fontOptionFor(model.font).supportsItalic && !isItalic,
                }),
                [],
            ],
            ToggledAnimation: () => [
                evo(model, {
                    isAnimating: (isAnimating) => !isAnimating,
                }),
                [],
            ],
            ClickedLoadStaticFonts: () => [
                evo(model, { areStaticsLoaded: () => true }),
                [],
            ],
        })
    )
