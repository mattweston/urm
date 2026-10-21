import { Cause, Effect, Schema as S, TxQueue } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TXQUEUE PROGRAMS
// -----------------------------------------------------------------------------

export const create_program = Effect.gen(function* () {
    const queue = yield* TxQueue.bounded<number>(3)
    return [yield* TxQueue.size(queue), yield* TxQueue.isOpen(queue)] as const
})

export const strategy_program = Effect.gen(function* () {
    const dropping = yield* TxQueue.dropping<number>(2)
    yield* TxQueue.offerAll(dropping, [1, 2])
    const rejected = yield* TxQueue.offer(dropping, 3)

    const sliding = yield* TxQueue.sliding<number>(2)
    yield* TxQueue.offerAll(sliding, [1, 2])
    yield* TxQueue.offer(sliding, 3)

    return [rejected, yield* TxQueue.takeAll(sliding)] as const
})

export const offer_program = Effect.gen(function* () {
    const queue = yield* TxQueue.bounded<number>(4)
    const accepted = yield* TxQueue.offer(queue, 1)
    const rejected = yield* TxQueue.offerAll(queue, [2, 3])
    return [accepted, rejected, yield* TxQueue.size(queue)] as const
})

export const take_program = Effect.gen(function* () {
    const queue = yield* TxQueue.bounded<number>(5)
    yield* TxQueue.offerAll(queue, [1, 2, 3])
    const first = yield* TxQueue.take(queue)
    const second = yield* TxQueue.poll(queue)
    const rest = yield* TxQueue.takeAll(queue)
    return [first, second, rest] as const
})

export const batch_program = Effect.gen(function* () {
    const queue = yield* TxQueue.bounded<number>(8)
    yield* TxQueue.offerAll(queue, [1, 2, 3, 4, 5, 6])
    const first = yield* TxQueue.takeN(queue, 2)
    const next = yield* TxQueue.takeBetween(queue, 2, 3)
    return [first, next, yield* TxQueue.size(queue)] as const
})

export const transaction_program = Effect.gen(function* () {
    const queue = yield* TxQueue.bounded<number>(4)
    yield* Effect.tx(
        Effect.gen(function* () {
            yield* TxQueue.offerAll(queue, [1, 2])
            const first = yield* TxQueue.take(queue)
            yield* TxQueue.offer(queue, first + 10)
        })
    )
    return yield* TxQueue.takeAll(queue)
})

export const graceful_completion_program = Effect.gen(function* () {
    const queue = yield* TxQueue.bounded<number, Cause.Done>(4)
    yield* TxQueue.offerAll(queue, [1, 2])
    yield* TxQueue.end(queue)
    const closing = yield* TxQueue.isClosing(queue)
    const drained = yield* TxQueue.takeAll(queue)
    const done = yield* TxQueue.isDone(queue)
    return [closing, drained, done] as const
})

export const fail_program = Effect.gen(function* () {
    const queue = yield* TxQueue.bounded<number, string>(4)
    yield* TxQueue.offerAll(queue, [1, 2])
    yield* TxQueue.fail(queue, "boom")
    return yield* Effect.exit(TxQueue.take(queue))
})

export const poll_program = Effect.gen(function* () {
    const queue = yield* TxQueue.bounded<number>(2)
    const before = yield* TxQueue.poll(queue)
    yield* TxQueue.offer(queue, 42)
    const after = yield* TxQueue.poll(queue)
    return [before, after] as const
})

