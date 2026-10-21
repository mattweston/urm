import {
    Cause,
    Data,
    Effect,
    Fiber,
    Match as M,
    Queue,
    Schema as S,
} from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Queue examples
// -----------------------------------------------------------------------------

export class QueueError extends Data.TaggedError("QueueError")<{
    readonly message: string
}> {}

export const offer_and_take = Effect.gen(function* () {
    const queue = yield* Queue.bounded<number>(3)

    yield* Queue.offer(queue, 1)
    yield* Queue.offer(queue, 2)

    const first = yield* Queue.take(queue)
    const size = yield* Queue.size(queue)

    return { first, size }
})

export const bounded_backpressure = Effect.gen(function* () {
    const queue = yield* Queue.bounded<number>(1)

    yield* Queue.offer(queue, 1)

    // Capacity is full, so this child Fiber suspends.
    const producer = yield* Effect.forkChild(Queue.offer(queue, 2))

    // Frees capacity; the suspended offer can now complete.
    const first = yield* Queue.take(queue)

    yield* Fiber.join(producer)

    const second = yield* Queue.take(queue)

    return [first, second] as const
})

export const dropping_strategy = Effect.gen(function* () {
    const queue = yield* Queue.dropping<number>(2)

    const first = yield* Queue.offer(queue, 1)
    const second = yield* Queue.offer(queue, 2)
    const third = yield* Queue.offer(queue, 3)

    const values = yield* Queue.takeAll(queue)

    return { offered: [first, second, third], values }
})

export const sliding_strategy = Effect.gen(function* () {
    const queue = yield* Queue.sliding<number>(3)

    yield* Queue.offerAll(queue, [1, 2, 3])
    yield* Queue.offer(queue, 4)

    return yield* Queue.takeAll(queue)
})

export const graceful_end = Effect.gen(function* () {
    const queue = yield* Queue.bounded<number, Cause.Done>(3)

    yield* Queue.offerAll(queue, [1, 2])
    yield* Queue.end(queue)

    // Existing buffered values are still available while the queue closes.
    const first = yield* Queue.take(queue)
    const second = yield* Queue.take(queue)

    // Once drained, the terminal Done is observed.
    const exit = yield* Effect.exit(Queue.take(queue))

    return { first, second, exit }
})

export const typed_failure = Effect.gen(function* () {
    const queue = yield* Queue.bounded<number, QueueError>(3)

    yield* Queue.offer(queue, 1)
    yield* Queue.fail(queue, new QueueError({ message: "producer failed" }))

    const first = yield* Queue.take(queue)
    const exit = yield* Effect.exit(Queue.take(queue))

    return { first, exit }
})

export const immediate_shutdown = Effect.gen(function* () {
    const queue = yield* Queue.bounded<number>(3)

    yield* Queue.offerAll(queue, [1, 2, 3])
    yield* Queue.shutdown(queue)

    return yield* Queue.size(queue)
})

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Buffer"),
    S.Literal("Capacity"),
    S.Literal("Completion"),
    S.Literal("Fibers"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Buffer",
    "Capacity",
    "Completion",
    "Fibers",
]

export const Strategy = S.Union([
    S.Literal("Bounded"),
    S.Literal("Dropping"),
    S.Literal("Sliding"),
])
export type Strategy = typeof Strategy.Type

export const CompletionMode = S.Union([
    S.Literal("Open"),
    S.Literal("ClosingEnd"),
    S.Literal("ClosingFail"),
    S.Literal("Done"),
    S.Literal("Shutdown"),
])
export type CompletionMode = typeof CompletionMode.Type

export const FiberStatus = S.Union([
    S.Literal("Idle"),
    S.Literal("Running"),
    S.Literal("Suspended"),
    S.Literal("Success"),
])
export type FiberStatus = typeof FiberStatus.Type

