import type { Html, HtmlBuilder } from "foldkit/html"

import { scrubber } from "../../_shared/scrubber.ts"
import { ChangedVariable, type VariableName } from "../variables.message.ts"
import { ranges } from "../variables.derive.ts"

const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(Math.max(value, minimum), maximum)

const stepButtonClassName = [
    "grid size-9 place-items-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background",
    "text-lg leading-none text-foreground",
    "hover:bg-muted disabled:opacity-40",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
].join(" ")

const valueClassName = [
    "min-w-[4ch] cursor-ew-resize touch-none select-none rounded-md px-2 py-1 text-center",
    "font-mono text-3xl tabular-nums text-foreground",
    "hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
    "data-[scrubbing]:bg-primary/15",
].join(" ")

export type VariableBlockArgs = Readonly<{
    variable: VariableName
    value: number
    /** What this variable stands for, in one short phrase. */
    note: string
}>

/**
 * One variable, on its own, with room to breathe: the name, the value big
 * enough to drag, buttons for a single step, and the range it lives in.
 */
export const variableBlock = <ParentMessage>(
    args: VariableBlockArgs,
    toParentMessage: (message: typeof ChangedVariable.Type) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const range = ranges[args.variable]
    const fraction =
        (args.value - range.minimum) /
        Math.max(1, range.maximum - range.minimum)

    const setTo = (value: number) =>
        toParentMessage(
            ChangedVariable({
                variable: args.variable,
                value: clamp(value, range.minimum, range.maximum),
            })
        )

    const stepButton = (offset: number, label: string, symbol: string) =>
        h.button(
            [
                h.Class(stepButtonClassName),
                h.Type("button"),
                h.AriaLabel(`${label} ${args.variable}`),
                h.Disabled(
                    offset < 0
                        ? args.value <= range.minimum
                        : args.value >= range.maximum
                ),
                h.OnClick(setTo(args.value + offset)),
            ],
            [symbol]
        )

    return h.div(
        [
            h.Class(
                "grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-baseline justify-between gap-4")],
                [
                    h.span(
                        [h.Class("font-mono text-sm text-foreground")],
                        [args.variable]
                    ),
                    h.span(
                        [h.Class("text-xs text-muted-foreground")],
                        [args.note]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex items-center gap-3")],
                [
                    stepButton(-range.step, "Decrease", "−"),
                    scrubber(
                        {
                            value: args.value,
                            minimum: range.minimum,
                            maximum: range.maximum,
                            step: range.step,
                            pixelsPerStep: range.pixelsPerStep,
                            label: args.variable,
                            format: String,
                            className: valueClassName,
                        },
                        setTo,
                        h
                    ),
                    stepButton(range.step, "Increase", "+"),
                    h.span(
                        [
                            h.Class(
                                "ml-auto font-mono text-xs text-muted-foreground"
                            ),
                        ],
                        [`${range.minimum}–${range.maximum}`]
                    ),
                ]
            ),
            h.div(
                [h.Class("h-1.5 overflow-hidden rounded-full bg-muted")],
                [
                    h.div(
                        [
                            h.Class(
                                "h-full rounded-full bg-primary transition-[width] duration-100"
                            ),
                            h.Style({
                                width: `${Math.round(fraction * 100)}%`,
                            }),
                        ],
                        []
                    ),
                ]
            ),
            h.p(
                [h.Class("text-xs text-muted-foreground")],
                [
                    "Drag the number, use the buttons, or focus it and press the arrow keys.",
                ]
            ),
        ]
    )
}
