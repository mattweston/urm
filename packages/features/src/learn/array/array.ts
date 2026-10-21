import { Array as Arr, Match as M, Option, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Array examples
// -----------------------------------------------------------------------------

export const numbers = Arr.range(1, 5)
// NonEmptyArray<number> => [1, 2, 3, 4, 5]

export const safe_second = Arr.get(numbers, 1)
// Option.some(2)

export const safe_missing = Arr.get(numbers, 99)
// Option.none()

export const first_even = Arr.findFirst(numbers, (n) => n % 2 === 0)
// Option.some(2)

export const mapped = Arr.map(numbers, (n, index) => n * 10 + index)
// [10, 21, 32, 43, 54]

export const expanded = Arr.flatMap([1, 2, 3], (n) => [n, n * 10])
// [1, 10, 2, 20, 3, 30]

export const zipped_sums = Arr.zipWith([1, 2, 3], [10, 20, 30], (a, b) => a + b)
// [11, 22, 33]

export const evens = Arr.filter(numbers, (n) => n % 2 === 0)
// [2, 4]

// filterMap keeps only Result.Success values.
export const even_times_ten = Arr.filterMap(numbers, (n) =>
    n % 2 === 0 ? Result.succeed(n * 10) : Result.fail(undefined)
)
// [20, 40]

// partition keeps both failure and success channels.
export const [odd_labels, even_values] = Arr.partition(numbers, (n) =>
    n % 2 === 0 ? Result.succeed(n) : Result.fail(`odd:${n}`)
)
// [["odd:1", "odd:3", "odd:5"], [2, 4]]

// Structural / grouping helpers.
export const chunks = Arr.chunksOf(numbers, 2)
// [[1,2], [3,4], [5]]

export const windows = Arr.window(numbers, 3)
// Array<[number, number, number]>

export const people = [
    { name: "Ada", team: "A" },
    { name: "Grace", team: "B" },
    { name: "Alan", team: "A" },
] as const

export const by_team = Arr.groupBy(people, (person) => person.team)
// { A: [...], B: [...] }

export const total = Arr.reduce(numbers, 0, (sum, n) => sum + n)
// 15

export const union = Arr.union([1, 2, 3], [3, 4, 5])
// [1, 2, 3, 4, 5]

export const intersection = Arr.intersection([1, 2, 3], [3, 4, 1])
// [1, 3]

export const difference = Arr.difference([1, 2, 3], [2, 3, 4])
// [1]

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Access"),
    S.Literal("Transform"),
    S.Literal("Filter"),
    S.Literal("Shape"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Access",
    "Transform",
    "Filter",
    "Shape",
]

export const AccessMode = S.Union([
    S.Literal("Get"),
    S.Literal("Find"),
    S.Literal("HeadLast"),
])
export type AccessMode = typeof AccessMode.Type

export const TransformMode = S.Union([
    S.Literal("Map"),
    S.Literal("FlatMap"),
    S.Literal("ZipWith"),
])
export type TransformMode = typeof TransformMode.Type

export const FilterMode = S.Union([
    S.Literal("Filter"),
    S.Literal("FilterMap"),
    S.Literal("Partition"),
])
export type FilterMode = typeof FilterMode.Type

export const ShapeMode = S.Union([
    S.Literal("Chunks"),
    S.Literal("Window"),
    S.Literal("GroupBy"),
    S.Literal("Reduce"),
])
export type ShapeMode = typeof ShapeMode.Type

export const Model = S.Struct({
    stage: Stage,

    access_mode: AccessMode,
    access_index: S.Number,

    transform_mode: TransformMode,

    filter_mode: FilterMode,

    shape_mode: ShapeMode,
})
export type Model = typeof Model.Type

export const SelectedArrayStage = taggedStruct("SelectedArrayStage", {
    stage: Stage,
})

export const SelectedArrayAccessMode = taggedStruct("SelectedArrayAccessMode", {
    access_mode: AccessMode,
})

export const SelectedArrayAccessIndex = taggedStruct(
    "SelectedArrayAccessIndex",
    { index: S.Number }
)

export const SelectedArrayTransformMode = taggedStruct(
    "SelectedArrayTransformMode",
    { transform_mode: TransformMode }
)

export const SelectedArrayFilterMode = taggedStruct("SelectedArrayFilterMode", {
    filter_mode: FilterMode,
})

export const SelectedArrayShapeMode = taggedStruct("SelectedArrayShapeMode", {
    shape_mode: ShapeMode,
})

export const Message = S.Union([
    SelectedArrayStage,
    SelectedArrayAccessMode,
    SelectedArrayAccessIndex,
    SelectedArrayTransformMode,
    SelectedArrayFilterMode,
    SelectedArrayShapeMode,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Access",

    access_mode: "Get",
    access_index: 1,

    transform_mode: "Map",

    filter_mode: "Filter",

    shape_mode: "Chunks",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedArrayStage: ({ stage }) => ({
                model: evo(model, {
                    stage: () => stage,
                }),
                commands: [],
            }),

            SelectedArrayAccessMode: ({ access_mode }) => ({
                model: evo(model, {
                    access_mode: () => access_mode,
                }),
                commands: [],
            }),

            SelectedArrayAccessIndex: ({ index }) => ({
                model: evo(model, {
                    access_index: () => index,
                }),
                commands: [],
            }),

            SelectedArrayTransformMode: ({ transform_mode }) => ({
                model: evo(model, {
                    transform_mode: () => transform_mode,
                }),
                commands: [],
            }),

            SelectedArrayFilterMode: ({ filter_mode }) => ({
                model: evo(model, {
                    filter_mode: () => filter_mode,
                }),
                commands: [],
            }),

            SelectedArrayShapeMode: ({ shape_mode }) => ({
                model: evo(model, {
                    shape_mode: () => shape_mode,
                }),
                commands: [],
            }),
        })
    )