export const Model = S.Struct({
    stage: Stage,

    buffer_items: S.Array(S.Number),
    buffer_next: S.Number,
    buffer_last_taken: S.Option(S.Number),

    strategy: Strategy,
    capacity_items: S.Array(S.Number),
    capacity_next: S.Number,
    capacity_pending: S.Option(S.Number),
    capacity_rejected: S.Array(S.Number),

    completion_mode: CompletionMode,
    completion_items: S.Array(S.String),
    completion_failure: S.Option(S.String),
    completion_observation: S.String,

    producer_status: FiberStatus,
    consumer_status: FiberStatus,
    fiber_items: S.Array(S.Number),
    fiber_pending_offer: S.Option(S.Number),
    fiber_consumed: S.Array(S.Number),
    fiber_log: S.Array(S.String),
})
export type Model = typeof Model.Type

export const SelectedQueueStage = taggedStruct("SelectedQueueStage", {
    stage: Stage,
})

export const ClickedOfferQueueValue = taggedStruct("ClickedOfferQueueValue")
export const ClickedTakeQueueValue = taggedStruct("ClickedTakeQueueValue")
export const ClickedResetQueueBuffer = taggedStruct("ClickedResetQueueBuffer")

export const SelectedQueueStrategy = taggedStruct("SelectedQueueStrategy", {
    strategy: Strategy,
})
export const ClickedOfferCapacityValue = taggedStruct(
    "ClickedOfferCapacityValue"
)
export const ClickedTakeCapacityValue = taggedStruct("ClickedTakeCapacityValue")
export const ClickedResetQueueCapacity = taggedStruct(
    "ClickedResetQueueCapacity"
)

export const ClickedEndQueue = taggedStruct("ClickedEndQueue")
export const ClickedFailQueue = taggedStruct("ClickedFailQueue")
export const ClickedShutdownQueue = taggedStruct("ClickedShutdownQueue")
export const ClickedTakeCompletionValue = taggedStruct(
    "ClickedTakeCompletionValue"
)
export const ClickedResetQueueCompletion = taggedStruct(
    "ClickedResetQueueCompletion"
)

export const ClickedStartQueueFibers = taggedStruct("ClickedStartQueueFibers")
export const ClickedConsumerTakeQueueValue = taggedStruct(
    "ClickedConsumerTakeQueueValue"
)
export const ClickedResetQueueFibers = taggedStruct("ClickedResetQueueFibers")

export const Message = S.Union([
    SelectedQueueStage,

    ClickedOfferQueueValue,
    ClickedTakeQueueValue,
    ClickedResetQueueBuffer,

    SelectedQueueStrategy,
    ClickedOfferCapacityValue,
    ClickedTakeCapacityValue,
    ClickedResetQueueCapacity,

    ClickedEndQueue,
    ClickedFailQueue,
    ClickedShutdownQueue,
    ClickedTakeCompletionValue,
    ClickedResetQueueCompletion,

    ClickedStartQueueFibers,
    ClickedConsumerTakeQueueValue,
    ClickedResetQueueFibers,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Buffer",

    buffer_items: [1, 2],
    buffer_next: 3,
    buffer_last_taken: S.Option(S.Number).make(undefined),

    strategy: "Bounded",
    capacity_items: [1, 2, 3],
    capacity_next: 4,
    capacity_pending: S.Option(S.Number).make(undefined),
    capacity_rejected: [],

    completion_mode: "Open",
    completion_items: ["alpha", "beta"],
    completion_failure: S.Option(S.String).make(undefined),
    completion_observation: "Queue is open.",

    producer_status: "Idle",
    consumer_status: "Idle",
    fiber_items: [],
    fiber_pending_offer: S.Option(S.Number).make(undefined),
    fiber_consumed: [],
    fiber_log: [],
})

type UpdateReturn = Update.Return<Model, Message>

