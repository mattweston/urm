import {
    Deferred,
    Effect,
    Fiber,
    Option,
    Schema as S,
    Stream,
    SubscriptionRef,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL SUBSCRIPTIONREF PROGRAMS
// -----------------------------------------------------------------------------

export const create_program = Effect.gen(function* () {
    const ref = yield* SubscriptionRef.make(10)
    const current = yield* SubscriptionRef.get(ref)

    return {
        current,
        unsafeCurrent: SubscriptionRef.getUnsafe(ref),
        isSubscriptionRef: SubscriptionRef.isSubscriptionRef(ref),
    } as const
})

export const observe_program = Effect.gen(function* () {
    const ref = yield* SubscriptionRef.make(0)
    const ready = yield* Deferred.make<void>()

    const fiber = yield* SubscriptionRef.changes(ref).pipe(
        Stream.tap((_: number) => Deferred.succeed(ready, undefined)),
        Stream.take(3),
        Stream.runCollect,
        Effect.forkChild
    )

    yield* Deferred.await(ready)
    yield* SubscriptionRef.set(ref, 1)
    yield* SubscriptionRef.set(ref, 2)

    return yield* Fiber.join(fiber)
})

export const update_program = Effect.gen(function* () {
    const ref = yield* SubscriptionRef.make(10)

    const oldValue = yield* SubscriptionRef.getAndSet(ref, 12)
    const doubled = yield* SubscriptionRef.updateAndGet(
        ref,
        (value: number) => value * 2
    )
    const plusThree = yield* SubscriptionRef.updateAndGetEffect(
        ref,
        (value: number) => Effect.succeed(value + 3)
    )
    const unchanged = yield* SubscriptionRef.updateSomeAndGet(
        ref,
        (_: number) => Option.none()
    )

    return {
        oldValue,
        doubled,
        plusThree,
        unchanged,
    } as const
})

export const modify_program = Effect.gen(function* () {
    const ref = yield* SubscriptionRef.make(10)

    const label = yield* SubscriptionRef.modify(
        ref,
        (value: number) => [`old=${value}`, value + 1] as const
    )
    const effectLabel = yield* SubscriptionRef.modifyEffect(
        ref,
        (value: number) =>
            Effect.succeed([`next=${value + 2}`, value + 2] as const)
    )
    const conditionalLabel = yield* SubscriptionRef.modifySome(
        ref,
        (value: number) => [`kept=${value}`, Option.none()] as const
    )
    const current = yield* SubscriptionRef.get(ref)

    return {
        label,
        effectLabel,
        conditionalLabel,
        current,
    } as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Observe"),
    S.Literal("Update"),
    S.Literal("Modify"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Observe",
    "Update",
    "Modify",
]

export const CreateCase = S.Union([
    S.Literal("Make"),
    S.Literal("Get"),
    S.Literal("Guard"),
    S.Literal("Unsafe"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Make",
    "Get",
    "Guard",
    "Unsafe",
]

export const ObserveCase = S.Union([
    S.Literal("Changes"),
    S.Literal("Replay"),
    S.Literal("Stream"),
    S.Literal("NoPublish"),
])
export type ObserveCase = typeof ObserveCase.Type

export const observe_cases: ReadonlyArray<ObserveCase> = [
    "Changes",
    "Replay",
    "Stream",
    "NoPublish",
]

export const UpdateCase = S.Union([
    S.Literal("Set"),
    S.Literal("GetAndSet"),
    S.Literal("Effectful"),
    S.Literal("Conditional"),
])
export type UpdateCase = typeof UpdateCase.Type

export const update_cases: ReadonlyArray<UpdateCase> = [
    "Set",
    "GetAndSet",
    "Effectful",
    "Conditional",
]

export const ModifyCase = S.Union([
    S.Literal("Modify"),
    S.Literal("ModifyEffect"),
    S.Literal("OldVsNew"),
    S.Literal("Optional"),
])
export type ModifyCase = typeof ModifyCase.Type

export const modify_cases: ReadonlyArray<ModifyCase> = [
    "Modify",
    "ModifyEffect",
    "OldVsNew",
    "Optional",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    observeCase: ObserveCase,
    updateCase: UpdateCase,
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
        eyebrow:
            "one current value + serialized mutation + a replaying publication channel",
        title: "Create observable mutable state",
        description:
            "SubscriptionRef.make stores the initial value, creates a one-permit Semaphore for serialized mutations, creates an unbounded PubSub with replay 1, and immediately publishes the initial value.",
        code: `const ref = yield* SubscriptionRef.make(10)

const current = yield* SubscriptionRef.get(ref)

SubscriptionRef.isSubscriptionRef(ref)
// true`,
        apis: [
            "SubscriptionRef.make",
            "SubscriptionRef.get",
            "SubscriptionRef.getUnsafe",
            "SubscriptionRef.isSubscriptionRef",
        ],
        notice: "A SubscriptionRef is runtime synchronization state. Keep it outside Foldkit Model state; store durable domain values in the model and keep the live ref in Effect services/program wiring.",
    },

    Observe: {
        eyebrow: "changes is a Stream backed by a replay-1 PubSub",
        title: "Subscribe to the current value and every committed update",
        description:
            "The initial value is published during make. A new changes subscriber therefore receives the latest replayed value first, then each later committed mutation. Conditional updates that choose Option.none leave the ref unchanged and do not publish.",
        code: `const ref = yield* SubscriptionRef.make(0)

const values = SubscriptionRef.changes(ref).pipe(
    Stream.take(3),
    Stream.runCollect
)

// after set(ref, 1), set(ref, 2)
// subscriber observes 0, 1, 2`,
        apis: [
            "SubscriptionRef.changes",
            "Stream.Stream",
            "PubSub replay: 1",
            "SubscriptionRef.set",
        ],
        notice: "Publication happens only when a new value is committed. updateSome / modifySome with Option.none do not emit a duplicate notification.",
    },

    Update: {
        eyebrow:
            "writes and updates hold one semaphore permit across the whole commit",
        title: "Serialize updates so concurrent changes cannot interleave",
        description:
            "set, update, and their get-and/effectful variants run under the same one-permit Semaphore. Effectful update functions run while that permit is held; the new value is published only after the effect succeeds.",
        code: `const old = yield* SubscriptionRef.getAndSet(
    ref,
    12
)

const next = yield* SubscriptionRef.updateAndGetEffect(
    ref,
    (n) => Effect.succeed(n + 3)
)`,
        apis: [
            "SubscriptionRef.set",
            "SubscriptionRef.getAndSet",
            "SubscriptionRef.updateAndGet",
            "SubscriptionRef.updateEffect",
        ],
        notice: "If an effectful update fails, its mapping callback never commits a value, so the previous value remains current and no change is published.",
    },

    Modify: {
        eyebrow:
            "modify separates the returned result from the value committed into the ref",
        title: "Compute an answer and a new state atomically",
        description:
            "modify returns B while storing A, making it the most general atomic operation. Effectful and optional forms preserve the same serialized commit rule; optional forms can return a result without publishing a new value.",
        code: `const label = yield* SubscriptionRef.modify(
    ref,
    (n) => [
        \`old=\${n}\`,
        n + 1
    ] as const
)`,
        apis: [
            "SubscriptionRef.modify",
            "SubscriptionRef.modifyEffect",
            "SubscriptionRef.modifySome",
            "SubscriptionRef.modifySomeEffect",
        ],
        notice: "Use modify when callers need a result different from the stored value. Use the getAndUpdate/updateAndGet families when the old/new state value itself is the result you want.",
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
                operation: "SubscriptionRef.make(10)",
                result: "SubscriptionRef<number>",
                invariant:
                    "the initial value is immediately current and published",
                implementation:
                    "Semaphore(1) + PubSub.unbounded({ replay: 1 })",
                guidance:
                    "Use SubscriptionRef when state must be both mutable and observable as a Stream.",
            }

        case "Get":
            return {
                input: "SubscriptionRef<number>",
                operation: "yield* SubscriptionRef.get(ref)",
                result: "current number",
                invariant:
                    "get reads the value that is current when its Effect runs",
                implementation: "Effect.sync(() => self.value)",
                guidance:
                    "Prefer get inside Effect programs so the read stays explicit at the runtime boundary.",
            }

        case "Guard":
            return {
                input: "unknown runtime value",
                operation: "SubscriptionRef.isSubscriptionRef(value)",
                result: "boolean + type narrowing",
                invariant: "the guard checks the SubscriptionRef runtime brand",
                implementation: "hasProperty(value, TypeId)",
                guidance:
                    "Use the guard when a SubscriptionRef crosses an unknown/untyped boundary.",
            }

        case "Unsafe":
            return {
                input: "known SubscriptionRef<A>",
                operation: "SubscriptionRef.getUnsafe(ref)",
                result: "A immediately",
                invariant:
                    "the read bypasses Effect and synchronization machinery",
                implementation: "direct self.value access",
                guidance:
                    "Reserve getUnsafe for controlled synchronous internals or test setup without concurrent mutation.",
            }
    }
}

export const observe_snapshot = (model: Model): Snapshot => {
    switch (model.observeCase) {
        case "Changes":
            return {
                input: "ref current = 0; later set 1, set 2",
                operation: "SubscriptionRef.changes(ref)",
                result: "Stream emits 0 → 1 → 2",
                invariant: "each committed value is published",
                implementation: "changes = Stream.fromPubSub(self.pubsub)",
                guidance:
                    "Use ordinary Stream combinators to transform, bound, merge, or consume state changes.",
            }

        case "Replay":
            return {
                input: "new subscriber attaches after construction",
                operation: "subscribe to replay-1 PubSub",
                result: "latest value arrives before future updates",
                invariant: "make publishes the initial value immediately",
                implementation: "PubSub.unbounded<A>({ replay: 1 })",
                guidance:
                    "Treat changes as current-state-plus-future-events, not as a history of every value since creation.",
            }

        case "Stream":
            return {
                input: "SubscriptionRef.changes(ref)",
                operation: "Stream.take / map / runCollect",
                result: "ordinary Stream program",
                invariant: "observation uses the normal Stream API",
                implementation:
                    "SubscriptionRef does not invent a separate subscription abstraction",
                guidance:
                    "Reuse Stream backpressure, interruption, error, and terminal operators for observers.",
            }

        case "NoPublish":
            return {
                input: "conditional update returns Option.none()",
                operation: "updateSome / modifySome",
                result: "value unchanged · no PubSub publish",
                invariant: "only committed new values become change events",
                implementation: "setUnsafe runs only for Option.some",
                guidance:
                    "Use optional update forms when no-op decisions should stay silent to subscribers.",
            }
    }
}

export const update_snapshot = (model: Model): Snapshot => {
    switch (model.updateCase) {
        case "Set":
            return {
                input: "current 10 · new value 12",
                operation: "SubscriptionRef.set(ref, 12)",
                result: "current 12 + published 12",
                invariant: "set is serialized with every other mutation",
                implementation: "semaphore.withPermit + setUnsafe",
                guidance:
                    "Use set for replacement when the caller does not need the previous/new value returned.",
            }

        case "GetAndSet":
            return {
                input: "current 10 · replacement 12",
                operation: "getAndSet(ref, 12)",
                result: "returns 10 · stores/publishes 12",
                invariant:
                    "the read and write form one atomic critical section",
                implementation:
                    "capture current, setUnsafe(new), return current",
                guidance:
                    "Use getAndSet when handoff logic needs the value that was replaced.",
            }

        case "Effectful":
            return {
                input: "current 12",
                operation: "updateEffect(ref, n => Effect.succeed(n + 3))",
                result: "15 committed only after Effect success",
                invariant:
                    "the semaphore permit stays held while the update Effect runs",
                implementation:
                    "withPermit(Effect.suspend(... Effect.map(update(...))))",
                guidance:
                    "Keep effectful update bodies focused; long effects also serialize every competing mutation.",
            }

        case "Conditional":
            return {
                input: "update returns Option.none()",
                operation: "updateSomeAndGet(ref, f)",
                result: "returns existing current value",
                invariant: "no new value means no publication",
                implementation:
                    "Option.none branch returns current without setUnsafe",
                guidance:
                    "Use optional updates instead of publishing a same-value write when the domain decision is genuinely no-op.",
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
                    "result B and stored value A are computed atomically",
                implementation:
                    "destructure [b, newValue], publish newValue, return b",
                guidance:
                    "Use modify when state transition code also needs to return a domain-specific answer.",
            }

        case "ModifyEffect":
            return {
                input: "current 11",
                operation: "modifyEffect(ref, f)",
                result: "effectful B + new A commit",
                invariant:
                    "failure prevents the new state from being installed",
                implementation: "Effect.map only calls setUnsafe on success",
                guidance:
                    "Use modifyEffect when the atomic decision itself needs Effect services or can fail.",
            }

        case "OldVsNew":
            return {
                input: "state transition n → f(n)",
                operation: "getAndUpdate vs updateAndGet",
                result: "choose old A or new A as return value",
                invariant: "both perform the same serialized update shape",
                implementation:
                    "return current before commit vs return newValue after commit",
                guidance:
                    "Pick the helper whose return value matches the caller instead of reconstructing it outside the critical section.",
            }

        case "Optional":
            return {
                input: "B plus Option<A>",
                operation: "modifySome / modifySomeEffect",
                result: "always returns B; only Some(A) publishes",
                invariant:
                    "a result can be produced without changing observable state",
                implementation: "Option.none returns b before setUnsafe",
                guidance:
                    "Useful for compare-and-decide operations where the caller needs an explanation even when state stays unchanged.",
            }
    }
}

export const initial_model: Model = {
    stage: "Create",
    createCase: "Make",
    observeCase: "Changes",
    updateCase: "Set",
    modifyCase: "Modify",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedSubscriptionRefStage: { stage: Stage },
    SelectedSubscriptionRefCreateCase: { createCase: CreateCase },
    SelectedSubscriptionRefObserveCase: { observeCase: ObserveCase },
    SelectedSubscriptionRefUpdateCase: { updateCase: UpdateCase },
    SelectedSubscriptionRefModifyCase: { modifyCase: ModifyCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type ObserveCasePayload = Readonly<{ observeCase: ObserveCase }>
type UpdateCasePayload = Readonly<{ updateCase: UpdateCase }>
type ModifyCasePayload = Readonly<{ modifyCase: ModifyCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedSubscriptionRefStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, { stage: () => stage }),
        }),

        SelectedSubscriptionRefCreateCase: ({
            createCase,
        }: CreateCasePayload) => ({
            model: modifyFields(model, { createCase: () => createCase }),
        }),

        SelectedSubscriptionRefObserveCase: ({
            observeCase,
        }: ObserveCasePayload) => ({
            model: modifyFields(model, { observeCase: () => observeCase }),
        }),

        SelectedSubscriptionRefUpdateCase: ({
            updateCase,
        }: UpdateCasePayload) => ({
            model: modifyFields(model, { updateCase: () => updateCase }),
        }),

        SelectedSubscriptionRefModifyCase: ({
            modifyCase,
        }: ModifyCasePayload) => ({
            model: modifyFields(model, { modifyCase: () => modifyCase }),
        }),
    })
