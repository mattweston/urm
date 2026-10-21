import { describe, expect, it } from "vitest"

import {
    categories,
    example_by_key,
    example_node_label,
    ExampleKey,
    examples,
} from "../src/learn/runner/catalog.ts"
import { example_timelines } from "../src/learn/runner/catalog/timelines.ts"
import { step_target_key } from "../src/learn/runner/catalog/define.ts"
import { control_icon_name } from "../src/learn/runner/view.ts"
import {
    shake_intensity,
    shake_keyframes,
    shake_rotation_range,
    step_node_selector,
} from "../src/learn/runner/animation.ts"
import {
    emoji,
    primitive,
    result_text,
    temperature,
    temperatures,
} from "../src/learn/runner/result.ts"
import {
    next_sound_preference,
    sound_preference_label,
} from "../src/learn/runner/audio.ts"
import {
    advance_walk,
    initial_walk,
    walk_note,
    type NoteTransposer,
} from "../src/learn/runner/tone-sounds.ts"

// `walk_note` only needs Tone to transpose, so a stub keeps the test free of an
// AudioContext while still exercising the note naming.
const fake_tone: NoteTransposer = {
    Frequency: (name: string) => ({
        transpose: (semitones: number) => ({
            toNote: () => `${name}+${semitones.toString()}`,
        }),
    }),
}
import {
    default_example_options,
    ExampleOptions,
    type ConcurrencyMode,
    type FinalizerOutcome,
} from "../src/learn/runner/catalog/options.ts"
import { is_indexed_step } from "../src/learn/runner/catalog/timeline.ts"
import { snippet_result_target_key } from "../src/learn/runner/snippet-highlights.ts"
import {
    example_key_for_route,
    effectRouteForPath,
    example_href,
    example_segments,
    isEffectExamplePath,
} from "../src/learn/runner/route.ts"

const all_keys = ExampleKey.literals
const concurrency_modes: ReadonlyArray<ConcurrencyMode> = [
    "Sequential",
    "Numbered",
    "Unbounded",
]
const finalizer_outcomes: ReadonlyArray<FinalizerOutcome> = [
    "Succeed",
    "Fail",
    "Die",
    "Interrupt",
]

// Every combination the two controls can produce, so an example that only
// misbehaves under one of them cannot hide.
const modes: ReadonlyArray<ExampleOptions> = concurrency_modes.flatMap(
    (concurrency_mode) =>
        finalizer_outcomes.map((finalizer_outcome) =>
            ExampleOptions.make({ concurrency_mode, finalizer_outcome })
        )
)

// Every href the sidebar can render, paired with the key its route must select.
const error_handling_hrefs = [
    [example_href("error-handling/all-short-circuit"), "AllShortCircuit"],
    [example_href("error-handling/or-else"), "OrElse"],
    [example_href("error-handling/first-success-of"), "FirstSuccessOf"],
    [example_href("error-handling/timeout"), "Timeout"],
    [example_href("error-handling/eventually"), "Eventually"],
    [example_href("error-handling/partition"), "Partition"],
    [example_href("error-handling/validate"), "Validate"],
    [example_href("ref/ref-make"), "RefMake"],
    [example_href("ref/ref-update-and-get"), "RefUpdateAndGet"],
    [example_href("scope/add-finalizer"), "AddFinalizer"],
    [example_href("scope/acquire-release"), "AcquireRelease"],
] as const

