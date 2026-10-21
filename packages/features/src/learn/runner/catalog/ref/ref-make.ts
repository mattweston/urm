import type { Example } from "../../catalog.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { emoji, primitive } from "../../result.ts"
import {
    completed,
    ref_set,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"

export const ref_make_example: Example = define({
    key: "RefMake",
    title: "Ref.make",
    description: "Create a concurrency-safe mutable reference",
    source: [
        "const increment = (counter: Ref<number>) =>",
        "  Ref.updateAndGet(counter, n => n + 1)",
        "",
        "const repeat = Effect.gen(function* () {",
        "  const counter = yield* Ref.make(0)",
        "  yield* Effect.repeat(increment(counter), Schedule.recurs(4))",
        "})",
    ].join("\n"),
    result_highlight: HighlightSelector.Text({
        text: "Effect.repeat(increment(counter), Schedule.recurs(4))",
    }),
    step_highlights: [
        HighlightSelector.Text({
            text: "Ref.updateAndGet(counter, n => n + 1)",
        }),
    ],
})

export const ref_make_step_labels = ["increment"]

export const ref_make_name = "counter"
export const ref_make_initial = "0"
export const ref_make_result = emoji("✅")

// One node, repeated five times. Upstream sleeps 400ms, bumps the ref, then
// sleeps 150ms — the second sleep is what lets you see the new value land
// while the node is still running.
export const ref_make_attempts = 5
export const ref_make_before_update = 400
export const ref_make_after_update = 150
export const ref_make_gap = 400

const before_update = ref_make_before_update
const after_update = ref_make_after_update
const attempt_span = before_update + after_update + ref_make_gap

export const ref_make_start_delays = Array.from(
    { length: ref_make_attempts },
    (_, index) => index * attempt_span
)

export const ref_make_timeline: ReadonlyArray<StepEvent> = [
    // The run resets the counter before the first increment, exactly as
    // upstream's `Ref.set(ref, 0)` does.
    ref_set(0, ref_make_initial),
    ...ref_make_start_delays.flatMap((at_millis, index) => {
        const value = (index + 1).toString()

        return [
            started(0, at_millis),
            ref_set(at_millis + before_update, value),
            completed(
                0,
                at_millis +
                    before_update +
                    after_update -
                    STEP_SETTLE_LEAD_MILLIS,
                primitive(value)
            ),
        ]
    }),
]

export const ref_make_duration =
    (ref_make_attempts - 1) * attempt_span + before_update + after_update
