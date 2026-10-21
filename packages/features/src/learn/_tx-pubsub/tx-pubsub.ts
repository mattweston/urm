import { Effect, Fiber, Schema as S, TxPubSub, TxQueue } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TXPUBSUB PROGRAMS
// -----------------------------------------------------------------------------

export const create_program = Effect.gen(function* () {
    const bounded = yield* TxPubSub.bounded<number>(2)
    const dropping = yield* TxPubSub.dropping<number>(2)
    const sliding = yield* TxPubSub.sliding<number>(2)
    const unbounded = yield* TxPubSub.unbounded<number>()

    return [
        TxPubSub.capacity(bounded),
        TxPubSub.capacity(dropping),
        TxPubSub.capacity(sliding),
        TxPubSub.capacity(unbounded),
    ] as const
})

export const scoped_subscription_program = Effect.scoped(
    Effect.gen(function* () {
        const hub = yield* TxPubSub.unbounded<string>()
        const subscriber = yield* TxPubSub.subscribe(hub)
        yield* TxPubSub.publish(hub, "hello")
        return yield* TxQueue.take(subscriber)
    })
)

export const manual_subscription_program = Effect.gen(function* () {
    const hub = yield* TxPubSub.unbounded<string>()
    const subscriber = yield* Effect.tx(TxPubSub.acquireSubscriber(hub))
    yield* TxPubSub.publish(hub, "manual")
    const value = yield* TxQueue.take(subscriber)
    yield* Effect.tx(TxPubSub.releaseSubscriber(hub, subscriber))
    return value
})

export const broadcast_program = Effect.scoped(
    Effect.gen(function* () {
        const hub = yield* TxPubSub.unbounded<string>()
        const first = yield* TxPubSub.subscribe(hub)
        const second = yield* TxPubSub.subscribe(hub)

        yield* TxPubSub.publish(hub, "broadcast")

        return [
            yield* TxQueue.take(first),
            yield* TxQueue.take(second),
        ] as const
    })
)

export const dropping_program = Effect.scoped(
    Effect.gen(function* () {
        const hub = yield* TxPubSub.dropping<number>(2)
        const subscriber = yield* TxPubSub.subscribe(hub)

        const first = yield* TxPubSub.publish(hub, 1)
        const second = yield* TxPubSub.publish(hub, 2)
        const third = yield* TxPubSub.publish(hub, 3)

        return [
            first,
            second,
            third,
            yield* TxQueue.take(subscriber),
            yield* TxQueue.take(subscriber),
        ] as const
    })
)

export const sliding_program = Effect.scoped(
    Effect.gen(function* () {
        const hub = yield* TxPubSub.sliding<number>(2)
        const subscriber = yield* TxPubSub.subscribe(hub)

        yield* TxPubSub.publishAll(hub, [1, 2, 3])

        return [
            yield* TxQueue.take(subscriber),
            yield* TxQueue.take(subscriber),
        ] as const
    })
)

export const bounded_retry_program = Effect.scoped(
    Effect.gen(function* () {
        const hub = yield* TxPubSub.bounded<number>(1)
        yield* TxPubSub.subscribe(hub)
        yield* TxPubSub.publish(hub, 1)
        // Retries transactionally until a subscriber makes space.
        return yield* TxPubSub.publish(hub, 2)
    })
)

export const no_subscribers_program = Effect.gen(function* () {
    const hub = yield* TxPubSub.unbounded<string>()
    return yield* TxPubSub.publish(hub, "no one listening")
})

