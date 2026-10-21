import type { Html, HtmlBuilder } from "foldkit/html"

import { values } from "./array-fold.data.ts"
import {
    ClickedFoldNext,
    ClickedReset,
    type Message,
} from "./array-fold.message.ts"
import type { Model } from "./array-fold.model.ts"

const button_style =
    "inline-flex items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
        [
            h.Class(
                "mx-auto flex w-full max-w-3xl flex-col gap-8 p-6 text-foreground"
            ),
        ],
        [
            h.header(
                [h.Class("flex flex-col gap-3")],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-muted-foreground")],
                        ["Foldkit / array fold"]
                    ),
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        ["Fold an array one value at a time"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-muted-foreground")],
                        [
                            "A fold reduces many values to one result. It starts with an initial accumulator, takes the next array value, combines them, then carries the new accumulator into the following step.",
                        ]
                    ),
                    h.p(
                        [h.Class("font-mono text-sm text-muted-foreground")],
                        [
                            "[1, 2, 3, 4].reduce((total, value) => total + value, 0)",
                        ]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-3")],
                        values.map((value, index) =>
                            h.div(
                                [
                                    h.Class(
                                        index < model.step
                                            ? "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary/40 bg-primary/10 px-4 py-3 font-mono font-semibold"
                                            : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-4 py-3 font-mono text-muted-foreground"
                                    ),
                                ],
                                [value.toString()]
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "mt-5 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary/30 bg-primary/10 p-4"
                            ),
                        ],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-medium uppercase tracking-wide text-muted-foreground"
                                    ),
                                ],
                                ["Accumulator"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-1 font-mono text-3xl font-semibold"
                                    ),
                                ],
                                [model.total.toString()]
                            ),
                            h.p(
                                [h.Class("mt-2 text-sm text-muted-foreground")],
                                [
                                    model.step === values.length
                                        ? "Every value has been folded into the final result."
                                        : `Next value: ${values[model.step]}`,
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-3")],
                [
                    h.button(
                        [
                            h.OnClick(toParentMessage(ClickedFoldNext())),
                            h.Class(button_style),
                        ],
                        ["Fold next value"]
                    ),
                    h.button(
                        [
                            h.OnClick(toParentMessage(ClickedReset())),
                            h.Class(button_style),
                        ],
                        ["Reset"]
                    ),
                ]
            ),
        ]
    )
