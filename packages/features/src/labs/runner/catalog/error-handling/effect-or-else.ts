import type { Example } from "../../catalog.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { emoji } from "../../result.ts"
import {
    completed,
    failed,
    notified,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"

// PORT NOTE: upstream's snippet is `Effect.orElse(shoot, () => question)`, but
// this repo is on Effect v4, where `Effect.orElse` no longer exists — the
// combinator is `Effect.catch`. The snippet shows what the run actually does;
// the subtitle keeps the name the example is known by.
export const or_else_example: Example = define({
    key: "OrElse",
    title: "Effect.orElse",
    subtitle: "Effect.catch in v4",
    description: "Try one effect, and if it fails, fall back to another effect",
    source: [
        "const shoot = shootFirst()",
        "const question = askQuestions()",
        "",
        "const result = Effect.catch(shoot, () => question)",
    ].join("\n"),
    result_highlight: HighlightSelector.Text({
        text: "Effect.catch(shoot, () => question)",
    }),
    step_highlights: [
        HighlightSelector.Text({ text: "shootFirst()" }),
        HighlightSelector.Text({ text: "askQuestions()" }),
    ],
})

export const or_else_step_labels = ["shoot", "question"]

export const or_else_error = "Out of Ammo!"
export const or_else_value = emoji("💬")

const shoot_duration = 450
const question_duration = 550

export const or_else_failed_at = shoot_duration - STEP_SETTLE_LEAD_MILLIS
export const or_else_durations = [shoot_duration, question_duration]

// Upstream cycles fail/succeed/fail across runs; the first position is the one
// that shows the fallback actually being taken.
export const or_else_timeline: ReadonlyArray<StepEvent> = [
    started(0, 0),
    failed(0, or_else_failed_at, or_else_error),
    notified(or_else_failed_at, or_else_error),
    started(1, shoot_duration),
    completed(
        1,
        shoot_duration + question_duration - STEP_SETTLE_LEAD_MILLIS,
        or_else_value
    ),
]
