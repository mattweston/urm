import { Effect, PubSub, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL PUBSUB PROGRAMS
// -----------------------------------------------------------------------------

export const broadcast_program = Effect.scoped(
    Effect.gen(function* () {
        const pubsub = yield* PubSub.bounded<string>(4)

        const first = yield* PubSub.subscribe(pubsub)

        const second = yield* PubSub.subscribe(pubsub)

        const published = yield* PubSub.publish(pubsub, "broadcast")

        const firstMessage = yield* PubSub.take(first)

        const secondMessage = yield* PubSub.take(second)

        return {
            published,
            firstMessage,
            secondMessage,
        } as const
    })
)

export const publish_all_program = Effect.scoped(
    Effect.gen(function* () {
        const pubsub = yield* PubSub.bounded<string>(4)

        const subscription = yield* PubSub.subscribe(pubsub)

        const published = yield* PubSub.publishAll(pubsub, [
            "one",
            "two",
            "three",
        ])

        const values = yield* PubSub.takeAll(subscription)

        return {
            published,
            values,
        } as const
    })
)

export const dropping_program = Effect.scoped(
    Effect.gen(function* () {
        const pubsub = yield* PubSub.dropping<string>(2)

        const subscription = yield* PubSub.subscribe(pubsub)

        const first = yield* PubSub.publish(pubsub, "one")

        const second = yield* PubSub.publish(pubsub, "two")

        const third = yield* PubSub.publish(pubsub, "three")

        const values = yield* PubSub.takeUpTo(subscription, 10)

        return {
            published: [first, second, third] as const,
            values,
        } as const
    })
)

export const sliding_program = Effect.scoped(
    Effect.gen(function* () {
        const pubsub = yield* PubSub.sliding<string>(2)

        const subscription = yield* PubSub.subscribe(pubsub)

        yield* PubSub.publishAll(pubsub, ["one", "two", "three"])

        return yield* PubSub.takeUpTo(subscription, 10)
    })
)

export const replay_program = Effect.scoped(
    Effect.gen(function* () {
        const pubsub = yield* PubSub.bounded<string>({
            capacity: 4,
            replay: 2,
        })

        yield* PubSub.publishAll(pubsub, ["before-1", "before-2", "before-3"])

        const late = yield* PubSub.subscribe(pubsub)

        return yield* PubSub.takeUpTo(late, 2)
    })
)

export const remaining_program = Effect.scoped(
    Effect.gen(function* () {
        const pubsub = yield* PubSub.bounded<string>(4)

        const subscription = yield* PubSub.subscribe(pubsub)

        yield* PubSub.publishAll(pubsub, ["a", "b", "c"])

        const before = yield* PubSub.remaining(subscription)

        const first = yield* PubSub.take(subscription)

        const after = yield* PubSub.remaining(subscription)

        return {
            before,
            first,
            after,
        } as const
    })
)

export const shutdown_program = Effect.gen(function* () {
    const pubsub = yield* PubSub.bounded<string>(1)

    const before = yield* PubSub.isShutdown(pubsub)

    yield* PubSub.shutdown(pubsub)

    const after = yield* PubSub.isShutdown(pubsub)

    const published = yield* PubSub.publish(pubsub, "after")

    return {
        before,
        after,
        published,
    } as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Broadcast"),
    S.Literal("Consume"),
    S.Literal("Lifecycle"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Broadcast",
    "Consume",
    "Lifecycle",
]

export const CreateCase = S.Union([
    S.Literal("Bounded"),
    S.Literal("Strategies"),
    S.Literal("Replay"),
])
export type CreateCase = typeof CreateCase.Type

export const BroadcastCase = S.Union([
    S.Literal("Publish"),
    S.Literal("PublishAll"),
    S.Literal("FanOut"),
])
export type BroadcastCase = typeof BroadcastCase.Type

export const ConsumeCase = S.Union([
    S.Literal("Take"),
    S.Literal("Batch"),
    S.Literal("Remaining"),
])
export type ConsumeCase = typeof ConsumeCase.Type

export const LifecycleCase = S.Union([
    S.Literal("Size"),
    S.Literal("Shutdown"),
    S.Literal("Unsafe"),
])
export type LifecycleCase = typeof LifecycleCase.Type

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    broadcastCase: BroadcastCase,
    consumeCase: ConsumeCase,
    lifecycleCase: LifecycleCase,
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
        eyebrow: "one hub, multiple capacity strategies",
        title: "Choose backpressure, dropping, sliding, or unbounded storage — with optional replay for late subscribers",
        description:
            "bounded suspends effectful publishers when full; dropping rejects new surplus; sliding evicts old retained messages to accept new ones; unbounded removes the capacity limit. Current constructors also accept replay options so late subscribers can start with recent messages.",
        code: `const bounded =
    yield* PubSub.bounded<string>(
        16
    )

const dropping =
    yield* PubSub.dropping<string>(
        16
    )

const sliding =
    yield* PubSub.sliding<string>(
        16
    )

const replaying =
    yield* PubSub.bounded<string>({
        capacity:
            16,
        replay:
            4
    })

const unbounded =
    yield* PubSub.unbounded<string>()`,
        apis: [
            "PubSub.make",
            "PubSub.bounded",
            "PubSub.dropping",
            "PubSub.sliding",
            "PubSub.unbounded",
            "PubSub.makeAtomicBounded",
            "PubSub.makeAtomicUnbounded",
            "PubSub.BackPressureStrategy",
            "PubSub.DroppingStrategy",
            "PubSub.SlidingStrategy",
        ],
        notice: "Without replay, a subscriber only sees messages published while it is subscribed. Replay is a separate recent-message window for late subscribers; it does not turn PubSub into durable history.",
    },

    Broadcast: {
        eyebrow: "accepted messages fan out to every active subscriber",
        title: "Publish once and let every current subscription receive its own copy",
        description:
            "publish returns Effect<boolean> and honors the configured surplus strategy. publishUnsafe is a synchronous non-blocking attempt that never runs effectful surplus handling. publishAll sends an iterable of messages through the same strategy rules.",
        code: `const first =
    yield* PubSub.subscribe(
        pubsub
    )

const second =
    yield* PubSub.subscribe(
        pubsub
    )

yield* PubSub.publish(
    pubsub,
    "broadcast"
)

yield* PubSub.take(
    first
)
// "broadcast"

yield* PubSub.take(
    second
)
// "broadcast"`,
        apis: [
            "PubSub.publish",
            "PubSub.publishUnsafe",
            "PubSub.publishAll",
            "PubSub.subscribe",
        ],
        notice: "PubSub is broadcast, not work stealing: active subscribers do not compete for one shared message. Queue is the better abstraction when each message should go to only one consumer.",
    },

    Consume: {
        eyebrow: "scoped subscriptions with blocking and non-blocking reads",
        title: "Subscribe in a Scope, then take one, all, up to a maximum, or between minimum/maximum batch sizes",
        description:
            "subscribe returns a scoped Subscription. take suspends until one message exists. takeAll also waits until at least one exists and returns a non-empty array. takeUpTo never waits, while takeBetween waits until its normalized minimum is satisfied.",
        code: `const subscription =
    yield* PubSub.subscribe(
        pubsub
    )

const one =
    yield* PubSub.take(
        subscription
    )

const available =
    yield* PubSub.takeUpTo(
        subscription,
        10
    )

const batch =
    yield* PubSub.takeBetween(
        subscription,
        2,
        5
    )

const count =
    yield* PubSub.remaining(
        subscription
    )`,
        apis: [
            "PubSub.Subscription",
            "PubSub.subscribe",
            "PubSub.take",
            "PubSub.takeAll",
            "PubSub.takeUpTo",
            "PubSub.takeBetween",
            "PubSub.remaining",
            "PubSub.remainingUnsafe",
        ],
        notice: "takeAll is intentionally non-empty: if nothing is available it suspends for one item before returning. takeUpTo is the polling-style batch helper and may immediately return an empty array.",
    },

    Lifecycle: {
        eyebrow: "inspect retained messages and coordinate shutdown",
        title: "Read capacity/size, test empty/full state, then shut down publishers and subscriptions explicitly",
        description:
            "capacity is synchronous and fixed. size is an Effect snapshot of messages retained for active subscribers; sizeUnsafe is the synchronous snapshot. shutdown closes active subscriptions and strategy state, while awaitShutdown lets another fiber wait for that lifecycle event.",
        code: `PubSub.capacity(
    pubsub
)
// fixed number

yield* PubSub.size(
    pubsub
)

yield* PubSub.isEmpty(
    pubsub
)

yield* PubSub.shutdown(
    pubsub
)

yield* PubSub.isShutdown(
    pubsub
)
// true

yield* PubSub.publish(
    pubsub,
    "after"
)
// false`,
        apis: [
            "PubSub.capacity",
            "PubSub.size",
            "PubSub.sizeUnsafe",
            "PubSub.isFull",
            "PubSub.isEmpty",
            "PubSub.shutdown",
            "PubSub.isShutdown",
            "PubSub.isShutdownUnsafe",
            "PubSub.awaitShutdown",
        ],
        notice: "After PubSub shutdown, effectful publish / publishAll succeed with false and publishUnsafe returns false. Subscription take operations interrupt after their subscription has been shut down.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type CreateSnapshot = Readonly<{
    mode: CreateCase
    bounded: string
    dropping: string
    sliding: string
    unbounded: string
    replay: string
    lowLevel: string
}>

export const create_snapshot = (model: Model): CreateSnapshot => ({
    mode: model.createCase,
    bounded: "full → effectful publisher waits for space",
    dropping: "full → new surplus rejected · publish returns false",
    sliding: "full → oldest retained values evicted · new value accepted",
    unbounded: `capacity = ${Number.MAX_SAFE_INTEGER}`,
    replay: "options.replay > 0 → recent values available to late subscribers",
    lowLevel: "make = Atomic<A> + Strategy<A>",
})

export type BroadcastSnapshot = Readonly<{
    mode: BroadcastCase
    publish: string
    unsafe: string
    all: string
    first: string
    second: string
    queueContrast: string
}>

export const broadcast_snapshot = (model: Model): BroadcastSnapshot => ({
    mode: model.broadcastCase,
    publish: "publish(value) → Effect<boolean> · honors surplus strategy",
    unsafe: "publishUnsafe(value) → boolean · immediate attempt only",
    all: "publishAll(iterable) → Effect<boolean>",
    first: 'subscriber A ← "broadcast"',
    second: 'subscriber B ← "broadcast"',
    queueContrast: "PubSub fan-out · Queue load distribution",
})

export type ConsumeSnapshot = Readonly<{
    mode: ConsumeCase
    subscribe: string
    take: string
    takeAll: string
    takeUpTo: string
    takeBetween: string
    remaining: string
    remainingUnsafe: string
}>

export const consume_snapshot = (model: Model): ConsumeSnapshot => ({
    mode: model.consumeCase,
    subscribe: "Subscription<A> · Scope-bound automatic unsubscribe",
    take: "one message · suspends while empty",
    takeAll: "all currently available · waits for ≥1 · NonEmptyArray<A>",
    takeUpTo: "0…max immediately available · never waits",
    takeBetween: "wait until min · collect no more than max",
    remaining: "Effect<number> · includes replay-window messages",
    remainingUnsafe: "Option<number> · None when subscription is shut down",
})

export type LifecycleSnapshot = Readonly<{
    mode: LifecycleCase
    capacity: string
    size: string
    sizeUnsafe: string
    predicates: string
    shutdown: string
    unsafeShutdown: string
    await: string
    after: string
}>

export const lifecycle_snapshot = (model: Model): LifecycleSnapshot => ({
    mode: model.lifecycleCase,
    capacity: "capacity → synchronous fixed configured limit",
    size: "size → Effect<number> retained for active subscribers",
    sizeUnsafe: "sizeUnsafe → synchronous snapshot · 0 after shutdown",
    predicates: "isEmpty / isFull derive from current size",
    shutdown: "shutdown → close subscriptions + strategy + set shutdown flag",
    unsafeShutdown: "isShutdownUnsafe → synchronous flag snapshot",
    await: "awaitShutdown → suspend until shutdown occurs",
    after: "publish after shutdown → false",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedPubSubStage: {
        stage: Stage,
    },
    SelectedPubSubCreateCase: {
        createCase: CreateCase,
    },
    SelectedPubSubBroadcastCase: {
        broadcastCase: BroadcastCase,
    },
    SelectedPubSubConsumeCase: {
        consumeCase: ConsumeCase,
    },
    SelectedPubSubLifecycleCase: {
        lifecycleCase: LifecycleCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Create",
    createCase: "Bounded",
    broadcastCase: "FanOut",
    consumeCase: "Take",
    lifecycleCase: "Size",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type CreateCasePayload = Readonly<{
    createCase: CreateCase
}>

type BroadcastCasePayload = Readonly<{
    broadcastCase: BroadcastCase
}>

type ConsumeCasePayload = Readonly<{
    consumeCase: ConsumeCase
}>

type LifecycleCasePayload = Readonly<{
    lifecycleCase: LifecycleCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedPubSubStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedPubSubCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: evo(model, {
                createCase: () => createCase,
            }),
        }),

        SelectedPubSubBroadcastCase: ({
            broadcastCase,
        }: BroadcastCasePayload) => ({
            model: evo(model, {
                broadcastCase: () => broadcastCase,
            }),
        }),

        SelectedPubSubConsumeCase: ({ consumeCase }: ConsumeCasePayload) => ({
            model: evo(model, {
                consumeCase: () => consumeCase,
            }),
        }),

        SelectedPubSubLifecycleCase: ({
            lifecycleCase,
        }: LifecycleCasePayload) => ({
            model: evo(model, {
                lifecycleCase: () => lifecycleCase,
            }),
        }),
    })