export const peek_program = Effect.gen(function* () {
    const queue = yield* TxQueue.bounded<number>(2)
    yield* TxQueue.offer(queue, 42)
    return [yield* TxQueue.peek(queue), yield* TxQueue.size(queue)] as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Offer"),
    S.Literal("Take"),
    S.Literal("Complete"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Offer",
    "Take",
    "Complete",
]

export const CreateCase = S.Union([
    S.Literal("Bounded"),
    S.Literal("Unbounded"),
    S.Literal("Dropping"),
    S.Literal("Sliding"),
])
export type CreateCase = typeof CreateCase.Type
export const create_cases: ReadonlyArray<CreateCase> = [
    "Bounded",
    "Unbounded",
    "Dropping",
    "Sliding",
]

export const OfferCase = S.Union([
    S.Literal("One"),
    S.Literal("Many"),
    S.Literal("Backpressure"),
    S.Literal("Transaction"),
])
export type OfferCase = typeof OfferCase.Type
export const offer_cases: ReadonlyArray<OfferCase> = [
    "One",
    "Many",
    "Backpressure",
    "Transaction",
]

export const TakeCase = S.Union([
    S.Literal("Take"),
    S.Literal("Poll"),
    S.Literal("Batch"),
    S.Literal("Peek"),
])
export type TakeCase = typeof TakeCase.Type
export const take_cases: ReadonlyArray<TakeCase> = [
    "Take",
    "Poll",
    "Batch",
    "Peek",
]

export const CompleteCase = S.Union([
    S.Literal("End"),
    S.Literal("Fail"),
    S.Literal("Interrupt"),
    S.Literal("Shutdown"),
])
export type CompleteCase = typeof CompleteCase.Type
export const complete_cases: ReadonlyArray<CompleteCase> = [
    "End",
    "Fail",
    "Interrupt",
    "Shutdown",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    offerCase: OfferCase,
    takeCase: TakeCase,
    completeCase: CompleteCase,
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
        eyebrow: "Strategy + capacity + lifecycle define queue behavior",
        title: "Create a transactional FIFO queue",
        description:
            "bounded, unbounded, dropping, and sliding all store items in TxChunk-backed transactional state. The strategy decides what offer does at capacity while the lifecycle begins in Open.",
        code: `const queue = yield* TxQueue.bounded<number>(3)

const open = yield* TxQueue.isOpen(queue)
const empty = yield* TxQueue.isEmpty(queue)
// true, true`,
        apis: [
            "TxQueue.bounded",
            "TxQueue.unbounded",
            "TxQueue.dropping",
            "TxQueue.sliding",
        ],
        notice: "A TxQueue carries both an item type A and an error/completion channel E. Use the narrower TxEnqueue or TxDequeue interfaces when a component should only produce or consume.",
    },
    Offer: {
        eyebrow: "Each strategy defines a different full-queue contract",
        title: "Offer values into transactional capacity",
        description:
            "offer returns whether one item was accepted. offerAll returns the rejected values. Bounded queues retry transactionally when full; dropping rejects new values; sliding evicts the oldest buffered value; unbounded always accepts while Open.",
        code: `const queue = yield* TxQueue.dropping<number>(2)

yield* TxQueue.offerAll(queue, [1, 2])
const accepted = yield* TxQueue.offer(queue, 3)
// false`,
        apis: [
            "TxQueue.offer",
            "TxQueue.offerAll",
            "TxQueue.isFull",
            "Effect.tx",
        ],
        notice: "offerAll runs all offers in one transaction. On a bounded queue, txRetry rolls back the whole attempted batch until the transaction can commit.",
    },
    Take: {
        eyebrow:
            "Retrying consumers and non-retrying polls share one FIFO buffer",
        title: "Take one value, poll, peek, or drain batches",
        description:
            "take and peek retry while an Open queue is empty. poll returns None instead. takeAll waits for at least one item, while takeN and takeBetween support transactional batch consumers.",
        code: `const value = yield* TxQueue.take(queue)
const maybe = yield* TxQueue.poll(queue)
const batch = yield* TxQueue.takeN(queue, 2)
const peeked = yield* TxQueue.peek(queue)`,
        apis: [
            "TxQueue.take",
            "TxQueue.poll",
            "TxQueue.takeAll",
            "TxQueue.takeBetween",
        ],
        notice: "Live rc.115 normalizes takeN / takeBetween counts: finite fractions floor and NaN or non-positive counts normalize to zero. Integer examples remain compatible with rc.112.",
    },
    Complete: {
        eyebrow:
            "Queue completion distinguishes draining from immediate termination",
        title: "Move from Open to Closing to Done",
        description:
            "failCause, end, and interrupt preserve buffered items by entering Closing when necessary. Consumers may drain those items before the cause is observed. fail discards buffered items immediately; shutdown clears then interrupts.",
        code: `yield* TxQueue.offerAll(queue, [1, 2])
yield* TxQueue.end(queue)

const closing = yield* TxQueue.isClosing(queue)
const values = yield* TxQueue.takeAll(queue)
const done = yield* TxQueue.isDone(queue)`,
        apis: [
            "TxQueue.end",
            "TxQueue.fail",
            "TxQueue.interrupt",
            "TxQueue.awaitCompletion",
        ],
        notice: "Completion causes live in the queue error channel. Cause.Done represents normal end-of-stream style completion; arbitrary E values and interruption remain observable failures.",
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
        case "Bounded":
            return {
                input: "capacity = 3",
                operation: "TxQueue.bounded<number>(3)",
                result: "Open bounded queue",
                invariant: "offer retries when full",
                implementation: "TxChunk.empty + TxRef<State.Open>",
                guidance:
                    "Use when loss is unacceptable and producer backpressure is desired.",
            }
        case "Unbounded":
            return {
                input: "item type A",
                operation: "TxQueue.unbounded<A>()",
                result: "capacity = Infinity",
                invariant: "Open offers always accept",
                implementation: "same queue state with unbounded strategy",
                guidance:
                    "Use when capacity must not block producers and memory growth is acceptable.",
            }
        case "Dropping":
            return {
                input: "capacity = 2",
                operation: "TxQueue.dropping<A>(2)",
                result: "lossy newest-item strategy",
                invariant: "full offer returns false",
                implementation: "full queue leaves items unchanged",
                guidance:
                    "Use when freshness is optional and producers must never wait for capacity.",
            }
        case "Sliding":
            return {
                input: "capacity = 2",
                operation: "TxQueue.sliding<A>(2)",
                result: "lossy oldest-item strategy",
                invariant: "full offer evicts the oldest item",
                implementation: "drop(1) then append(new)",
                guidance:
                    "Use when the most recent bounded window matters more than old buffered values.",
            }
    }
}

export const offer_snapshot = (model: Model): Snapshot => {
    switch (model.offerCase) {
        case "One":
            return {
                input: "queue + one A",
                operation: "TxQueue.offer(queue, value)",
                result: "Effect<boolean>",
                invariant: "false means rejected, not typed failure",
                implementation: "strategy-specific TxChunk mutation",
                guidance: "Use for ordinary producer events.",
            }
        case "Many":
            return {
                input: "queue + Iterable<A>",
                operation: "TxQueue.offerAll(queue, values)",
                result: "Array<A> rejected values",
                invariant: "accepted items preserve FIFO order",
                implementation: "loop offer inside one Effect.tx",
                guidance:
                    "Use when a batch must be offered transactionally and rejected values matter.",
            }
        case "Backpressure":
            return {
                input: "full bounded queue",
                operation: "TxQueue.offer(queue, value)",
                result: "transaction retries",
                invariant: "no partial bounded commit",
                implementation: "Effect.txRetry on capacity exhaustion",
                guidance:
                    "The transaction resumes only after relevant transactional state changes make space available.",
            }
        case "Transaction":
            return {
                input: "queue + related Tx state",
                operation: "Effect.tx(Effect.gen(...))",
                result: "one atomic producer invariant",
                invariant: "all writes commit or retry together",
                implementation: "shared transaction journal",
                guidance:
                    "Use when enqueueing depends on or updates other transactional state.",
            }
    }
}

export const take_snapshot = (model: Model): Snapshot => {
    switch (model.takeCase) {
        case "Take":
            return {
                input: "possibly empty Open queue",
                operation: "TxQueue.take(queue)",
                result: "next FIFO A",
                invariant: "empty Open queue retries",
                implementation: "head + drop(1) + lifecycle check",
                guidance:
                    "Use when the consumer should transactionally wait for the next value.",
            }
        case "Poll":
            return {
                input: "possibly empty or Done queue",
                operation: "TxQueue.poll(queue)",
                result: "Option<A>",
                invariant: "None never retries and hides Done cause",
                implementation: "read head and conditionally drop",
                guidance: "Use for non-blocking opportunistic consumption.",
            }
        case "Batch":
            return {
                input: "queue + count bounds",
                operation: "takeN / takeBetween / takeAll",
                result: "Array<A> batch",
                invariant: "open queues may retry for required minimum",
                implementation: "transactional Chunk take/drop",
                guidance:
                    "Use takeBetween when a consumer needs a minimum batch but can absorb more immediately available work.",
            }
        case "Peek":
            return {
                input: "possibly empty Open queue",
                operation: "TxQueue.peek(queue)",
                result: "next A without removal",
                invariant: "empty Open queue retries",
                implementation: "TxChunk.get → Chunk.head",
                guidance:
                    "Use when transactional logic needs to inspect the next value before deciding whether to consume it.",
            }
    }
}

export const complete_snapshot = (model: Model): Snapshot => {
    switch (model.completeCase) {
        case "End":
            return {
                input: "Open queue, maybe buffered",
                operation: "TxQueue.end(queue)",
                result: "Closing or Done with Cause.Done",
                invariant: "buffered values may drain first",
                implementation: "failCause(Cause.fail(Cause.Done()))",
                guidance:
                    "Use for graceful normal completion when consumers understand Cause.Done.",
            }
        case "Fail":
            return {
                input: "Open queue + typed E",
                operation: "TxQueue.fail(queue, error)",
                result: "Done immediately",
                invariant: "buffered items are discarded",
                implementation: "clear items + state Done(Cause.fail(error))",
                guidance:
                    "Use when buffered work must be abandoned and consumers should observe the failure immediately.",
            }
        case "Interrupt":
            return {
                input: "Open queue",
                operation: "TxQueue.interrupt(queue)",
                result: "Closing or Done with interrupt cause",
                invariant: "existing items are preserved while Closing",
                implementation: "current fiber id → failCause(interrupt)",
                guidance:
                    "Use for graceful interruption semantics that still allow buffered values to drain.",
            }
        case "Shutdown":
            return {
                input: "queue before terminal shutdown",
                operation: "TxQueue.shutdown(queue)",
                result: "buffer cleared and queue interrupted",
                invariant: "isShutdown aliases Done state",
                implementation: "ignoreCause(clear) → interrupt",
                guidance:
                    "Use for the legacy immediate shutdown path when buffered values should not survive.",
            }
    }
}

export const current_snapshot = (model: Model): Snapshot => {
    switch (model.stage) {
        case "Create":
            return create_snapshot(model)
        case "Offer":
            return offer_snapshot(model)
        case "Take":
            return take_snapshot(model)
        case "Complete":
            return complete_snapshot(model)
    }
}

export const initial_model: Model = {
    stage: "Create",
    createCase: "Bounded",
    offerCase: "One",
    takeCase: "Take",
    completeCase: "End",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTxQueueStage: { stage: Stage },
    SelectedTxQueueCreateCase: { createCase: CreateCase },
    SelectedTxQueueOfferCase: { offerCase: OfferCase },
    SelectedTxQueueTakeCase: { takeCase: TakeCase },
    SelectedTxQueueCompleteCase: { completeCase: CompleteCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type OfferCasePayload = Readonly<{ offerCase: OfferCase }>
type TakeCasePayload = Readonly<{ takeCase: TakeCase }>
type CompleteCasePayload = Readonly<{ completeCase: CompleteCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTxQueueStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, { stage: () => stage }),
        }),
        SelectedTxQueueCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: modifyFields(model, { createCase: () => createCase }),
        }),
        SelectedTxQueueOfferCase: ({ offerCase }: OfferCasePayload) => ({
            model: modifyFields(model, { offerCase: () => offerCase }),
        }),
        SelectedTxQueueTakeCase: ({ takeCase }: TakeCasePayload) => ({
            model: modifyFields(model, { takeCase: () => takeCase }),
        }),
        SelectedTxQueueCompleteCase: ({
            completeCase,
        }: CompleteCasePayload) => ({
            model: modifyFields(model, { completeCase: () => completeCase }),
        }),
    })
