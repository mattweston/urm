import type { Example } from "../../catalog.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { emoji, primitive } from "../../result.ts"
import {
    completed,
    failed,
    notified,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"

export const partition_example: Example = define({
    key: "Partition",
    title: "Effect.partition",
    description:
        "Execute effects and partition results into successes and failures",
    source: [
        "const result = Effect.partition(",
        "  [iceCream, battery, popsicle, toad, lollipop],",
        "  performLick",
        ").pipe(",
        "  Effect.map(([fails, successes]) =>",
        "    `👹 ${fails.length} 😇 ${successes.length}`",
        "  )",
        ")",
    ].join("\n"),
    result_highlight: HighlightSelector.LineRange({
        start_line: 1,
        end_line: 8,
    }),
    step_highlights: [
        HighlightSelector.Text({ text: "iceCream" }),
        HighlightSelector.Text({ text: "battery" }),
        HighlightSelector.Text({ text: "popsicle" }),
        HighlightSelector.Text({ text: "toad" }),
        HighlightSelector.Text({ text: "lollipop" }),
    ],
})

export const partition_step_labels = [
    "iceCream",
    "battery",
    "popsicle",
    "toad",
    "lollipop",
]

export const partition_error = "DEMONIC!"

// Upstream flips a coin per lick. Two of the five failing is the split that
// shows what partition is for: nothing short-circuits, and both halves of the
// tuple end up non-empty.
const licks: ReadonlyArray<{
    readonly duration: number
    readonly value: string | undefined
}> = [
    { duration: 700, value: "👅" },
    { duration: 850, value: undefined },
    { duration: 600, value: "😋" },
    { duration: 900, value: undefined },
    { duration: 750, value: "👄" },
]

export const partition_durations = licks.map((lick) => lick.duration)
export const partition_outcomes = licks.map((lick) => lick.value)

export const partition_failure_count = licks.filter(
    (lick) => lick.value === undefined
).length
export const partition_success_count = licks.length - partition_failure_count

export const partition_result = primitive(
    `👹 ${partition_failure_count.toString()} 😇 ${partition_success_count.toString()}`
)

export const partition_timeline: ReadonlyArray<StepEvent> = licks.flatMap(
    (lick, index) => {
        const settled_at = lick.duration - STEP_SETTLE_LEAD_MILLIS

        if (lick.value === undefined) {
            return [
                started(index, 0),
                failed(index, settled_at, partition_error),
                notified(settled_at, partition_error),
            ]
        }

        return [
            started(index, 0),
            completed(index, settled_at, emoji(lick.value)),
        ]
    }
)
