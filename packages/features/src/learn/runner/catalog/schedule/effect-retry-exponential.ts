import type { Example } from "../../catalog.ts"
import {
    completed,
    failed,
    notified,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { primitive } from "../../result.ts"

const source = [
    "const park = attemptParallelPark()",
    'const result = Effect.retry(park, Schedule.exponential("700 millis"))',
].join("\n")

export const retry_exponential_example: Example = define({
    key: "RetryExponential",
    title: "Effect.retry",
    subtitle: "exponential",
    description:
        "Retry a failing effect with gaps that widen after each failure",
    source,
    result_highlight: HighlightSelector.Text({
        text: 'Effect.retry(park, Schedule.exponential("700 millis"))',
    }),
    step_highlights: [
        HighlightSelector.Text({ text: "attemptParallelPark()" }),
    ],
})

export const exponential_step_labels = ["park"]
export const exponential_step_values = ["🚗 Parked!"].map(primitive)
export const exponential_attempt_messages = [
    "😤 Too Close!",
    "😡 Too Far!",
    "🤬 Neutral!",
    "😑 Focus.",
]
export const exponential_attempt_start_delays = [0, 1_200, 3_100, 6_400, 12_500]
export const exponential_attempt_duration = 500

// The gaps double after each failure — the start delays are the visible part of
// `Schedule.exponential`. The last attempt is the one that parks.
export const retry_exponential_timeline: ReadonlyArray<StepEvent> =
    exponential_attempt_start_delays.flatMap((at_millis, attempt_index) => {
        const settled_at =
            at_millis + exponential_attempt_duration - STEP_SETTLE_LEAD_MILLIS
        const is_success =
            attempt_index === exponential_attempt_start_delays.length - 1

        if (is_success) {
            return [
                started(0, at_millis),
                completed(
                    0,
                    settled_at,
                    exponential_step_values[0] ?? primitive("")
                ),
            ]
        }

        const error = exponential_attempt_messages[attempt_index] ?? "Focus."

        return [
            started(0, at_millis),
            failed(0, settled_at, error),
            notified(settled_at, error),
        ]
    })
