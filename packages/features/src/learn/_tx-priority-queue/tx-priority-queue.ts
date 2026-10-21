import { Effect, Order, Schema as S, TxPriorityQueue } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TXPRIORITYQUEUE PROGRAMS
// -----------------------------------------------------------------------------

export const create_program = Effect.gen(function* () {
    const queue = yield* TxPriorityQueue.fromIterable(Order.Number, [3, 1, 2])
    return yield* TxPriorityQueue.toArray(queue)
})

export const enqueue_program = Effect.gen(function* () {
    const queue = yield* TxPriorityQueue.empty<number>(Order.Number)
    yield* TxPriorityQueue.offer(queue, 3)
    yield* TxPriorityQueue.offer(queue, 1)
    yield* TxPriorityQueue.offerAll(queue, [5, 2, 4])
    return yield* TxPriorityQueue.toArray(queue)
})

export const transaction_program = Effect.gen(function* () {
    const queue = yield* TxPriorityQueue.empty<number>(Order.Number)

    yield* Effect.tx(
        Effect.gen(function* () {
            yield* TxPriorityQueue.offerAll(queue, [3, 1, 2])
            const first = yield* TxPriorityQueue.take(queue)
            yield* TxPriorityQueue.offer(queue, first + 10)
        })
    )

    return yield* TxPriorityQueue.toArray(queue)
})

export const dequeue_program = Effect.gen(function* () {
    const queue = yield* TxPriorityQueue.fromIterable(
        Order.Number,
        [5, 3, 1, 4, 2]
    )
    const first = yield* TxPriorityQueue.take(queue)
    const second = yield* TxPriorityQueue.takeOption(queue)
    const nextTwo = yield* TxPriorityQueue.takeUpTo(queue, 2)
    return [
        first,
        second,
        nextTwo,
        yield* TxPriorityQueue.toArray(queue),
    ] as const
})

export const retrying_take_program = Effect.gen(function* () {
    const queue = yield* TxPriorityQueue.empty<number>(Order.Number)
    return yield* TxPriorityQueue.take(queue)
})

export const peek_program = Effect.gen(function* () {
    const queue = yield* TxPriorityQueue.fromIterable(Order.Number, [3, 1, 2])
    return [
        yield* TxPriorityQueue.peek(queue),
        yield* TxPriorityQueue.peekOption(queue),
        yield* TxPriorityQueue.size(queue),
    ] as const
})

export const refine_program = Effect.gen(function* () {
    const queue = yield* TxPriorityQueue.fromIterable(
        Order.Number,
        [1, 2, 3, 4, 5, 6]
    )
    yield* TxPriorityQueue.removeIf(queue, (n: number) => n % 2 === 0)
    yield* TxPriorityQueue.retainIf(queue, (n: number) => n >= 3)
    return yield* TxPriorityQueue.toArray(queue)
})

