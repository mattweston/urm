import type { Example } from "../../catalog.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { primitive } from "../../result.ts"
import type { ExampleOptions, FinalizerOutcome } from "../options.ts"
import {
    completed,
    failed,
    finalizer_added,
    notified,
    release_scope,
    scope_phase,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"

export const add_finalizer_id = "clean-up"
export const add_finalizer_name = "🧹 Clean up"

export const add_finalizer_success = primitive("Done")
export const add_finalizer_error = "💥 Fail"
export const add_finalizer_defect = "☠️ Die"

const outcome_lines = (outcome: FinalizerOutcome): ReadonlyArray<string> => {
    if (outcome === "Fail") {
        return ["  // Fail", '  return yield* Effect.fail("Boom")']
    }

    if (outcome === "Die") {
        return ["  // Die", '  return yield* Effect.die("Defect")']
    }

    if (outcome === "Interrupt") {
        return [
            "  // Keep running until interrupted",
            "  yield* Effect.sleep(60 * 60 * 1000)",
        ]
    }

    return ["  // Succeed", '  return "Done"']
}

const source = (outcome: FinalizerOutcome): string =>
    [
        "const effect = Effect.gen(function* () {",
        "  // Register finalizer first",
        '  yield* Effect.addFinalizer(() => console.log("cleanup"))',
        ...outcome_lines(outcome),
        "}).pipe(Effect.scoped)",
    ].join("\n")

// The whole snippet is the effect, so the result box covers all of it rather
// than picking out the `effect` identifier the way upstream does.
export const add_finalizer_example = (outcome: FinalizerOutcome): Example =>
    define({
        key: "AddFinalizer",
        title: "Effect.addFinalizer",
        description: "Register cleanup actions in a scope",
        source: source(outcome),
        result_highlight: HighlightSelector.LineRange({
            start_line: 1,
            end_line: source(outcome).split("\n").length,
        }),
        step_highlights: [
            HighlightSelector.Text({
                text: 'Effect.addFinalizer(() => console.log("cleanup"))',
            }),
        ],
    })

export const add_finalizer_step_labels = ["effect"]

export const add_finalizer_register_at = 350
export const add_finalizer_work_duration = 750

const register_at = add_finalizer_register_at
const work_duration = add_finalizer_work_duration

export const add_finalizer_resolves_at = register_at + work_duration

// PORT NOTE: `Interrupt` deliberately schedules nothing past `Active`. Upstream
// sleeps for an hour and waits for you to tap the node, so the release cannot
// be pre-scheduled — `update` emits it when the interrupt actually happens.
// That is also the only outcome where the finalizer runs without a result.
export const add_finalizer_timeline = (
    options: ExampleOptions
): ReadonlyArray<StepEvent> => {
    const outcome = options.finalizer_outcome
    const opening: ReadonlyArray<StepEvent> = [
        scope_phase(0, "Acquiring"),
        started(0, 0),
        finalizer_added(register_at, add_finalizer_id, add_finalizer_name),
        scope_phase(register_at, "Active"),
    ]

    if (outcome === "Interrupt") {
        return opening
    }

    const settled_at = add_finalizer_resolves_at - STEP_SETTLE_LEAD_MILLIS
    const released = release_scope(add_finalizer_resolves_at, [
        add_finalizer_id,
    ])

    if (outcome === "Fail") {
        return [
            ...opening,
            failed(0, settled_at, add_finalizer_error),
            notified(settled_at, add_finalizer_error),
            ...released.events,
        ]
    }

    if (outcome === "Die") {
        return [
            ...opening,
            failed(0, settled_at, add_finalizer_defect),
            notified(settled_at, add_finalizer_defect, { variant: "death" }),
            ...released.events,
        ]
    }

    return [
        ...opening,
        completed(0, settled_at, add_finalizer_success),
        ...released.events,
    ]
}
