import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ChangedBillingVariable,
    type BillingVariable,
} from "../billing.message.ts"
import { ranges } from "../billing.plan.ts"

const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(Math.max(value, minimum), maximum)

const snap = (value: number, step: number) => Math.round(value / step) * step

export type NumberFieldArgs = Readonly<{
    variable: BillingVariable
    value: number
    label: string
}>

const className = [
    "w-[8ch] rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-2 py-0.5",
    "text-center font-medium tabular-nums text-foreground",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
].join(" ")

/** The same variable as a scrubber, typed rather than dragged. */
export const numberField = <ParentMessage>(
    args: NumberFieldArgs,
    toParentMessage: (
        message: typeof ChangedBillingVariable.Type
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const range = ranges[args.variable]

    return h.input([
        h.Class(className),
        h.Type("number"),
        h.Value(String(args.value)),
        h.AriaLabel(args.label),
        h.Attribute("min", String(range.minimum)),
        h.Attribute("max", String(range.maximum)),
        h.Attribute("step", String(range.step)),
        h.OnInput((text) => {
            const parsed = Number.parseFloat(text)
            const value = Number.isNaN(parsed)
                ? args.value
                : clamp(snap(parsed, range.step), range.minimum, range.maximum)

            return toParentMessage(
                ChangedBillingVariable({ variable: args.variable, value })
            )
        }),
    ])
}
