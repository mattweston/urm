import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ClickedNext,
    ClickedPrevious,
    ClickedRestart,
    type Message,
} from "./fold.message.ts"
import type { Model } from "./fold.model.ts"

const steps = [
    { message: "ClickedIncrement", before: 0, after: 1 },
    { message: "ClickedIncrement", before: 1, after: 2 },
    { message: "ClickedDecrement", before: 2, after: 1 },
    { message: "ClickedReset", before: 1, after: 0 },
]

const button_style =
    "inline-flex items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const active_steps = steps.slice(0, model.step)

    return h.main(
        [
            h.Class(
                "mx-auto flex w-full max-w-4xl flex-col gap-8 p-6 text-foreground"
            ),
        ],
        [
            h.header(
                [h.Class("flex flex-col gap-3")],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-muted-foreground")],
                        ["Foldkit / core idea"]
                    ),
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        ["A Foldkit app is a fold over time"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-muted-foreground")],
                        [
                            "The Model is the accumulator. Each dispatched Message is the next value in the stream. update combines the two and returns the next Model.",
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
                        ["What a fold does"]
                    ),
                    h.p(
                        [h.Class("mt-2 max-w-2xl text-muted-foreground")],
                        [
                            "A fold walks through an ordered collection, carrying one accumulated value forward. For every next item it calls a combining function with the current accumulator and that item. When the collection ends, the accumulator is the result.",
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-3 font-mono text-sm text-muted-foreground"
                            ),
                        ],
                        ["result = fold(items, initialValue, combine)"]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
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
                                ["fold(messages, initialModel, update)"]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-col gap-4 p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary/30 bg-primary/10 p-4"
                                    ),
                                ],
                                [
                                    h.p(
                                        [
                                            h.Class(
                                                "text-xs font-medium uppercase tracking-wide text-muted-foreground"
                                            ),
                                        ],
                                        ["Initial Model (accumulator)"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-1 font-mono text-2xl font-semibold"
                                            ),
                                        ],
                                        ["{ count: 0 }"]
                                    ),
                                ]
                            ),
                            ...active_steps.map((step, index) =>
                                h.div(
                                    [
                                        h.Class(
                                            "grid gap-3 md:grid-cols-[1fr_auto_1fr]"
                                        ),
                                    ],
                                    [
                                        h.div(
                                            [
                                                h.Class(
                                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-4 bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                                                ),
                                            ],
                                            [
                                                h.p(
                                                    [
                                                        h.Class(
                                                            "text-xs font-medium uppercase tracking-wide text-muted-foreground"
                                                        ),
                                                    ],
                                                    [`Message ${index + 1}`]
                                                ),
                                                h.p(
                                                    [
                                                        h.Class(
                                                            "mt-1 font-mono font-medium"
                                                        ),
                                                    ],
                                                    [step.message]
                                                ),
                                            ]
                                        ),
                                        h.div(
                                            [
                                                h.Class(
                                                    "flex items-center justify-center font-mono text-muted-foreground"
                                                ),
                                            ],
                                            ["update"]
                                        ),
                                        h.div(
                                            [
                                                h.Class(
                                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted/40 p-4"
                                                ),
                                            ],
                                            [
                                                h.p(
                                                    [
                                                        h.Class(
                                                            "text-xs font-medium uppercase tracking-wide text-muted-foreground"
                                                        ),
                                                    ],
                                                    ["Next Model"]
                                                ),
                                                h.p(
                                                    [
                                                        h.Class(
                                                            "mt-1 font-mono font-medium"
                                                        ),
                                                    ],
                                                    [
                                                        `{ count: ${step.before} } → { count: ${step.after} }`,
                                                    ]
                                                ),
                                            ]
                                        ),
                                    ]
                                )
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-4 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.step === steps.length
                                        ? "The stream is complete. The final Model is the fold result."
                                        : `Next: ${steps[model.step]?.message ?? ""}`,
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
                            h.OnClick(toParentMessage(ClickedPrevious())),
                            h.Class(button_style),
                        ],
                        ["Previous"]
                    ),
                    h.button(
                        [
                            h.OnClick(toParentMessage(ClickedNext())),
                            h.Class(button_style),
                        ],
                        ["Apply next message"]
                    ),
                    h.button(
                        [
                            h.OnClick(toParentMessage(ClickedRestart())),
                            h.Class(button_style),
                        ],
                        ["Restart"]
                    ),
                ]
            ),
        ]
    )
}
