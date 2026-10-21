import type { Html, HtmlBuilder } from "foldkit/html"
import type { Model } from "./counter.model.ts"
import type { Message } from "./counter.message.ts"
import {
    ClickedDecrement,
    ClickedIncrement,
    ClickedReset,
} from "./counter.message.ts"

const buttonStyle =
    "inline-flex items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 py-2 text-sm [font-weight:var(--control-font-weight)] [letter-spacing:var(--control-letter-spacing)] [text-transform:var(--control-text-transform)] text-foreground transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (msg: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const clickedDecrement = toParentMessage(ClickedDecrement())
    const clickedIncrement = toParentMessage(ClickedIncrement())
    const clickedReset = toParentMessage(ClickedReset())

    return h.div(
        [
            h.Class(
                "flex min-h-screen flex-col items-center justify-center bg-background p-8 text-foreground"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex flex-col items-center gap-8 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-12 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "text-7xl font-bold tabular-nums tracking-tight text-foreground"
                            ),
                        ],
                        [model.count.toString()]
                    ),
                    h.div(
                        [h.Class("flex gap-3")],
                        [
                            h.button(
                                [
                                    h.OnClick(clickedDecrement),
                                    h.Class(buttonStyle),
                                ],
                                ["-"]
                            ),
                            h.button(
                                [h.OnClick(clickedReset), h.Class(buttonStyle)],
                                ["Reset"]
                            ),
                            h.button(
                                [
                                    h.OnClick(clickedIncrement),
                                    h.Class(buttonStyle),
                                ],
                                ["+"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}