describe("Effect example catalog", () => {
    // The snippet selectors resolve to character offsets at import, and throw
    // when they no longer match. Touching every example is what runs them.
    it("resolves a code snippet and a result highlight for every example", () => {
        for (const mode of modes) {
            for (const key of all_keys) {
                const example = example_by_key(key, mode)

                expect(example.key).toBe(key)
                expect(example.code.source.length).toBeGreaterThan(0)

                const result_ranges =
                    example.code.highlights_by_target[snippet_result_target_key]

                expect(result_ranges).toBeDefined()
                expect(result_ranges?.length ?? 0).toBeGreaterThan(0)

                for (const range of result_ranges ?? []) {
                    expect(range.end_offset).toBeGreaterThan(range.start_offset)
                    expect(range.end_offset).toBeLessThanOrEqual(
                        example.code.source.length
                    )
                }

                expect(example_node_label(key).length).toBeGreaterThan(0)
            }
        }
    })

    it("lists every example in exactly one category", () => {
        for (const mode of modes) {
            const listed = categories(mode).flatMap((category) =>
                category.examples.map((example) => example.key)
            )

            expect([...listed].sort()).toEqual([...all_keys].sort())
            expect(listed.length).toBe(examples(mode).length)
        }
    })
})

describe("Visual Effect timelines", () => {
    it("keeps every step event inside its example's own labels", () => {
        for (const mode of modes) {
            for (const key of all_keys) {
                const timeline = example_timelines[key]

                for (const event of timeline.events(mode)) {
                    expect(event.at_millis).toBeGreaterThanOrEqual(0)

                    if (!is_indexed_step(event)) {
                        continue
                    }

                    // An index past the end would schedule a Command for a node
                    // the view never draws — the step would silently not happen.
                    expect(event.index).toBeGreaterThanOrEqual(0)
                    expect(event.index).toBeLessThan(timeline.labels.length)
                }
            }
        }
    })

    // Collected rather than asserted per event, so a failure names every
    // offending example at once instead of stopping at the first.
    it("starts a step before it completes, fails or is interrupted", () => {
        const out_of_order: Array<string> = []

        for (const mode of modes) {
            for (const key of all_keys) {
                const timeline = example_timelines[key]
                const started_at = new Map<number, number>()

                for (const event of timeline.events(mode)) {
                    if (!is_indexed_step(event)) {
                        continue
                    }

                    if (event.kind === "start") {
                        started_at.set(event.index, event.at_millis)
                        continue
                    }

                    const start = started_at.get(event.index)
                    const where = `${key} step ${event.index.toString()} ${event.kind}`

                    if (start === undefined) {
                        out_of_order.push(`${where} settles before it starts`)
                    } else if (event.at_millis < start) {
                        out_of_order.push(
                            `${where} settles at ${event.at_millis.toString()}ms, before its ${start.toString()}ms start`
                        )
                    }
                }
            }
        }

        expect(out_of_order).toEqual([])
    })
})

describe("Visual Effect step highlights", () => {
    // Hovering a node points the highlight at the code that produced it, so
    // every node needs a target — a missing one silently leaves the box on the
    // result, which looks like nothing happened.
    it("gives every step node its own resolved snippet target", () => {
        const missing: Array<string> = []

        for (const mode of modes) {
            for (const key of all_keys) {
                const example = example_by_key(key, mode)
                const timeline = example_timelines[key]

                timeline.labels.forEach((label, index) => {
                    const ranges =
                        example.code.highlights_by_target[
                            step_target_key(index)
                        ]

                    if (ranges === undefined || ranges.length === 0) {
                        missing.push(`${key}.${label}`)
                        return
                    }

                    for (const range of ranges) {
                        expect(range.end_offset).toBeGreaterThan(
                            range.start_offset
                        )
                        expect(range.end_offset).toBeLessThanOrEqual(
                            example.code.source.length
                        )
                    }
                })
            }
        }

        expect(missing).toEqual([])
    })

    it("gives the constructor examples no step targets at all", () => {
        for (const key of [
            "Succeed",
            "Fail",
            "Die",
            "Sync",
            "Sleep",
        ] as const) {
            const example = example_by_key(key, default_example_options)

            expect(example_timelines[key].labels).toEqual([])
            expect(Object.keys(example.code.highlights_by_target)).toEqual([
                snippet_result_target_key,
            ])
        }
    })
})

