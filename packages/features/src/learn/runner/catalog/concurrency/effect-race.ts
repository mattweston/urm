import type { Example } from "../../catalog.ts"
import {
    completed,
    interrupted,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { emoji } from "../../result.ts"

const source = [
    'const tortoise = runFast("tortoise")',
    'const achilles = runFast("achilles")',
    "",
    "const winner = Effect.race(tortoise, achilles)",
].join("\n")

export const race_example: Example = define({
    key: "Race",
    title: "Effect.race",
    description:
        "Race two effects and return the result of the first successful one",
    source,
    result_highlight: HighlightSelector.Text({
        text: "Effect.race(tortoise, achilles)",
    }),
    step_highlights: [
        HighlightSelector.Text({ text: 'runFast("tortoise")' }),
        HighlightSelector.Text({ text: 'runFast("achilles")' }),
    ],
})

export const race_step_labels = ["tortoise", "achilles"]
export const race_step_values = ["🐢", "🏃‍♂️"].map(emoji)
export const race_step_durations = [780, 620]

// Both start together; the loser is interrupted the instant the winner lands,
// which is what `Effect.race` does to the fiber it did not need.
const settled_at = (race_step_durations[1] ?? 0) - STEP_SETTLE_LEAD_MILLIS

export const race_timeline: ReadonlyArray<StepEvent> = [
    started(0, 0),
    started(1, 0),
    completed(1, settled_at, race_step_values[1] ?? emoji("")),
    interrupted(0, settled_at),
]
