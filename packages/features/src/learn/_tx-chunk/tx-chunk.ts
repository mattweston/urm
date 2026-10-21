import { Chunk, Effect, Schema as S, TxChunk, TxRef } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TXCHUNK PROGRAMS
// -----------------------------------------------------------------------------

export const seed_chunk = Chunk.fromIterable([1, 2, 3])

export const create_program = Effect.gen(function* () {
    const txChunk = yield* TxChunk.fromIterable([1, 2, 3])
    return yield* TxChunk.get(txChunk)
})

export const append_program = Effect.gen(function* () {
    const txChunk = yield* TxChunk.fromIterable([1, 2, 3])
    yield* TxChunk.append(txChunk, 4)
    return yield* TxChunk.get(txChunk)
})

export const modify_program = Effect.gen(function* () {
    const txChunk = yield* TxChunk.fromIterable([1, 2, 3])
    const oldSize = yield* TxChunk.modify(
        txChunk,
        (current: Chunk.Chunk<number>) => [
            Chunk.size(current),
            Chunk.append(current, 4),
        ]
    )
    const next = yield* TxChunk.get(txChunk)
    return [oldSize, next] as const
})

export const slice_program = Effect.gen(function* () {
    const txChunk = yield* TxChunk.fromIterable([1, 2, 3, 4, 5, 6])
    yield* TxChunk.slice(txChunk, 1, 4)
    return yield* TxChunk.get(txChunk)
})

export const filter_program = Effect.gen(function* () {
    const txChunk = yield* TxChunk.fromIterable([1, 2, 3, 4, 5, 6])
    yield* TxChunk.filter(txChunk, (n: number) => n % 2 === 0)
    return yield* TxChunk.get(txChunk)
})

export const transaction_program = Effect.gen(function* () {
    const txChunk = yield* TxChunk.fromIterable([1, 2, 3])

    yield* Effect.tx(
        Effect.gen(function* () {
            yield* TxChunk.prepend(txChunk, 0)
            yield* TxChunk.append(txChunk, 4)
        })
    )

    return yield* TxChunk.get(txChunk)
})

export const concat_program = Effect.gen(function* () {
    const left = yield* TxChunk.fromIterable([1, 2, 3])
    const right = yield* TxChunk.fromIterable([4, 5, 6])
    yield* TxChunk.concat(left, right)
    return [yield* TxChunk.get(left), yield* TxChunk.get(right)] as const
})

