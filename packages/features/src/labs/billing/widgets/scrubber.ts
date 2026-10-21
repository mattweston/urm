import type { Html, HtmlBuilder } from "foldkit/html"

import { scrubber as baseScrubber } from "../../_shared/scrubber.ts"
import {
    ChangedBillingVariable,
    type BillingVariable,
} from "../billing.message.ts"
import { ranges } from "../billing.plan.ts"

export type ScrubberArgs = Readonly<{
    variable: BillingVariable
    value: number
    label: string
    format: (value: number) => string
}>

/** The shared scrubber, bound to one field of the billing Model. */
export const scrubber = <ParentMessage>(
    args: ScrubberArgs,
    toParentMessage: (
        message: typeof ChangedBillingVariable.Type
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const range = ranges[args.variable]

    return baseScrubber(
        {
            value: args.value,
            minimum: range.minimum,
            maximum: range.maximum,
            step: range.step,
            pixelsPerStep: range.pixelsPerStep,
            label: args.label,
            format: args.format,
        },
        (value) =>
            toParentMessage(
                ChangedBillingVariable({ variable: args.variable, value })
            ),
        h
    )
}
