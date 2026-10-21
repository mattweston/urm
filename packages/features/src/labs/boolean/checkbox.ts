import * as Ui from "@foldkit/ui"
import { Boolean } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import { ToggledCheckbox, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const checkboxClassName =
    "flex h-5 w-5 shrink-0 items-center justify-center rounded border-(length:--surface-border-width) border-border cursor-pointer data-[checked]:bg-primary data-[checked]:border-primary"

type BooleanResult = Readonly<{
    operation: string
    value: boolean
}>

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const checkmark = h.span(
        [h.Class("text-xs text-primary-foreground")],
        ["✓"]
    )
    const value = model.checkbox
    const results: ReadonlyArray<BooleanResult> = [
        { operation: "Boolean.not(value)", value: Boolean.not(value) },
        {
            operation: "Boolean.and(value, true)",
            value: Boolean.and(value, true),
        },
        {
            operation: "Boolean.or(value, false)",
            value: Boolean.or(value, false),
        },
        {
            operation: "Boolean.xor(value, true)",
            value: Boolean.xor(value, true),
        },
        {
            operation: "Boolean.eqv(value, true)",
            value: Boolean.eqv(value, true),
        },
        {
            operation: "Boolean.implies(value, false)",
            value: Boolean.implies(value, false),
        },
        {
            operation: "Boolean.every([value, true])",
            value: Boolean.every([value, true]),
        },
        {
            operation: "Boolean.some([value, false])",
            value: Boolean.some([value, false]),
        },
    ]

    return h.div(
        [h.Class("max-w-2xl")],
        [
            Ui.Checkbox.view(
                {
                    id: "boolean-checkbox-demo",
                    isChecked: value,
                    onToggle: (isChecked) =>
                        toParentMessage(ToggledCheckbox({ isChecked })),
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
                                    value ? [checkmark] : []
                                ),
                                h.span(
                                    [...attributes.label],
                                    [`Value: ${value}`]
                                ),
                            ]
                        ),
                },
                h
            ),
            h.dl(
                [
                    h.Class(
                        "mt-4 grid gap-px overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-border sm:grid-cols-2"
                    ),
                ],
                results.map((result) =>
                    h.keyed("div")(
                        result.operation,
                        [
                            h.Class(
                                "flex items-center justify-between gap-3 bg-card px-4 py-3"
                            ),
                        ],
                        [
                            h.dt(
                                [
                                    h.Class(
                                        "font-mono text-xs text-muted-foreground"
                                    ),
                                ],
                                [result.operation]
                            ),
                            h.dd(
                                [
                                    h.Class(
                                        "font-mono text-sm font-medium text-foreground"
                                    ),
                                ],
                                [String(result.value)]
                            ),
                        ]
                    )
                )
            ),
        ]
    )
}
