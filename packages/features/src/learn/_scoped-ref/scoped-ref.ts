import { Effect, Scope, ScopedRef, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL SCOPEDREF PROGRAMS
// -----------------------------------------------------------------------------

type Handle = Readonly<{
    name: string
}>

const acquire_handle = (
    name: string,
    events: Array<string>
): Effect.Effect<Handle, never, Scope.Scope> =>
    Effect.acquireRelease(
        Effect.sync((): Handle => {
            events.push(`acquire:${name}`)
            return { name }
        }),
        (handle: Handle) =>
            Effect.sync(() => {
                events.push(`release:${handle.name}`)
            })
    )

export const from_acquire_program = Effect.gen(function* () {
    const events: Array<string> = []

    const snapshot = yield* Effect.scoped(
        Effect.gen(function* () {
            const ref = yield* ScopedRef.fromAcquire(
                acquire_handle("primary", events)
            )

            const current = yield* ScopedRef.get(ref)
            const unsafe = ScopedRef.getUnsafe(ref)

            return {
                current: current.name,
                unsafe: unsafe.name,
                duringScope: events.slice(),
            } as const
        })
    )

    return {
        ...snapshot,
        afterScope: events.slice(),
    } as const
})

export const make_value_program = Effect.scoped(
    Effect.gen(function* () {
        let evaluations = 0

        const ref = yield* ScopedRef.make((): string => {
            evaluations += 1
            return `value-${String(evaluations)}`
        })

        const first = yield* ScopedRef.get(ref)
        const second = yield* ScopedRef.get(ref)

        return {
            first,
            second,
            evaluations,
        } as const
    })
)

export const replacement_program = Effect.gen(function* () {
    const events: Array<string> = []

    const snapshot = yield* Effect.scoped(
        Effect.gen(function* () {
            const ref = yield* ScopedRef.fromAcquire(
                acquire_handle("v1", events)
            )

            const before = yield* ScopedRef.get(ref)

            yield* ScopedRef.set(ref, acquire_handle("v2", events))

            const after = yield* ScopedRef.get(ref)

            return {
                before: before.name,
                after: after.name,
                duringScope: events.slice(),
            } as const
        })
    )

    return {
        ...snapshot,
        afterScope: events.slice(),
    } as const
})

export const failed_replacement_program = Effect.scoped(
    Effect.gen(function* () {
        const events: Array<string> = []

        const ref = yield* ScopedRef.fromAcquire(
            acquire_handle("stable", events)
        )

        const candidate = acquire_handle("candidate", events).pipe(
            Effect.flatMap(() => Effect.fail("candidate failed" as const))
        )

        const replacement = yield* Effect.exit(ScopedRef.set(ref, candidate))
        const after = yield* ScopedRef.get(ref)

        return {
            replacementTag: replacement._tag,
            current: after.name,
            events: events.slice(),
        } as const
    })
)

export const plain_set_program = Effect.scoped(
    Effect.gen(function* () {
        const ref = yield* ScopedRef.make(() => "draft")

        yield* ScopedRef.set(ref, Effect.succeed("published"))

        return yield* ScopedRef.get(ref)
    })
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Read"),
    S.Literal("Replace"),
    S.Literal("Release"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Read",
    "Replace",
    "Release",
]

export const CreateCase = S.Union([
    S.Literal("Acquire"),
    S.Literal("Value"),
    S.Literal("Backing"),
    S.Literal("Boundary"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Acquire",
    "Value",
    "Backing",
    "Boundary",
]

export const ReadCase = S.Union([
    S.Literal("Effect"),
    S.Literal("Unsafe"),
    S.Literal("Stable"),
    S.Literal("Ownership"),
])
export type ReadCase = typeof ReadCase.Type

export const read_cases: ReadonlyArray<ReadCase> = [
    "Effect",
    "Unsafe",
    "Stable",
    "Ownership",
]

export const ReplaceCase = S.Union([
    S.Literal("Success"),
    S.Literal("Failure"),
    S.Literal("Serialized"),
    S.Literal("Requirements"),
])
export type ReplaceCase = typeof ReplaceCase.Type

export const replace_cases: ReadonlyArray<ReplaceCase> = [
    "Success",
    "Failure",
    "Serialized",
    "Requirements",
]

export const ReleaseCase = S.Union([
    S.Literal("Previous"),
    S.Literal("Outer"),
    S.Literal("Order"),
    S.Literal("Resource"),
])
export type ReleaseCase = typeof ReleaseCase.Type

export const release_cases: ReadonlyArray<ReleaseCase> = [
    "Previous",
    "Outer",
    "Order",
    "Resource",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    readCase: ReadCase,
    replaceCase: ReplaceCase,
    releaseCase: ReleaseCase,
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
        eyebrow: "one current value paired with the Scope that owns it",
        title: "Create the ScopedRef inside an outer Scope",
        description:
            "ScopedRef.fromAcquire runs the initial acquisition in a private child Scope and stores that Scope beside the acquired value. Use ScopedRef.make only when the initial value itself does not acquire resources; its lazy evaluator is not a scoped acquisition.",
        code: `const ref =
    yield* ScopedRef.fromAcquire(
        openConnection
    )

const current =
    yield* ScopedRef.get(ref)

// initial acquisition failure
// fails this constructor effect`,
        apis: [
            "ScopedRef.ScopedRef",
            "ScopedRef.fromAcquire",
            "ScopedRef.make",
            "Scope.Scope",
        ],
        notice: "Unlike Resource.manual, fromAcquire does not store an initial failure as data: a failed acquisition fails construction. Keep the live ScopedRef on the Effect runtime/service side of a Foldkit feature, not in the serializable UI Model.",
    },

    Read: {
        eyebrow:
            "reads observe the current value without changing resource ownership",
        title: "Read through Effect, or bypass it deliberately",
        description:
            "ScopedRef.get wraps a synchronous current-value read in Effect. getUnsafe returns the same current value directly, which is useful only when the caller intentionally steps outside the Effect boundary. Neither read reacquires or releases anything.",
        code: `const current =
    yield* ScopedRef.get(ref)

const direct =
    ScopedRef.getUnsafe(ref)

// both observe the same
// current value`,
        apis: [
            "ScopedRef.get",
            "ScopedRef.getUnsafe",
            "Effect.sync",
            "SynchronizedRef",
        ],
        notice: "getUnsafe is unsafe because it bypasses the Effect API, not because it mutates the reference. Prefer get inside normal Effect programs so runtime boundaries remain explicit.",
    },

    Replace: {
        eyebrow: "replacement acquisition is serialized and scope-safe",
        title: "Acquire the replacement before releasing the old value",
        description:
            "ScopedRef.set creates a fresh child Scope, acquires the replacement inside it, then closes the previous Scope and installs the new pair. The whole transition is uninterruptible and guarded by the backing SynchronizedRef semaphore, so concurrent replacements happen one at a time.",
        code: `const before =
    yield* ScopedRef.get(ref)

const result =
    yield* Effect.exit(
        ScopedRef.set(
            ref,
            openReplacement
        )
    )

const after =
    yield* ScopedRef.get(ref)`,
        apis: [
            "ScopedRef.set",
            "SynchronizedRef",
            "Semaphore.withPermit",
            "Scope.close",
        ],
        notice: "If replacement acquisition fails, its new Scope is closed and the old value stays current. On success the old Scope is closed before the backing pair is swapped to the replacement.",
    },

    Release: {
        eyebrow:
            "the current child Scope is owned by the ScopedRef's outer lifetime",
        title: "Release old values on swap and the current value on outer close",
        description:
            "A successful set closes the previous child Scope immediately. The constructor also registers an outer finalizer that closes whichever child Scope is current when the owning Scope ends. This gives every installed resource exactly one explicit lifetime owner.",
        code: `yield* Effect.scoped(
    Effect.gen(function* () {
        const ref =
            yield* ScopedRef.fromAcquire(
                openConnection
            )

        yield* ScopedRef.set(
            ref,
            openReplacement
        )
    })
)
// current replacement released here`,
        apis: [
            "Effect.scoped",
            "Effect.addFinalizer",
            "Scope.close",
            "ScopedRef.set",
        ],
        notice: "ScopedRef owns one replaceable scoped value. Resource builds refresh policy on top of ScopedRef; ScopedCache owns many independently scoped entries keyed by cache key.",
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
        case "Acquire":
            return {
                input: "Effect<A, E, R> that may acquire resources",
                operation: "ScopedRef.fromAcquire(acquire)",
                result: "Effect<ScopedRef<A>, E, Scope | R>",
                invariant: "initial acquisition failure fails construction",
                implementation: "fresh Closeable Scope is provided to acquire",
                guidance:
                    "Use fromAcquire whenever creation itself opens resources that need finalizers.",
            }

        case "Value":
            return {
                input: "lazy plain value",
                operation: "ScopedRef.make(() => value)",
                result: "Effect<ScopedRef<A>, never, Scope>",
                invariant: "the evaluator is not a scoped resource acquisition",
                implementation: "an empty child Scope is paired with the value",
                guidance:
                    "Use make for already-available state, not for opening files, sockets, clients, or subscriptions.",
            }

        case "Backing":
            return {
                input: "current child Scope + A",
                operation: "store pair in SynchronizedRef",
                result: "readonly [Scope.Closeable, A]",
                invariant: "ownership and current value move together",
                implementation:
                    "backing SynchronizedRef serializes replacements",
                guidance:
                    "The pair is the key mental model: replacing A also replaces the Scope responsible for A.",
            }

        case "Boundary":
            return {
                input: "Foldkit feature state",
                operation: "keep ScopedRef in runtime/service layer",
                result: "plain UI Model + scoped runtime ownership",
                invariant: "do not serialize a live ScopedRef into Model",
                implementation:
                    "messages carry serializable intent/results only",
                guidance:
                    "Treat ScopedRef like a runtime resource handle, not like application data for rendering or persistence.",
            }
    }
}

export const read_snapshot = (model: Model): Snapshot => {
    switch (model.readCase) {
        case "Effect":
            return {
                input: "ScopedRef<A>",
                operation: "yield* ScopedRef.get(ref)",
                result: "A",
                invariant: "read is observational",
                implementation: "Effect.sync(() => getUnsafe(ref))",
                guidance:
                    "Use get for normal Effect code so the runtime boundary stays explicit.",
            }

        case "Unsafe":
            return {
                input: "ScopedRef<A>",
                operation: "ScopedRef.getUnsafe(ref)",
                result: "A immediately",
                invariant: "no Effect wrapper and no lifecycle action",
                implementation: "reads the current pair's value directly",
                guidance:
                    "Reserve getUnsafe for carefully controlled synchronous boundaries and tests.",
            }

        case "Stable":
            return {
                input: "same ref, no set",
                operation: "get → get → get",
                result: "same current value",
                invariant: "reads do not reacquire",
                implementation: "only set changes the backing pair",
                guidance:
                    "Reading a ScopedRef is not polling or refreshing; replacement is always explicit.",
            }

        case "Ownership":
            return {
                input: "current A",
                operation: "read only value component",
                result: "Scope remains alive and hidden",
                invariant:
                    "callers borrow the value; ScopedRef keeps ownership",
                implementation: "child Scope stays stored beside A",
                guidance:
                    "Do not manually close the hidden child Scope; let set or the outer Scope own release timing.",
            }
    }
}

export const replace_snapshot = (model: Model): Snapshot => {
    switch (model.replaceCase) {
        case "Success":
            return {
                input: "current v1 + acquire v2",
                operation: "ScopedRef.set(ref, acquireV2)",
                result: "acquire:v2 → release:v1 → current:v2",
                invariant:
                    "new resource exists before old resource is released",
                implementation:
                    "fresh child Scope, then close old Scope, then swap pair",
                guidance:
                    "Use set for hot-swapping resource-backed values while preserving a clear handover order.",
            }

        case "Failure":
            return {
                input: "current stable + failing replacement acquire",
                operation: "Effect.exit(ScopedRef.set(...))",
                result: "Failure · current remains stable",
                invariant: "failed candidate never becomes current",
                implementation:
                    "candidate Scope is closed with the acquisition failure cause",
                guidance:
                    "Handle the set error and keep using the old value when stale-but-working behavior is acceptable.",
            }

        case "Serialized":
            return {
                input: "two concurrent set calls",
                operation: "backing semaphore.withPermit",
                result: "one complete replacement transition at a time",
                invariant: "acquire / close / swap transitions do not overlap",
                implementation:
                    "SynchronizedRef supplies the semaphore guarding set",
                guidance:
                    "You do not need a second mutex around ScopedRef.set just to prevent concurrent replacements.",
            }

        case "Requirements":
            return {
                input: "acquire: Effect<A, E, R | Scope>",
                operation: "ScopedRef.set",
                result: "Effect<void, E, Exclude<R, Scope>>",
                invariant: "set provides its own fresh child Scope",
                implementation:
                    "Scope.provide(newScope) removes Scope from caller requirements",
                guidance:
                    "Replacement callers provide business services, while ScopedRef supplies the resource lifetime Scope internally.",
            }
    }
}

export const release_snapshot = (model: Model): Snapshot => {
    switch (model.releaseCase) {
        case "Previous":
            return {
                input: "v1 installed, v2 acquisition succeeds",
                operation: "Scope.close(v1Scope, Exit.void)",
                result: "v1 finalizers run before current becomes v2",
                invariant: "previous installed resource is not leaked",
                implementation: "old child Scope is closed inside set",
                guidance:
                    "Put all resource finalizers in the acquisition Scope so ScopedRef can release the entire old value as one unit.",
            }

        case "Outer":
            return {
                input: "current v2 when outer Scope ends",
                operation: "registered outer finalizer",
                result: "Scope.close(v2Scope, outerExit)",
                invariant:
                    "current resource cannot outlive the ScopedRef owner",
                implementation:
                    "constructor finalizer reads the current backing Scope",
                guidance:
                    "Create ScopedRef under the same high-level lifetime that should own whichever resource is current.",
            }

        case "Order":
            return {
                input: "acquire v1 → set v2 → outer close",
                operation: "track acquire / release events",
                result: "acquire:v1 · acquire:v2 · release:v1 · release:v2",
                invariant:
                    "every installed scoped resource is eventually released",
                implementation:
                    "set releases old; outer finalizer releases current",
                guidance:
                    "Event ordering is a useful test technique for proving hot-swap lifecycle behavior.",
            }

        case "Resource":
            return {
                input: "need one replaceable resource",
                operation: "ScopedRef vs Resource",
                result: "direct set vs captured refresh recipe",
                invariant: "Resource is built around ScopedRef<Exit<A, E>>",
                implementation:
                    "Resource.refresh delegates successful replacement to ScopedRef.set",
                guidance:
                    "Choose ScopedRef when the replacement Effect is supplied at each set; choose Resource when one acquisition recipe should be refreshed repeatedly.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedScopedRefStage: {
        stage: Stage,
    },
    SelectedScopedRefCreateCase: {
        createCase: CreateCase,
    },
    SelectedScopedRefReadCase: {
        readCase: ReadCase,
    },
    SelectedScopedRefReplaceCase: {
        replaceCase: ReplaceCase,
    },
    SelectedScopedRefReleaseCase: {
        releaseCase: ReleaseCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Create",
    createCase: "Acquire",
    readCase: "Effect",
    replaceCase: "Failure",
    releaseCase: "Order",
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

type ReplaceCasePayload = Readonly<{
    replaceCase: ReplaceCase
}>

type ReleaseCasePayload = Readonly<{
    releaseCase: ReleaseCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedScopedRefStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedScopedRefCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: modifyFields(model, {
                createCase: () => createCase,
            }),
        }),

        SelectedScopedRefReadCase: ({ readCase }: ReadCasePayload) => ({
            model: modifyFields(model, {
                readCase: () => readCase,
            }),
        }),

        SelectedScopedRefReplaceCase: ({
            replaceCase,
        }: ReplaceCasePayload) => ({
            model: modifyFields(model, {
                replaceCase: () => replaceCase,
            }),
        }),

        SelectedScopedRefReleaseCase: ({
            releaseCase,
        }: ReleaseCasePayload) => ({
            model: modifyFields(model, {
                releaseCase: () => releaseCase,
            }),
        }),
    })
