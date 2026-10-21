import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Model as CounterModel } from "../counter/counter.model.ts"
import {
    ClickedDecrement,
    ClickedIncrement,
    ClickedReset,
    type Message as CounterMessage,
} from "../counter/counter.message.ts"
import {
    ClickedAddRow,
    ClickedRemoveRow,
    GotCounterMessage,
    type Message,
} from "./counters.message.ts"
import type { Model, Row } from "./counters.model.ts"

const buttonStyle =
    "inline-flex items-center justify-center rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"

const counterWidgetView = <ParentMessage>(
    model: CounterModel,
    toParentMessage: (message: CounterMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
) => {
    return h.div(
        [h.Class("flex flex-col gap-4")],
        [
            h.div(
                [
                    h.Class(
                        "text-6xl font-bold tabular-nums tracking-tight text-foreground"
                    ),
                ],
                [model.count.toString()]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    h.button(
                        [
                            h.OnClick(toParentMessage(ClickedDecrement())),
                            h.Class(buttonStyle),
                        ],
                        ["-"]
                    ),
                    h.button(
                        [
                            h.OnClick(toParentMessage(ClickedReset())),
                            h.Class(buttonStyle),
                        ],
                        ["Reset"]
                    ),
                    h.button(
                        [
                            h.OnClick(toParentMessage(ClickedIncrement())),
                            h.Class(buttonStyle),
                        ],
                        ["+"]
                    ),
                ]
            ),
        ]
    )
}

const createRowView = <ParentMessage>(
    row: Row,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
) => {
    return h.keyed("div")(
        row.id,
        [
            h.Class(
                "flex items-start gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("min-w-0 flex-1")],
                [
                    counterWidgetView(
                        row.counter,
                        (message) =>
                            toParentMessage(
                                GotCounterMessage({ id: row.id, message })
                            ),
                        h
                    ),
                ]
            ),
            h.button(
                [
                    h.OnClick(
                        toParentMessage(ClickedRemoveRow({ id: row.id }))
                    ),
                    h.Class(
                        `${buttonStyle} shrink-0 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground`
                    ),
                ],
                ["Remove"]
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("min-h-screen bg-background px-4 py-8 text-foreground")],
        [
            h.div(
                [h.Class("mx-auto flex w-full max-w-4xl flex-col gap-6")],
                [
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                            ),
                        ],
                        [
                            h.h1(
                                [
                                    h.Class(
                                        "text-3xl font-bold tracking-tight text-foreground"
                                    ),
                                ],
                                ["Counters"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Each row reuses the Counter model and routes child messages back to the matching row.",
                                ]
                            ),
                            h.div(
                                [h.Class("mt-6 flex items-center gap-3")],
                                [
                                    h.button(
                                        [
                                            h.OnClick(
                                                toParentMessage(ClickedAddRow())
                                            ),
                                            h.Class(
                                                "inline-flex items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                            ),
                                        ],
                                        ["+ Add Counter"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [`${model.rows.length} rows`]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-4")],
                        Array.map(model.rows, (row) =>
                            createRowView(row, toParentMessage, h)
                        )
                    ),
                ]
            ),
        ]
    )
}
