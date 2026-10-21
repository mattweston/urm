import type { Example } from "../../catalog.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { emoji } from "../../result.ts"
import {
    completed,
    failed,
    notified,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"

export const eventually_example: Example = define({
    key: "Eventually",
    title: "Effect.eventually",
    description: "Run an effect repeatedly until it succeeds, ignoring errors",
    source: [
        "const swipeCard = swipeCard()",
        "const result = Effect.eventually(swipeCard)",
    ].join("\n"),
    result_highlight: HighlightSelector.Text({
        text: "Effect.eventually(swipeCard)",
    }),
    // `swipeCard` alone appears three times; the call parentheses pick out the
    // one that is actually the step.
    step_highlights: [HighlightSelector.Text({ text: "swipeCard()" })],
})

export const eventually_step_labels = ["swipeCard"]

export const eventually_attempt_messages = [
    "Card Read Error!",
    "Too Fast!",
    "Overdraft Fee!",
]
export const eventually_value = emoji("💰")
export const eventually_attempt_duration = 300
// PORT NOTE: `Effect.eventually` retries with no delay at all, which on screen
// is a node that strobes. Upstream shows the same snippet while running
// `Effect.retry` with a one-second gap, and this port does the same — the gap
// is the only reason the attempts are watchable.
export const eventually_retry_gap_millis = 1_000

const attempt_span = eventually_attempt_duration + eventually_retry_gap_millis

export const eventually_start_delays = Array.from(
    { length: eventually_attempt_messages.length + 1 },
    (_, index) => index * attempt_span
)

export const eventually_timeline: ReadonlyArray<StepEvent> =
    eventually_start_delays.flatMap((at_millis, attempt_index) => {
        const settled_at =
            at_millis + eventually_attempt_duration - STEP_SETTLE_LEAD_MILLIS
        const error = eventually_attempt_messages[attempt_index]

        if (error === undefined) {
            return [
                started(0, at_millis),
                completed(0, settled_at, eventually_value),
            ]
        }

        return [
            started(0, at_millis),
            failed(0, settled_at, error),
            notified(settled_at, error),
        ]
    })
