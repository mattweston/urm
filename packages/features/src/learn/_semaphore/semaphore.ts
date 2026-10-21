import { Effect, Option, Semaphore, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL SEMAPHORE PROGRAMS
// -----------------------------------------------------------------------------

export const bounded_concurrency_program = Effect.gen(function* () {
    const semaphore = yield* Semaphore.make(2)
    let active = 0
    let peak = 0

    const task = (id: number) =>
        Semaphore.withPermit(
            semaphore,
            Effect.gen(function* () {
                active += 1
                peak = Math.max(peak, active)
                yield* Effect.yieldNow
                active -= 1
                return id
            })
        )

    const values = yield* Effect.all([task(1), task(2), task(3), task(4)], {
        concurrency: "unbounded",
    })

    return {
        values,
        peak,
    } as const
})

export const automatic_release_program = Effect.gen(function* () {
    const semaphore = yield* Semaphore.make(1)

    const failed = yield* Effect.exit(
        Semaphore.withPermit(semaphore, Effect.fail("boom" as const))
    )

    const availableAfterFailure = yield* Semaphore.takeIfAvailable(semaphore, 1)

    if (availableAfterFailure) {
        yield* Semaphore.release(semaphore, 1)
    }

    return {
        exitTag: failed._tag,
        availableAfterFailure,
    } as const
})

export const immediate_guard_program = Effect.gen(function* () {
    const semaphore = yield* Semaphore.make(1)

    yield* Semaphore.take(semaphore, 1)

    const blocked = yield* Semaphore.withPermitsIfAvailable(
        semaphore,
        1,
        Effect.succeed("ran" as const)
    )

    yield* Semaphore.release(semaphore, 1)

    const admitted = yield* Semaphore.withPermitsIfAvailable(
        semaphore,
        1,
        Effect.succeed("ran" as const)
    )

    return {
        blocked: Option.isNone(blocked),
        admitted: Option.isSome(admitted),
    } as const
})

export const manual_permit_program = Effect.gen(function* () {
    const semaphore = yield* Semaphore.make(3)

    const acquired = yield* Semaphore.take(semaphore, 2)
    const twoMoreImmediately = yield* Semaphore.takeIfAvailable(semaphore, 2)
    const freeAfterRelease = yield* Semaphore.release(semaphore, 1)
    const twoAfterRelease = yield* Semaphore.takeIfAvailable(semaphore, 2)
    const freeAfterReleaseAll = yield* Semaphore.releaseAll(semaphore)

    return {
        acquired,
        twoMoreImmediately,
        freeAfterRelease,
        twoAfterRelease,
        freeAfterReleaseAll,
    } as const
})

export const resize_program = Effect.gen(function* () {
    const semaphore = yield* Semaphore.make(2)

    yield* Semaphore.take(semaphore, 2)
    yield* Semaphore.resize(semaphore, 1)

    const whileOvercommitted = yield* Semaphore.takeIfAvailable(semaphore, 1)

    yield* Semaphore.release(semaphore, 2)

    const afterRelease = yield* Semaphore.takeIfAvailable(semaphore, 1)
    if (afterRelease) {
        yield* Semaphore.release(semaphore, 1)
    }

    yield* Semaphore.resize(semaphore, 4)
    const afterGrow = yield* Semaphore.takeIfAvailable(semaphore, 4)
    if (afterGrow) {
        yield* Semaphore.release(semaphore, 4)
    }

    return {
        whileOvercommitted,
        afterRelease,
        afterGrow,
    } as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Guard"),
    S.Literal("Manual"),
    S.Literal("Resize"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Guard",
    "Manual",
    "Resize",
]

export const CreateCase = S.Union([
    S.Literal("Effect"),
    S.Literal("Unsafe"),
    S.Literal("Permits"),
    S.Literal("Boundary"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Effect",
    "Unsafe",
    "Permits",
    "Boundary",
]

export const GuardCase = S.Union([
    S.Literal("One"),
    S.Literal("Many"),
    S.Literal("Immediate"),
    S.Literal("Exit"),
])
export type GuardCase = typeof GuardCase.Type

export const guard_cases: ReadonlyArray<GuardCase> = [
    "One",
    "Many",
    "Immediate",
    "Exit",
]

export const ManualCase = S.Union([
    S.Literal("Take"),
    S.Literal("TryTake"),
    S.Literal("Release"),
    S.Literal("Ordering"),
])
export type ManualCase = typeof ManualCase.Type

export const manual_cases: ReadonlyArray<ManualCase> = [
    "Take",
    "TryTake",
    "Release",
    "Ordering",
]

export const ResizeCase = S.Union([
    S.Literal("Shrink"),
    S.Literal("Grow"),
    S.Literal("Held"),
    S.Literal("Wake"),
])
export type ResizeCase = typeof ResizeCase.Type

export const resize_cases: ReadonlyArray<ResizeCase> = [
    "Shrink",
    "Grow",
    "Held",
    "Wake",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    guardCase: GuardCase,
    manualCase: ManualCase,
    resizeCase: ResizeCase,
})
export type Model = typeof Model.Type

export type StageDetails = Readonly<{
    eyebrow: string
    title: string
    description: string
    code: string
    apis: ReadonlyArray<string>
    notice: string
}>

export const stage_details: Record<Stage, StageDetails> = {
    Create: {
        eyebrow: "one permit counter shared by concurrent effects",
        title: "Create the semaphore where concurrency policy lives",
        description:
            "Semaphore.make creates the semaphore inside Effect. makeUnsafe returns it synchronously for controlled boundaries. The initial permit count is the total concurrency budget; work that needs more permits than are currently free waits until enough are released.",
        code: `const semaphore =
    yield* Semaphore.make(2)

const guarded =
    Semaphore.withPermit(
        semaphore,
        Effect.succeed("done")
    )

// at most two one-permit
// regions can be active`,
        apis: [
            "Semaphore.Semaphore",
            "Semaphore.make",
            "Semaphore.makeUnsafe",
            "Semaphore.withPermit",
        ],
        notice: "A Semaphore is runtime coordination, not serializable application state. Keep it in Effect services/runtime wiring and keep the Foldkit Model limited to plain UI-visible state.",
    },

    Guard: {
        eyebrow:
            "automatic wrappers acquire before work and release on every exit",
        title: "Prefer automatic permit bracketing around one effect",
        description:
            "withPermit and withPermits wait until enough permits are free, run the wrapped effect, then return the permits when that effect exits. withPermitsIfAvailable is the non-waiting variant: it returns Option.none and does not run the work when the budget is unavailable.",
        code: `const result =
    yield* Semaphore.withPermitsIfAvailable(
        semaphore,
        2,
        expensiveWork
    )

if (Option.isNone(result)) {
    // work never started
}`,
        apis: [
            "Semaphore.withPermit",
            "Semaphore.withPermits",
            "Semaphore.withPermitsIfAvailable",
            "Option.Option",
        ],
        notice: "Automatic wrappers are interruption-safe: once permits are acquired, they are returned when the wrapped effect succeeds, fails, or is interrupted. Prefer them over manual take/release whenever the permit lifetime matches one effect.",
    },

    Manual: {
        eyebrow:
            "low-level permit protocols expose acquisition and release directly",
        title: "Use take and release only when one effect wrapper is not enough",
        description:
            "take waits for a requested permit count and returns that count. takeIfAvailable returns false immediately when the request cannot be satisfied. release returns permits manually, while releaseAll returns every currently taken permit. Manual protocols must keep the accounting balanced.",
        code: `yield* Semaphore.take(
    semaphore,
    2
)

try {
    // custom protocol spans
    // multiple operations
} finally {
    yield* Semaphore.release(
        semaphore,
        2
    )
}`,
        apis: [
            "Semaphore.take",
            "Semaphore.takeIfAvailable",
            "Semaphore.release",
            "Semaphore.releaseAll",
        ],
        notice: "Pending take calls are scanned in registration order, but they are not strict FIFO reservations: a smaller later request may proceed before a larger earlier request when only the smaller request fits the currently free permits.",
    },

    Resize: {
        eyebrow: "capacity can change without revoking permits already held",
        title: "Resize the total budget while preserving current acquisitions",
        description:
            "resize changes the semaphore's total permit count. Existing acquisitions stay taken. Shrinking below the currently held count temporarily makes the semaphore overcommitted, so new acquisitions wait; growing the total can wake queued work immediately.",
        code: `yield* Semaphore.take(
    semaphore,
    2
)

// existing two permits stay held
// even though total becomes one
yield* Semaphore.resize(
    semaphore,
    1
)

// new acquisition waits until
// enough permits are released`,
        apis: [
            "Semaphore.resize",
            "Semaphore.take",
            "Semaphore.release",
            "Semaphore.withPermits",
        ],
        notice: "resize changes capacity, not ownership. It never force-releases work that is already inside a guarded region; the new limit becomes effective as existing holders return permits.",
    },
}

// -----------------------------------------------------------------------------
// VISUAL SNAPSHOTS
// -----------------------------------------------------------------------------

export type Snapshot = Readonly<{
    input: string
    operation: string
    result: string
    invariant: string
    implementation: string
    guidance: string
}>

export const create_snapshot = (model: Model): Snapshot => {
    switch (model.createCase) {
        case "Effect":
            return {
                input: "initial budget = 2 permits",
                operation: "yield* Semaphore.make(2)",
                result: "Effect<Semaphore>",
                invariant: "the semaphore owns one shared permit counter",
                implementation: "construction is wrapped in Effect.sync",
                guidance:
                    "Create inside Effect when the semaphore belongs to runtime program wiring.",
            }

        case "Unsafe":
            return {
                input: "initial budget = 3 permits",
                operation: "Semaphore.makeUnsafe(3)",
                result: "Semaphore immediately",
                invariant:
                    "same runtime semantics, no Effect construction boundary",
                implementation: "constructs SemaphoreImpl synchronously",
                guidance:
                    "Use makeUnsafe only at controlled synchronous setup or test boundaries.",
            }

        case "Permits":
            return {
                input: "4 tasks × 1 permit, budget 2",
                operation: "withPermit(task) for each",
                result: "peak active guarded work = 2",
                invariant: "permit count bounds guarded concurrency",
                implementation:
                    "free = total permits − currently taken permits",
                guidance:
                    "Model permits as capacity units: a task can request more than one when it consumes more shared capacity.",
            }

        case "Boundary":
            return {
                input: "Foldkit feature + shared runtime limiter",
                operation: "keep Semaphore outside Model",
                result: "serializable Model + runtime coordination service",
                invariant: "UI state should not own synchronization primitives",
                implementation:
                    "messages carry intent; Effect layer performs guarded work",
                guidance:
                    "Store only plain state in Model and inject or close over the semaphore where effects run.",
            }
    }
}

export const guard_snapshot = (model: Model): Snapshot => {
    switch (model.guardCase) {
        case "One":
            return {
                input: "Effect<A, E, R>",
                operation: "Semaphore.withPermit(semaphore, effect)",
                result: "same A / E / R after one-permit guard",
                invariant: "exactly one permit is held for the effect lifetime",
                implementation: "withPermit is the one-permit specialization",
                guidance:
                    "Use withPermit for ordinary mutex-like or one-slot concurrency guarding.",
            }

        case "Many":
            return {
                input: "effect needs 3 capacity units",
                operation: "withPermits(semaphore, 3, effect)",
                result: "wait → run → release 3",
                invariant: "work starts only when the full request fits",
                implementation:
                    "taken increases only after enough free permits exist",
                guidance:
                    "Use multiple permits when guarded tasks consume different shares of a bounded resource.",
            }

        case "Immediate":
            return {
                input: "requested permits are currently unavailable",
                operation: "withPermitsIfAvailable(...)",
                result: "Option.none; wrapped effect is not run",
                invariant: "the immediate variant never waits",
                implementation: "checks free count before entering the effect",
                guidance:
                    "Use this for opportunistic work, shedding, or fallback paths where queuing would be undesirable.",
            }

        case "Exit":
            return {
                input: "guarded effect fails or is interrupted",
                operation: "automatic wrapper observes exit",
                result: "permits returned before wrapper completes",
                invariant:
                    "automatic permit lifetime matches the wrapped effect",
                implementation: "release runs in the wrapper's exit handler",
                guidance:
                    "Prefer automatic wrappers when possible so error and interruption paths cannot leak permits.",
            }
    }
}

export const manual_snapshot = (model: Model): Snapshot => {
    switch (model.manualCase) {
        case "Take":
            return {
                input: "need 2 permits",
                operation: "yield* Semaphore.take(semaphore, 2)",
                result: "2 after waiting until available",
                invariant: "take reserves permits until explicit release",
                implementation: "the request suspends when free < requested",
                guidance:
                    "Use take only when the protected protocol cannot be represented by one wrapped Effect.",
            }

        case "TryTake":
            return {
                input: "need 2 permits right now",
                operation: "takeIfAvailable(semaphore, 2)",
                result: "true if acquired; false without waiting",
                invariant: "false means no permits were taken",
                implementation:
                    "free count is checked atomically before incrementing taken",
                guidance:
                    "Pair a true result with release later; a false result needs no cleanup.",
            }

        case "Release":
            return {
                input: "manual acquisition is finished",
                operation: "release(2) or releaseAll",
                result: "updated free permit count",
                invariant: "manual accounting is caller-owned",
                implementation:
                    "releasing schedules waiting observers for re-check",
                guidance:
                    "Keep take/release counts balanced. Prefer withPermits when a lexical effect boundary exists.",
            }

        case "Ordering":
            return {
                input: "earlier waiter needs 3; later waiter needs 1; free = 1",
                operation: "scan registered waiters",
                result: "later 1-permit waiter may proceed first",
                invariant:
                    "registration order is scanned, but unsatisfied requests do not reserve capacity",
                implementation:
                    "each waiter resumes only when free >= its requested permits",
                guidance:
                    "Do not rely on strict FIFO fairness across requests with different permit counts.",
            }
    }
}

export const resize_snapshot = (model: Model): Snapshot => {
    switch (model.resizeCase) {
        case "Shrink":
            return {
                input: "2 permits currently held; resize total to 1",
                operation: "Semaphore.resize(semaphore, 1)",
                result: "held = 2; free is temporarily below zero",
                invariant: "existing acquisitions are not revoked",
                implementation: "resize updates total permits only",
                guidance:
                    "Expect new work to wait until releases bring the semaphore back within the smaller capacity.",
            }

        case "Grow":
            return {
                input: "queued work + total grows from 1 to 4",
                operation: "Semaphore.resize(semaphore, 4)",
                result: "newly satisfiable waiters are scheduled",
                invariant:
                    "capacity increases can admit queued work immediately",
                implementation:
                    "resize re-runs waiter checks when free is non-negative",
                guidance:
                    "Growing a semaphore is useful for runtime tuning without replacing the coordination object.",
            }

        case "Held":
            return {
                input: "guarded region already owns permits",
                operation: "resize while it is running",
                result: "region keeps its permits until normal exit",
                invariant: "resize is not cancellation",
                implementation: "taken count remains unchanged",
                guidance:
                    "Use cancellation separately if currently running work must stop; resizing only changes future admission.",
            }

        case "Wake":
            return {
                input: "waiters blocked on insufficient free permits",
                operation: "release or grow capacity",
                result: "waiting requests re-check availability",
                invariant: "a wake is a re-check, not a permit reservation",
                implementation:
                    "observers are scheduled through the current dispatcher",
                guidance:
                    "Reason about admission from the live free count rather than assuming wake order guarantees completion order.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedSemaphoreStage: {
        stage: Stage,
    },
    SelectedSemaphoreCreateCase: {
        createCase: CreateCase,
    },
    SelectedSemaphoreGuardCase: {
        guardCase: GuardCase,
    },
    SelectedSemaphoreManualCase: {
        manualCase: ManualCase,
    },
    SelectedSemaphoreResizeCase: {
        resizeCase: ResizeCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Create",
    createCase: "Effect",
    guardCase: "Immediate",
    manualCase: "Ordering",
    resizeCase: "Shrink",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type CreateCasePayload = Readonly<{
    createCase: CreateCase
}>

type GuardCasePayload = Readonly<{
    guardCase: GuardCase
}>

type ManualCasePayload = Readonly<{
    manualCase: ManualCase
}>

type ResizeCasePayload = Readonly<{
    resizeCase: ResizeCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedSemaphoreStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedSemaphoreCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: evo(model, {
                createCase: () => createCase,
            }),
        }),

        SelectedSemaphoreGuardCase: ({ guardCase }: GuardCasePayload) => ({
            model: evo(model, {
                guardCase: () => guardCase,
            }),
        }),

        SelectedSemaphoreManualCase: ({ manualCase }: ManualCasePayload) => ({
            model: evo(model, {
                manualCase: () => manualCase,
            }),
        }),

        SelectedSemaphoreResizeCase: ({ resizeCase }: ResizeCasePayload) => ({
            model: evo(model, {
                resizeCase: () => resizeCase,
            }),
        }),
    })
