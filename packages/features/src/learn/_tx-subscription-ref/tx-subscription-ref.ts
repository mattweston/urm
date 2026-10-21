import {
    Effect,
    Option,
    Schema as S,
    Stream,
    TxQueue,
    TxSubscriptionRef,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TXSUBSCRIPTIONREF PROGRAMS
// -----------------------------------------------------------------------------

export const create_program = Effect.gen(function* () {
    const ref = yield* TxSubscriptionRef.make(0)
    return yield* TxSubscriptionRef.get(ref)
})

export const update_program = Effect.gen(function* () {
    const ref = yield* TxSubscriptionRef.make(10)
    const previous = yield* TxSubscriptionRef.getAndUpdate(
        ref,
        (current: number) => current + 5
    )
    const current = yield* TxSubscriptionRef.get(ref)
    return [previous, current] as const
})

export const queue_changes_program = Effect.gen(function* () {
    const ref = yield* TxSubscriptionRef.make(0)

    return yield* Effect.scoped(
        Effect.gen(function* () {
            const sub = yield* TxSubscriptionRef.changes(ref)
            const initial = yield* TxQueue.take(sub)
            yield* TxSubscriptionRef.set(ref, 1)
            const next = yield* TxQueue.take(sub)
            return [initial, next] as const
        })
    )
})

export const atomic_publication_program = Effect.gen(function* () {
    const ref = yield* TxSubscriptionRef.make(0)

    return yield* Effect.scoped(
        Effect.gen(function* () {
            const sub = yield* TxSubscriptionRef.changes(ref)
            yield* TxQueue.take(sub)

            yield* Effect.tx(
                Effect.gen(function* () {
                    yield* TxSubscriptionRef.update(ref, (n: number) => n + 1)
                    yield* TxSubscriptionRef.update(ref, (n: number) => n + 1)
                })
            )

            const first = yield* TxQueue.take(sub)
            const second = yield* TxQueue.take(sub)
            return [first, second] as const
        })
    )
})

export const rollback_does_not_publish_program = Effect.gen(function* () {
    const ref = yield* TxSubscriptionRef.make(0)

    return yield* Effect.scoped(
        Effect.gen(function* () {
            const sub = yield* TxSubscriptionRef.changes(ref)
            const initial = yield* TxQueue.take(sub)

            yield* Effect.exit(
                Effect.tx(
                    Effect.gen(function* () {
                        yield* TxSubscriptionRef.set(ref, 99)
                        return yield* Effect.fail("rollback")
                    })
                )
            )

            const queued = yield* TxQueue.poll(sub)
            const current = yield* TxSubscriptionRef.get(ref)
            return {
                initial,
                current,
                published: Option.isSome(queued),
            }
        })
    )
})

export const stream_changes_program = Effect.gen(function* () {
    const ref = yield* TxSubscriptionRef.make(0)
    yield* TxSubscriptionRef.set(ref, 1)
    yield* TxSubscriptionRef.set(ref, 2)

    const values = yield* Stream.runCollect(
        TxSubscriptionRef.changesStream(ref).pipe(Stream.take(1))
    )
    return Array.from(values)
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Update"),
    S.Literal("Queue"),
    S.Literal("Stream"),
])
export type Stage = typeof Stage.Type
export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Update",
    "Queue",
    "Stream",
]

export const CreateCase = S.Union([
    S.Literal("Make"),
    S.Literal("Read"),
    S.Literal("Guard"),
    S.Literal("Internals"),
])
export type CreateCase = typeof CreateCase.Type
export const create_cases: ReadonlyArray<CreateCase> = [
    "Make",
    "Read",
    "Guard",
    "Internals",
]

export const UpdateCase = S.Union([
    S.Literal("Set"),
    S.Literal("Previous"),
    S.Literal("Next"),
    S.Literal("Modify"),
])
export type UpdateCase = typeof UpdateCase.Type
export const update_cases: ReadonlyArray<UpdateCase> = [
    "Set",
    "Previous",
    "Next",
    "Modify",
]

