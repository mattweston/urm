import type { Example } from "../../catalog.ts"
import { HighlightSelector } from "../../snippet-highlights.ts"
import { define } from "../define.ts"
import { primitive } from "../../result.ts"
import {
    completed,
    finalizer_added,
    release_scope,
    scope_phase,
    started,
    STEP_SETTLE_LEAD_MILLIS,
    type StepEvent,
} from "../timeline.ts"

export const acquire_release_example: Example = define({
    key: "AcquireRelease",
    title: "Effect.acquireRelease",
    description: "Acquire resources with guaranteed cleanup",
    source: [
        "const makeDatabase = Effect.acquireRelease(",
        "  connectDatabase(),",
        "  (db) => Effect.sync(() => db.close())",
        ")",
        "",
        "const makeCache = Effect.acquireRelease(",
        "  connectCache(),",
        "  (cache) => Effect.sync(() => cache.flush())",
        ")",
        "",
        "const makeLogger = Effect.acquireRelease(",
        "  openLogFile(),",
        "  (file) => Effect.sync(() => file.close())",
        ")",
        "",
        "const result = Effect.gen(function* () {",
        "  const db = yield* makeDatabase",
        "  const cache = yield* makeCache",
        "  const logger = yield* makeLogger",
        "  return yield* doWork(db, cache, logger)",
        "})",
        "  .pipe(Effect.scoped)",
    ].join("\n"),
    result_highlight: HighlightSelector.LineRange({
        start_line: 16,
        end_line: 22,
    }),
    // Each name appears twice — once defined, once used in the gen block. The
    // first occurrence is the `acquireRelease` the node stands for.
    step_highlights: [
        HighlightSelector.Text({ text: "makeDatabase", occurrence: 1 }),
        HighlightSelector.Text({ text: "makeCache", occurrence: 1 }),
        HighlightSelector.Text({ text: "makeLogger", occurrence: 1 }),
    ],
})

export const acquire_release_step_labels = ["database", "cache", "logger"]
export const acquire_release_step_values = ["DATABASE", "CACHE", "LOGGER"].map(
    primitive
)
export const acquire_release_result = primitive("Work completed!")

// Each resource is acquired, registers its finalizer, then holds for a moment
// before the next one starts — the stagger is what makes the LIFO release
// legible when it unwinds.
const acquire_durations = [700, 650, 600]
const hold_after_acquire = 200

export const acquire_release_work_duration = 1_200

// What each resource costs end to end — the acquire plus the hold that follows
// it, which is the span the run program sleeps for.
export const acquire_release_acquire_spans = acquire_durations.map(
    (duration) => duration + hold_after_acquire
)

const work_duration = acquire_release_work_duration

export const acquire_release_finalizers = [
    { id: "close-database", name: "Close database" },
    { id: "flush-cache", name: "Flush cache" },
    { id: "close-log-file", name: "Close log file" },
]

const build = (): {
    readonly events: ReadonlyArray<StepEvent>
    readonly resolves_at: number
} => {
    const events: Array<StepEvent> = [scope_phase(0, "Acquiring")]
    let at = 0

    acquire_durations.forEach((duration, index) => {
        const finalizer = acquire_release_finalizers[index]

        events.push(started(index, at))
        events.push(
            finalizer_added(
                at + duration,
                finalizer?.id ?? "",
                finalizer?.name ?? ""
            )
        )
        at += duration + hold_after_acquire
        events.push(
            completed(
                index,
                at - STEP_SETTLE_LEAD_MILLIS,
                acquire_release_step_values[index] ?? primitive("")
            )
        )
    })

    events.push(scope_phase(at, "Active"))

    const resolves_at = at + work_duration
    // The scope unwinds once the work is done — after the result lands, which
    // is exactly the guarantee the example is about.
    const released = release_scope(
        resolves_at,
        acquire_release_finalizers.map((finalizer) => finalizer.id)
    )

    return { events: [...events, ...released.events], resolves_at }
}

const built = build()

export const acquire_release_timeline: ReadonlyArray<StepEvent> = built.events
export const acquire_release_duration = built.resolves_at
