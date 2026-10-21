import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { KeyedTokensInfo } from "@shikijs/magic-move/core"

import { IconCheckCircle2, IconCircleOff } from "@urm/ui/foldkit/icons/view.ts"

export const Model = S.Struct({ step_index: S.Number })
export type Model = typeof Model.Type

export const SelectedDont = taggedStruct("SelectedDont")
export const SelectedDo = taggedStruct("SelectedDo")
export const Message = S.Union([SelectedDont, SelectedDo])
export type Message = typeof Message.Type

export const init = (): Model => ({ step_index: 0 })

export const update = (model: Model, message: Message): Model =>
    modifyFields(model, {
        step_index: () => (message._tag === "SelectedDont" ? 0 : 1),
    })

export const view = <ParentMessage>(
    model: Model,
    descriptions: ReadonlyArray<string>,
    panels: ReadonlyArray<Html>,
    step_tokens: ReadonlyArray<KeyedTokensInfo>,
    to_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const step_index = Math.max(
        0,
        Math.min(model.step_index, panels.length - 1)
    )
    const maximum_line_count = Math.max(
        1,
        ...step_tokens.map((step) => step.code.split("\n").length)
    )

    return h.div(
        [h.Class("documentation-styleguide-animation")],
        [
            h.div(
                [
                    h.Class("documentation-styleguide-animation-description"),
                    h.AriaLive("polite"),
                ],
                [
                    descriptions[step_index] ??
                        (step_index === 0 ? "Don't" : "Do"),
                ]
            ),
            h.div(
                [
                    h.Class("documentation-styleguide-animation-code"),
                    h.Style({
                        minHeight: `${maximum_line_count * 1.5 + 2}rem`,
                    }),
                    h.DataAttribute("magic-move", ""),
                    h.DataAttribute("step-index", String(step_index)),
                    h.DataAttribute("step-tokens", JSON.stringify(step_tokens)),
                ],
                [panels[step_index] ?? h.empty]
            ),
            h.div(
                [h.Class("documentation-styleguide-animation-actions")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(
                                "documentation-styleguide-animation-button dont"
                            ),
                            h.OnClick(to_message(SelectedDont())),
                            h.Disabled(step_index === 0),
                        ],
                        [IconCircleOff(), "Don't"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(
                                "documentation-styleguide-animation-button do"
                            ),
                            h.OnClick(to_message(SelectedDo())),
                            h.Disabled(step_index === 1),
                        ],
                        [IconCheckCircle2(), "Do"]
                    ),
                ]
            ),
        ]
    )
}