export const drain_program = Effect.gen(function* () {
    const queue = yield* TxPriorityQueue.fromIterable(
        Order.Number,
        [4, 2, 3, 1]
    )
    const drained = yield* TxPriorityQueue.takeAll(queue)
    return [drained, yield* TxPriorityQueue.isEmpty(queue)] as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Enqueue"),
    S.Literal("Dequeue"),
    S.Literal("Refine"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Enqueue",
    "Dequeue",
    "Refine",
]

export const CreateCase = S.Union([
    S.Literal("Empty"),
    S.Literal("Iterable"),
    S.Literal("Make"),
    S.Literal("Order"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Empty",
    "Iterable",
    "Make",
    "Order",
]

export const EnqueueCase = S.Union([
    S.Literal("Offer"),
    S.Literal("OfferAll"),
    S.Literal("EqualPriority"),
    S.Literal("Transaction"),
])
export type EnqueueCase = typeof EnqueueCase.Type

export const enqueue_cases: ReadonlyArray<EnqueueCase> = [
    "Offer",
    "OfferAll",
    "EqualPriority",
    "Transaction",
]

export const DequeueCase = S.Union([
    S.Literal("Take"),
    S.Literal("Option"),
    S.Literal("UpTo"),
    S.Literal("All"),
])
export type DequeueCase = typeof DequeueCase.Type

export const dequeue_cases: ReadonlyArray<DequeueCase> = [
    "Take",
    "Option",
    "UpTo",
    "All",
]

export const RefineCase = S.Union([
    S.Literal("Peek"),
    S.Literal("PeekOption"),
    S.Literal("Filter"),
    S.Literal("Array"),
])
export type RefineCase = typeof RefineCase.Type

export const refine_cases: ReadonlyArray<RefineCase> = [
    "Peek",
    "PeekOption",
    "Filter",
    "Array",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    enqueueCase: EnqueueCase,
    dequeueCase: DequeueCase,
    refineCase: RefineCase,
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
        eyebrow: "Order + sorted Chunk + TxRef define queue priority",
        title: "Create a transactional priority queue",
        description:
            "empty, fromIterable, and make create a queue whose immutable Chunk stays sorted according to the supplied Order. That Order defines which element peek and take see first.",
        code: `const queue = yield* TxPriorityQueue.fromIterable(
    Order.Number,
    [3, 1, 2]
)

const values = yield* TxPriorityQueue.toArray(queue)
// [1, 2, 3]`,
        apis: [
            "TxPriorityQueue.empty",
            "TxPriorityQueue.fromIterable",
            "TxPriorityQueue.make",
            "Order.Number",
        ],
        notice: "With Order.Number the smallest number is highest priority because the queue stores values in ascending order. Supply a different Order to redefine priority.",
    },

    Enqueue: {
        eyebrow:
            "offers preserve sorted order inside the same transactional queue",
        title: "Offer one value or many values",
        description:
            "offer inserts one element into its sorted position; offerAll combines the current queue with an iterable and sorts once. Both mutate the same TxPriorityQueue reference transactionally.",
        code: `yield* TxPriorityQueue.offer(queue, 3)
yield* TxPriorityQueue.offer(queue, 1)
yield* TxPriorityQueue.offerAll(queue, [5, 2, 4])

const values = yield* TxPriorityQueue.toArray(queue)
// [1, 2, 3, 4, 5]`,
        apis: [
            "TxPriorityQueue.offer",
            "TxPriorityQueue.offerAll",
            "TxPriorityQueue.toArray",
            "Effect.tx",
        ],
        notice: "offer inserts after existing values that compare equal, so equal-priority offers keep arrival order. Wrap related queue and TxRef changes in one Effect.tx when they form one invariant.",
    },

    Dequeue: {
        eyebrow:
            "retrying and non-retrying dequeue operations share the same priority head",
        title: "Take the next prioritized values",
        description:
            "take removes the current head and retries transactionally when empty. takeOption returns None instead. takeUpTo drains at most n values, while takeAll drains the queue completely.",
        code: `const first = yield* TxPriorityQueue.take(queue)
const next = yield* TxPriorityQueue.takeOption(queue)
const batch = yield* TxPriorityQueue.takeUpTo(queue, 2)
const rest = yield* TxPriorityQueue.takeAll(queue)`,
        apis: [
            "TxPriorityQueue.take",
            "TxPriorityQueue.takeOption",
            "TxPriorityQueue.takeUpTo",
            "TxPriorityQueue.takeAll",
        ],
        notice: "take uses Effect.txRetry when empty: the transaction suspends and can resume after the queue's TxRef changes. takeOption never retries.",
    },

    Refine: {
        eyebrow:
            "observe the priority head, prune values, or leave with a plain array",
        title: "Peek, filter, and snapshot queue state",
        description:
            "peek retries while empty; peekOption returns None. removeIf and retainIf mutate the current queue without disturbing the ordering of survivors. toArray returns the current priority order without removing values.",
        code: `const head = yield* TxPriorityQueue.peekOption(queue)

yield* TxPriorityQueue.removeIf(queue, (n) => n < 0)
yield* TxPriorityQueue.retainIf(queue, (n) => n <= 10)

const snapshot = yield* TxPriorityQueue.toArray(queue)`,
        apis: [
            "TxPriorityQueue.peek",
            "TxPriorityQueue.peekOption",
            "TxPriorityQueue.removeIf",
            "TxPriorityQueue.toArray",
        ],
        notice: "toArray is a plain Array snapshot of the current sorted Chunk. Later offers and takes do not mutate an array you already received.",
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
        case "Empty":
            return {
                input: "Order<A>",
                operation: "TxPriorityQueue.empty(order)",
                result: "empty prioritized queue",
                invariant: "size starts at zero",
                implementation: "Chunk.empty → TxRef.make",
                guidance: "Use when producers will populate the queue later.",
            }
        case "Iterable":
            return {
                input: "Order.Number + [3, 1, 2]",
                operation: "fromIterable(order, values)",
                result: "queue ordered [1, 2, 3]",
                invariant: "construction sorts the whole iterable",
                implementation: "Array.from(...).sort(order) → Chunk → TxRef",
                guidance:
                    "Best default when values already exist in an iterable.",
            }
        case "Make":
            return {
                input: "Order<A> + variadic values",
                operation: "TxPriorityQueue.make(order)(...values)",
                result: "sorted TxPriorityQueue<A>",
                invariant: "make delegates to fromIterable",
                implementation: "curried constructor over fromIterable",
                guidance: "Useful for compact literals and fixtures.",
            }
        case "Order":
            return {
                input: "custom comparison function",
                operation: "construct with custom Order<A>",
                result: "domain-specific priority",
                invariant: "peek/take always use the same stored Order",
                implementation: "ascending sort under ord(a, b)",
                guidance:
                    "Reverse or project your domain values when larger or derived priorities should win.",
            }
    }
}

export const enqueue_snapshot = (model: Model): Snapshot => {
    switch (model.enqueueCase) {
        case "Offer":
            return {
                input: "queue + one value",
                operation: "TxPriorityQueue.offer(queue, value)",
                result: "same queue, newly sorted contents",
                invariant: "one element is inserted in sorted position",
                implementation: "binary-search insertion → TxRef.update",
                guidance: "Use for one producer event at a time.",
            }
        case "OfferAll":
            return {
                input: "queue + Iterable<A>",
                operation: "TxPriorityQueue.offerAll(queue, values)",
                result: "same queue with all values",
                invariant: "combined contents are sorted once",
                implementation: "existing array + iterable → sort → Chunk",
                guidance:
                    "Use for batches instead of repeated individual offers.",
            }
        case "EqualPriority":
            return {
                input: "existing equals + another equal value",
                operation: "offer(queue, equalPriorityValue)",
                result: "new equal goes after existing equals",
                invariant: "arrival order is preserved among equal comparisons",
                implementation:
                    "insertion advances while ord(existing, value) <= 0",
                guidance:
                    "Useful when equal priority should behave FIFO rather than jump ahead.",
            }
        case "Transaction":
            return {
                input: "related queue reads/writes + other Tx state",
                operation: "Effect.tx(Effect.gen(...))",
                result: "one atomic commit",
                invariant: "all steps participate in one transaction",
                implementation: "shared transactional journal across TxRefs",
                guidance:
                    "Use when enqueueing depends on related transactional state or must update it together.",
            }
    }
}

export const dequeue_snapshot = (model: Model): Snapshot => {
    switch (model.dequeueCase) {
        case "Take":
            return {
                input: "possibly empty queue",
                operation: "TxPriorityQueue.take(queue)",
                result: "smallest value under Order",
                invariant: "empty queue triggers txRetry",
                implementation: "head + drop(1) inside Effect.tx",
                guidance:
                    "Use when the consumer should transactionally wait for work.",
            }
        case "Option":
            return {
                input: "possibly empty queue",
                operation: "TxPriorityQueue.takeOption(queue)",
                result: "Option<A>",
                invariant: "None leaves queue unchanged",
                implementation: "TxRef.modify without txRetry",
                guidance:
                    "Use for polling or fallback logic that must not suspend.",
            }
        case "UpTo":
            return {
                input: "queue + maximum n",
                operation: "TxPriorityQueue.takeUpTo(queue, n)",
                result: "Array<A> of up to n items",
                invariant: "result remains in priority order",
                implementation: "Chunk.take + Chunk.drop in one modify",
                guidance: "Useful for bounded batch consumers.",
            }
        case "All":
            return {
                input: "current queue",
                operation: "TxPriorityQueue.takeAll(queue)",
                result: "all values in priority order",
                invariant: "queue is empty afterward",
                implementation: "TxRef.modify swaps current Chunk for empty",
                guidance: "Use to atomically drain all currently queued work.",
            }
    }
}

export const refine_snapshot = (model: Model): Snapshot => {
    switch (model.refineCase) {
        case "Peek":
            return {
                input: "possibly empty queue",
                operation: "TxPriorityQueue.peek(queue)",
                result: "priority head without removal",
                invariant: "empty queue triggers txRetry",
                implementation: "TxRef.get + Chunk.head inside Effect.tx",
                guidance:
                    "Use when downstream logic needs the next value but must not consume it yet.",
            }
        case "PeekOption":
            return {
                input: "possibly empty queue",
                operation: "TxPriorityQueue.peekOption(queue)",
                result: "Option<A>",
                invariant: "queue is never changed",
                implementation: "TxRef.get → Chunk.head",
                guidance: "Use for non-blocking inspection of the head.",
            }
        case "Filter":
            return {
                input: "queue + predicate",
                operation: "removeIf / retainIf",
                result: "same queue with survivors",
                invariant: "survivor ordering stays valid",
                implementation: "Chunk.filter → TxRef.update",
                guidance:
                    "Use removeIf to prune matches or retainIf to keep only matches.",
            }
        case "Array":
            return {
                input: "live queue",
                operation: "TxPriorityQueue.toArray(queue)",
                result: "plain sorted Array snapshot",
                invariant: "nothing is removed",
                implementation: "TxRef.get → Chunk.toArray",
                guidance:
                    "Use when code should leave transactional queue state and inspect ordinary data.",
            }
    }
}

export const current_snapshot = (model: Model): Snapshot => {
    switch (model.stage) {
        case "Create":
            return create_snapshot(model)
        case "Enqueue":
            return enqueue_snapshot(model)
        case "Dequeue":
            return dequeue_snapshot(model)
        case "Refine":
            return refine_snapshot(model)
    }
}

export const initial_model: Model = {
    stage: "Create",
    createCase: "Iterable",
    enqueueCase: "Offer",
    dequeueCase: "Take",
    refineCase: "Peek",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTxPriorityQueueStage: { stage: Stage },
    SelectedTxPriorityQueueCreateCase: { createCase: CreateCase },
    SelectedTxPriorityQueueEnqueueCase: { enqueueCase: EnqueueCase },
    SelectedTxPriorityQueueDequeueCase: { dequeueCase: DequeueCase },
    SelectedTxPriorityQueueRefineCase: { refineCase: RefineCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type EnqueueCasePayload = Readonly<{ enqueueCase: EnqueueCase }>
type DequeueCasePayload = Readonly<{ dequeueCase: DequeueCase }>
type RefineCasePayload = Readonly<{ refineCase: RefineCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTxPriorityQueueStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, { stage: () => stage }),
        }),
        SelectedTxPriorityQueueCreateCase: ({
            createCase,
        }: CreateCasePayload) => ({
            model: modifyFields(model, { createCase: () => createCase }),
        }),
        SelectedTxPriorityQueueEnqueueCase: ({
            enqueueCase,
        }: EnqueueCasePayload) => ({
            model: modifyFields(model, { enqueueCase: () => enqueueCase }),
        }),
        SelectedTxPriorityQueueDequeueCase: ({
            dequeueCase,
        }: DequeueCasePayload) => ({
            model: modifyFields(model, { dequeueCase: () => dequeueCase }),
        }),
        SelectedTxPriorityQueueRefineCase: ({
            refineCase,
        }: RefineCasePayload) => ({
            model: modifyFields(model, { refineCase: () => refineCase }),
        }),
    })
