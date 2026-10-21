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

// PORT NOTE: the snippet keeps upstream's `Math.random()` delay because that is
// the point being made — five fibers arrive in an order nobody chose and not
// one update is lost. The run itself uses the fixed delays below, since the
// node timeline has to know when each increment lands.
export const ref_update_and_get_example: Example = define({
    key: "RefUpdateAndGet",
    title: "Ref.updateAndGet",
    description: "Update a ref and return the new value",
    source: [
        "const increment = (counter: Ref<number>) => Effect.gen(function* () {",
        "  yield* Effect.sleep(Duration.millis(Math.random() * 1000 + 500))",
        "  return yield* Ref.updateAndGet(counter, n => n + 1)",
        "})",
        "",
        "const concurrent = Effect.gen(function* () {",
        "  const counter = yield* Ref.make(0)",
        "  return yield* Effect.all(",
        "    Array.from({ length: 5 }, () => increment(counter)),",
        '    { concurrency: "unbounded" }',
        "  )",
        "})",
    ].join("\n"),
    result_highlight: HighlightSelector.LineRange({
        start_line: 8,
        end_line: 11,
    }),
    // All five fibers run the same line, so every node points at it — hovering
    // any of them says "this is the code all five are contending over".
    step_highlights: Array.from({ length: 5 }, () =>
        HighlightSelector.Text({
            text: "Ref.updateAndGet(counter, n => n + 1)",
        })
    ),
})

export const ref_update_and_get_step_labels = [
    "increment1",
    "increment2",
    "increment3",
    "increment4",
    "increment5",
]

export const ref_update_and_get_name = "counter"
export const ref_update_and_get_initial = "0"
export const ref_update_and_get_result = emoji("✅")

// All five start together and finish out of order. The value each one reads
// back is its finishing *rank*, not its position in the list — which is the
// whole demonstration: increment3 lands first and gets 1.
export const ref_update_and_get_durations = [700, 1_100, 500, 1_300, 900]

export const ref_update_and_get_settle_lag = 50

const settle_lag = ref_update_and_get_settle_lag

const rank_of = (index: number): number =>
    [...ref_update_and_get_durations]
        .sort((left, right) => left - right)
        .indexOf(ref_update_and_get_durations[index] ?? 0) + 1

export const ref_update_and_get_values = ref_update_and_get_durations.map(
    (_, index) => rank_of(index).toString()
)

export const ref_update_and_get_timeline: ReadonlyArray<StepEvent> = [
    ref_set(0, ref_update_and_get_initial),
    ...ref_update_and_get_durations.flatMap((duration, index) => {
        const value = ref_update_and_get_values[index] ?? "0"

        return [
            started(index, 0),
            ref_set(duration, value),
            completed(
                index,
                duration + settle_lag - STEP_SETTLE_LEAD_MILLIS,
                primitive(value)
            ),
        ]
    }),
]

export const ref_update_and_get_duration =
    Math.max(...ref_update_and_get_durations) + settle_lag