export const QueueCase = S.Union([
    S.Literal("CurrentFirst"),
    S.Literal("Committed"),
    S.Literal("Scoped"),
    S.Literal("AtomicSubscribe"),
])
export type QueueCase = typeof QueueCase.Type
export const queue_cases: ReadonlyArray<QueueCase> = [
    "CurrentFirst",
    "Committed",
    "Scoped",
    "AtomicSubscribe",
]

export const StreamCase = S.Union([
    S.Literal("Live"),
    S.Literal("SubscribeTime"),
    S.Literal("NoHistory"),
    S.Literal("QueueVsStream"),
])
export type StreamCase = typeof StreamCase.Type
export const stream_cases: ReadonlyArray<StreamCase> = [
    "Live",
    "SubscribeTime",
    "NoHistory",
    "QueueVsStream",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    updateCase: UpdateCase,
    queueCase: QueueCase,
    streamCase: StreamCase,
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
            "One transactional value plus an unbounded transactional pub/sub",
        title: "Create observable transactional state",
        description:
            "TxSubscriptionRef.make creates a TxRef for the current value and an unbounded TxPubSub for committed updates. get reads only the current value; it does not create a subscription.",
        code: `const ref = yield* TxSubscriptionRef.make(0)\n\nconst current = yield* TxSubscriptionRef.get(ref)`,
        apis: [
            "TxSubscriptionRef.make",
            "TxSubscriptionRef.get",
            "isTxSubscriptionRef",
        ],
        notice: "The live TxRef and TxPubSub belong to runtime transactional state. Keep only serializable lesson selections in the Foldkit Model.",
    },
    Update: {
        eyebrow:
            "Every mutation writes the ref and publishes the new value in one transaction",
        title: "Update state and publish atomically",
        description:
            "set, update, getAndSet, getAndUpdate, updateAndGet, and modify all funnel through the same transactional mutation path. The TxRef write and TxPubSub publication commit or roll back together.",
        code: `const previous = yield* TxSubscriptionRef.getAndUpdate(\n    ref,\n    (current) => current + 1\n)\n\n// previous is returned; the new value is published`,
        apis: [
            "set",
            "update",
            "getAndSet",
            "getAndUpdate",
            "updateAndGet",
            "modify",
        ],
        notice: "A failed outer transaction does not leave the value changed and does not leak the transactional publication to subscribers.",
    },
    Queue: {
        eyebrow:
            "Subscription registration and the initial snapshot are one transaction",
        title: "Consume changes through a scoped TxQueue",
        description:
            "changes registers a subscriber, reads the current TxRef value, and offers that value to the subscriber queue atomically. The queue then receives later committed updates until its scope closes.",
        code: `const sub = yield* TxSubscriptionRef.changes(ref)\nconst initial = yield* TxQueue.take(sub)\n\nyield* TxSubscriptionRef.set(ref, 1)\nconst next = yield* TxQueue.take(sub)`,
        apis: ["TxSubscriptionRef.changes", "TxQueue.take", "Effect.scoped"],
        notice: "The atomic acquire + current-value enqueue removes the gap where an update could otherwise land between registration and the initial snapshot.",
    },
    Stream: {
        eyebrow: "The Stream form subscribes when it is consumed",
        title: "Consume the same change feed as a Stream",
        description:
            "changesStream wraps the scoped transactional subscription as a Stream. It starts with the current value at subscription time, then yields later committed updates; it does not replay the full update history from ref creation.",
        code: `const values = yield* Stream.runCollect(\n    TxSubscriptionRef.changesStream(ref).pipe(\n        Stream.take(1)\n    )\n)`,
        apis: [
            "TxSubscriptionRef.changesStream",
            "Stream.take",
            "Stream.runCollect",
        ],
        notice: "If the ref was updated before the stream starts, its first element is the latest current value, not every earlier value that existed before subscription.",
    },
}

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
                input: "initial value 0",
                operation: "TxSubscriptionRef.make(0)",
                result: "observable transactional ref",
                invariant: "current value + change channel",
                implementation: "TxRef.make + TxPubSub.unbounded",
                guidance:
                    "Use when transactional state also needs a live committed-change feed.",
            }
        case "Read":
            return {
                input: "TxSubscriptionRef<A>",
                operation: "TxSubscriptionRef.get(ref)",
                result: "current A",
                invariant: "no subscription created",
                implementation: "delegates to TxRef.get",
                guidance:
                    "Use get for a point-in-time read when future updates are irrelevant.",
            }
        case "Guard":
            return {
                input: "unknown value",
                operation: "isTxSubscriptionRef(value)",
                result: "runtime type guard",
                invariant: "narrows unknown",
                implementation: "checks private TypeId property",
                guidance:
                    "Use the guard at unknown/runtime boundaries, not for ordinary typed code.",
            }
        case "Internals":
            return {
                input: "workspace rc.112 → live rc.115",
                operation: "compare source",
                result: "same 12-name API",
                invariant: "behavior unchanged",
                implementation: "private TypeId string renamed",
                guidance:
                    "Avoid relying on the marker string; use public constructors and guard APIs.",
            }
    }
}

