import {
    Deferred,
    Effect,
    Fiber,
    Option,
    Schema as S,
    SynchronizedRef,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL SYNCHRONIZEDREF PROGRAMS
// -----------------------------------------------------------------------------

export const create_program = Effect.gen(function* () {
    const ref = yield* SynchronizedRef.make(10)
    const current = yield* SynchronizedRef.get(ref)

    return {
        current,
        unsafeCurrent: SynchronizedRef.getUnsafe(ref),
        unsafeRef: SynchronizedRef.makeUnsafe(20),
    } as const
})

export const serialized_effect_program = Effect.gen(function* () {
    const ref = yield* SynchronizedRef.make(0)
    const firstStarted = yield* Deferred.make<void>()
    const releaseFirst = yield* Deferred.make<void>()

    const first = yield* SynchronizedRef.updateEffect(ref, (value: number) =>
        Effect.gen(function* () {
            yield* Deferred.succeed(firstStarted, undefined)
            yield* Deferred.await(releaseFirst)
            return value + 1
        })
    ).pipe(Effect.forkChild)

    yield* Deferred.await(firstStarted)

    const second = yield* SynchronizedRef.updateAndGetEffect(
        ref,
        (value: number) => Effect.succeed(value + 10)
    ).pipe(Effect.forkChild)

    yield* Deferred.succeed(releaseFirst, undefined)
    yield* Fiber.join(first)
    const secondValue = yield* Fiber.join(second)

    return {
        secondValue,
        current: yield* SynchronizedRef.get(ref),
    } as const
})

export const failed_effect_program = Effect.gen(function* () {
    const ref = yield* SynchronizedRef.make(10)
    const exit = yield* Effect.exit(
        SynchronizedRef.updateEffect(ref, (_: number) => Effect.fail("boom"))
    )

    return {
        exit,
        current: yield* SynchronizedRef.get(ref),
    } as const
})

export const partial_program = Effect.gen(function* () {
    const ref = yield* SynchronizedRef.make(10)

    const unchanged = yield* SynchronizedRef.updateSomeAndGet(
        ref,
        (_: number) => Option.none()
    )
    const changed = yield* SynchronizedRef.updateSomeAndGetEffect(
        ref,
        (value: number) => Effect.succeed(Option.some(value + 5))
    )

    return { unchanged, changed } as const
})

export const modify_program = Effect.gen(function* () {
    const ref = yield* SynchronizedRef.make(10)

    const label = yield* SynchronizedRef.modify(
        ref,
        (value: number) => [`old=${value}`, value + 1] as const
    )
    const effectLabel = yield* SynchronizedRef.modifyEffect(
        ref,
        (value: number) =>
            Effect.succeed([`next=${value + 2}`, value + 2] as const)
    )
    const current = yield* SynchronizedRef.get(ref)

    return { label, effectLabel, current } as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Serialize"),
    S.Literal("Partial"),
    S.Literal("Modify"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Serialize",
    "Partial",
    "Modify",
]

export const CreateCase = S.Union([
    S.Literal("Make"),
    S.Literal("Unsafe"),
    S.Literal("Get"),
    S.Literal("Shape"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Make",
    "Unsafe",
    "Get",
    "Shape",
]

export const SerializeCase = S.Union([
    S.Literal("Update"),
    S.Literal("Effectful"),
    S.Literal("Concurrent"),
    S.Literal("Failure"),
])
export type SerializeCase = typeof SerializeCase.Type

export const serialize_cases: ReadonlyArray<SerializeCase> = [
    "Update",
    "Effectful",
    "Concurrent",
    "Failure",
]

export const PartialCase = S.Union([
    S.Literal("Some"),
    S.Literal("None"),
    S.Literal("Effectful"),
    S.Literal("AndGet"),
])
export type PartialCase = typeof PartialCase.Type

export const partial_cases: ReadonlyArray<PartialCase> = [
    "Some",
    "None",
    "Effectful",
    "AndGet",
]

export const ModifyCase = S.Union([
    S.Literal("Modify"),
    S.Literal("ModifyEffect"),
    S.Literal("Previous"),
    S.Literal("New"),
])
export type ModifyCase = typeof ModifyCase.Type

export const modify_cases: ReadonlyArray<ModifyCase> = [
    "Modify",
    "ModifyEffect",
    "Previous",
    "New",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    serializeCase: SerializeCase,
    partialCase: PartialCase,
    modifyCase: ModifyCase,
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
        eyebrow: "one backing Ref + one one-permit Semaphore",
        title: "Create synchronized mutable state",
        description:
            "SynchronizedRef wraps a backing Ref with a Semaphore. Reads are straightforward, while every mutation helper acquires the single permit so state transitions cannot interleave.",
        code: `const ref = yield* SynchronizedRef.make(10)

const current = yield* SynchronizedRef.get(ref)

const unsafe = SynchronizedRef.makeUnsafe(20)`,
        apis: [
            "SynchronizedRef.make",
            "SynchronizedRef.makeUnsafe",
            "SynchronizedRef.get",
            "SynchronizedRef.getUnsafe",
        ],
        notice: "The live rc.113 model extends Pipeable rather than Ref.Ref. Treat SynchronizedRef as its own abstraction instead of relying on Ref subtype compatibility.",
    },

    Serialize: {
        eyebrow: "the semaphore permit covers the whole state transition",
        title: "Serialize pure and effectful updates",
        description:
            "Pure helpers delegate to the backing Ref while holding the permit. Effectful helpers read the current value, run the update Effect under that same permit, and commit only after the Effect succeeds.",
        code: `const next = yield* SynchronizedRef.updateAndGetEffect(
    ref,
    (current) => fetchDelta(current).pipe(
        Effect.map((delta) => current + delta)
    )
)`,
        apis: [
            "SynchronizedRef.update",
            "SynchronizedRef.updateEffect",
            "SynchronizedRef.getAndUpdateEffect",
            "SynchronizedRef.updateAndGetEffect",
        ],
        notice: "A long-running effectful update also holds the single mutation permit for longer. Competing mutations wait and then see the latest committed value.",
    },

    Partial: {
        eyebrow: "Option.none means leave the current value untouched",
        title: "Express no-op transitions explicitly",
        description:
            "The Some variants decide under the same serialized critical section whether a new value exists. Option.some commits it; Option.none returns without changing the backing Ref.",
        code: `const current = yield* SynchronizedRef.updateSomeAndGet(
    ref,
    (value) =>
        value < 100
            ? Option.some(value + 1)
            : Option.none()
)`,
        apis: [
            "SynchronizedRef.updateSome",
            "SynchronizedRef.updateSomeEffect",
            "SynchronizedRef.getAndUpdateSome",
            "SynchronizedRef.updateSomeAndGet",
        ],
        notice: "If an effectful partial update fails, the commit callback never runs. If it succeeds with Option.none, the ref is deliberately unchanged.",
    },

    Modify: {
        eyebrow: "compute an independent return value and next state together",
        title: "Use modify for the most general atomic transition",
        description:
            "modify separates the value returned to the caller from the value stored in the ref. Effectful and optional forms preserve the same single-permit serialization and commit-on-success behavior.",
        code: `const label = yield* SynchronizedRef.modify(
    ref,
    (value) => [
        \`old=\${value}\`,
        value + 1
    ] as const
)`,
        apis: [
            "SynchronizedRef.modify",
            "SynchronizedRef.modifyEffect",
            "SynchronizedRef.modifySome",
            "SynchronizedRef.modifySomeEffect",
        ],
        notice: "Use getAndUpdate/updateAndGet when the old or new state is the desired result. Use modify when the caller needs a different result type.",
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
        case "Make":
            return {
                input: "initial value 10",
                operation: "yield* SynchronizedRef.make(10)",
                result: "SynchronizedRef<number>",
                invariant:
                    "construction allocates a fresh backing Ref and Semaphore(1)",
                implementation: "Effect.sync(() => makeUnsafe(value))",
                guidance:
                    "Use make inside Effect programs; use makeUnsafe only when synchronous construction is genuinely required.",
            }
        case "Unsafe":
            return {
                input: "initial value 20",
                operation: "SynchronizedRef.makeUnsafe(20)",
                result: "ref immediately",
                invariant: "no Effect boundary is used for construction",
                implementation: "Ref.makeUnsafe + Semaphore.makeUnsafe(1)",
                guidance:
                    "Prefer Effect-wrapped make in normal runtime code so construction stays explicit in the program.",
            }
        case "Get":
            return {
                input: "SynchronizedRef<A>",
                operation: "yield* SynchronizedRef.get(ref)",
                result: "current A",
                invariant: "reads do not acquire the mutation semaphore",
                implementation: "Effect.sync(() => backing.ref.current)",
                guidance:
                    "Use get in Effect code; reserve getUnsafe for controlled synchronous internals.",
            }
        case "Shape":
            return {
                input: "live rc.113 interface",
                operation: "inspect model",
                result: "Pipeable + backing Ref + Semaphore",
                invariant: "SynchronizedRef is not typed as Ref.Ref in rc.113+",
                implementation: "public operations remain unchanged",
                guidance:
                    "Do not pass a SynchronizedRef where a Ref is required unless you explicitly use its backing field.",
            }
    }
}

export const serialize_snapshot = (model: Model): Snapshot => {
    switch (model.serializeCase) {
        case "Update":
            return {
                input: "current 10",
                operation: "update(ref, n => n + 1)",
                result: "current 11",
                invariant:
                    "pure mutation is serialized with all other mutations",
                implementation: "semaphore.withPermit(Ref.update(backing, f))",
                guidance:
                    "Use update when the transition is pure and the caller does not need a return value.",
            }
        case "Effectful":
            return {
                input: "current 10",
                operation: "updateEffect(ref, n => Effect.succeed(n + 5))",
                result: "15 after Effect success",
                invariant: "the permit stays held while the update Effect runs",
                implementation: "read → run Effect → commit inside withPermit",
                guidance:
                    "Use effectful helpers only when transition logic really needs Effect services or failure.",
            }
        case "Concurrent":
            return {
                input: "two concurrent effectful updates",
                operation: "both contend for Semaphore(1)",
                result: "second starts from first committed state",
                invariant: "effectful transitions cannot overlap",
                implementation:
                    "one-permit semaphore serializes the full transition",
                guidance:
                    "This is the core reason to choose SynchronizedRef over plain Ref for effectful state transitions.",
            }
        case "Failure":
            return {
                input: "current 10",
                operation: "updateEffect(ref, _ => Effect.fail('boom'))",
                result: "failure · current stays 10",
                invariant: "failed transitions do not commit a new value",
                implementation:
                    "backing assignment occurs only in Effect.map success callback",
                guidance:
                    "Failure rolls back by construction because the backing Ref is mutated only after the update Effect succeeds.",
            }
    }
}

export const partial_snapshot = (model: Model): Snapshot => {
    switch (model.partialCase) {
        case "Some":
            return {
                input: "current 10",
                operation: "updateSome(ref, n => Option.some(n + 1))",
                result: "current 11",
                invariant: "Option.some means commit the supplied value",
                implementation: "delegates to Ref.updateSome under withPermit",
                guidance:
                    "Use partial helpers when the domain transition may legitimately choose not to write.",
            }
        case "None":
            return {
                input: "current 10",
                operation: "updateSome(ref, _ => Option.none())",
                result: "current remains 10",
                invariant: "Option.none is an explicit no-op",
                implementation: "no backing assignment occurs",
                guidance:
                    "Prefer Option.none to writing the same value when the semantic outcome is 'no transition'.",
            }
        case "Effectful":
            return {
                input: "current 10",
                operation: "updateSomeEffect(ref, f)",
                result: "Effect<Option<A>> decides commit",
                invariant: "decision and commit remain serialized",
                implementation: "effect runs inside semaphore.withPermit",
                guidance:
                    "The effect may fail, return none, or return some; only the some-success path commits.",
            }
        case "AndGet":
            return {
                input: "conditional transition",
                operation: "updateSomeAndGet(ref, f)",
                result: "new value or unchanged current value",
                invariant:
                    "the returned value matches the state after the decision",
                implementation: "some → store/return new; none → return old",
                guidance:
                    "Use AndGet helpers when callers need the authoritative post-transition state from the same critical section.",
            }
    }
}

export const modify_snapshot = (model: Model): Snapshot => {
    switch (model.modifyCase) {
        case "Modify":
            return {
                input: "current 10",
                operation: "modify(ref, n => [label, n + 1])",
                result: 'returns "old=10" · stores 11',
                invariant:
                    "returned B and stored A derive from one current value",
                implementation: "Ref.modify under the semaphore permit",
                guidance:
                    "Use modify when the caller needs a result different from the state itself.",
            }
        case "ModifyEffect":
            return {
                input: "current 11",
                operation: "modifyEffect(ref, f)",
                result: "effectful B + new A",
                invariant:
                    "the effectful calculation is part of the serialized transition",
                implementation:
                    "read → effect → store tuple[1] → return tuple[0]",
                guidance:
                    "Use modifyEffect for transactional-style state transitions that need services or typed failure.",
            }
        case "Previous":
            return {
                input: "state update A → A",
                operation: "getAndUpdate / getAndSet",
                result: "returns previous A",
                invariant:
                    "the old value is captured inside the critical section",
                implementation: "return value before commit",
                guidance:
                    "Choose getAnd* when the replaced state is the useful result.",
            }
        case "New":
            return {
                input: "state update A → A",
                operation: "updateAndGet / setAndGet",
                result: "returns new A",
                invariant: "the result is the exact value committed",
                implementation: "commit then return new value",
                guidance:
                    "Choose *AndGet when the post-transition state is the useful result.",
            }
    }
}

export const initial_model: Model = {
    stage: "Create",
    createCase: "Make",
    serializeCase: "Update",
    partialCase: "Some",
    modifyCase: "Modify",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedSynchronizedRefStage: { stage: Stage },
    SelectedSynchronizedRefCreateCase: { createCase: CreateCase },
    SelectedSynchronizedRefSerializeCase: { serializeCase: SerializeCase },
    SelectedSynchronizedRefPartialCase: { partialCase: PartialCase },
    SelectedSynchronizedRefModifyCase: { modifyCase: ModifyCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type SerializeCasePayload = Readonly<{ serializeCase: SerializeCase }>
type PartialCasePayload = Readonly<{ partialCase: PartialCase }>
type ModifyCasePayload = Readonly<{ modifyCase: ModifyCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedSynchronizedRefStage: ({ stage }: StagePayload) => ({
            model: evo(model, { stage: () => stage }),
        }),
        SelectedSynchronizedRefCreateCase: ({
            createCase,
        }: CreateCasePayload) => ({
            model: evo(model, { createCase: () => createCase }),
        }),
        SelectedSynchronizedRefSerializeCase: ({
            serializeCase,
        }: SerializeCasePayload) => ({
            model: evo(model, { serializeCase: () => serializeCase }),
        }),
        SelectedSynchronizedRefPartialCase: ({
            partialCase,
        }: PartialCasePayload) => ({
            model: evo(model, { partialCase: () => partialCase }),
        }),
        SelectedSynchronizedRefModifyCase: ({
            modifyCase,
        }: ModifyCasePayload) => ({
            model: evo(model, { modifyCase: () => modifyCase }),
        }),
    })
