import { Ordering, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL ORDERING HELPERS
// -----------------------------------------------------------------------------

export const compare_number = (self: number, that: number): Ordering.Ordering =>
    self < that ? -1 : self > that ? 1 : 0

export const ordering_label = (ordering: Ordering.Ordering): string =>
    Ordering.match(ordering, {
        onLessThan: () => "less than",
        onEqual: () => "equal",
        onGreaterThan: () => "greater than",
    })

export const compare_descending = (
    self: number,
    that: number
): Ordering.Ordering => Ordering.reverse(compare_number(self, that))

export const compare_person = (
    self: Readonly<{
        age: number
        name: string
    }>,
    that: Readonly<{
        age: number
        name: string
    }>
): Ordering.Ordering =>
    Ordering.Reducer.combineAll([
        compare_number(self.age, that.age),
        self.name < that.name ? -1 : self.name > that.name ? 1 : 0,
    ])

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Values"),
    S.Literal("Reverse"),
    S.Literal("Match"),
    S.Literal("Reduce"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Values",
    "Reverse",
    "Match",
    "Reduce",
]

export const ValuesCase = S.Union([
    S.Literal("Less"),
    S.Literal("Equal"),
    S.Literal("Greater"),
])
export type ValuesCase = typeof ValuesCase.Type

export const ReverseCase = S.Union([
    S.Literal("Less"),
    S.Literal("Equal"),
    S.Literal("Greater"),
])
export type ReverseCase = typeof ReverseCase.Type

export const MatchCase = S.Union([
    S.Literal("DataFirst"),
    S.Literal("DataLast"),
    S.Literal("Branches"),
])
export type MatchCase = typeof MatchCase.Type

export const ReduceCase = S.Union([
    S.Literal("Combine"),
    S.Literal("CombineAll"),
    S.Literal("Priority"),
])
export type ReduceCase = typeof ReduceCase.Type

export const Model = S.Struct({
    stage: Stage,
    valuesCase: ValuesCase,
    reverseCase: ReverseCase,
    matchCase: MatchCase,
    reduceCase: ReduceCase,
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
    Values: {
        eyebrow: "normalized comparison result",
        title: "Represent less-than, equal, or greater-than with exactly -1, 0, or 1",
        description:
            "Ordering.Ordering is the result type used by Effect Order comparators. It intentionally contains only three values, making comparison outcomes exhaustive and easy to pass between sorting, branching, and tie-breaking logic.",
        code: `const compareNumber = (
    self: number,
    that: number
): Ordering.Ordering =>
    self < that
        ? -1
        : self > that
          ? 1
          : 0

compareNumber(
    1,
    2
)
// -1

compareNumber(
    2,
    2
)
// 0

compareNumber(
    3,
    2
)
// 1`,
        apis: ["Ordering.Ordering"],
        notice: "Ordering is the result value; Order<A> is the comparator function that produces it. Keep that distinction clear when composing comparison logic.",
    },

    Reverse: {
        eyebrow: "invert one comparison result",
        title: "Flip less-than and greater-than while leaving equality unchanged",
        description:
            "reverse maps -1 to 1, 1 to -1, and 0 to 0. It is useful when a comparison has already been computed and only its direction needs to change.",
        code: `Ordering.reverse(
    -1
)
// 1

Ordering.reverse(
    0
)
// 0

Ordering.reverse(
    1
)
// -1

const descending = (
    self: number,
    that: number
) =>
    Ordering.reverse(
        compareNumber(
            self,
            that
        )
    )`,
        apis: ["Ordering.reverse"],
        notice: "Order.flip reverses a whole comparator; Ordering.reverse reverses one already-computed comparison result. They operate at different levels.",
    },

    Match: {
        eyebrow: "exhaustive three-way branching",
        title: "Match all three outcomes without numeric conditionals at each call site",
        description:
            "match selects one lazy branch for -1, 0, or 1. The handlers may return different types, and the result becomes their union. The function supports both data-first and data-last forms.",
        code: `const toMessage =
    Ordering.match({
        onLessThan:
            () =>
                "less than",
        onEqual:
            () =>
                "equal",
        onGreaterThan:
            () =>
                "greater than"
    })

toMessage(
    -1
)
// "less than"

Ordering.match(
    1,
    {
        onLessThan:
            () => "l",
        onEqual:
            () => "e",
        onGreaterThan:
            () => "g"
    }
)
// "g"`,
        apis: ["Ordering.match"],
        notice: "Branches are lazy callbacks. Only the handler selected by the Ordering is evaluated.",
    },

    Reduce: {
        eyebrow: "first non-zero comparison wins",
        title: "Combine prioritized comparison results with the exported Reducer",
        description:
            "Ordering.Reducer uses 0 as its identity. combine keeps the first non-zero Ordering; combineAll scans in priority order and stops as soon as it finds a non-zero result. This is raw tie-breaking logic beneath multi-criteria ordering.",
        code: `Ordering.Reducer.combine(
    0,
    1
)
// 1

Ordering.Reducer.combine(
    -1,
    1
)
// -1

Ordering.Reducer.combineAll([
    0,
    0,
    1,
    -1
])
// 1

const comparePerson = (
    self,
    that
) =>
    Ordering.Reducer.combineAll([
        compareNumber(
            self.age,
            that.age
        ),
        self.name < that.name
            ? -1
            : self.name > that.name
              ? 1
              : 0
    ])`,
        apis: ["Ordering.Reducer", "Reducer.combine", "Reducer.combineAll"],
        notice: "combineAll short-circuits on the first non-zero Ordering, so later criteria are not consumed once an earlier criterion decides the result.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type ValuesSnapshot = Readonly<{
    mode: ValuesCase
    less: string
    equal: string
    greater: string
    domain: string
    orderRelationship: string
}>

export const values_snapshot = (model: Model): ValuesSnapshot => ({
    mode: model.valuesCase,
    less: `${compare_number(1, 2)} · less`,
    equal: `${compare_number(2, 2)} · equal`,
    greater: `${compare_number(3, 2)} · greater`,
    domain: "Ordering = -1 | 0 | 1",
    orderRelationship: "Order<A> compares A × A and returns Ordering",
})

export type ReverseSnapshot = Readonly<{
    mode: ReverseCase
    less: string
    equal: string
    greater: string
    ascending: string
    descending: string
}>

export const reverse_snapshot = (model: Model): ReverseSnapshot => ({
    mode: model.reverseCase,
    less: `reverse(-1) = ${Ordering.reverse(-1)}`,
    equal: `reverse(0) = ${Ordering.reverse(0)}`,
    greater: `reverse(1) = ${Ordering.reverse(1)}`,
    ascending: `${compare_number(1, 2)} · 1 before 2`,
    descending: `${compare_descending(1, 2)} · 1 after 2`,
})

export type MatchSnapshot = Readonly<{
    mode: MatchCase
    less: string
    equal: string
    greater: string
    dataFirst: string
    dataLast: string
    laziness: string
}>

export const match_snapshot = (model: Model): MatchSnapshot => {
    const dataLast = Ordering.match({
        onLessThan: () => "L",
        onEqual: () => "E",
        onGreaterThan: () => "G",
    })

    return {
        mode: model.matchCase,
        less: ordering_label(-1),
        equal: ordering_label(0),
        greater: ordering_label(1),
        dataFirst: Ordering.match(1, {
            onLessThan: () => "L",
            onEqual: () => "E",
            onGreaterThan: () => "G",
        }),
        dataLast: dataLast(-1),
        laziness: "only the selected branch callback runs",
    }
}

export type ReduceSnapshot = Readonly<{
    mode: ReduceCase
    identity: number
    zeroThenOne: number
    firstNonZero: number
    allZero: number
    sequence: number
    personAgeWins: string
    personNameBreaksTie: string
}>

export const reduce_snapshot = (model: Model): ReduceSnapshot => ({
    mode: model.reduceCase,
    identity: Ordering.Reducer.initialValue,
    zeroThenOne: Ordering.Reducer.combine(0, 1),
    firstNonZero: Ordering.Reducer.combine(-1, 1),
    allZero: Ordering.Reducer.combineAll([0, 0, 0]),
    sequence: Ordering.Reducer.combineAll([0, 0, 1, -1]),
    personAgeWins: `${compare_person(
        {
            age: 20,
            name: "Zed",
        },
        {
            age: 30,
            name: "Ada",
        }
    )} · age decides`,
    personNameBreaksTie: `${compare_person(
        {
            age: 30,
            name: "Ada",
        },
        {
            age: 30,
            name: "Grace",
        }
    )} · name breaks tie`,
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedOrderingStage: {
        stage: Stage,
    },
    SelectedOrderingValuesCase: {
        valuesCase: ValuesCase,
    },
    SelectedOrderingReverseCase: {
        reverseCase: ReverseCase,
    },
    SelectedOrderingMatchCase: {
        matchCase: MatchCase,
    },
    SelectedOrderingReduceCase: {
        reduceCase: ReduceCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Values",
    valuesCase: "Less",
    reverseCase: "Less",
    matchCase: "DataLast",
    reduceCase: "Combine",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ValuesCasePayload = Readonly<{
    valuesCase: ValuesCase
}>

type ReverseCasePayload = Readonly<{
    reverseCase: ReverseCase
}>

type MatchCasePayload = Readonly<{
    matchCase: MatchCase
}>

type ReduceCasePayload = Readonly<{
    reduceCase: ReduceCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedOrderingStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedOrderingValuesCase: ({ valuesCase }: ValuesCasePayload) => ({
            model: modifyFields(model, {
                valuesCase: () => valuesCase,
            }),
        }),

        SelectedOrderingReverseCase: ({ reverseCase }: ReverseCasePayload) => ({
            model: modifyFields(model, {
                reverseCase: () => reverseCase,
            }),
        }),

        SelectedOrderingMatchCase: ({ matchCase }: MatchCasePayload) => ({
            model: modifyFields(model, {
                matchCase: () => matchCase,
            }),
        }),

        SelectedOrderingReduceCase: ({ reduceCase }: ReduceCasePayload) => ({
            model: modifyFields(model, {
                reduceCase: () => reduceCase,
            }),
        }),
    })
