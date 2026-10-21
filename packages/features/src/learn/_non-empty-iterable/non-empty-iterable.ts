import { Chunk, NonEmptyIterable, Random, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

export const words = Chunk.make("alpha", "beta", "gamma")

export const numbers = Chunk.make(10, 20, 30, 40)

const collect_iterator = <A>(iterator: Iterator<A>): ReadonlyArray<A> =>
    Array.from({
        [Symbol.iterator]: (): Iterator<A> => iterator,
    })

export const split_words = () => {
    const [first, remaining] = NonEmptyIterable.unprepend(words)

    return {
        first,
        rest: collect_iterator(remaining),
    } as const
}

export const sum_non_empty = (
    self: NonEmptyIterable.NonEmptyIterable<number>
): number => {
    let total = 0

    for (const value of self) {
        total += value
    }

    return total
}

export const random_choice_program = Random.choice(words)

export type StringNonEmptyIterable = NonEmptyIterable.NonEmptyIterable<string>

export const Stage = S.Union([
    S.Literal("Guarantee"),
    S.Literal("Split"),
    S.Literal("Iterator"),
    S.Literal("Integrate"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Guarantee",
    "Split",
    "Iterator",
    "Integrate",
]

export const GuaranteeCase = S.Union([
    S.Literal("Brand"),
    S.Literal("Iterable"),
    S.Literal("Types"),
])
export type GuaranteeCase = typeof GuaranteeCase.Type

export const SplitCase = S.Union([
    S.Literal("Head"),
    S.Literal("Tail"),
    S.Literal("Tuple"),
])
export type SplitCase = typeof SplitCase.Type

export const IteratorCase = S.Union([
    S.Literal("Remaining"),
    S.Literal("Consume"),
    S.Literal("OnePass"),
])
export type IteratorCase = typeof IteratorCase.Type

export const IntegrateCase = S.Union([
    S.Literal("Chunk"),
    S.Literal("Random"),
    S.Literal("Generic"),
])
export type IntegrateCase = typeof IntegrateCase.Type

export const Model = S.Struct({
    stage: Stage,
    guaranteeCase: GuaranteeCase,
    splitCase: SplitCase,
    iteratorCase: IteratorCase,
    integrateCase: IntegrateCase,
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
    Guarantee: {
        eyebrow: "an Iterable plus a compile-time non-empty guarantee",
        title: "Require at least one element without changing JavaScript's normal iteration protocol",
        description:
            "NonEmptyIterable<A> extends Iterable<A> and adds a unique-symbol brand at the type level. It can be consumed anywhere an Iterable<A> is expected, while APIs can rely on the stronger guarantee that the first iterator result exists.",
        code: `type Values =
    NonEmptyIterable
        .NonEmptyIterable<
            string
        >

const words =
    Chunk.make(
        "alpha",
        "beta",
        "gamma"
    )

for (
    const word
    of words
) {
    // normal Iterable
}

function firstRequired(
    values: Values
) {
    return NonEmptyIterable
        .unprepend(
            values
        )[0]
}`,
        apis: [
            "NonEmptyIterable.nonEmpty",
            "NonEmptyIterable.NonEmptyIterable",
        ],
        notice: "The nonEmpty unique symbol is a type-level brand declaration. The guarantee is only sound when the producer really cannot be empty; consumers such as unprepend trust that contract.",
    },

    Split: {
        eyebrow: "safe head + remaining iterator",
        title: "Use unprepend to deconstruct a guaranteed non-empty iterable without an Option or empty-case branch",
        description:
            "unprepend calls the iterable's iterator once, reads its first result, then returns that first value together with the same Iterator positioned immediately after it.",
        code: `const [
    first,
    remaining
] =
    NonEmptyIterable
        .unprepend(
            Chunk.make(
                10,
                20,
                30
            )
        )

first
// 10

Array.from({
    [Symbol.iterator]:
        () =>
            remaining
})
// [20, 30]`,
        apis: ["NonEmptyIterable.unprepend"],
        notice: "The return shape is [firstElement, remainingElements]. remainingElements is an Iterator<A>, not a reusable array and not necessarily a fresh Iterable.",
    },

    Iterator: {
        eyebrow: "the tail is the live iterator",
        title: "Understand that the returned remainder continues from the original iterator and is consumed as you read it",
        description:
            "unprepend does not materialize the tail. It hands back the iterator after the first next() call, which preserves laziness and works with arbitrary iterables but also means the returned tail has iterator-style one-pass semantics.",
        code: `const [
    first,
    rest
] =
    NonEmptyIterable
        .unprepend(
            numbers
        )

rest.next()
// { value: 20, done: false }

rest.next()
// { value: 30, done: false }

// reads continue from
// the same iterator`,
        apis: ["NonEmptyIterable.unprepend", "Iterator.next"],
        notice: "If you need a reusable collection, materialize the remaining Iterator yourself. unprepend intentionally avoids copying the tail.",
    },

    Integrate: {
        eyebrow: "stronger types remove downstream empty errors",
        title: "Pass NonEmptyIterable into APIs that can exploit the guarantee, while retaining normal Iterable compatibility",
        description:
            "Effect types such as non-empty Chunk implement NonEmptyIterable. Random.choice uses the stronger input type to produce an infallible Effect, whereas a general Iterable may be empty and therefore carries NoSuchElementError.",
        code: `const words =
    Chunk.make(
        "alpha",
        "beta",
        "gamma"
    )

const choice =
    Random.choice(
        words
    )
// Effect<string>
// no NoSuchElementError

const sum = (
    values:
        NonEmptyIterable
            .NonEmptyIterable<
                number
            >
) => {
    let total = 0

    for (
        const value
        of values
    ) {
        total += value
    }

    return total
}`,
        apis: [
            "Chunk.NonEmptyChunk",
            "Random.choice",
            "NonEmptyIterable.NonEmptyIterable",
        ],
        notice: "The benefit is type propagation: producers that prove non-emptiness let consumers remove impossible empty cases from their error or return types.",
    },
}

export type GuaranteeSnapshot = Readonly<{
    mode: GuaranteeCase
    type: string
    iterable: string
    brand: string
    runtimeWrapper: string
    sample: string
}>

export const guarantee_snapshot = (model: Model): GuaranteeSnapshot => ({
    mode: model.guaranteeCase,
    type: "NonEmptyIterable<A> extends Iterable<A>",
    iterable: "Symbol.iterator still drives ordinary JavaScript iteration",
    brand: "readonly [nonEmpty]: A · unique-symbol type brand",
    runtimeWrapper: "no wrapper allocation required by the interface",
    sample: Array.from(words).join(" · "),
})

export type SplitSnapshot = Readonly<{
    mode: SplitCase
    source: string
    first: string
    rest: string
    returnType: string
}>

export const split_snapshot = (model: Model): SplitSnapshot => {
    const split = split_words()

    return {
        mode: model.splitCase,
        source: Array.from(words).join(" · "),
        first: split.first,
        rest: split.rest.join(" · "),
        returnType: "[firstElement: A, remainingElements: Iterator<A>]",
    }
}

export type IteratorSnapshot = Readonly<{
    mode: IteratorCase
    first: number
    nextOne: string
    nextTwo: string
    remaining: string
    model: string
}>

export const iterator_snapshot = (model: Model): IteratorSnapshot => {
    const [first, iterator] = NonEmptyIterable.unprepend(numbers)

    const nextOne = iterator.next()

    const nextTwo = iterator.next()

    const remaining = collect_iterator(iterator)

    return {
        mode: model.iteratorCase,
        first,
        nextOne: nextOne.done ? "done" : String(nextOne.value),
        nextTwo: nextTwo.done ? "done" : String(nextTwo.value),
        remaining: remaining.length === 0 ? "[]" : remaining.join(" · "),
        model: "same iterator · cursor advances after every next()",
    }
}

export type IntegrateSnapshot = Readonly<{
    mode: IntegrateCase
    chunkType: string
    random: string
    generalIterable: string
    sum: number
    compatibility: string
}>

export const integrate_snapshot = (model: Model): IntegrateSnapshot => ({
    mode: model.integrateCase,
    chunkType: "Chunk.make(...) → NonEmptyChunk<A> → NonEmptyIterable<A>",
    random: "Random.choice(non-empty) → infallible Effect<A>",
    generalIterable:
        "Random.choice(general Iterable) may fail with NoSuchElementError",
    sum: sum_non_empty(numbers),
    compatibility: "NonEmptyIterable can be consumed by ordinary Iterable APIs",
})

export const Message = defineMessageUnion({
    SelectedNonEmptyIterableStage: {
        stage: Stage,
    },
    SelectedNonEmptyIterableGuaranteeCase: {
        guaranteeCase: GuaranteeCase,
    },
    SelectedNonEmptyIterableSplitCase: {
        splitCase: SplitCase,
    },
    SelectedNonEmptyIterableIteratorCase: {
        iteratorCase: IteratorCase,
    },
    SelectedNonEmptyIterableIntegrateCase: {
        integrateCase: IntegrateCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Guarantee",
    guaranteeCase: "Brand",
    splitCase: "Head",
    iteratorCase: "Remaining",
    integrateCase: "Chunk",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type GuaranteeCasePayload = Readonly<{
    guaranteeCase: GuaranteeCase
}>

type SplitCasePayload = Readonly<{
    splitCase: SplitCase
}>

type IteratorCasePayload = Readonly<{
    iteratorCase: IteratorCase
}>

type IntegrateCasePayload = Readonly<{
    integrateCase: IntegrateCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedNonEmptyIterableStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedNonEmptyIterableGuaranteeCase: ({
            guaranteeCase,
        }: GuaranteeCasePayload) => ({
            model: evo(model, {
                guaranteeCase: () => guaranteeCase,
            }),
        }),

        SelectedNonEmptyIterableSplitCase: ({
            splitCase,
        }: SplitCasePayload) => ({
            model: evo(model, {
                splitCase: () => splitCase,
            }),
        }),

        SelectedNonEmptyIterableIteratorCase: ({
            iteratorCase,
        }: IteratorCasePayload) => ({
            model: evo(model, {
                iteratorCase: () => iteratorCase,
            }),
        }),

        SelectedNonEmptyIterableIntegrateCase: ({
            integrateCase,
        }: IntegrateCasePayload) => ({
            model: evo(model, {
                integrateCase: () => integrateCase,
            }),
        }),
    })
