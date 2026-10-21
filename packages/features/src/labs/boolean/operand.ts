import * as Ui from "@foldkit/ui"
import { type Html, type HtmlBuilder, inertHtml as ih } from "foldkit/html"

import type { Message } from "./message.ts"

const checkboxClassName =
    "flex h-5 w-5 shrink-0 items-center justify-center rounded border-(length:--surface-border-width) border-border cursor-pointer data-[checked]:bg-primary data-[checked]:border-primary"

// One labelled checkbox, the shape every combinator page uses for its inputs.
export const operandCheckbox = <ParentMessage>(
    id: string,
    isChecked: boolean,
    label: string,
    toDemoMessage: (isChecked: boolean) => Message,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const checkmark = h.span(
        [h.Class("text-xs text-primary-foreground")],
        ["\u2713"]
    )

    return Ui.Checkbox.view(
        {
            id,
            isChecked,
            onToggle: (next) => toParentMessage(toDemoMessage(next)),
            toView: (attributes) =>
                h.div(
                    [
                        h.Class(
                            "flex items-center gap-3 text-sm text-foreground"
                        ),
                    ],
                    [
                        h.button(
                            [
                                ...attributes.checkbox,
                                h.Class(checkboxClassName),
                            ],
                            isChecked ? [checkmark] : []
                        ),
                        h.span(
                            [...attributes.label, h.Class("font-mono")],
                            [`${label} = ${isChecked}`]
                        ),
                    ]
                ),
        },
        h
    )
}

export const operandPanel = (checkboxes: ReadonlyArray<Html>): Html => {
    return ih.div(
        [
            ih.Class(
                "grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
            ),
        ],
        checkboxes
    )
}

// The call and its answer, so the reader sees the expression rather than only
// the value it produced.
export const resultPanel = (call: string, result: boolean): Html => {
    return ih.div(
        [
            ih.Class(
                "mt-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary/30 bg-primary/5 p-4"
            ),
        ],
        [
            ih.p(
                [ih.Class("font-mono text-sm text-foreground")],
                [`${call} → ${result}`]
            ),
        ]
    )
}
