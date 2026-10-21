import type { ConcurrencyMode, ExampleOptions } from "../options.ts"

import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import type { Example } from "../../catalog.ts"
import { completed, started, type StepEvent } from "../timeline.ts"
import { temperature } from "../../result.ts"

const result_source = (mode: ConcurrencyMode): string => {
    if (mode === "Sequential") {
        return "Effect.all([nyc, berlin, tokyo, london])"
    }

    if (mode === "Numbered") {
        return [
            "Effect.all([nyc, berlin, tokyo, london], {",
            "  concurrency: 2",
            "})",
        ].join("\n")
    }

    return [
        "Effect.all([nyc, berlin, tokyo, london], {",
        '  concurrency: "unbounded"',
        "})",
    ].join("\n")
}

const source = (mode: ConcurrencyMode): string =>
    [
        'const nyc = readTemperature("New York")',
        'const berlin = readTemperature("Berlin")',
        'const tokyo = readTemperature("Tokyo")',
        'const london = readTemperature("London")',
        "",
        `const result = ${result_source(mode)}`,
    ].join("\n")

export const all_example = (mode: ConcurrencyMode): Example =>
    define({
        key: "All",
        title: "Effect.all",
        description:
            "Combine multiple effects into one, returning results based on input structure",
        source: source(mode),
        result_highlight: HighlightSelector.Text({ text: result_source(mode) }),
        step_highlights: [
            HighlightSelector.Text({ text: 'readTemperature("New York")' }),
            HighlightSelector.Text({ text: 'readTemperature("Berlin")' }),
            HighlightSelector.Text({ text: 'readTemperature("Tokyo")' }),
            HighlightSelector.Text({ text: 'readTemperature("London")' }),
        ],
    })

export const all_step_labels = ["nyc", "berlin", "tokyo", "london"]
export const all_step_degrees = [65, 44, 72, 53]
export const all_step_values = all_step_degrees.map(temperature)
export const all_step_durations = [900, 500, 650, 400]

export const all_step_start_delays = (
    mode: ConcurrencyMode
): ReadonlyArray<number> => {
    if (mode === "Sequential") {
        return [0, 900, 1_400, 2_050]
    }

    if (mode === "Numbered") {
        return [0, 0, 500, 900]
    }

    return [0, 0, 0, 0]
}

// The only timeline without the settle lead: the steps *are* the result here,
// so landing them early would show `[65°, 44°, 72°, 53°]` before the last node
// had finished.
export const all_timeline = (
    options: ExampleOptions
): ReadonlyArray<StepEvent> =>
    all_step_start_delays(options.concurrency_mode).flatMap(
        (at_millis, index) => [
            started(index, at_millis),
            completed(
                index,
                at_millis + (all_step_durations[index] ?? 0),
                all_step_values[index] ?? temperature(0)
            ),
        ]
    )
