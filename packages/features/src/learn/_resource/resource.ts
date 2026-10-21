import { Effect, Resource, Schedule, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL RESOURCE PROGRAMS
// -----------------------------------------------------------------------------

export const manual_resource_program = Effect.scoped(
    Effect.gen(function* () {
        let version = 0

        const resource = yield* Resource.manual(
            Effect.sync((): string => {
                version += 1
                return `config-v${String(version)}`
            })
        )

        const before = yield* Resource.get(resource)
        const guard = Resource.isResource(resource)

        yield* Resource.refresh(resource)

        const after = yield* Resource.get(resource)

        return {
            before,
            after,
            guard,
        } as const
    })
)

export const initial_failure_program = Effect.scoped(
    Effect.gen(function* () {
        const resource = yield* Resource.manual(
            Effect.fail("initial acquisition failed" as const)
        )

        const read = yield* Effect.exit(Resource.get(resource))

        return {
            constructed: Resource.isResource(resource),
            readTag: read._tag,
        } as const
    })
)

export const refresh_failure_program = Effect.scoped(
    Effect.gen(function* () {
        let attempts = 0

        const resource = yield* Resource.manual(
            Effect.suspend(() => {
                attempts += 1
                return attempts === 1
                    ? Effect.succeed("stable-value")
                    : Effect.fail("refresh failed" as const)
            })
        )

        const before = yield* Resource.get(resource)
        const refreshExit = yield* Effect.exit(Resource.refresh(resource))
        const after = yield* Resource.get(resource)

        return {
            before,
            refreshTag: refreshExit._tag,
            after,
        } as const
    })
)

export const lifecycle_program = Effect.scoped(
    Effect.gen(function* () {
        const events: Array<string> = []
        let nextId = 0

        const acquire = Effect.acquireRelease(
            Effect.sync(() => {
                nextId += 1
                const value = { id: nextId } as const
                events.push(`acquire:${String(value.id)}`)
                return value
            }),
            (value: Readonly<{ id: number }>) =>
                Effect.sync(() => {
                    events.push(`release:${String(value.id)}`)
                })
        )

        const resource = yield* Resource.manual(acquire)
        const first = yield* Resource.get(resource)

        yield* Resource.refresh(resource)

        const second = yield* Resource.get(resource)

        return {
            first: first.id,
            second: second.id,
            events,
        } as const
    })
)

export const automatic_resource_program = Effect.scoped(
    Effect.gen(function* () {
        let version = 0

        const resource = yield* Resource.auto(
            Effect.sync((): number => {
                version += 1
                return version
            }),
            Schedule.spaced("20 millis")
        )

        const initial = yield* Resource.get(resource)
        yield* Effect.sleep("55 millis")
        const later = yield* Resource.get(resource)

        return {
            initial,
            later,
        } as const
    })
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Read"),
    S.Literal("Refresh"),
    S.Literal("Schedule"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Read",
    "Refresh",
    "Schedule",
]

export const CreateCase = S.Union([
    S.Literal("Manual"),
    S.Literal("Guard"),
    S.Literal("Model"),
    S.Literal("Boundary"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Manual",
    "Guard",
    "Model",
    "Boundary",
]

export const ReadCase = S.Union([
    S.Literal("Current"),
    S.Literal("InitialFailure"),
    S.Literal("Repeated"),
    S.Literal("Exit"),
])
export type ReadCase = typeof ReadCase.Type

export const read_cases: ReadonlyArray<ReadCase> = [
    "Current",
    "InitialFailure",
    "Repeated",
    "Exit",
]

export const RefreshCase = S.Union([
    S.Literal("Replace"),
    S.Literal("Release"),
    S.Literal("Failure"),
    S.Literal("Acquire"),
])
export type RefreshCase = typeof RefreshCase.Type

export const refresh_cases: ReadonlyArray<RefreshCase> = [
    "Replace",
    "Release",
    "Failure",
    "Acquire",
]

export const ScheduleCase = S.Union([
    S.Literal("Auto"),
    S.Literal("Policy"),
    S.Literal("Scope"),
    S.Literal("ManualToo"),
])
export type ScheduleCase = typeof ScheduleCase.Type

export const schedule_cases: ReadonlyArray<ScheduleCase> = [
    "Auto",
    "Policy",
    "Scope",
    "ManualToo",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    readCase: ReadCase,
    refreshCase: RefreshCase,
    scheduleCase: ScheduleCase,
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
        eyebrow: "a scoped holder for one refreshable acquisition result",
        title: "Create the Resource inside a scope",
        description:
            "Resource.manual performs the initial acquisition inside scoped state and returns a Resource whose construction effect itself cannot fail with the acquisition error. The value or failure is stored for later reads, while isResource lets runtime boundaries narrow unknown values.",
        code: `const resource =
    yield* Resource.manual(
        loadConfiguration
    )

Resource.isResource(resource)
// true

const value =
    yield* Resource.get(resource)`,
        apis: [
            "Resource.Resource",
            "Resource.manual",
            "Resource.isResource",
            "Scope",
        ],
        notice: "Resource.manual requires a Scope because the stored value may own finalizers. Keep the live Resource on the Effect runtime/service side of a Foldkit feature; keep only plain presentation data in the pure UI Model.",
    },

    Read: {
        eyebrow:
            "get exposes the currently stored Exit as an ordinary Effect result",
        title: "Read the current acquisition result repeatedly",
        description:
            "Resource.get reads the current ScopedRef and then flattens its stored Exit. Successful acquisitions become successful reads; a stored failed acquisition becomes a failed read. Construction still succeeds because the acquisition outcome is data inside the Resource.",
        code: `const resource =
    yield* Resource.manual(
        Effect.fail("offline")
    )
// construction succeeds

const result =
    yield* Effect.exit(
        Resource.get(resource)
    )
// Failure("offline")`,
        apis: ["Resource.get", "Effect.exit", "ScopedRef", "Exit"],
        notice: "A Resource is not a promise that runs again on every read. get observes the currently stored acquisition result. Reacquisition only happens when refresh runs or when an auto schedule triggers refresh.",
    },

    Refresh: {
        eyebrow:
            "successful replacement swaps scopes; failed replacement preserves the old result",
        title: "Refresh without discarding a working value on failure",
        description:
            "refresh re-runs the captured acquisition effect. On success it installs the new value in the ScopedRef and releases resources owned by the previous value. If acquisition fails, refresh fails and leaves the previous stored result available to get.",
        code: `const before =
    yield* Resource.get(resource)

const refreshExit =
    yield* Effect.exit(
        Resource.refresh(resource)
    )

const after =
    yield* Resource.get(resource)

// failed refresh:
// after === before`,
        apis: [
            "Resource.refresh",
            "Resource.get",
            "ScopedRef.set",
            "Effect.acquireRelease",
        ],
        notice: "Successful refresh is a lifecycle transition, not just assignment: replacing the scoped value runs the old value's finalizers. A failed refresh does not overwrite the previous stored result with the failure.",
    },

    Schedule: {
        eyebrow: "auto is manual plus a scoped background repeat loop",
        title: "Refresh in the background with a Schedule",
        description:
            "Resource.auto first constructs the same manual Resource, then forks a scoped repetition of refresh according to the supplied Schedule. The background fiber and current resource value both live only as long as the surrounding scope.",
        code: `const resource =
    yield* Resource.auto(
        loadConfiguration,
        Schedule.spaced(
            "30 seconds"
        )
    )

const current =
    yield* Resource.get(resource)`,
        apis: [
            "Resource.auto",
            "Schedule.Schedule",
            "Schedule.spaced",
            "Effect.forkScoped",
            "Resource.refresh",
        ],
        notice: "Choose a schedule that matches the cost and freshness needs of the acquisition. auto does not remove manual control: the returned Resource can still be refreshed explicitly while the scheduled loop is active.",
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
        case "Manual":
            return {
                input: "Resource.manual(acquire)",
                operation: "run acquire once inside Scope",
                result: "Resource<A, E>",
                invariant: "constructor error channel is never",
                implementation:
                    "initial Effect.exit(acquire) is stored in a ScopedRef",
                guidance:
                    "Use manual when callers should decide exactly when reacquisition occurs.",
            }

        case "Guard":
            return {
                input: "unknown value",
                operation: "Resource.isResource(value)",
                result: "boolean + type narrowing",
                invariant: "checks the Resource type marker",
                implementation: 'marker key is "~effect/Resource"',
                guidance:
                    "Use the guard at runtime boundaries before treating unknown input as a Resource.",
            }

        case "Model":
            return {
                input: "Resource<A, E>",
                operation: "hold acquire + ScopedRef<Exit<A, E>>",
                result: "refreshable scoped state",
                invariant:
                    "current acquisition result and acquisition recipe travel together",
                implementation: "Pipeable object backed by ScopedRef",
                guidance:
                    "Think of Resource as a scoped refreshable cell, not as a one-shot Effect.",
            }

        case "Boundary":
            return {
                input: "Foldkit Model / view",
                operation: "runtime owns Resource; messages carry plain values",
                result: "pure UI state + scoped runtime lifecycle",
                invariant:
                    "do not serialize a live Resource into feature state",
                implementation:
                    "own it in a service, runtime adapter, or command handler",
                guidance:
                    "Use Foldkit state for what the UI knows; use Resource for live refreshable runtime ownership.",
            }
    }
}

export const read_snapshot = (model: Model): Snapshot => {
    switch (model.readCase) {
        case "Current":
            return {
                input: "stored Exit.succeed(config-v1)",
                operation: "yield* Resource.get(resource)",
                result: '"config-v1"',
                invariant: "get does not reacquire",
                implementation: "ScopedRef.get then flatten the Exit",
                guidance:
                    "Read as often as needed; the acquisition only changes when refresh runs.",
            }

        case "InitialFailure":
            return {
                input: 'manual(Effect.fail("offline"))',
                operation: "construct Resource, then get",
                result: 'construction succeeds · get fails "offline"',
                invariant:
                    "initial acquisition failure is stored, not thrown by construction",
                implementation: "manual stores Effect.exit(acquire)",
                guidance:
                    "Handle the acquisition error when reading the Resource, even though creation itself has a never error channel.",
            }

        case "Repeated":
            return {
                input: "same Resource, no refresh",
                operation: "get → get → get",
                result: "same stored acquisition result",
                invariant: "reads are observational",
                implementation: "no acquisition effect is run by get",
                guidance:
                    "Do not use get as a polling trigger; use refresh or auto for reacquisition.",
            }

        case "Exit":
            return {
                input: "ScopedRef<Exit<A, E>>",
                operation: "Resource.get",
                result: "Effect<A, E>",
                invariant:
                    "stored Exit is translated back into the Effect channels",
                implementation: "flatMap(identity) over the stored Exit",
                guidance:
                    "The Resource remembers success or failure while callers consume a normal Effect interface.",
            }
    }
}

export const refresh_snapshot = (model: Model): Snapshot => {
    switch (model.refreshCase) {
        case "Replace":
            return {
                input: "current config-v1",
                operation: "yield* Resource.refresh(resource)",
                result: "current config-v2",
                invariant:
                    "successful acquisition becomes the new stored result",
                implementation: "ScopedRef.set installs Exit.succeed(newValue)",
                guidance:
                    "Refresh when the current value should be replaced at a caller-controlled point.",
            }

        case "Release":
            return {
                input: "old scoped value owns a finalizer",
                operation: "successful refresh installs replacement",
                result: "old finalizer runs; new value remains owned",
                invariant: "replacement closes the previous inner scope",
                implementation: "ScopedRef handles finalizer-safe swapping",
                guidance:
                    "Use scoped acquisition when each refreshed value owns connections, subscriptions, or other cleanup.",
            }

        case "Failure":
            return {
                input: "stable-value + next acquire fails",
                operation: "Effect.exit(Resource.refresh(resource))",
                result: "Failure · get still returns stable-value",
                invariant: "failed refresh does not overwrite working state",
                implementation:
                    "ScopedRef.set only swaps after successful acquisition",
                guidance:
                    "Surface refresh failure separately while continuing to serve the previous value when that is acceptable.",
            }

        case "Acquire":
            return {
                input: "Resource captures acquire at construction",
                operation: "each refresh re-runs that same Effect recipe",
                result: "new A or E from the same environment",
                invariant:
                    "manual captures the construction Context for future refreshes",
                implementation:
                    "acquire is updateContext-provided before being stored",
                guidance:
                    "Provide acquisition dependencies when constructing the Resource; later refreshes reuse that captured context.",
            }
    }
}

export const schedule_snapshot = (model: Model): Snapshot => {
    switch (model.scheduleCase) {
        case "Auto":
            return {
                input: "acquire + Schedule.spaced(30 seconds)",
                operation: "Resource.auto",
                result: "Resource + background refresh loop",
                invariant: "auto still returns the normal Resource interface",
                implementation:
                    "manual(acquire) then forkScoped(repeat(refresh, policy))",
                guidance:
                    "Use auto when freshness should be maintained independently of individual readers.",
            }

        case "Policy":
            return {
                input: "Schedule<Out, unknown, E2, R2>",
                operation: "drive refresh repetitions",
                result: "timing/retry policy controls background cadence",
                invariant:
                    "schedule requirements become constructor requirements",
                implementation:
                    "Effect.repeat(Resource.refresh(resource), policy)",
                guidance:
                    "Compose a Schedule deliberately; acquisition cost and failure behavior should shape the cadence.",
            }

        case "Scope":
            return {
                input: "auto Resource inside Effect.scoped",
                operation: "surrounding Scope closes",
                result: "background fiber stops + current value finalizes",
                invariant: "automatic work cannot outlive ownership scope",
                implementation: "refresh loop is forkScoped",
                guidance:
                    "Create auto resources in the scope whose lifetime should define their refresh loop.",
            }

        case "ManualToo":
            return {
                input: "Resource created with auto",
                operation: "caller also invokes Resource.refresh(resource)",
                result: "explicit reacquisition still works",
                invariant: "auto changes refresh policy, not the Resource API",
                implementation: "auto delegates construction to manual",
                guidance:
                    "Keep explicit refresh for exceptional events even when normal freshness is schedule-driven.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedResourceStage: {
        stage: Stage,
    },
    SelectedResourceCreateCase: {
        createCase: CreateCase,
    },
    SelectedResourceReadCase: {
        readCase: ReadCase,
    },
    SelectedResourceRefreshCase: {
        refreshCase: RefreshCase,
    },
    SelectedResourceScheduleCase: {
        scheduleCase: ScheduleCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Create",
    createCase: "Manual",
    readCase: "InitialFailure",
    refreshCase: "Failure",
    scheduleCase: "Auto",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type CreateCasePayload = Readonly<{
    createCase: CreateCase
}>

type ReadCasePayload = Readonly<{
    readCase: ReadCase
}>

type RefreshCasePayload = Readonly<{
    refreshCase: RefreshCase
}>

type ScheduleCasePayload = Readonly<{
    scheduleCase: ScheduleCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedResourceStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedResourceCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: evo(model, {
                createCase: () => createCase,
            }),
        }),

        SelectedResourceReadCase: ({ readCase }: ReadCasePayload) => ({
            model: evo(model, {
                readCase: () => readCase,
            }),
        }),

        SelectedResourceRefreshCase: ({ refreshCase }: RefreshCasePayload) => ({
            model: evo(model, {
                refreshCase: () => refreshCase,
            }),
        }),

        SelectedResourceScheduleCase: ({
            scheduleCase,
        }: ScheduleCasePayload) => ({
            model: evo(model, {
                scheduleCase: () => scheduleCase,
            }),
        }),
    })