export const unsafe_tx_chunk = TxChunk.makeUnsafe(
    TxRef.makeUnsafe(Chunk.fromIterable([10, 20, 30]))
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Mutate"),
    S.Literal("Slice"),
    S.Literal("Compose"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Mutate",
    "Slice",
    "Compose",
]

export const CreateCase = S.Union([
    S.Literal("Iterable"),
    S.Literal("Empty"),
    S.Literal("Chunk"),
    S.Literal("Unsafe"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Iterable",
    "Empty",
    "Chunk",
    "Unsafe",
]

export const MutateCase = S.Union([
    S.Literal("Append"),
    S.Literal("Prepend"),
    S.Literal("Set"),
    S.Literal("Modify"),
])
export type MutateCase = typeof MutateCase.Type

export const mutate_cases: ReadonlyArray<MutateCase> = [
    "Append",
    "Prepend",
    "Set",
    "Modify",
]

export const SliceCase = S.Union([
    S.Literal("Take"),
    S.Literal("Drop"),
    S.Literal("Slice"),
    S.Literal("Filter"),
])
export type SliceCase = typeof SliceCase.Type

export const slice_cases: ReadonlyArray<SliceCase> = [
    "Take",
    "Drop",
    "Slice",
    "Filter",
]

export const ComposeCase = S.Union([
    S.Literal("Map"),
    S.Literal("AppendAll"),
    S.Literal("Concat"),
    S.Literal("Transaction"),
])
export type ComposeCase = typeof ComposeCase.Type

export const compose_cases: ReadonlyArray<ComposeCase> = [
    "Map",
    "AppendAll",
    "Concat",
    "Transaction",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    mutateCase: MutateCase,
    sliceCase: SliceCase,
    composeCase: ComposeCase,
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
        eyebrow: "transactional chunk state · backed by TxRef",
        title: "Create a mutable chunk inside transactional state",
        description:
            "TxChunk wraps a TxRef<Chunk<A>>. Constructors build the transactional reference; reads and later updates participate in Effect transactions rather than returning persistent TxChunk versions.",
        code: `const txChunk = yield* TxChunk.fromIterable([
    1,
    2,
    3
])

const current = yield* TxChunk.get(txChunk)`,
        apis: [
            "TxChunk.fromIterable",
            "TxChunk.make",
            "TxChunk.empty",
            "TxChunk.makeUnsafe",
        ],
        notice: "TxChunk is mutable transactional state. Keep the live TxChunk out of a serializable Foldkit model and store only UI selections there.",
    },

    Mutate: {
        eyebrow: "single operations commit transactionally",
        title: "Append, prepend, replace, update, or modify",
        description:
            "Each combinator delegates to the underlying TxRef and runs transactionally. modify is the most general primitive: compute a return value and the replacement Chunk from one current snapshot.",
        code: `const oldSize = yield* TxChunk.modify(
    txChunk,
    (chunk) => [
        Chunk.size(chunk),
        Chunk.append(chunk, 4)
    ]
)`,
        apis: [
            "TxChunk.append",
            "TxChunk.prepend",
            "TxChunk.set",
            "TxChunk.update",
            "TxChunk.modify",
        ],
        notice: "These functions mutate the same TxChunk reference. Their transactionality protects the stored Chunk; it does not create a new TxChunk value as Trie-style persistent updates do.",
    },

    Slice: {
        eyebrow: "chunk transforms update the stored value in place",
        title: "Keep, discard, slice, and filter atomically",
        description:
            "take, drop, slice, map, and filter are transactional updates over the current Chunk. slice uses an exclusive end index, matching the ordinary Chunk slicing model.",
        code: `yield* TxChunk.slice(txChunk, 1, 4)
// keep indexes 1, 2, 3

yield* TxChunk.filter(
    txChunk,
    (n) => n % 2 === 0
)`,
        apis: [
            "TxChunk.take",
            "TxChunk.drop",
            "TxChunk.slice",
            "TxChunk.filter",
            "TxChunk.size",
        ],
        notice: "map must preserve the element type A because it updates the existing TxChunk<A>; use a separate transactional structure when the element type itself must change.",
    },

    Compose: {
        eyebrow: "group multiple reads and writes with Effect.tx",
        title: "Compose chunk operations into one atomic transaction",
        description:
            "Single TxChunk calls are transactional already. Wrap a multi-step invariant in Effect.tx so all accessed transactional values are validated and committed together. concat already does this internally for its read-plus-append sequence.",
        code: `yield* Effect.tx(
    Effect.gen(function*() {
        yield* TxChunk.prepend(txChunk, 0)
        yield* TxChunk.append(txChunk, 4)
    })
)`,
        apis: [
            "Effect.tx",
            "TxChunk.appendAll",
            "TxChunk.prependAll",
            "TxChunk.concat",
            "TxChunk.map",
        ],
        notice: "Use explicit Effect.tx for multi-operation invariants. Transaction conflicts retry the composed transaction rather than exposing a partially committed sequence.",
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
        case "Iterable":
            return {
                input: "Iterable<number> · [1, 2, 3]",
                operation: "TxChunk.fromIterable(...) ",
                result: "Effect<TxChunk<number>>",
                invariant: "initial Chunk lives inside transactional state",
                implementation: "TxRef.make(Chunk.fromIterable(...))",
                guidance:
                    "Use fromIterable for ordinary JS arrays and other iterables.",
            }
        case "Empty":
            return {
                input: "no initial elements",
                operation: "TxChunk.empty<number>()",
                result: "empty TxChunk<number>",
                invariant: "isEmpty reads transactionally",
                implementation: "TxRef.make(Chunk.empty())",
                guidance:
                    "Use empty when the collection will be populated transactionally later.",
            }
        case "Chunk":
            return {
                input: "Chunk<number>",
                operation: "TxChunk.make(chunk)",
                result: "TxChunk<number>",
                invariant:
                    "constructor stores the supplied Chunk as one TxRef value",
                implementation: "Effect.map(TxRef.make(initial), makeUnsafe)",
                guidance:
                    "Use make when you already have a Chunk rather than a generic iterable.",
            }
        case "Unsafe":
            return {
                input: "existing TxRef<Chunk<A>>",
                operation: "TxChunk.makeUnsafe(ref)",
                result: "TxChunk<A> wrapper",
                invariant: "the supplied TxRef becomes the backing state",
                implementation: "attaches the TxChunk marker and ref",
                guidance:
                    "Reserve makeUnsafe for controlled construction and advanced integration.",
            }
    }
}

export const mutate_snapshot = (model: Model): Snapshot => {
    switch (model.mutateCase) {
        case "Append":
            return {
                input: "[1, 2, 3] + 4",
                operation: "TxChunk.append(txChunk, 4)",
                result: "stored Chunk = [1, 2, 3, 4]",
                invariant: "updates the same TxChunk reference",
                implementation:
                    "update(current => Chunk.append(current, element))",
                guidance:
                    "Use append for one value and appendAll for a whole Chunk.",
            }
        case "Prepend":
            return {
                input: "[2, 3, 4] + 1",
                operation: "TxChunk.prepend(txChunk, 1)",
                result: "stored Chunk = [1, 2, 3, 4]",
                invariant: "single write is transactional",
                implementation: "update(current => Chunk.prepend(...))",
                guidance:
                    "Use prepend when front insertion is part of the transactional state update.",
            }
        case "Set":
            return {
                input: "replacement Chunk [10, 20]",
                operation: "TxChunk.set(txChunk, replacement)",
                result: "old contents replaced",
                invariant: "set replaces the entire TxRef value",
                implementation: "TxRef.set(self.ref, chunk)",
                guidance:
                    "Use set when the next complete Chunk is already known.",
            }
        case "Modify":
            return {
                input: "current Chunk",
                operation: "modify(chunk => [result, nextChunk])",
                result: "custom result + committed new Chunk",
                invariant:
                    "result and next state derive from one transactional snapshot",
                implementation: "delegates to TxRef.modify",
                guidance:
                    "Use modify when an update must also return metadata such as the previous size.",
            }
    }
}

export const slice_snapshot = (model: Model): Snapshot => {
    switch (model.sliceCase) {
        case "Take":
            return {
                input: "[1, 2, 3, 4, 5] · n = 3",
                operation: "TxChunk.take(txChunk, 3)",
                result: "[1, 2, 3]",
                invariant: "stored chunk is replaced with the leading segment",
                implementation: "Chunk.take inside update",
                guidance:
                    "Use take to retain only a leading transactional window.",
            }
        case "Drop":
            return {
                input: "[1, 2, 3, 4, 5] · n = 2",
                operation: "TxChunk.drop(txChunk, 2)",
                result: "[3, 4, 5]",
                invariant: "first n elements are discarded atomically",
                implementation: "Chunk.drop inside update",
                guidance:
                    "Use drop for queue-like leading removal when a Chunk representation is still appropriate.",
            }
        case "Slice":
            return {
                input: "[1, 2, 3, 4, 5] · 1..4",
                operation: "TxChunk.slice(txChunk, 1, 4)",
                result: "[2, 3, 4]",
                invariant: "end index is exclusive",
                implementation:
                    "Chunk.drop(start) then Chunk.take(end - start)",
                guidance:
                    "Use slice when both start and end boundaries matter.",
            }
        case "Filter":
            return {
                input: "[1, 2, 3, 4, 5, 6]",
                operation: "TxChunk.filter(txChunk, isEven)",
                result: "[2, 4, 6]",
                invariant:
                    "non-matching elements are removed from the stored Chunk",
                implementation: "Chunk.filter inside update",
                guidance:
                    "Filter may use a refinement, but the TxChunk's declared element type remains A.",
            }
    }
}

export const compose_snapshot = (model: Model): Snapshot => {
    switch (model.composeCase) {
        case "Map":
            return {
                input: "TxChunk<number>",
                operation: "TxChunk.map(txChunk, n => n * 2)",
                result: "same TxChunk<number>, transformed contents",
                invariant: "map is same-type only",
                implementation: "Chunk.map inside TxRef update",
                guidance:
                    "Use map for same-type normalization or arithmetic transforms.",
            }
        case "AppendAll":
            return {
                input: "TxChunk + ordinary Chunk",
                operation: "appendAll / prependAll",
                result: "combined contents in self",
                invariant: "the input Chunk is immutable and unchanged",
                implementation: "Chunk.appendAll / prependAll inside update",
                guidance:
                    "Use these when the other side is already an ordinary Chunk.",
            }
        case "Concat":
            return {
                input: "left TxChunk + right TxChunk",
                operation: "TxChunk.concat(left, right)",
                result: "right appended into left",
                invariant: "right TxChunk remains unchanged",
                implementation: "read right + appendAll left inside Effect.tx",
                guidance:
                    "concat is the TxChunk-to-TxChunk combination primitive and is atomic across both references.",
            }
        case "Transaction":
            return {
                input: "multiple TxChunk operations",
                operation: "Effect.tx(Effect.gen(...))",
                result: "one atomic multi-step commit",
                invariant: "no partial commit of the grouped invariant",
                implementation:
                    "STM validation/retry over accessed transactional refs",
                guidance:
                    "Use explicit transactions for invariants spanning multiple reads/writes or multiple transactional structures.",
            }
    }
}

export const initial_model: Model = {
    stage: "Create",
    createCase: "Iterable",
    mutateCase: "Append",
    sliceCase: "Slice",
    composeCase: "Transaction",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTxChunkStage: { stage: Stage },
    SelectedTxChunkCreateCase: { createCase: CreateCase },
    SelectedTxChunkMutateCase: { mutateCase: MutateCase },
    SelectedTxChunkSliceCase: { sliceCase: SliceCase },
    SelectedTxChunkComposeCase: { composeCase: ComposeCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type MutateCasePayload = Readonly<{ mutateCase: MutateCase }>
type SliceCasePayload = Readonly<{ sliceCase: SliceCase }>
type ComposeCasePayload = Readonly<{ composeCase: ComposeCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTxChunkStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, { stage: () => stage }),
        }),
        SelectedTxChunkCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: modifyFields(model, { createCase: () => createCase }),
        }),
        SelectedTxChunkMutateCase: ({ mutateCase }: MutateCasePayload) => ({
            model: modifyFields(model, { mutateCase: () => mutateCase }),
        }),
        SelectedTxChunkSliceCase: ({ sliceCase }: SliceCasePayload) => ({
            model: modifyFields(model, { sliceCase: () => sliceCase }),
        }),
        SelectedTxChunkComposeCase: ({ composeCase }: ComposeCasePayload) => ({
            model: modifyFields(model, { composeCase: () => composeCase }),
        }),
    })