describe("Visual Effect scope and ref", () => {
    const scope_keys = ["AddFinalizer", "AcquireRelease"] as const
    const ref_keys = ["RefMake", "RefUpdateAndGet"] as const

    it("declares a panel for exactly the examples that draw one", () => {
        for (const key of all_keys) {
            const timeline = example_timelines[key]
            const has_scope = timeline.has_scope === true
            const has_ref = timeline.ref !== undefined

            expect(has_scope).toBe(
                (scope_keys as ReadonlyArray<string>).includes(key)
            )
            expect(has_ref).toBe(
                (ref_keys as ReadonlyArray<string>).includes(key)
            )
        }
    })

    it("registers a finalizer before it runs, and runs it before completing", () => {
        const problems: Array<string> = []

        for (const mode of modes) {
            for (const key of scope_keys) {
                const registered = new Set<string>()
                const running = new Set<string>()

                for (const event of example_timelines[key].events(mode)) {
                    if (event.kind === "finalizer_added") {
                        registered.add(event.id)
                    } else if (event.kind === "finalizer_running") {
                        if (!registered.has(event.id)) {
                            problems.push(
                                `${key}: ${event.id} runs unregistered`
                            )
                        }
                        running.add(event.id)
                    } else if (
                        event.kind === "finalizer_completed" &&
                        !running.has(event.id)
                    ) {
                        problems.push(
                            `${key}: ${event.id} completes without running`
                        )
                    }
                }
            }
        }

        expect(problems).toEqual([])
    })

    // The guarantee `acquireRelease` is about: resources are torn down in the
    // reverse of the order they were taken.
    it("releases acquire-release's finalizers last-in first-out", () => {
        const registered: Array<string> = []
        const ran: Array<string> = []

        for (const event of example_timelines.AcquireRelease.events(
            default_example_options
        )) {
            if (event.kind === "finalizer_added") {
                registered.push(event.id)
            } else if (event.kind === "finalizer_running") {
                ran.push(event.id)
            }
        }

        expect(registered.length).toBeGreaterThan(1)
        expect(ran).toEqual(registered.toReversed())
    })

    // Upstream keeps the node alive for an hour on this outcome and waits for a
    // tap, so `update` — not the timeline — has to emit the release.
    it("leaves the interrupt outcome unresolved", () => {
        const interrupt_options = ExampleOptions.make({
            concurrency_mode: "Sequential",
            finalizer_outcome: "Interrupt",
        })
        const events = example_timelines.AddFinalizer.events(interrupt_options)

        expect(events.some((event) => event.kind === "finalizer_added")).toBe(
            true
        )
        expect(
            events.some(
                (event) =>
                    event.kind === "complete" ||
                    event.kind === "fail" ||
                    event.kind === "finalizer_running"
            )
        ).toBe(false)

        for (const outcome of ["Succeed", "Fail", "Die"] as const) {
            const resolved = example_timelines.AddFinalizer.events(
                ExampleOptions.make({
                    concurrency_mode: "Sequential",
                    finalizer_outcome: outcome,
                })
            )

            expect(
                resolved.some((event) => event.kind === "finalizer_running")
            ).toBe(true)
        }
    })

    it("starts each ref at the value its panel first shows", () => {
        for (const key of ref_keys) {
            const timeline = example_timelines[key]
            const first_ref = timeline
                .events(default_example_options)
                .find((event) => event.kind === "ref")

            expect(timeline.ref?.name.length ?? 0).toBeGreaterThan(0)
            expect(first_ref).toBeDefined()
            // The run resets the counter before its first increment, so the
            // first ref event must agree with the panel's initial value.
            expect(
                first_ref !== undefined && first_ref.kind === "ref"
                    ? first_ref.value
                    : undefined
            ).toBe(timeline.ref?.initial)
        }
    })
})