export const update_snapshot = (model: Model): Snapshot => {
    switch (model.updateCase) {
        case "Set":
            return {
                input: "current 10 · next 42",
                operation: "TxSubscriptionRef.set(ref, 42)",
                result: "void · publishes 42",
                invariant: "write + publish are atomic",
                implementation: "modify(() => [void 0, value])",
                guidance: "Use set when the next value is already known.",
            }
        case "Previous":
            return {
                input: "current 10",
                operation: "getAndUpdate(ref, n => n + 5)",
                result: "returns 10 · stores 15",
                invariant: "previous and update share one snapshot",
                implementation: "modify(current => [current, next])",
                guidance:
                    "Use getAndSet/getAndUpdate when the caller needs the exact previous value.",
            }
        case "Next":
            return {
                input: "current 3",
                operation: "updateAndGet(ref, n => n * 3)",
                result: "returns 9 · stores 9",
                invariant: "returned value is the published value",
                implementation: "modify returns newValue twice",
                guidance:
                    "Use updateAndGet when downstream work needs the committed next value.",
            }
        case "Modify":
            return {
                input: "current A",
                operation: "modify(ref, current => [B, nextA])",
                result: "returns B · stores/publishes nextA",
                invariant: "one transaction computes result + next state",
                implementation: "TxRef.set + TxPubSub.publish inside Effect.tx",
                guidance:
                    "Use modify for domain operations that return a result distinct from stored state.",
            }
    }
}

export const queue_snapshot = (model: Model): Snapshot => {
    switch (model.queueCase) {
        case "CurrentFirst":
            return {
                input: "ref currently 7",
                operation: "changes(ref) → TxQueue.take(sub)",
                result: "first value is 7",
                invariant: "subscription begins with current snapshot",
                implementation: "register queue + get ref + offer current",
                guidance:
                    "Treat the first queue element as the subscription snapshot, not a historical event.",
            }
        case "Committed":
            return {
                input: "outer tx sets 99 then fails",
                operation: "poll subscribed queue after rollback",
                result: "no 99 event · ref unchanged",
                invariant: "aborted publications do not escape",
                implementation:
                    "ref write and queue offer share transaction journal",
                guidance:
                    "Use outer transactions freely: subscribers observe only successfully committed work.",
            }
        case "Scoped":
            return {
                input: "Effect.scoped region",
                operation: "TxSubscriptionRef.changes(ref)",
                result: "scoped TxQueue subscription",
                invariant: "scope close unregisters + shuts queue",
                implementation: "acquireRelease around TxPubSub subscriber",
                guidance:
                    "Keep the subscription inside a scope so cleanup is deterministic.",
            }
        case "AtomicSubscribe":
            return {
                input: "registration racing with updates",
                operation: "acquire subscriber + snapshot in Effect.tx",
                result: "coherent current-then-later ordering",
                invariant: "no registration/snapshot gap",
                implementation:
                    "TxPubSub.acquireSubscriber + TxRef.get + TxQueue.offer",
                guidance:
                    "The built-in changes operation already handles the tricky subscription boundary atomically.",
            }
    }
}