const fresh_capacity = (
    strategy: Strategy
): Readonly<{
    strategy: Strategy
    capacity_items: ReadonlyArray<number>
    capacity_next: number
    capacity_pending: Model["capacity_pending"]
    capacity_rejected: ReadonlyArray<number>
}> => ({
    strategy,
    capacity_items: [1, 2, 3],
    capacity_next: 4,
    capacity_pending: S.Option(S.Number).make(undefined),
    capacity_rejected: [],
})

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedQueueStage: ({ stage }) => ({
                model: evo(model, { stage: () => stage }),
                commands: [],
            }),

            ClickedOfferQueueValue: () => ({
                model: evo(model, {
                    buffer_items: (items) => [...items, model.buffer_next],
                    buffer_next: (next) => next + 1,
                    buffer_last_taken: () => S.Option(S.Number).make(undefined),
                }),
                commands: [],
            }),

            ClickedTakeQueueValue: () => {
                const [first, ...rest] = model.buffer_items
                if (first === undefined) {
                    return { model, commands: [] }
                }

                return {
                    model: evo(model, {
                        buffer_items: () => rest,
                        buffer_last_taken: () => S.Option(S.Number).make(first),
                    }),
                    commands: [],
                }
            },

            ClickedResetQueueBuffer: () => ({
                model: evo(model, {
                    buffer_items: () => [1, 2],
                    buffer_next: () => 3,
                    buffer_last_taken: () => S.Option(S.Number).make(undefined),
                }),
                commands: [],
            }),

            SelectedQueueStrategy: ({ strategy }) => {
                const fresh = fresh_capacity(strategy)

                return {
                    model: evo(model, {
                        strategy: () => fresh.strategy,
                        capacity_items: () => fresh.capacity_items,
                        capacity_next: () => fresh.capacity_next,
                        capacity_pending: () => fresh.capacity_pending,
                        capacity_rejected: () => fresh.capacity_rejected,
                    }),
                    commands: [],
                }
            },

            ClickedOfferCapacityValue: () => {
                const value = model.capacity_next

                if (model.capacity_items.length < 3) {
                    return {
                        model: evo(model, {
                            capacity_items: (items) => [...items, value],
                            capacity_next: (next) => next + 1,
                        }),
                        commands: [],
                    }
                }

                if (model.strategy === "Bounded") {
                    return {
                        model: evo(model, {
                            capacity_pending: () =>
                                S.Option(S.Number).make(value),
                            capacity_next: (next) => next + 1,
                        }),
                        commands: [],
                    }
                }

                if (model.strategy === "Dropping") {
                    return {
                        model: evo(model, {
                            capacity_rejected: (items) => [...items, value],
                            capacity_next: (next) => next + 1,
                        }),
                        commands: [],
                    }
                }

                const [oldest, ...rest] = model.capacity_items

                return {
                    model: evo(model, {
                        capacity_items: () => [...rest, value],
                        capacity_rejected: (items) =>
                            oldest === undefined ? items : [...items, oldest],
                        capacity_next: (next) => next + 1,
                    }),
                    commands: [],
                }
            },

            ClickedTakeCapacityValue: () => {
                const [, ...rest] = model.capacity_items

                return {
                    model: evo(model, {
                        capacity_items: () =>
                            model.strategy === "Bounded" &&
                            model.capacity_pending._tag === "Some"
                                ? [...rest, model.capacity_pending.value]
                                : rest,
                        capacity_pending: () =>
                            S.Option(S.Number).make(undefined),
                    }),
                    commands: [],
                }
            },

            ClickedResetQueueCapacity: () => {
                const fresh = fresh_capacity(model.strategy)

                return {
                    model: evo(model, {
                        capacity_items: () => fresh.capacity_items,
                        capacity_next: () => fresh.capacity_next,
                        capacity_pending: () => fresh.capacity_pending,
                        capacity_rejected: () => fresh.capacity_rejected,
                    }),
                    commands: [],
                }
            },

            ClickedEndQueue: () => ({
                model: evo(model, {
                    completion_mode: () =>
                        model.completion_items.length === 0
                            ? "Done"
                            : "ClosingEnd",
                    completion_failure: () =>
                        S.Option(S.String).make(undefined),
                    completion_observation: () =>
                        "Queue.end stops new offers; buffered values still drain.",
                }),
                commands: [],
            }),

            ClickedFailQueue: () => ({
                model: evo(model, {
                    completion_mode: () =>
                        model.completion_items.length === 0
                            ? "Done"
                            : "ClosingFail",
                    completion_failure: () => S.Option(S.String).make("boom"),
                    completion_observation: () =>
                        'Queue.fail("boom") closes to a typed error after buffered values drain.',
                }),
                commands: [],
            }),

            ClickedShutdownQueue: () => ({
                model: evo(model, {
                    completion_mode: () => "Shutdown",
                    completion_items: () => [],
                    completion_failure: () =>
                        S.Option(S.String).make(undefined),
                    completion_observation: () =>
                        "Queue.shutdown clears buffered values and interrupts pending operations.",
                }),
                commands: [],
            }),

            ClickedTakeCompletionValue: () => {
                if (model.completion_items.length > 0) {
                    const [first, ...rest] = model.completion_items

                    return {
                        model: evo(model, {
                            completion_items: () => rest,
                            completion_mode: () =>
                                rest.length === 0 &&
                                (model.completion_mode === "ClosingEnd" ||
                                    model.completion_mode === "ClosingFail")
                                    ? "Done"
                                    : model.completion_mode,
                            completion_observation: () =>
                                `Queue.take → ${first}`,
                        }),
                        commands: [],
                    }
                }

                if (model.completion_mode === "Done") {
                    return {
                        model: evo(model, {
                            completion_observation: () =>
                                model.completion_failure._tag === "Some"
                                    ? `Queue.take → failure "${model.completion_failure.value}"`
                                    : "Queue.take → Done",
                        }),
                        commands: [],
                    }
                }

                if (model.completion_mode === "Shutdown") {
                    return {
                        model: evo(model, {
                            completion_observation: () =>
                                "Queue.take terminates: the Queue was shut down.",
                        }),
                        commands: [],
                    }
                }

                return {
                    model: evo(model, {
                        completion_observation: () =>
                            "Queue.take would suspend: the Queue is empty and still open.",
                    }),
                    commands: [],
                }
            },

            ClickedResetQueueCompletion: () => ({
                model: evo(model, {
                    completion_mode: () => "Open",
                    completion_items: () => ["alpha", "beta"],
                    completion_failure: () =>
                        S.Option(S.String).make(undefined),
                    completion_observation: () => "Queue is open.",
                }),
                commands: [],
            }),

            ClickedStartQueueFibers: () => ({
                model: evo(model, {
                    producer_status: () => "Suspended",
                    consumer_status: () => "Running",
                    fiber_items: () => [1],
                    fiber_pending_offer: () => S.Option(S.Number).make(2),
                    fiber_consumed: () => [],
                    fiber_log: () => [
                        "Queue.bounded(1) created",
                        "producer offered 1",
                        "producer offered 2 → suspended",
                        "consumer Fiber waiting to take",
                    ],
                }),
                commands: [],
            }),

            ClickedConsumerTakeQueueValue: () => {
                const [first, ...rest] = model.fiber_items

                if (first === undefined) {
                    return { model, commands: [] }
                }

                return {
                    model: evo(model, {
                        fiber_items: () =>
                            model.fiber_pending_offer._tag === "Some"
                                ? [...rest, model.fiber_pending_offer.value]
                                : rest,
                        producer_status: () =>
                            model.fiber_pending_offer._tag === "Some"
                                ? "Success"
                                : model.producer_status,
                        consumer_status: () => "Success",
                        fiber_pending_offer: () =>
                            S.Option(S.Number).make(undefined),
                        fiber_consumed: (items) => [...items, first],
                        fiber_log: (log) => [
                            ...log,
                            `consumer took ${first}`,
                            ...(model.fiber_pending_offer._tag === "Some"
                                ? [
                                      "space freed → suspended producer resumed",
                                      `${model.fiber_pending_offer.value} entered Queue`,
                                  ]
                                : []),
                        ],
                    }),
                    commands: [],
                }
            },

            ClickedResetQueueFibers: () => ({
                model: evo(model, {
                    producer_status: () => "Idle",
                    consumer_status: () => "Idle",
                    fiber_items: () => [],
                    fiber_pending_offer: () =>
                        // Argument of type 'undefined' is not assignable to parameter of type 'Option<number>'.
                        S.Option(S.Number).make(undefined),
                    fiber_consumed: () => [],
                    fiber_log: () => [],
                }),
                commands: [],
            }),
        })
    )
