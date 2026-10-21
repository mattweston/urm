import type { Example } from "../../catalog.ts"
import {
    completed,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { primitive } from "../../result.ts"

const source = [
    "const hotdog = eatHotdog()",
    "const schedule = Schedule.spaced(Duration.millis(400)).pipe(",
    "  Schedule.upTo({ duration: Duration.seconds(10) })",
    ")",
    "const contest = Effect.repeat(hotdog, schedule)",
].join("\n")

export const repeat_while_example: Example = define({
    key: "RepeatWhile",
    title: "Effect.repeat",
    subtitle: "whileOutput",
    description: "Repeat an effect while a schedule condition is true",
    source,
    result_highlight: HighlightSelector.Text({
        text: "Effect.repeat(hotdog, schedule)",
    }),
    step_highlights: [HighlightSelector.Text({ text: "eatHotdog()" })],
})

export const repeat_while_step_labels = ["hotdog"]
export const repeat_while_durations = [
    650, 800, 550, 700, 850, 600, 750, 500, 900, 650,
]
export const repeat_while_start_delays = [
    0, 1_050, 2_250, 3_200, 4_300, 5_550, 6_550, 7_700, 8_600, 9_900,
]
export const repeat_while_values = Array.from(
    { length: repeat_while_start_delays.length },
    (_, index) => primitive("🌭".repeat(index + 1))
)

// Every attempt succeeds; the schedule's 10-second budget is what stops it, so
// there is no failing attempt to show.
export const repeat_while_timeline: ReadonlyArray<StepEvent> =
    repeat_while_start_delays.flatMap((at_millis, attempt_index) => [
        started(0, at_millis),
        completed(
            0,
            at_millis +
                (repeat_while_durations[attempt_index] ?? 650) -
                STEP_SETTLE_LEAD_MILLIS,
            repeat_while_values[attempt_index] ?? primitive("🌭")
        ),
    ])