export const stream_snapshot = (model: Model): Snapshot => {
    switch (model.streamCase) {
        case "Live":
            return {
                input: "TxSubscriptionRef<A>",
                operation: "changesStream(ref)",
                result: "Stream<A>",
                invariant: "current first · future updates later",
                implementation:
                    "unwrap scoped changes queue + repeated TxQueue.take",
                guidance:
                    "Use the stream form when downstream operators, sinks, or stream composition are more natural.",
            }
        case "SubscribeTime":
            return {
                input: "ref updated 0 → 1 → 2 before stream runs",
                operation: "changesStream(ref).pipe(Stream.take(1))",
                result: "[2]",
                invariant: "initial element is current at subscription time",
                implementation: "changes(ref) executes when stream is consumed",
                guidance:
                    "Constructing a change stream does not create historical replay from ref creation.",
            }
        case "NoHistory":
            return {
                input: "updates before subscription",
                operation: "start changes/changesStream later",
                result: "latest current + later updates",
                invariant: "not an event log",
                implementation:
                    "TxRef stores current; TxPubSub serves current subscribers only",
                guidance:
                    "Use a persistent event log if every historical transition must be recoverable later.",
            }
        case "QueueVsStream":
            return {
                input: "same committed-change feed",
                operation: "choose changes or changesStream",
                result: "TxQueue control or Stream composition",
                invariant: "same current-first semantics",
                implementation:
                    "Stream form is built from the queue subscription",
                guidance:
                    "Choose changes for transactional queue control; choose changesStream for stream pipelines.",
            }
    }
}

export const init: Model = {
    stage: "Create",
    createCase: "Make",
    updateCase: "Set",
    queueCase: "CurrentFirst",
    streamCase: "Live",
}

export const Message = defineMessageUnion({
    SelectedTxSubscriptionRefStage: { stage: Stage },
    SelectedTxSubscriptionRefCreateCase: { createCase: CreateCase },
    SelectedTxSubscriptionRefUpdateCase: { updateCase: UpdateCase },
    SelectedTxSubscriptionRefQueueCase: { queueCase: QueueCase },
    SelectedTxSubscriptionRefStreamCase: { streamCase: StreamCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type UpdateCasePayload = Readonly<{ updateCase: UpdateCase }>
type QueueCasePayload = Readonly<{ queueCase: QueueCase }>
type StreamCasePayload = Readonly<{ streamCase: StreamCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTxSubscriptionRefStage: ({ stage }: StagePayload) => ({
            model: evo(model, { stage: () => stage }),
        }),
        SelectedTxSubscriptionRefCreateCase: ({
            createCase,
        }: CreateCasePayload) => ({
            model: evo(model, { createCase: () => createCase }),
        }),
        SelectedTxSubscriptionRefUpdateCase: ({
            updateCase,
        }: UpdateCasePayload) => ({
            model: evo(model, { updateCase: () => updateCase }),
        }),
        SelectedTxSubscriptionRefQueueCase: ({
            queueCase,
        }: QueueCasePayload) => ({
            model: evo(model, { queueCase: () => queueCase }),
        }),
        SelectedTxSubscriptionRefStreamCase: ({
            streamCase,
        }: StreamCasePayload) => ({
            model: evo(model, { streamCase: () => streamCase }),
        }),
    })