export const source_numbers = Arr.range(1, 5)

export const option_label = <A>(option: Option.Option<A>): string =>
    Option.match(option, {
        onNone: () => "Option.none()",
        onSome: (value) => `Option.some(${JSON.stringify(value)})`,
    })

export const access_result = (
    model: Model
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    switch (model.access_mode) {
        case "Get":
            return {
                expression: `Array.get(numbers, ${model.access_index})`,
                output: option_label(
                    Arr.get(source_numbers, model.access_index)
                ),
                detail: "get floors the index and represents out-of-bounds access with Option.none().",
            }

        case "Find":
            return {
                expression: "Array.findFirst(numbers, n => n > 3)",
                output: option_label(
                    Arr.findFirst(source_numbers, (n) => n > 3)
                ),
                detail: "findFirst searches left-to-right and returns Option.some(first match) or None.",
            }

        case "HeadLast":
            return {
                expression: "Array.head(numbers) / Array.last(numbers)",
                output: `${option_label(Arr.head(source_numbers))} · ${option_label(Arr.last(source_numbers))}`,
                detail: "head and last are safe for possibly-empty arrays. NonEmptyArray variants can return values directly.",
            }
    }
}

export const transform_result = (
    mode: TransformMode
): Readonly<{
    left: ReadonlyArray<unknown>
    right: ReadonlyArray<unknown>
    expression: string
    detail: string
}> => {
    switch (mode) {
        case "Map":
            return {
                left: source_numbers,
                right: Arr.map(source_numbers, (n, index) => n * 10 + index),
                expression: "Array.map(numbers, (n, i) => n * 10 + i)",
                detail: "map transforms one element into exactly one element and preserves NonEmptyArray-ness.",
            }

        case "FlatMap":
            return {
                left: [1, 2, 3],
                right: Arr.flatMap([1, 2, 3], (n) => [n, n * 10]),
                expression: "Array.flatMap([1,2,3], n => [n, n*10])",
                detail: "flatMap lets each input produce zero or more outputs, then flattens one level.",
            }

        case "ZipWith":
            return {
                left: [1, 2, 3],
                right: Arr.zipWith([1, 2, 3], [10, 20, 30], (a, b) => a + b),
                expression: "Array.zipWith([1,2,3], [10,20,30], (a,b) => a+b)",
                detail: "zipWith walks two iterables together up to the shorter length and computes one output per pair.",
            }
    }
}

export const filter_result = (
    mode: FilterMode
): Readonly<{
    expression: string
    left: ReadonlyArray<unknown>
    right: ReadonlyArray<unknown>
    detail: string
}> => {
    switch (mode) {
        case "Filter":
            return {
                expression: "Array.filter(numbers, n => n % 2 === 0)",
                left: [],
                right: Arr.filter(source_numbers, (n) => n % 2 === 0),
                detail: "filter keeps original values that satisfy a predicate or refinement.",
            }

        case "FilterMap":
            return {
                expression:
                    "Array.filterMap(numbers, n => even ? Success(n*10) : Failure)",
                left: [],
                right: Arr.filterMap(source_numbers, (n) =>
                    n % 2 === 0
                        ? Result.succeed(n * 10)
                        : Result.fail(undefined)
                ),
                detail: "filterMap transforms and filters in one pass: Success values are kept, Failure values are discarded.",
            }

        case "Partition": {
            const [excluded, satisfying] = Arr.partition(source_numbers, (n) =>
                n % 2 === 0 ? Result.succeed(n) : Result.fail(`odd:${n}`)
            )

            return {
                expression:
                    "Array.partition(numbers, n => even ? Success(n) : Failure(`odd:${n}`))",
                left: excluded,
                right: satisfying,
                detail: "partition keeps both channels: Result failures go left and successes go right.",
            }
        }
    }
}

export const shape_result = (
    mode: ShapeMode
): Readonly<{
    expression: string
    output: unknown
    detail: string
}> => {
    switch (mode) {
        case "Chunks":
            return {
                expression: "Array.chunksOf(numbers, 2)",
                output: Arr.chunksOf(source_numbers, 2),
                detail: "chunksOf creates non-overlapping NonEmptyArray chunks; the final chunk may be smaller.",
            }

        case "Window":
            return {
                expression: "Array.window(numbers, 3)",
                output: Arr.window(source_numbers, 3),
                detail: "window creates overlapping windows. With a literal size 3, each output is typed as a 3-element tuple.",
            }

        case "GroupBy":
            return {
                expression: "Array.groupBy(people, person => person.team)",
                output: Arr.groupBy(people, (person) => person.team),
                detail: "groupBy collects all elements by a string/symbol key; each group is NonEmptyArray because the key exists only after an element creates it.",
            }

        case "Reduce":
            return {
                expression: "Array.reduce(numbers, 0, (sum, n) => sum + n)",
                output: Arr.reduce(source_numbers, 0, (sum, n) => sum + n),
                detail: "reduce folds left-to-right into one accumulator; scan is the related API when you also want intermediate totals.",
            }
    }
}
