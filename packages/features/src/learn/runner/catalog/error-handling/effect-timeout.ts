import type { Example } from "../../catalog.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import {
    interrupted,
    notified,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"

export const timeout_example: Example = define({
    key: "Timeout",
    title: "Effect.timeout",
    description:
        "Add a time limit to an effect, failing with timeout if exceeded",
    source: [
        "const pizza = orderDelivery()",
        'const result = Effect.timeout(pizza, "1 second")',
    ].join("\n"),
    result_highlight: HighlightSelector.Text({
        text: 'Effect.timeout(pizza, "1 second")',
    }),
    step_highlights: [HighlightSelector.Text({ text: "orderDelivery()" })],
})

export const timeout_step_labels = ["pizza"]

export const timeout_limit_millis = 1_000
// The delivery would arrive at 1.7s, so the limit always wins. Upstream
// alternates a slow attempt with a fast one; the slow one is what the example
// is about.
export const timeout_delivery_millis = 1_700
export const timeout_error = "TOO SLOW!"

const timed_out_at = timeout_limit_millis - STEP_SETTLE_LEAD_MILLIS

// The node is interrupted rather than failed: `Effect.timeout` kills the fiber
// it was waiting on, and the error belongs to the result, not to the delivery.
export const timeout_timeline: ReadonlyArray<StepEvent> = [
    started(0, 0),
    interrupted(0, timed_out_at),
    notified(timed_out_at, timeout_error),
]
