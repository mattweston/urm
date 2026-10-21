import { Iterable as EffectIterable, Option, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Lazy"),
    S.Literal("Search"),
    S.Literal("Fold"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = ["Create", "Lazy", "Search", "Fold"]

export const CreateCase = S.Union([
    S.Literal("Range"),
    S.Literal("Generate"),
    S.Literal("Repeat"),
    S.Literal("Unfold"),
])
export type CreateCase = typeof CreateCase.Type

export const LazyCase = S.Union([
    S.Literal("Pipeline"),
    S.Literal("Combine"),
    S.Literal("Chunk"),
])
export type LazyCase = typeof LazyCase.Type

export const SearchCase = S.Union([
    S.Literal("Find"),
    S.Literal("Group"),
    S.Literal("Extract"),
])
export type SearchCase = typeof SearchCase.Type

export const FoldCase = S.Union([
    S.Literal("Reduce"),
    S.Literal("Scan"),
    S.Literal("Product"),
])
export type FoldCase = typeof FoldCase.Type

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    lazyCase: LazyCase,
    searchCase: SearchCase,
    foldCase: FoldCase,
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
        eyebrow: "construct reusable sequences",
        title: "Create finite or infinite Iterables without materializing arrays",
        description:
            "range, makeBy, replicate, repeat, forever, unfold, of, empty, and fromRecord all return ordinary JavaScript Iterables. Infinite constructors stay safe when downstream operations such as take bound consumption.",
        code: `const naturals =
    EffectIterable.range(1)

const firstFive =
    EffectIterable.take(
        naturals,
        5
    )

Array.from(firstFive)
// [1, 2, 3, 4, 5]

const fibonacci =
    EffectIterable.unfold(
        [0, 1] as const,
        ([a, b]) =>
            Option.some([
                a,
                [b, a + b] as const
            ] as const)
    )`,
        apis: [
            "Iterable.empty",
            "Iterable.of",
            "Iterable.makeBy",
            "Iterable.range",
            "Iterable.replicate",
            "Iterable.repeat",
            "Iterable.forever",
            "Iterable.unfold",
            "Iterable.fromRecord",
        ],
        notice: "Several count-like constructor arguments are normalized rather than rejected. Unbounded range / forever values are lazy, so pair them with take or another terminating consumer before materializing.",
    },

    Lazy: {
        eyebrow: "transform without eager arrays",
        title: "Map, filter, sequence, slice, and combine lazily",
        description:
            "Most combinators return a fresh Iterable whose source is consumed only when iterated. Pipelines can map, filter, flatten, take, drop, chunk, append, prepend, intersperse, or zip while retaining Iterable semantics.",
        code: `let visited = 0

const pipeline =
    EffectIterable.map(
        EffectIterable.filter(
            EffectIterable.range(1),
            (value: number) => {
                visited++
                return value % 2 === 0
            }
        ),
        (
            value: number
        ) => value * 10
    )

visited
// 0

Array.from(
    EffectIterable.take(
        pipeline,
        3
    )
)
// [20, 40, 60]`,
        apis: [
            "Iterable.map",
            "Iterable.filter",
            "Iterable.filterMap",
            "Iterable.filterMapWhile",
            "Iterable.flatMap",
            "Iterable.flatMapNullishOr",
            "Iterable.flatten",
            "Iterable.take",
            "Iterable.takeWhile",
            "Iterable.drop",
            "Iterable.chunksOf",
            "Iterable.append",
            "Iterable.appendAll",
            "Iterable.prepend",
            "Iterable.prependAll",
            "Iterable.intersperse",
            "Iterable.zip",
            "Iterable.zipWith",
        ],
        notice: "Laziness affects side effects and infinite inputs. append / appendAll cannot reach their suffix until the first iterable finishes; zip stops as soon as either side is exhausted.",
    },

    Search: {
        eyebrow: "inspect + classify",
        title: "Search safely, test membership, group runs, and extract Option / Result values",
        description:
            "head and find operations return Option, contains can use Effect equality or a custom equivalence, group and dedupe operate on adjacent runs, while groupBy classifies all values by a string or symbol key.",
        code: `const values =
    [1, 1, 2, 2, 3, 1]

Array.from(
    EffectIterable.group(values)
)
// [[1,1], [2,2], [3], [1]]

Array.from(
    EffectIterable
        .dedupeAdjacent(values)
)
// [1, 2, 3, 1]

EffectIterable.findFirst(
    values,
    (value: number) =>
        value > 2
)
// Some(3)`,
        apis: [
            "Iterable.head",
            "Iterable.headUnsafe",
            "Iterable.findFirst",
            "Iterable.findLast",
            "Iterable.contains",
            "Iterable.containsWith",
            "Iterable.some",
            "Iterable.isEmpty",
            "Iterable.size",
            "Iterable.group",
            "Iterable.groupWith",
            "Iterable.groupBy",
            "Iterable.dedupeAdjacent",
            "Iterable.dedupeAdjacentWith",
            "Iterable.getSomes",
            "Iterable.getFailures",
            "Iterable.getSuccesses",
        ],
        notice: "group and dedupeAdjacent only compare neighboring elements: a matching value that appears later starts a new run. groupBy is the operation that brings non-consecutive values into one keyed bucket.",
    },

    Fold: {
        eyebrow: "consume or combine",
        title: "Fold to a value, keep running state, traverse effects, or form pair combinations",
        description:
            "reduce, countBy, and forEach consume an iterable; scan remains lazy and emits every accumulator state. Cartesian helpers form all cross-pairs, while zip-style helpers combine corresponding positions.",
        code: `const running =
    EffectIterable.scan(
        [1, 2, 3, 4],
        0,
        (
            sum: number,
            value: number
        ) => sum + value
    )

Array.from(running)
// [0, 1, 3, 6, 10]

EffectIterable.reduce(
    [1, 2, 3, 4],
    0,
    (
        sum: number,
        value: number
    ) => sum + value
)
// 10`,
        apis: [
            "Iterable.reduce",
            "Iterable.scan",
            "Iterable.countBy",
            "Iterable.forEach",
            "Iterable.cartesian",
            "Iterable.cartesianWith",
            "Iterable.zip",
            "Iterable.zipWith",
        ],
        notice: "scan includes the initial accumulator before consuming the first element. cartesian creates every left/right pair; zip is positional and ends at the shorter iterable.",
    },
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const option_number = (value: Option.Option<number>): string =>
    Option.match(value, {
        onNone: () => "None",
        onSome: (number: number) => `Some(${number})`,
    })

const option_string = (value: Option.Option<string>): string =>
    Option.match(value, {
        onNone: () => "None",
        onSome: (text: string) => `Some(${JSON.stringify(text)})`,
    })

const rows = <A>(iterable: Iterable<A>, format: (value: A) => string): string =>
    Array.from(iterable)
        .map((value: A) => format(value))
        .join(", ")

// -----------------------------------------------------------------------------
// CREATE SNAPSHOT
// -----------------------------------------------------------------------------

export type CreateSnapshot = Readonly<{
    mode: CreateCase
    primary: string
    secondary: string
    finite: string
    infiniteBounded: string
    recordEntries: string
    emptySize: number
}>

export const create_snapshot = (model: Model): CreateSnapshot => {
    const recordEntries = Array.from(
        EffectIterable.fromRecord({
            alpha: 1,
            beta: 2,
        })
    )
        .map((entry: [string, number]) => `${entry[0]}=${entry[1]}`)
        .join(" · ")

    if (model.createCase === "Generate") {
        const squares = EffectIterable.makeBy(
            (index: number) => index * index,
            {
                length: 5,
            }
        )

        return {
            mode: model.createCase,
            primary: rows(squares, (value: number) => String(value)),
            secondary: rows(
                EffectIterable.of("only"),
                (value: string) => value
            ),
            finite: "makeBy length=5",
            infiniteBounded: rows(
                EffectIterable.take(
                    EffectIterable.makeBy((index: number) => index * 3),
                    4
                ),
                (value: number) => String(value)
            ),
            recordEntries,
            emptySize: EffectIterable.size(EffectIterable.empty<number>()),
        }
    }

    if (model.createCase === "Repeat") {
        return {
            mode: model.createCase,
            primary: rows(
                EffectIterable.replicate("x", 4),
                (value: string) => value
            ),
            secondary: rows(EffectIterable.repeat([1, 2], 3), (value: number) =>
                String(value)
            ),
            finite: "replicate + repeat",
            infiniteBounded: rows(
                EffectIterable.take(EffectIterable.forever(["A", "B"]), 5),
                (value: string) => value
            ),
            recordEntries,
            emptySize: 0,
        }
    }

    if (model.createCase === "Unfold") {
        const fibonacci = EffectIterable.unfold(
            [0, 1] as const,
            (state: readonly [number, number]) => {
                const [left, right] = state

                return Option.some([
                    left,
                    [right, left + right] as const,
                ] as const)
            }
        )

        return {
            mode: model.createCase,
            primary: rows(EffectIterable.take(fibonacci, 8), (value: number) =>
                String(value)
            ),
            secondary: "state → Option<[value, nextState]>",
            finite: "termination controlled by Option.none",
            infiniteBounded: "0, 1, 1, 2, 3, 5, 8, 13",
            recordEntries,
            emptySize: 0,
        }
    }

    return {
        mode: model.createCase,
        primary: rows(EffectIterable.range(3, 7), (value: number) =>
            String(value)
        ),
        secondary: rows(EffectIterable.range(5, 2), (value: number) =>
            String(value)
        ),
        finite: "inclusive endpoints; descending request yields start only",
        infiniteBounded: rows(
            EffectIterable.take(EffectIterable.range(10), 5),
            (value: number) => String(value)
        ),
        recordEntries,
        emptySize: 0,
    }
}

// -----------------------------------------------------------------------------
// LAZY SNAPSHOT
// -----------------------------------------------------------------------------

export type LazySnapshot = Readonly<{
    mode: LazyCase
    beforeConsumption: number
    afterConsumption: number
    output: string
    secondary: string
    detail: string
}>

export const lazy_snapshot = (model: Model): LazySnapshot => {
    if (model.lazyCase === "Combine") {
        const appended = EffectIterable.append(
            EffectIterable.prepend([2, 3], 1),
            4
        )

        const interspersed = EffectIterable.intersperse(["a", "b", "c"], "|")

        const zipped = EffectIterable.zipWith(
            [1, 2, 3],
            [10, 20],
            (left: number, right: number) => left + right
        )

        return {
            mode: model.lazyCase,
            beforeConsumption: 0,
            afterConsumption: 0,
            output: rows(appended, (value: number) => String(value)),
            secondary: `intersperse=${rows(interspersed, (value: string) => value)} · zipWith=${rows(zipped, (value: number) => String(value))}`,
            detail: "zip stops at shorter side",
        }
    }

    if (model.lazyCase === "Chunk") {
        const chunks = EffectIterable.chunksOf(EffectIterable.range(1, 7), 3)

        const flat = EffectIterable.flatten([[1, 2], [], [3, 4]])

        return {
            mode: model.lazyCase,
            beforeConsumption: 0,
            afterConsumption: 0,
            output: Array.from(chunks)
                .map((chunk: Array<number>) => `[${chunk.join(", ")}]`)
                .join(" · "),
            secondary: rows(flat, (value: number) => String(value)),
            detail: "chunksOf normalizes size to at least 1",
        }
    }

    let visited = 0

    const filtered = EffectIterable.filter(
        EffectIterable.range(1),
        (value: number) => {
            visited++
            return value % 2 === 0
        }
    )

    const mapped = EffectIterable.map(filtered, (value: number) => value * 10)

    const beforeConsumption = visited

    const output = Array.from(EffectIterable.take(mapped, 3))

    const afterConsumption = visited

    const parsed = EffectIterable.flatMapNullishOr(
        ["1", "x", "3"],
        (text: string) => {
            const value = Number(text)

            return Number.isNaN(value) ? undefined : value
        }
    )

    return {
        mode: model.lazyCase,
        beforeConsumption,
        afterConsumption,
        output: output.join(", "),
        secondary: `flatMapNullishOr=${rows(parsed, (value: number) => String(value))}`,
        detail: "filter / map performed no work until take was consumed",
    }
}

// -----------------------------------------------------------------------------
// SEARCH SNAPSHOT
// -----------------------------------------------------------------------------

export type SearchSnapshot = Readonly<{
    mode: SearchCase
    head: string
    first: string
    last: string
    contains: boolean
    customContains: boolean
    grouped: string
    groupBy: string
    deduped: string
    extracted: string
}>

export const search_snapshot = (model: Model): SearchSnapshot => {
    const numbers = [1, 1, 2, 2, 3, 1]

    const grouped = Array.from(EffectIterable.group(numbers))
        .map((group: [number, ...Array<number>]) => `[${group.join(",")}]`)
        .join(" ")

    const byParity = EffectIterable.groupBy(numbers, (value: number) =>
        value % 2 === 0 ? "even" : "odd"
    )

    const customContains = EffectIterable.containsWith<string>(
        (left: string, right: string) =>
            left.toLowerCase() === right.toLowerCase()
    )(["Hello", "World"], "hello")

    const options: ReadonlyArray<Option.Option<number>> = [
        Option.some(1),
        Option.none(),
        Option.some(3),
    ]

    const results: ReadonlyArray<Result.Result<number, string>> = [
        Result.succeed(2),
        Result.fail("bad"),
        Result.succeed(4),
    ]

    const extracted =
        model.searchCase === "Extract"
            ? `Somes=${rows(EffectIterable.getSomes(options), (value: number) => String(value))} · Successes=${rows(EffectIterable.getSuccesses(results), (value: number) => String(value))} · Failures=${rows(EffectIterable.getFailures(results), (value: string) => value)}`
            : `size=${EffectIterable.size(numbers)} · empty=${EffectIterable.isEmpty([])}`

    return {
        mode: model.searchCase,
        head: option_number(EffectIterable.head(numbers)),
        first: option_number(
            EffectIterable.findFirst(numbers, (value: number) => value > 2)
        ),
        last: option_number(
            EffectIterable.findLast(numbers, (value: number) => value === 1)
        ),
        contains: EffectIterable.contains(numbers, 3),
        customContains,
        grouped,
        groupBy: JSON.stringify(byParity),
        deduped: rows(EffectIterable.dedupeAdjacent(numbers), (value: number) =>
            String(value)
        ),
        extracted,
    }
}

// -----------------------------------------------------------------------------
// FOLD SNAPSHOT
// -----------------------------------------------------------------------------

export type FoldSnapshot = Readonly<{
    mode: FoldCase
    reduced: number
    scan: string
    countBy: number
    visited: string
    cartesian: string
    zipped: string
}>

export const fold_snapshot = (model: Model): FoldSnapshot => {
    const input = [1, 2, 3, 4]

    const reduced = EffectIterable.reduce(
        input,
        0,
        (sum: number, value: number) => sum + value
    )

    const scan = EffectIterable.scan(
        input,
        0,
        (sum: number, value: number) => sum + value
    )

    const countBy = EffectIterable.countBy(
        input,
        (value: number) => value % 2 === 0
    )

    const visited: Array<string> = []

    EffectIterable.forEach(["a", "b", "c"], (value: string, index: number) => {
        visited.push(`${index}:${value}`)
    })

    const cartesian = EffectIterable.cartesianWith(
        [1, 2],
        ["a", "b"],
        (left: number, right: string) => `${left}${right}`
    )

    const zipped = EffectIterable.zip([1, 2, 3], ["a", "b"])

    return {
        mode: model.foldCase,
        reduced,
        scan: rows(scan, (value: number) => String(value)),
        countBy,
        visited: visited.join(" · "),
        cartesian: rows(cartesian, (value: string) => value),
        zipped: Array.from(zipped)
            .map((pair: [number, string]) => `${pair[0]}:${pair[1]}`)
            .join(" · "),
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedIterableStage: {
        stage: Stage,
    },
    SelectedIterableCreateCase: {
        createCase: CreateCase,
    },
    SelectedIterableLazyCase: {
        lazyCase: LazyCase,
    },
    SelectedIterableSearchCase: {
        searchCase: SearchCase,
    },
    SelectedIterableFoldCase: {
        foldCase: FoldCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Create",
    createCase: "Range",
    lazyCase: "Pipeline",
    searchCase: "Find",
    foldCase: "Reduce",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type CreateCasePayload = Readonly<{
    createCase: CreateCase
}>

type LazyCasePayload = Readonly<{
    lazyCase: LazyCase
}>

type SearchCasePayload = Readonly<{
    searchCase: SearchCase
}>

type FoldCasePayload = Readonly<{
    foldCase: FoldCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedIterableStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedIterableCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: evo(model, {
                createCase: () => createCase,
            }),
        }),

        SelectedIterableLazyCase: ({ lazyCase }: LazyCasePayload) => ({
            model: evo(model, {
                lazyCase: () => lazyCase,
            }),
        }),

        SelectedIterableSearchCase: ({ searchCase }: SearchCasePayload) => ({
            model: evo(model, {
                searchCase: () => searchCase,
            }),
        }),

        SelectedIterableFoldCase: ({ foldCase }: FoldCasePayload) => ({
            model: evo(model, {
                foldCase: () => foldCase,
            }),
        }),
    })
