import type { Example } from "../../catalog.ts"
import {
    completed,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { temperature } from "../../result.ts"

const source = [
    'const locations = ["New York", "London", "Tokyo"]',
    "",
    "const result = Effect.forEach(locations, getWeather)",
].join("\n")

export const for_each_example: Example = define({
    key: "ForEach",
    title: "Effect.forEach",
    description:
        "Execute an effectful operation for each element in an iterable",
    source,
    result_highlight: HighlightSelector.Text({
        text: "Effect.forEach(locations, getWeather)",
    }),
    // The steps are the array's elements — there is no separate call per
    // location to point at, which is the shape `forEach` is for.
    step_highlights: [
        HighlightSelector.Text({ text: '"New York"' }),
        HighlightSelector.Text({ text: '"London"' }),
        HighlightSelector.Text({ text: '"Tokyo"' }),
    ],
})

export const for_each_step_labels = ["nyc", "london", "tokyo"]
export const for_each_step_degrees = [65, 53, 72]
export const for_each_step_values = for_each_step_degrees.map(temperature)
export const for_each_step_durations = [600, 800, 700]
export const for_each_step_start_delays = [0, 600, 1_400]

// Strictly one at a time — each node starts where the previous one finished,
// which is the whole point of the default `forEach`.
export const for_each_timeline: ReadonlyArray<StepEvent> =
    for_each_step_start_delays.flatMap((at_millis, index) => [
        started(index, at_millis),
        completed(
            index,
            at_millis +
                (for_each_step_durations[index] ?? 0) -
                STEP_SETTLE_LEAD_MILLIS,
            for_each_step_values[index] ?? temperature(0)
        ),
    ])
