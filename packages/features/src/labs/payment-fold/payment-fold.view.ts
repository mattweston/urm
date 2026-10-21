import type { Html, HtmlBuilder } from "foldkit/html"

import { payment_lines } from "./payment-fold.data.ts"
import {
    ClickedReset,
    ClickedRunFold,
    type Message,
} from "./payment-fold.message.ts"
import type { Model } from "./payment-fold.model.ts"

const button_style =
    "inline-flex items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"

const to_currency = (amount: number): string => `£${amount.toFixed(2)}`

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
                        ["Foldkit / payment summary"]
                    ),
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        ["Fold payment lines into one total"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-muted-foreground")],
                        [
                            "This is the same shape as Array.reduce in vanilla JavaScript: the total is the accumulator and each payment line is folded into it.",
                        ]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted/30 p-5"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("text-lg font-semibold")],
                        ["What the fold returns"]
                    ),
                    h.p(
                        [h.Class("mt-2 max-w-2xl text-muted-foreground")],
                        [
                            "The fold starts with £0.00, then carries that running total through each payment line. Each step combines the previous total with one line amount; after the last line, the accumulator is the payment summary.",
                        ]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "border-b-(length:--surface-border-width) border-border bg-muted/40 p-5"
                            ),
                        ],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "font-mono text-sm text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Array.reduce(paymentLines, 0, (total, line) => total + line.amount)",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-col gap-3 p-5")],
                        payment_lines.map((line) =>
                            h.div(
                                [
                                    h.Class(
                                        "flex items-center justify-between rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-4 py-3"
                                    ),
                                ],
                                [
                                    h.span([], [line.label]),
                                    h.span(
                                        [
                                            h.Class(
                                                "font-mono font-medium tabular-nums"
                                            ),
                                        ],
                                        [to_currency(line.amount)]
                                    ),
                                ]
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border bg-primary/10 p-5"
                            ),
                        ],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-medium uppercase tracking-wide text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.isSummarized
                                        ? "Fold result"
                                        : "Accumulator before the fold",
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-1 font-mono text-3xl font-semibold tabular-nums"
                                    ),
                                ],
                                [to_currency(model.total)]
                            ),
                            model.isSummarized
                                ? h.p(
                                      [
                                          h.Class(
                                              "mt-2 text-sm text-muted-foreground"
                                          ),
                                      ],
                                      ["£0.00 + £24.99 + £4.99 + £6.00"]
                                  )
                                : h.empty,
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-3")],
                [
                    h.button(
                        [
                            h.OnClick(toParentMessage(ClickedRunFold())),
                            h.Class(button_style),
                        ],
                        ["Run payment fold"]
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
