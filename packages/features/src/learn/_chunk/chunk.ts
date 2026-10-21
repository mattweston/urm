import { Chunk, Match, Option, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Chunk examples
// -----------------------------------------------------------------------------

export const numbers = Chunk.range(1, 5)
// NonEmptyChunk<number> => 1, 2, 3, 4, 5

export const safeSecond = Chunk.get(numbers, 1)
// Option.some(2)

export const safeMissing = Chunk.get(numbers, 99)
// Option.none()

export const first = Chunk.headNonEmpty(numbers)
// 1

export const last = Chunk.lastNonEmpty(numbers)
// 5

export const left = Chunk.make(1, 2, 3)

export const right = Chunk.make(4, 5)

export const concatenated = Chunk.appendAll(left, right)
// Chunk(1, 2, 3, 4, 5)

export const appended = Chunk.append(left, 4)
// NonEmptyChunk(1, 2, 3, 4)

export const taken = Chunk.take(concatenated, 3)
// Chunk(1, 2, 3)

export const dropped = Chunk.drop(concatenated, 3)
// Chunk(4, 5)

export const mapped = Chunk.map(numbers, (n, index) => n * 10 + index)
// NonEmptyChunk(10, 21, 32, 43, 54)

export const expanded = Chunk.flatMap(Chunk.make(1, 2, 3), (n) =>
    Chunk.make(n, n * 10)
)
// NonEmptyChunk(1, 10, 2, 20, 3, 30)

export const evenTimesTen = Chunk.filterMap(numbers, (n) =>
    n % 2 === 0 ? Result.succeed(n * 10) : Result.fail(undefined)
)
// Chunk(20, 40)

export const [oddLabels, evenValues] = Chunk.partition(numbers, (n) =>
    n % 2 === 0 ? Result.succeed(n) : Result.fail(`odd:${n}`)
)
// Chunk("odd:1", "odd:3", "odd:5")
// Chunk(2, 4)

export const chunked = Chunk.chunksOf(numbers, 2)
// Chunk(Chunk(1,2), Chunk(3,4), Chunk(5))

export const adjacent = Chunk.dedupeAdjacent(Chunk.make(1, 1, 2, 2, 2, 3, 1, 1))
// Chunk(1, 2, 3, 1)

export const zipped = Chunk.zipWith(
    Chunk.make(1, 2, 3),
    Chunk.make(10, 20, 30),
    (a, b) => a + b
)
// Chunk(11, 22, 33)

export const union = Chunk.union(Chunk.make(1, 2, 3), Chunk.make(3, 4, 5))
// Chunk(1, 2, 3, 4, 5)

export const intersection = Chunk.intersection(
    Chunk.make(1, 2, 3, 4),
    Chunk.make(3, 4, 5)
)
// Chunk(3, 4)

export const difference = Chunk.difference(
    Chunk.make(1, 2, 3, 4),
    Chunk.make(2, 4)
)
// Chunk(1, 3)

export const total = Chunk.reduce(numbers, 0, (sum, n) => sum + n)
// 15

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Access", "Concat", "Transform", "Shape"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Access",
    "Concat",
    "Transform",
    "Shape",
]

export const AccessMode = S.Literals(["Get", "Ends", "Convert"])
export type AccessMode = typeof AccessMode.Type

export const ConcatMode = S.Literals(["Append", "AppendAll", "Slice"])
export type ConcatMode = typeof ConcatMode.Type

export const TransformMode = S.Literals([
    "Map",
    "FlatMap",
    "FilterMap",
    "Partition",
])
export type TransformMode = typeof TransformMode.Type

export const ShapeMode = S.Literals([
    "Chunks",
    "Dedupe",
    "Zip",
    "Set",
    "Reduce",
])
export type ShapeMode = typeof ShapeMode.Type

