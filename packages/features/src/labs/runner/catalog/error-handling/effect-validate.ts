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

export const validate_password = "p@ssw0rd"

// PORT NOTE: two adaptations. Upstream's snippet is the v3 combinator form,
// `length.pipe(Effect.validate(complexity), Effect.validate(vibes))`, which
// Effect v4 does not have — v4 validates a collection. And upstream draws the
// password it drew at random on a line above the card; the password is fixed
// here, so it belongs in the snippet where the checks can be read against it.
export const validate_example: Example = define({
    key: "Validate",
    title: "Effect.validate",
    description: "Accumulate validation errors instead of short-circuiting",
    source: [
        `const password = "${validate_password}"`,
        "",
        "const length = checkLength(password)",
        "const complexity = checkComplexity(password)",
        "const vibes = checkVibes(password)",
        "",
        "const result = Effect.validate(",
        "  [length, complexity, vibes],",
        "  identity",
        ")",
    ].join("\n"),
    result_highlight: HighlightSelector.LineRange({
        start_line: 7,
        end_line: 10,
    }),
    step_highlights: [
        HighlightSelector.Text({ text: "checkLength(password)" }),
        HighlightSelector.Text({ text: "checkComplexity(password)" }),
        HighlightSelector.Text({ text: "checkVibes(password)" }),
    ],
})

export const validate_step_labels = ["length", "complexity", "vibes"]

export const validate_ok = emoji("👌")
// `p@ssw0rd` is eight characters with a digit, a symbol and mixed case, so it
// clears length and complexity — and upstream has a canned put-down waiting for
// exactly this one.
export const validate_vibes_error = "Cringe!"
export const validate_durations = [750, 500, 450]

// The point of `validate` over `all`: the run keeps going after `vibes` fails,
// and the result counts the errors rather than surfacing the first.
export const validate_error_count = 1
export const validate_error = `${validate_error_count.toString()} error`

export const validate_timeline: ReadonlyArray<StepEvent> = (() => {
    const [length = 0, complexity = 0, vibes = 0] = validate_durations
    const complexity_start = length
    const vibes_start = length + complexity
    const vibes_failed_at = vibes_start + vibes - STEP_SETTLE_LEAD_MILLIS

    return [
        started(0, 0),
        completed(0, length - STEP_SETTLE_LEAD_MILLIS, validate_ok),
        started(1, complexity_start),
        completed(1, vibes_start - STEP_SETTLE_LEAD_MILLIS, validate_ok),
        started(2, vibes_start),
        failed(2, vibes_failed_at, validate_vibes_error),
        notified(vibes_failed_at, validate_vibes_error),
    ]
})()