describe("Visual Effect results", () => {
    // Values reach the view as tagged results, not pre-baked strings, so a
    // temperature can render its degree sign and an emoji its own size.
    it("carries every completed step value as a typed result", () => {
        for (const mode of modes) {
            for (const key of all_keys) {
                for (const event of example_timelines[key].events(mode)) {
                    if (event.kind !== "complete") {
                        continue
                    }

                    expect([
                        "PrimitiveResult",
                        "EmojiResult",
                        "TemperatureResult",
                        "TemperatureListResult",
                    ]).toContain(event.value._tag)
                    expect(result_text(event.value).length).toBeGreaterThan(0)
                }
            }
        }
    })

    it("renders temperatures as degrees rather than bare numbers", () => {
        expect(result_text(temperature(65))).toBe("65°")
        expect(result_text(temperatures([65, 44]))).toBe("[65°, 44°]")
        expect(result_text(primitive("$58"))).toBe("$58")
        expect(result_text(emoji("🐢"))).toBe("🐢")
    })

    // Upstream races animal emoji; the port showed the words until results
    // became typed.
    it("races emoji, not names", () => {
        const values = example_timelines.Race.events(default_example_options)
            .filter((event) => event.kind === "complete")
            .map((event) => (event.kind === "complete" ? event.value._tag : ""))

        expect(values).toContain("EmojiResult")
    })
})

describe("Visual Effect sound preference", () => {
    it("cycles system to on to off and back", () => {
        expect(next_sound_preference("System")).toBe("On")
        expect(next_sound_preference("On")).toBe("Off")
        expect(next_sound_preference("Off")).toBe("System")
    })

    it("labels each state", () => {
        expect(sound_preference_label("System")).toBe("SOUND SYSTEM")
        expect(sound_preference_label("On")).toBe("SOUND ON")
        expect(sound_preference_label("Off")).toBe("SOUND OFF")
    })
})

describe("Effect example shake", () => {
    // The animation itself needs a DOM, but the keyframes are pure — and the
    // property that matters is testable: a shake that does not end at rest
    // leaves the node permanently displaced, which no amount of watching it
    // once would reliably catch.
    it("ends every shake back at rest", () => {
        for (let attempt = 0; attempt < 50; attempt += 1) {
            const frames = shake_keyframes(shake_intensity)
            const last = frames.at(-1)

            expect(frames.length).toBe(7)
            expect(last?.to).toBe(0)
        }
    })

    it("keeps every jolt inside the intensity it was given", () => {
        for (const range of [shake_intensity, shake_rotation_range]) {
            for (let attempt = 0; attempt < 50; attempt += 1) {
                for (const frame of shake_keyframes(range)) {
                    expect(Math.abs(frame.to)).toBeLessThanOrEqual(range / 2)
                    expect(frame.duration).toBeGreaterThan(0)
                }
            }
        }
    })

    it("scopes its selector to the example subtree", () => {
        expect(step_node_selector(2)).toBe(
            '.effect-example [data-step-index="2"]'
        )
    })
})

describe("Visual Effect trigger button", () => {
    const idle = { _tag: "Idle" } as const
    const running = {
        _tag: "Running",
        run_id: 1,
        started_at_millis: 0,
        elapsed_millis: 0,
    } as const
    const succeeded = {
        _tag: "Succeeded",
        duration_millis: 1,
        result: primitive("ok"),
    } as const

    it("shows the sparkle until the pointer is over it", () => {
        for (const state of [idle, running, succeeded]) {
            expect(control_icon_name(state, false)).toBe("star")
        }
    })

    // The whole point: the button says what tapping it will do.
    it("offers the action it would take on hover", () => {
        expect(control_icon_name(idle, true)).toBe("play")
        expect(control_icon_name(running, true)).toBe("stop")
        expect(control_icon_name(succeeded, true)).toBe("reset")
    })
})