export const Model = S.Struct({
    stage: Stage,

    accessMode: AccessMode,
    accessIndex: S.Number,

    concatMode: ConcatMode,

    transformMode: TransformMode,

    shapeMode: ShapeMode,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedChunkStage: {
        stage: Stage,
    },

    SelectedChunkAccessMode: {
        mode: AccessMode,
    },

    SelectedChunkAccessIndex: {
        index: S.Number,
    },

    SelectedChunkConcatMode: {
        mode: ConcatMode,
    },

    SelectedChunkTransformMode: {
        mode: TransformMode,
    },

    SelectedChunkShapeMode: {
        mode: ShapeMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Access",

    accessMode: "Get",
    accessIndex: 1,

    concatMode: "AppendAll",

    transformMode: "Map",

    shapeMode: "Chunks",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedChunkStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedChunkAccessMode: ({ mode }) => ({
            model: evo(model, {
                accessMode: () => mode,
            }),
        }),

        SelectedChunkAccessIndex: ({ index }) => ({
            model: evo(model, {
                accessIndex: () => index,
            }),
        }),

        SelectedChunkConcatMode: ({ mode }) => ({
            model: evo(model, {
                concatMode: () => mode,
            }),
        }),

        SelectedChunkTransformMode: ({ mode }) => ({
            model: evo(model, {
                transformMode: () => mode,
            }),
        }),

        SelectedChunkShapeMode: ({ mode }) => ({
            model: evo(model, {
                shapeMode: () => mode,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

const optionLabel = <A>(value: Option.Option<A>): string =>
    Option.match(value, {
        onNone: () => "Option.none()",
        onSome: (value) => `Option.some(${JSON.stringify(value)})`,
    })

export const sourceValues = Chunk.toArray(numbers)

export const accessResult = (
    model: Model
): Readonly<{
    expression: string
    output: string
    detail: string
}> =>
    Match.value(model.accessMode).pipe(
        Match.when("Get", () => ({
            expression: `Chunk.get(numbers, ${model.accessIndex})`,
            output: optionLabel(Chunk.get(numbers, model.accessIndex)),
            detail: "Safe indexed access returns Option.none() for negative or out-of-bounds indexes.",
        })),
        Match.when("Ends", () => ({
            expression:
                "Chunk.headNonEmpty(numbers) / Chunk.lastNonEmpty(numbers)",
            output: `${Chunk.headNonEmpty(numbers)} · ${Chunk.lastNonEmpty(numbers)}`,
            detail: "Chunk.make/range produce NonEmptyChunk, so headNonEmpty and lastNonEmpty return values directly.",
        })),
        Match.orElse(() => ({
            expression: "Chunk.toArray(numbers)",
            output: JSON.stringify(Chunk.toArray(numbers)),
            detail: "toArray materializes a mutable Array; toReadonlyArray exposes a read-only array view.",
        }))
    )

export const concatResult = (
    mode: ConcatMode
): Readonly<{
    left: ReadonlyArray<number>
    right: ReadonlyArray<number>
    output: ReadonlyArray<number>
    expression: string
    detail: string
}> => {
    switch (mode) {
        case "Append":
            return {
                left: Chunk.toArray(left),
                right: [4],
                output: Chunk.toArray(Chunk.append(left, 4)),
                expression: "Chunk.append(left, 4)",
                detail: "append returns a new NonEmptyChunk; the original left Chunk remains unchanged.",
            }

        case "AppendAll":
            return {
                left: Chunk.toArray(left),
                right: Chunk.toArray(right),
                output: Chunk.toArray(concatenated),
                expression: "Chunk.appendAll(left, right)",
                detail: "Chunk is designed for immutable concatenation: appendAll combines Chunk structure rather than mutating either input.",
            }

        case "Slice":
            return {
                left: Chunk.toArray(concatenated),
                right: [],
                output: Chunk.toArray(Chunk.take(concatenated, 3)),
                expression: "Chunk.take(combined, 3) / Chunk.drop(combined, 3)",
                detail: `take → ${JSON.stringify(Chunk.toArray(taken))} · drop → ${JSON.stringify(Chunk.toArray(dropped))}. Slicing still returns Chunks.`,
            }
    }
}

export const transformResult = (
    mode: TransformMode
): Readonly<{
    expression: string
    source: ReadonlyArray<unknown>
    left: ReadonlyArray<unknown>
    right: ReadonlyArray<unknown>
    detail: string
}> => {
    switch (mode) {
        case "Map":
            return {
                expression: "Chunk.map(numbers, (n, i) => n * 10 + i)",
                source: sourceValues,
                left: Chunk.toArray(mapped),
                right: [],
                detail: "map preserves non-empty information: mapping a NonEmptyChunk returns a NonEmptyChunk.",
            }

        case "FlatMap":
            return {
                expression:
                    "Chunk.flatMap(Chunk.make(1,2,3), n => Chunk.make(n, n*10))",
                source: [1, 2, 3],
                left: Chunk.toArray(expanded),
                right: [],
                detail: "flatMap concatenates the Chunk returned for each input; non-empty source + non-empty outputs preserve NonEmptyChunk.",
            }

        case "FilterMap":
            return {
                expression:
                    "Chunk.filterMap(numbers, n => even ? Success(n*10) : Failure)",
                source: sourceValues,
                left: Chunk.toArray(evenTimesTen),
                right: [],
                detail: "Effect 4 filterMap uses Result: Success values are transformed/kept and Failure values are discarded.",
            }

        case "Partition":
            return {
                expression:
                    "Chunk.partition(numbers, n => even ? Success(n) : Failure(`odd:${n}`))",
                source: sourceValues,
                left: Chunk.toArray(oddLabels),
                right: Chunk.toArray(evenValues),
                detail: "partition keeps both Result channels: failures become the excluded Chunk and successes the satisfying Chunk.",
            }
    }
}

export const shapeResult = (
    mode: ShapeMode
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Chunks":
            return {
                expression: "Chunk.chunksOf(numbers, 2)",
                output: JSON.stringify(
                    Chunk.toArray(chunked).map(Chunk.toArray)
                ),
                detail: "chunksOf returns a Chunk whose elements are Chunks; the final chunk may be smaller.",
            }

        case "Dedupe":
            return {
                expression: "Chunk.dedupeAdjacent(1,1,2,2,2,3,1,1)",
                output: JSON.stringify(Chunk.toArray(adjacent)),
                detail: "dedupeAdjacent removes only neighboring duplicates, unlike dedupe which removes duplicate values globally.",
            }

        case "Zip":
            return {
                expression: "Chunk.zipWith([1,2,3], [10,20,30], (a,b) => a+b)",
                output: JSON.stringify(Chunk.toArray(zipped)),
                detail: "zipWith combines corresponding positions and stops at the shorter Chunk.",
            }

        case "Set":
            return {
                expression: "union / intersection / difference",
                output: `union ${JSON.stringify(Chunk.toArray(union))} · intersection ${JSON.stringify(Chunk.toArray(intersection))} · difference ${JSON.stringify(Chunk.toArray(difference))}`,
                detail: "Set-style helpers return Chunks and preserve the first collection's ordering semantics.",
            }

        case "Reduce":
            return {
                expression: "Chunk.reduce(numbers, 0, (sum, n) => sum + n)",
                output: String(total),
                detail: "reduce folds left-to-right into a plain accumulator value; mapAccum is available when you also need mapped outputs.",
            }
    }
}
