import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { KeyedTokensInfo } from "@shikijs/magic-move/core"

import {
    IconChevronLeft,
    IconChevronRight,
} from "@urm/ui/foldkit/icons/view.ts"

export const Model = S.Struct({ step_index: S.Number })
export type Model = typeof Model.Type

export const SelectedPrevious = taggedStruct("SelectedPrevious", {
    step_count: S.Number,
})
export const SelectedNext = taggedStruct("SelectedNext", {
    step_count: S.Number,
})
export const Message = S.Union([SelectedPrevious, SelectedNext])
export type Message = typeof Message.Type

export const init = (): Model => ({ step_index: 0 })

export const update = (model: Model, message: Message): Model => {
    if (message.step_count < 1) {
        return model
    }

    const offset = message._tag === "SelectedPrevious" ? -1 : 1

    return modifyFields(model, {
        step_index: (step_index) =>
            (step_index + offset + message.step_count) % message.step_count,
    })
}

export const view = <ParentMessage>(
    model: Model,
    titles: ReadonlyArray<string>,
    panels: ReadonlyArray<Html>,
    step_tokens: ReadonlyArray<KeyedTokensInfo>,
    to_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const step_count = Math.min(titles.length, panels.length)
    const step_index =
        step_count === 0 ? 0 : Math.min(model.step_index, step_count - 1)
    const maximum_line_count = Math.max(
        1,
        ...step_tokens.map((step) => step.code.split("\n").length)
    )

    return h.div(
        [h.Class("documentation-syntax-animation")],
        [
            h.div(
                [h.Class("documentation-syntax-animation-header")],
                [
                    h.span([], [titles[step_index] ?? "Language"]),
                    h.span(
                        [h.Class("documentation-syntax-animation-counter")],
                        [`${step_index + 1} / ${step_count}`]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class("documentation-syntax-animation-code"),
                    h.Style({
                        minHeight: `${maximum_line_count * 1.5 + 2}rem`,
                    }),
                    h.AriaLive("polite"),
                    h.DataAttribute("magic-move", ""),
                    h.DataAttribute("step-index", String(step_index)),
                    h.DataAttribute("step-tokens", JSON.stringify(step_tokens)),
                ],
                [panels[step_index] ?? h.empty]
            ),
            h.div(
                [h.Class("documentation-syntax-animation-actions")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class("documentation-syntax-animation-button"),
                            h.OnClick(
                                to_message(SelectedPrevious({ step_count }))
                            ),
                            h.Disabled(step_count < 2),
                        ],
                        [IconChevronLeft(), "Previous"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class("documentation-syntax-animation-button"),
                            h.OnClick(to_message(SelectedNext({ step_count }))),
                            h.Disabled(step_count < 2),
                        ],
                        ["Next", IconChevronRight()]
                    ),
                ]
            ),
        ]
    )
}