describe("Visual Effect pitch walk", () => {
    const walk = (
        gaps: ReadonlyArray<number>,
        offset = 0
    ): ReadonlyArray<{ scale_index: number; octave: number }> => {
        let state = initial_walk
        let now = 0
        const notes: Array<{ scale_index: number; octave: number }> = []

        for (const gap of gaps) {
            now += gap
            const advanced = advance_walk(state, offset, now)
            state = advanced.walk
            notes.push({
                scale_index: advanced.scale_index,
                octave: advanced.walk.chord_base_octave,
            })
        }

        return notes
    }

    // Repeated events climb the scale instead of repeating one note.
    it("moves through the scale when events are far apart", () => {
        const notes = walk([0, 500, 500, 500, 500])
        const degrees = notes.map((note) => note.scale_index)

        expect(new Set(degrees).size).toBeGreaterThan(1)
    })

    // The reason concurrent nodes sound like a chord rather than five clicks.
    it("voices simultaneous events as distinct adjacent degrees", () => {
        const chord = walk([0, 1, 1, 1, 1])
        const degrees = chord.map((note) => note.scale_index)

        expect(new Set(degrees).size).toBe(degrees.length)
    })

    // The first event in a window fixes the chord's octave; the rest join it.
    it("keeps one octave for the whole chord", () => {
        let state = initial_walk
        const octaves: Array<number> = []

        for (const [index, offset] of [0, 1, 0.5, 1].entries()) {
            const advanced = advance_walk(state, offset, index)
            state = advanced.walk
            octaves.push(advanced.walk.chord_base_octave)
        }

        expect(new Set(octaves).size).toBe(1)
        expect(octaves[0]).toBe(0)
    })

    it("names a note from a scale degree and an octave offset", () => {
        expect(walk_note(fake_tone, 0, 0)).toBe("C3")
        expect(walk_note(fake_tone, 3, 1)).toBe("G4")
        // A fractional offset is a semitone transpose, not the unparseable
        // "C3.5" upstream builds.
        expect(walk_note(fake_tone, 0, 0.5)).toBe("C3+6")
    })
})

describe("Effect example routes", () => {
    it("claims exactly its own lesson paths", () => {
        expect(isEffectExamplePath("/learn/constructors/succeed")).toBe(true)
        expect(isEffectExamplePath("/learn/error-handling/partition/")).toBe(
            true
        )
        // `/learn/` is the index, a subject on its own is not a lesson, and the
        // other lessons are not this runner's.
        expect(isEffectExamplePath("/learn")).toBe(false)
        expect(isEffectExamplePath("/learn/")).toBe(false)
        expect(isEffectExamplePath("/learn/scope")).toBe(false)
        expect(isEffectExamplePath("/learn/number")).toBe(false)
        expect(isEffectExamplePath("/learn/constructors/succeeding")).toBe(
            false
        )
    })

    it("files every example under a subject, never under a library name", () => {
        expect(example_segments).toHaveLength(25)
        const subjects = new Set(
            example_segments.map((segment) => segment.split("/")[0])
        )
        expect([...subjects].sort()).toEqual([
            "concurrency",
            "constructors",
            "error-handling",
            "ref",
            "schedule",
            "scope",
        ])
        for (const segment of example_segments) {
            expect(segment).toMatch(/^[a-z-]+\/[a-z-]+$/)
            const href = example_href(segment)
            expect(href).toBe(`/learn/${segment}/`)
            expect(isEffectExamplePath(href)).toBe(true)
        }
    })

    it("selects the example each href is for", () => {
        for (const [href, key] of error_handling_hrefs) {
            expect(example_key_for_route(effectRouteForPath(href))).toBe(key)
        }
    })

    it("resolves a path with or without its trailing slash", () => {
        expect(effectRouteForPath("/learn/constructors/succeed")._tag).toBe(
            "SucceedRoute"
        )
        expect(
            effectRouteForPath(example_href("constructors/succeed"))._tag
        ).toBe("SucceedRoute")
        expect(effectRouteForPath("/learn/concurrency/all")._tag).toBe(
            "AllRoute"
        )
        expect(effectRouteForPath(example_href("concurrency/all"))._tag).toBe(
            "AllRoute"
        )
    })

    it("falls back to NotFound for an unknown example", () => {
        expect(
            effectRouteForPath("/learn/visual-effect/effect-catch/")._tag
        ).toBe("NotFoundRoute")
    })
})
