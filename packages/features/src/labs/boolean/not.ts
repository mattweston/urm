import * as Ui from "@foldkit/ui"
import { Boolean } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import { ToggledNot, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const checkboxClassName =
    "flex h-5 w-5 shrink-0 items-center justify-center rounded border-(length:--surface-border-width) border-border cursor-pointer data-[checked]:bg-primary data-[checked]:border-primary"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const checkmark = h.span(
        [h.Class("text-xs text-primary-foreground")],
        ["✓"]
    )
    const input = model.not
    const output = Boolean.not(input)

    return h.div(
        [h.Class("max-w-2xl")],
        [
            Ui.Checkbox.view(
                {
                    id: "boolean-not-demo",
                    isChecked: input,
                    onToggle: (isChecked) =>
                        toParentMessage(ToggledNot({ isChecked })),
                    toView: (attributes) =>
                        h.div(
                            [
                                h.Class(
                                    "flex items-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-sm text-foreground"
                                ),
                            ],
                            [
                                h.button(
                                    [
                                        ...attributes.checkbox,
                                        h.Class(checkboxClassName),
                                    ],
                                    input ? [checkmark] : []
                                ),
                                h.span(
                                    [...attributes.label],
                                    [`Selected: ${input}`]
                                ),
                            ]
                        ),
                },
                h
            ),
            h.div(
                [
                    h.Class(
                        "mt-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary/30 bg-primary/5 p-4"
                    ),
                ],
                [
                    h.p(
                        [h.Class("font-mono text-sm text-foreground")],
                        [`Not selected: ${output}`]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-1 font-mono text-xs text-muted-foreground"
                            ),
                        ],
                        [`Boolean.not(${input}) → ${output}`]
                    ),
                ]
            ),
        ]
    )
}
