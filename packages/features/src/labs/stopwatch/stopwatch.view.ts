import { Duration, String, flow, pipe } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Model } from "./stopwatch.model.ts"
import {
    ClickedReset,
    ClickedStart,
    ClickedStop,
    type Message,
} from "./stopwatch.message.ts"

const buttonStyle =
    "inline-flex items-center justify-center rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"

const formatTime = (ms: number): string => {
    const minutes = pipe(Duration.millis(ms), Duration.toMinutes, floorAndPad)
    const seconds = pipe(
        Duration.millis(ms % 60000),
        Duration.toSeconds,
        floorAndPad
    )
    const centiseconds = pipe(
        Duration.millis(ms % 1000),
        Duration.toMillis,
        (value) => value / 10,
        floorAndPad
    )

    return `${minutes}:${seconds}.${centiseconds}`
}

const floorAndPad = flow(
    Math.floor,
    (value) => value.toString(),
    String.padStart(2, "0")
)

const startStopButton = <ParentMessage>(
    isRunning: boolean,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    if (isRunning) {
        return h.button(
            [
                h.OnClick(toParentMessage(ClickedStop())),
                h.Class(
                    `${buttonStyle} bg-destructive text-destructive-foreground hover:bg-destructive/90`
                ),
            ],
            ["Stop"]
        )
    }

    return h.button(
        [
            h.OnClick(toParentMessage(ClickedStart())),
            h.Class(
                `${buttonStyle} bg-primary text-primary-foreground hover:bg-primary/90`
            ),
        ],
        ["Start"]
    )
}

export const stopwatchTitle = (elapsedMs: number) =>
    `Stopwatch ${formatTime(elapsedMs)} | Design`

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("flex min-h-[60vh] items-center justify-center")],
        [
            h.div(
                [
                    h.Class(
                        "w-full max-w-lg rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-8 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "text-center font-mono text-6xl font-bold tabular-nums text-foreground"
                            ),
                        ],
                        [formatTime(model.elapsedMs)]
                    ),
                    h.div(
                        [h.Class("mt-8 flex gap-3")],
                        [
                            h.button(
                                [
                                    h.OnClick(toParentMessage(ClickedReset())),
                                    h.Class(
                                        `${buttonStyle} flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80`
                                    ),
                                ],
                                ["Reset"]
                            ),
                            startStopButton(
                                model.isRunning,
                                toParentMessage,
                                h
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}