export const shutdown_program = Effect.gen(function* () {
    const hub = yield* TxPubSub.unbounded<number>()
    const waiter = yield* Effect.forkChild(TxPubSub.awaitShutdown(hub))

    yield* TxPubSub.shutdown(hub)
    yield* Fiber.await(waiter)

    return [
        yield* TxPubSub.isShutdown(hub),
        yield* TxPubSub.publish(hub, 1),
    ] as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Subscribe"),
    S.Literal("Publish"),
    S.Literal("Shutdown"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Subscribe",
    "Publish",
    "Shutdown",
]

export const CreateCase = S.Union([
    S.Literal("Bounded"),
    S.Literal("Dropping"),
    S.Literal("Sliding"),
    S.Literal("Unbounded"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Bounded",
    "Dropping",
    "Sliding",
    "Unbounded",
]

export const SubscribeCase = S.Union([
    S.Literal("Scoped"),
    S.Literal("Acquire"),
    S.Literal("Release"),
    S.Literal("Broadcast"),
])
export type SubscribeCase = typeof SubscribeCase.Type

export const subscribe_cases: ReadonlyArray<SubscribeCase> = [
    "Scoped",
    "Acquire",
    "Release",
    "Broadcast",
]

export const PublishCase = S.Union([
    S.Literal("Single"),
    S.Literal("Batch"),
    S.Literal("Backpressure"),
    S.Literal("NoSubscribers"),
])
export type PublishCase = typeof PublishCase.Type

export const publish_cases: ReadonlyArray<PublishCase> = [
    "Single",
    "Batch",
    "Backpressure",
    "NoSubscribers",
]

export const ShutdownCase = S.Union([
    S.Literal("Shutdown"),
    S.Literal("Await"),
    S.Literal("State"),
    S.Literal("Capacity"),
])
export type ShutdownCase = typeof ShutdownCase.Type

export const shutdown_cases: ReadonlyArray<ShutdownCase> = [
    "Shutdown",
    "Await",
    "State",
    "Capacity",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    subscribeCase: SubscribeCase,
    publishCase: PublishCase,
    shutdownCase: ShutdownCase,
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
        eyebrow: "subscriber queues inherit one hub capacity strategy",
        title: "Choose how slow subscribers affect publication",
        description:
            "bounded, dropping, sliding, and unbounded create the hub. Each future subscriber receives a TxQueue using that same strategy and capacity, so the constructor defines backpressure and loss semantics for every subscriber.",
        code: `const hub = yield* TxPubSub.bounded<number>(2)

TxPubSub.capacity(hub)
// 2`,
        apis: [
            "TxPubSub.bounded",
            "TxPubSub.dropping",
            "TxPubSub.sliding",
            "TxPubSub.unbounded",
        ],
        notice: "The capacity belongs to each subscriber queue, not to one shared message buffer. size reports the maximum pending queue length among current subscribers.",
    },

    Subscribe: {
        eyebrow: "every subscriber owns an independent transactional queue",
        title: "Subscribe with scope-managed or transaction-managed lifetime",
        description:
            "subscribe acquires a TxQueue and unregisters it automatically when the Scope closes. acquireSubscriber and releaseSubscriber expose the transactional acquire/release steps when registration must be atomic with other Tx operations.",
        code: `return yield* Effect.scoped(
    Effect.gen(function*() {
        const sub = yield* TxPubSub.subscribe(hub)
        yield* TxPubSub.publish(hub, "hello")
        return yield* TxQueue.take(sub)
    })
)`,
        apis: [
            "TxPubSub.subscribe",
            "TxPubSub.acquireSubscriber",
            "TxPubSub.releaseSubscriber",
            "TxQueue.take",
        ],
        notice: "A new subscriber receives only values published after it is registered. One publish broadcasts the same value into every subscriber queue that exists at commit time.",
    },

    Publish: {
        eyebrow:
            "one transaction broadcasts into all current subscriber queues",
        title: "Publish according to each queue strategy",
        description:
            "publish and publishAll return whether every delivery was accepted. bounded queues retry publication when any subscriber is full; dropping may reject only the full subscriber's new value; sliding evicts oldest queued values; unbounded never fills.",
        code: `const accepted = yield* TxPubSub.publish(hub, value)
const allAccepted = yield* TxPubSub.publishAll(
    hub,
    values
)`,
        apis: [
            "TxPubSub.publish",
            "TxPubSub.publishAll",
            "TxPubSub.isFull",
            "TxPubSub.size",
        ],
        notice: "Publishing with zero subscribers is a successful no-op and returns true. After shutdown, publish and publishAll return false.",
    },

    Shutdown: {
        eyebrow: "shutdown is transactional, idempotent, and observable",
        title: "Stop publication and close registered subscriber queues",
        description:
            "shutdown flips the hub state and shuts down the subscriber queues registered at that moment. awaitShutdown retries transactionally until the flag changes; isShutdown reads it directly.",
        code: `const waiter = yield* Effect.forkChild(
    TxPubSub.awaitShutdown(hub)
)

yield* TxPubSub.shutdown(hub)
yield* Fiber.await(waiter)`,
        apis: [
            "TxPubSub.shutdown",
            "TxPubSub.awaitShutdown",
            "TxPubSub.isShutdown",
            "TxPubSub.isTxPubSub",
        ],
        notice: "The implementation permits acquireSubscriber after shutdown; such later queues are not automatically shut down by the earlier shutdown call, and publication still returns false.",
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
        case "Bounded":
            return {
                input: "capacity 2",
                operation: "TxPubSub.bounded(2)",
                result: "bounded transactional hub",
                invariant: "full subscriber queues apply backpressure",
                implementation: "bounded TxQueue per subscriber",
                guidance:
                    "Use when loss is unacceptable and publishers may wait for slow subscribers.",
            }
        case "Dropping":
            return {
                input: "capacity 2",
                operation: "TxPubSub.dropping(2)",
                result: "dropping transactional hub",
                invariant: "new value may be dropped for a full subscriber",
                implementation: "dropping TxQueue per subscriber",
                guidance:
                    "Use when freshness is useful but blocking publishers is worse than losing new messages.",
            }
        case "Sliding":
            return {
                input: "capacity 2",
                operation: "TxPubSub.sliding(2)",
                result: "sliding transactional hub",
                invariant: "new value evicts oldest queued value when full",
                implementation: "sliding TxQueue per subscriber",
                guidance:
                    "Use when each subscriber should retain only its newest backlog.",
            }
        case "Unbounded":
            return {
                input: "no capacity limit",
                operation: "TxPubSub.unbounded()",
                result: "unbounded transactional hub",
                invariant: "subscriber queues never reject for capacity",
                implementation: "unbounded TxQueue per subscriber",
                guidance:
                    "Use only when backlog growth is acceptable or externally bounded.",
            }
    }
}

export const subscribe_snapshot = (model: Model): Snapshot => {
    switch (model.subscribeCase) {
        case "Scoped":
            return {
                input: "hub + Scope",
                operation: "TxPubSub.subscribe(hub)",
                result: "scoped TxQueue<A>",
                invariant: "queue is unregistered on scope close",
                implementation: "acquireRelease(tx(acquire), tx(release))",
                guidance:
                    "Use for normal application subscriptions so lifetime follows Scope automatically.",
            }
        case "Acquire":
            return {
                input: "hub inside a larger transaction",
                operation: "TxPubSub.acquireSubscriber(hub)",
                result: "registered TxQueue<A>",
                invariant: "registration joins the caller's transaction",
                implementation: "make queue + append to subscribersRef",
                guidance:
                    "Use when subscription registration must be atomic with other Tx state changes.",
            }
        case "Release":
            return {
                input: "hub + manually acquired queue",
                operation: "releaseSubscriber(hub, queue)",
                result: "unregistered, shutdown queue",
                invariant: "release removes the exact queue identity",
                implementation: "filter subscribers + TxQueue.shutdown",
                guidance:
                    "Pair manually acquired queues with releaseSubscriber inside your transactional cleanup.",
            }
        case "Broadcast":
            return {
                input: "two current subscribers + one value",
                operation: "TxPubSub.publish(hub, value)",
                result: "same value offered to both queues",
                invariant: "each subscriber owns an independent backlog",
                implementation: "iterate subscribers inside one transaction",
                guidance:
                    "Use pub/sub for fan-out; use TxQueue directly when exactly one consumer should receive an item.",
            }
    }
}

export const publish_snapshot = (model: Model): Snapshot => {
    switch (model.publishCase) {
        case "Single":
            return {
                input: "hub + one message",
                operation: "TxPubSub.publish(hub, value)",
                result: "Effect<boolean>",
                invariant: "boolean means every subscriber accepted",
                implementation:
                    "TxQueue.offer for each subscriber in Effect.tx",
                guidance:
                    "Check the boolean when dropping semantics or shutdown should influence upstream logic.",
            }
        case "Batch":
            return {
                input: "hub + Iterable<A>",
                operation: "TxPubSub.publishAll(hub, values)",
                result: "true only if every delivery was accepted",
                invariant: "values retain iterable order per subscriber queue",
                implementation:
                    "materialize iterable + publish each value transactionally",
                guidance:
                    "Use for a finite batch that should preserve message order for every current subscriber.",
            }
        case "Backpressure":
            return {
                input: "bounded hub + one full subscriber queue",
                operation: "publish(next)",
                result: "transaction retries",
                invariant: "no partial bounded broadcast commits",
                implementation:
                    "TxQueue.offer invokes txRetry when bounded queue is full",
                guidance:
                    "Consume from the slow subscriber or choose dropping/sliding when publisher suspension is undesirable.",
            }
        case "NoSubscribers":
            return {
                input: "hub with zero subscribers",
                operation: "TxPubSub.publish(hub, value)",
                result: "true",
                invariant: "there is no retained hub-level history",
                implementation: "empty subscriber loop is a successful no-op",
                guidance:
                    "Subscribe before publishing when the first message must be observed; TxPubSub does not replay past values.",
            }
    }
}

export const shutdown_snapshot = (model: Model): Snapshot => {
    switch (model.shutdownCase) {
        case "Shutdown":
            return {
                input: "live hub + current subscribers",
                operation: "TxPubSub.shutdown(hub)",
                result: "shutdown hub and queues",
                invariant: "operation is idempotent",
                implementation:
                    "set shutdownRef true + shutdown current queues",
                guidance:
                    "Use for terminal lifecycle cleanup when no further publication should be accepted.",
            }
        case "Await":
            return {
                input: "hub that may still be running",
                operation: "TxPubSub.awaitShutdown(hub)",
                result: "Effect<void> that completes after shutdown",
                invariant: "not shutdown → txRetry",
                implementation: "read shutdownRef inside Effect.tx",
                guidance:
                    "Use when another fiber should suspend efficiently until hub shutdown is committed.",
            }
        case "State":
            return {
                input: "hub lifecycle state",
                operation: "isShutdown / isEmpty / isFull / size",
                result: "transactional status values",
                invariant: "size is maximum queued messages across subscribers",
                implementation:
                    "inspect subscriber TxQueues inside transaction",
                guidance:
                    "Remember isEmpty/isFull summarize subscriber queues, not a hidden central buffer.",
            }
        case "Capacity":
            return {
                input: "constructed hub",
                operation: "TxPubSub.capacity(hub)",
                result: "number (Infinity for unbounded)",
                invariant: "capacity is synchronous constructor metadata",
                implementation: "read self.capacity directly",
                guidance:
                    "Use capacity to expose strategy limits without entering a transaction.",
            }
    }
}

export const current_snapshot = (model: Model): Snapshot => {
    switch (model.stage) {
        case "Create":
            return create_snapshot(model)
        case "Subscribe":
            return subscribe_snapshot(model)
        case "Publish":
            return publish_snapshot(model)
        case "Shutdown":
            return shutdown_snapshot(model)
    }
}

export const initial_model: Model = {
    stage: "Create",
    createCase: "Bounded",
    subscribeCase: "Scoped",
    publishCase: "Single",
    shutdownCase: "Shutdown",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTxPubSubStage: { stage: Stage },
    SelectedTxPubSubCreateCase: { createCase: CreateCase },
    SelectedTxPubSubSubscribeCase: { subscribeCase: SubscribeCase },
    SelectedTxPubSubPublishCase: { publishCase: PublishCase },
    SelectedTxPubSubShutdownCase: { shutdownCase: ShutdownCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type SubscribeCasePayload = Readonly<{ subscribeCase: SubscribeCase }>
type PublishCasePayload = Readonly<{ publishCase: PublishCase }>
type ShutdownCasePayload = Readonly<{ shutdownCase: ShutdownCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTxPubSubStage: ({ stage }: StagePayload) => ({
            model: evo(model, { stage: () => stage }),
        }),
        SelectedTxPubSubCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: evo(model, { createCase: () => createCase }),
        }),
        SelectedTxPubSubSubscribeCase: ({
            subscribeCase,
        }: SubscribeCasePayload) => ({
            model: evo(model, { subscribeCase: () => subscribeCase }),
        }),
        SelectedTxPubSubPublishCase: ({ publishCase }: PublishCasePayload) => ({
            model: evo(model, { publishCase: () => publishCase }),
        }),
        SelectedTxPubSubShutdownCase: ({
            shutdownCase,
        }: ShutdownCasePayload) => ({
            model: evo(model, { shutdownCase: () => shutdownCase }),
        }),
    })
