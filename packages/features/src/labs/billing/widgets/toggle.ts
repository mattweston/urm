import { Array, Option } from "effect"
import { inertHtml } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"

import { ToggledAnnualBilling } from "../billing.message.ts"

const className = [
    "cursor-pointer rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border border-dashed border-primary/60 px-1.5 py-0.5",
    "font-medium text-primary hover:bg-primary/10",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
].join(" ")

export type ToggleArgs = Readonly<{
    isOn: boolean
    label: string
    labelOff: string
    labelOn: string
}>

/** A word in the prose that swaps for its opposite when clicked. */
export const toggle = <ParentMessage>(
    args: ToggleArgs,
    toParentMessage: (
        message: typeof ToggledAnnualBilling.Type
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.button(
        [
            h.Class(className),
            h.Type("button"),
            h.AriaLabel(args.label),
            h.Attribute("aria-pressed", String(args.isOn)),
            h.OnClick(toParentMessage(ToggledAnnualBilling())),
        ],
        [args.isOn ? args.labelOn : args.labelOff]
    )
}

/** Reads the sign of a derived number as one word or the other. */
export const bySign = (
    args: Readonly<{
        value: number
        whenPositive: string
        whenNegative: string
    }>
): Html => {
    const h = inertHtml

    return h.span([], [args.value >= 0 ? args.whenPositive : args.whenNegative])
}

/** Picks the sentence that matches a derived index. */
export const byIndex = (
    args: Readonly<{
        index: number
        children: ReadonlyArray<Html>
    }>
): Html => {
    const h = inertHtml

    return Option.match(Array.get(args.children, args.index), {
        onNone: () => h.empty,
        onSome: (child) => child,
    })
}
