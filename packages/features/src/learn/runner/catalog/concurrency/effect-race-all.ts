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
    'const cat = runFast("cat")',
    'const dog = runFast("dog")',
    'const mouse = runFast("mouse")',
    'const rabbit = runFast("rabbit")',
    "",
    "const winner = Effect.raceAll([cat, dog, mouse, rabbit])",
].join("\n")

export const race_all_example: Example = define({
    key: "RaceAll",
    title: "Effect.raceAll",
    description: "Race multiple effects and return the first successful result",
    source,
    result_highlight: HighlightSelector.Text({
        text: "Effect.raceAll([cat, dog, mouse, rabbit])",
    }),
    step_highlights: [
        HighlightSelector.Text({ text: 'runFast("cat")' }),
        HighlightSelector.Text({ text: 'runFast("dog")' }),
        HighlightSelector.Text({ text: 'runFast("mouse")' }),
        HighlightSelector.Text({ text: 'runFast("rabbit")' }),
    ],
})

export const race_all_step_labels = ["cat", "dog", "mouse", "rabbit"]
export const race_all_step_values = ["🐱", "🐶", "🐭", "🐰"].map(emoji)
export const race_all_step_durations = [820, 700, 540, 760]
export const race_all_winner_index = 2

// The mouse is the shortest duration, so it wins and every other fiber is cut
// at that moment — including the dog, which would have finished later anyway.
const settled_at =
    (race_all_step_durations[race_all_winner_index] ?? 0) -
    STEP_SETTLE_LEAD_MILLIS

export const race_all_timeline: ReadonlyArray<StepEvent> =
    race_all_step_labels.flatMap((_, index) => [
        started(index, 0),
        index === race_all_winner_index
            ? completed(
                  index,
                  settled_at,
                  race_all_step_values[index] ?? emoji("")
              )
            : interrupted(index, settled_at),
    ])
