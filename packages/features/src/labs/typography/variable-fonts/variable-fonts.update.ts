import { Match as M } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"

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
                modifyFields(model, { weight: () => value }),
                [],
            ],
            UpdatedSize: ({ value }) => [modifyFields(model, { size: () => value }), []],
            UpdatedSample: ({ value }) => [
                modifyFields(model, { sample: () => value }),
                [],
            ],
            SelectedSample: ({ value }) => [
                modifyFields(model, { sample: () => value }),
                [],
            ],
            SelectedFont: ({ value }) => {
                const option = fontOptionFor(value)
                const weight = Math.max(
                    option.minimum,
                    Math.min(model.weight, option.maximum)
                )
                return [
                    modifyFields(model, {
                        font: () => option.value,
                        weight: () => weight,
                        isItalic: () => option.supportsItalic && model.isItalic,
                    }),
                    [],
                ]
            },
            ClickedNamedInstance: ({ weight }) => [
                modifyFields(model, { weight: () => weight }),
                [],
            ],
            ToggledItalic: () => [
                modifyFields(model, {
                    isItalic: (isItalic) =>
                        fontOptionFor(model.font).supportsItalic && !isItalic,
                }),
                [],
            ],
            ToggledAnimation: () => [
                modifyFields(model, {
                    isAnimating: (isAnimating) => !isAnimating,
                }),
                [],
            ],
            ClickedLoadStaticFonts: () => [
                modifyFields(model, { areStaticsLoaded: () => true }),
                [],
            ],
        })
    )
