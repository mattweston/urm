import { MutableList, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const list_text = <A>(list: MutableList.MutableList<A>): string =>
    MutableList.toArray(list)
        .map((value: A) => String(value))
        .join(" · ")

const take_text = <A>(value: A | MutableList.Empty): string =>
    value === MutableList.Empty ? "Empty" : String(value)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Queue"),
    S.Literal("Batch"),
    S.Literal("Filter"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Queue",
    "Batch",
    "Filter",
]

export const BuildCase = S.Union([
    S.Literal("Make"),
    S.Literal("Append"),
    S.Literal("Prepend"),
])
export type BuildCase = typeof BuildCase.Type

export const QueueCase = S.Union([
    S.Literal("Take"),
    S.Literal("Empty"),
    S.Literal("Snapshot"),
])
export type QueueCase = typeof QueueCase.Type

export const BatchCase = S.Union([
    S.Literal("AppendAll"),
    S.Literal("TakeN"),
    S.Literal("Unsafe"),
])
export type BatchCase = typeof BatchCase.Type

export const FilterCase = S.Union([
    S.Literal("Filter"),
    S.Literal("Remove"),
    S.Literal("Clear"),
])
export type FilterCase = typeof FilterCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    queueCase: QueueCase,
    batchCase: BatchCase,
    filterCase: FilterCase,
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
    Build: {
        eyebrow: "ordered mutable linked buckets",
        title: "Append at the tail or prepend at the head while one length field stays current",
        description:
            "MutableList is an in-place ordered collection backed by linked Bucket nodes. make starts empty, append adds to the tail, prepend adds to the head, and the public length field tracks the number of live elements.",
        code: `const list =
    MutableList.make<
        number
    >()

MutableList.append(
    list,
    2
)

MutableList.prepend(
    list,
    1
)

MutableList.append(
    list,
    3
)

MutableList.toArray(
    list
)
// [1, 2, 3]

list.length
// 3`,
        apis: [
            "MutableList.MutableList",
            "MutableList.MutableList.Bucket",
            "MutableList.make",
            "MutableList.append",
            "MutableList.prepend",
        ],
        notice: "The current implementation groups values into Bucket arrays linked through next pointers. head, tail, and length are public, but normal code should prefer the collection operations instead of mutating buckets directly.",
    },

    Queue: {
        eyebrow: "non-blocking front consumption",
        title: "Take from the front, detect an empty list with a unique symbol, or snapshot without consuming",
        description:
            "take removes one value from the head and returns MutableList.Empty when nothing is available. toArray / toArrayN copy values without mutation, while takeAll drains the whole list.",
        code: `const list =
    MutableList.make<
        string
    >()

MutableList.appendAll(
    list,
    [
        "first",
        "second"
    ]
)

MutableList.take(
    list
)
// "first"

MutableList.toArray(
    list
)
// ["second"]

MutableList.takeAll(
    list
)
// ["second"]

MutableList.take(
    list
) ===
    MutableList.Empty
// true`,
        apis: [
            "MutableList.Empty",
            "MutableList.Empty",
            "MutableList.take",
            "MutableList.takeAll",
            "MutableList.toArray",
            "MutableList.toArrayN",
        ],
        notice: "Unlike Effect Queue.take, MutableList.take never suspends. Empty is an immediate sentinel result, making MutableList a low-level synchronous buffer rather than a concurrent back-pressured Queue.",
    },

    Batch: {
        eyebrow: "bulk prepend / append / drain",
        title: "Move batches efficiently, normalize bounded counts, and optionally transfer array ownership",
        description:
            "appendAll and prependAll accept any iterable. takeN removes up to a normalized count, takeNVoid discards without returning values, and the Unsafe bulk variants can reuse a ReadonlyArray directly when ownership is transferred.",
        code: `const list =
    MutableList.make<
        number
    >()

MutableList.appendAll(
    list,
    [3, 4, 5]
)

MutableList.prependAll(
    list,
    [1, 2]
)

MutableList.takeN(
    list,
    2.9
)
// [1, 2]

MutableList.takeNVoid(
    list,
    1
)
// discards 3

MutableList.toArray(
    list
)
// [4, 5]`,
        apis: [
            "MutableList.prependAll",
            "MutableList.prependAllUnsafe",
            "MutableList.appendAll",
            "MutableList.appendAllUnsafe",
            "MutableList.takeN",
            "MutableList.takeNVoid",
        ],
        notice: "Finite fractional bounds are floored. NaN and non-positive bounds act like zero. For *Unsafe(..., mutable: true), ownership of the supplied array transfers to the list—do not read or mutate it afterward.",
    },

    Filter: {
        eyebrow: "in-place selection + removal",
        title: "Filter the list in place, remove all strictly equal values, or reset to an empty state",
        description:
            "filter rebuilds the live contents from matching values and updates length. If nothing matches it calls clear so head and tail become undefined. remove is implemented through filter using JavaScript strict equality.",
        code: `const list =
    MutableList.make<
        string
    >()

MutableList.appendAll(
    list,
    [
        "apple",
        "banana",
        "apple",
        "cherry"
    ]
)

MutableList.remove(
    list,
    "apple"
)

MutableList.toArray(
    list
)
// ["banana", "cherry"]

MutableList.filter(
    list,
    () => false
)

list.length
// 0`,
        apis: ["MutableList.filter", "MutableList.remove", "MutableList.clear"],
        notice: "remove uses !==, not Effect Equal.equals. For object values it therefore removes the exact reference only. The July 2026 v4 beta update specifically fixed filter's all-removed empty-state handling.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    mode: BuildCase
    initial: string
    afterAppend: string
    afterPrepend: string
    final: string
    length: number
    head: string
    tail: string
}>

export const build_snapshot = (model: Model): BuildSnapshot => {
    const list = MutableList.make<number>()

    const initial = list_text(list)

    MutableList.append(list, 2)

    const afterAppend = list_text(list)

    MutableList.prepend(list, 1)

    const afterPrepend = list_text(list)

    MutableList.append(list, 3)

    return {
        mode: model.buildCase,
        initial: initial === "" ? "[]" : initial,
        afterAppend,
        afterPrepend,
        final: list_text(list),
        length: list.length,
        head:
            list.head === undefined
                ? "undefined"
                : `Bucket(offset=${list.head.offset}, size=${list.head.array.length})`,
        tail:
            list.tail === undefined
                ? "undefined"
                : `Bucket(offset=${list.tail.offset}, size=${list.tail.array.length})`,
    }
}

export type QueueSnapshot = Readonly<{
    mode: QueueCase
    before: string
    first: string
    afterTake: string
    snapshotOne: string
    unchangedAfterSnapshot: string
    all: string
    emptyResult: string
    finalLength: number
}>

export const queue_snapshot = (model: Model): QueueSnapshot => {
    const list = MutableList.make<string>()

    MutableList.appendAll(list, ["first", "second", "third"])

    const before = list_text(list)

    const first = MutableList.take(list)

    const afterTake = list_text(list)

    const snapshotOne = MutableList.toArrayN(list, 1).join(" · ")

    const unchangedAfterSnapshot = list_text(list)

    const all = MutableList.takeAll(list).join(" · ")

    const emptyResult = take_text(MutableList.take(list))

    return {
        mode: model.queueCase,
        before,
        first: take_text(first),
        afterTake,
        snapshotOne,
        unchangedAfterSnapshot,
        all,
        emptyResult,
        finalLength: list.length,
    }
}

export type BatchSnapshot = Readonly<{
    mode: BatchCase
    appendCount: number
    afterPrepend: string
    takeFraction: string
    afterTake: string
    afterDiscard: string
    nanTake: string
    nanUnchanged: string
    unsafeRule: string
}>

export const batch_snapshot = (model: Model): BatchSnapshot => {
    const list = MutableList.make<number>()

    const appendCount = MutableList.appendAll(list, [3, 4, 5])

    MutableList.prependAll(list, [1, 2])

    const afterPrepend = list_text(list)

    const takeFraction = MutableList.takeN(list, 2.9).join(" · ")

    const afterTake = list_text(list)

    MutableList.takeNVoid(list, 1.9)

    const afterDiscard = list_text(list)

    const nanList = MutableList.make<number>()

    MutableList.appendAll(nanList, [7, 8])

    const nanTake = MutableList.takeN(nanList, Number.NaN).join(" · ")

    return {
        mode: model.batchCase,
        appendCount,
        afterPrepend,
        takeFraction,
        afterTake,
        afterDiscard,
        nanTake: nanTake === "" ? "[]" : nanTake,
        nanUnchanged: list_text(nanList),
        unsafeRule:
            "mutable=true transfers ownership of the supplied array to the list",
    }
}

export type FilterSnapshot = Readonly<{
    mode: FilterCase
    before: string
    evens: string
    evenLength: number
    removeAllMatches: string
    objectStrictEquality: string
    clearedLength: number
    clearedHead: string
    clearedTail: string
}>

export const filter_snapshot = (model: Model): FilterSnapshot => {
    const numbers = MutableList.make<number>()

    MutableList.appendAll(numbers, [1, 2, 3, 4, 5, 6])

    const before = list_text(numbers)

    MutableList.filter(numbers, (value: number): boolean => value % 2 === 0)

    const evens = list_text(numbers)

    const words = MutableList.make<string>()

    MutableList.appendAll(words, [
        "apple",
        "banana",
        "apple",
        "cherry",
        "apple",
    ])

    MutableList.remove(words, "apple")

    const firstObject = {
        id: 1,
    }
    const equalShape = {
        id: 1,
    }

    const objects =
        MutableList.make<
            Readonly<{
                id: number
            }>
        >()

    MutableList.append(objects, firstObject)

    MutableList.remove(objects, equalShape)

    const objectStrictEquality = `remaining=${objects.length} (different reference)`

    MutableList.filter(numbers, (_value: number): boolean => false)

    return {
        mode: model.filterCase,
        before,
        evens,
        evenLength: 3,
        removeAllMatches: list_text(words),
        objectStrictEquality,
        clearedLength: numbers.length,
        clearedHead: numbers.head === undefined ? "undefined" : "Bucket",
        clearedTail: numbers.tail === undefined ? "undefined" : "Bucket",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedMutableListStage: {
        stage: Stage,
    },
    SelectedMutableListBuildCase: {
        buildCase: BuildCase,
    },
    SelectedMutableListQueueCase: {
        queueCase: QueueCase,
    },
    SelectedMutableListBatchCase: {
        batchCase: BatchCase,
    },
    SelectedMutableListFilterCase: {
        filterCase: FilterCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Make",
    queueCase: "Take",
    batchCase: "AppendAll",
    filterCase: "Filter",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type QueueCasePayload = Readonly<{
    queueCase: QueueCase
}>

type BatchCasePayload = Readonly<{
    batchCase: BatchCase
}>

type FilterCasePayload = Readonly<{
    filterCase: FilterCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedMutableListStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedMutableListBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: modifyFields(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedMutableListQueueCase: ({ queueCase }: QueueCasePayload) => ({
            model: modifyFields(model, {
                queueCase: () => queueCase,
            }),
        }),

        SelectedMutableListBatchCase: ({ batchCase }: BatchCasePayload) => ({
            model: modifyFields(model, {
                batchCase: () => batchCase,
            }),
        }),

        SelectedMutableListFilterCase: ({ filterCase }: FilterCasePayload) => ({
            model: modifyFields(model, {
                filterCase: () => filterCase,
            }),
        }),
    })
