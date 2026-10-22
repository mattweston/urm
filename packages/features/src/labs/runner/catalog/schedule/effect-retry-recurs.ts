import type { Example } from "../../catalog.ts"
import {
    failed,
    notified,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"

const source = [
    "const wakeUp = attemptToWakeUp()",
    'const snoozeSchedule = Schedule.spaced("2 seconds").pipe(',
    "  Schedule.upTo({ times: 4 })",
    ")",
    "const result = Effect.retry(wakeUp, snoozeSchedule)",
].join("\n")

export const retry_recurs_example: Example = define({
    key: "RetryRecurs",
    title: "Effect.retry",
    subtitle: "recurs",
    description: "Retry an effect a fixed number of times",
    source,
    result_highlight: HighlightSelector.Text({
        text: "Effect.retry(wakeUp, snoozeSchedule)",
    }),
    step_highlights: [HighlightSelector.Text({ text: "attemptToWakeUp()" })],
})

export const retry_step_labels = ["wakeUp"]
export const retry_attempt_messages = [
    "😴 Snooze #1",
    "😪 Snooze #2",
    "🥱 Snooze #3",
    "😵 Snooze #4",
    "💀 Asleep Forever",
]
export const retry_attempt_start_delays = [0, 2_500, 5_000, 7_500, 10_000]
export const retry_attempt_duration = 500

// One node, retried: every attempt reuses index 0 and fails, so the last
// message is the one the run ends on.
export const retry_recurs_timeline: ReadonlyArray<StepEvent> =
    retry_attempt_start_delays.flatMap((at_millis, attempt_index) => {
        const error = retry_attempt_messages[attempt_index] ?? "Asleep Forever"
        const failed_at =
            at_millis + retry_attempt_duration - STEP_SETTLE_LEAD_MILLIS

        return [
            started(0, at_millis),
            failed(0, failed_at, error),
            notified(failed_at, error),
        ]
    })
