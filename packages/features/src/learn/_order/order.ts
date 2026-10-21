import { Order, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN
// -----------------------------------------------------------------------------

export type Person = Readonly<{
    name: string
    age: number
    active: boolean
}>

export const people: ReadonlyArray<Person> = [
    {
        name: "Ada",
        age: 36,
        active: true,
    },
    {
        name: "Grace",
        age: 36,
        active: false,
    },
    {
        name: "Linus",
        age: 28,
        active: true,
    },
    {
        name: "Alan",
        age: 41,
        active: false,
    },
]

export const by_name: Order.Order<Person> = Order.mapInput(
    Order.String,
    (person: Person): string => person.name
)

export const by_age: Order.Order<Person> = Order.mapInput(
    Order.Number,
    (person: Person): number => person.age
)

export const by_active: Order.Order<Person> = Order.mapInput(
    Order.Boolean,
    (person: Person): boolean => person.active
)

export const by_age_then_name: Order.Order<Person> = Order.combine(
    by_age,
    by_name
)

export const by_struct: Order.Order<Person> = Order.Struct({
    age: Order.Number,
    name: Order.String,
    active: Order.Boolean,
})

export const pair_order = Order.Tuple([Order.Number, Order.String])

export const number_array_order = Order.Array(Order.Number)

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const sort_people = (order: Order.Order<Person>): string =>
    [...people]
        .sort(order)
        .map(
            (person: Person) =>
                `${person.name}:${person.age}:${person.active ? "on" : "off"}`
        )
        .join(" · ")

const compare_text = (value: -1 | 0 | 1): string =>
    value === -1 ? "-1 · less" : value === 0 ? "0 · equal" : "1 · greater"

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Compare"),
    S.Literal("Derive"),
    S.Literal("Compose"),
    S.Literal("Range"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Compare",
    "Derive",
    "Compose",
    "Range",
]

export const CompareCase = S.Union([
    S.Literal("Builtins"),
    S.Literal("Custom"),
    S.Literal("Flip"),
])
export type CompareCase = typeof CompareCase.Type

export const DeriveCase = S.Union([
    S.Literal("MapInput"),
    S.Literal("Date"),
    S.Literal("Sort"),
])
export type DeriveCase = typeof DeriveCase.Type

export const ComposeCase = S.Union([
    S.Literal("Combine"),
    S.Literal("Struct"),
    S.Literal("Collections"),
])
export type ComposeCase = typeof ComposeCase.Type

export const RangeCase = S.Union([
    S.Literal("Predicates"),
    S.Literal("Bounds"),
    S.Literal("Reducer"),
])
export type RangeCase = typeof RangeCase.Type

export const Model = S.Struct({
    stage: Stage,
    compareCase: CompareCase,
    deriveCase: DeriveCase,
    composeCase: ComposeCase,
    rangeCase: RangeCase,
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
    Compare: {
        eyebrow: "total comparison → -1 | 0 | 1",
        title: "Use built-in Orders or define a total comparison explicitly",
        description:
            "Order<A> is a comparator returning -1, 0, or 1. The module ships String, Number, Boolean, BigInt, and Date orders. make adds a reference-equality shortcut before your comparison function, and flip reverses any existing order.",
        code: `Order.String(
    "apple",
    "banana"
)
// -1

Order.Number(
    2,
    2
)
// 0

Order.Boolean(
    false,
    true
)
// -1

const byLength =
    Order.make<
        string
    >(
        (
            self,
            that
        ) =>
            self.length <
                that.length
                ? -1
                : self.length >
                    that.length
                  ? 1
                  : 0
    )

Order.flip(
    Order.Number
)(
    1,
    2
)
// 1`,
        apis: [
            "Order.Order",
            "Order.OrderTypeLambda",
            "Order.make",
            "Order.String",
            "Order.Number",
            "Order.Boolean",
            "Order.BigInt",
            "Order.Date",
            "Order.flip",
            "Order.alwaysEqual",
        ],
        notice: "Order.Number treats all NaN values as equal and orders NaN below every non-NaN number. Equal values must return 0; lawful custom Orders should satisfy totality, antisymmetry, and transitivity.",
    },

    Derive: {
        eyebrow: "compare a larger value by one projection",
        title: "Derive domain Orders from carrier Orders with mapInput",
        description:
            "mapInput adapts Order<A> into Order<B> by projecting B to A. This is the standard way to sort objects by one field without manually writing comparator branches. The resulting Order works directly with JavaScript sort and Effect collection APIs.",
        code: `type Person =
    Readonly<{
        name: string
        age: number
    }>

const byName =
    Order.mapInput(
        Order.String,
        (
            person: Person
        ) =>
            person.name
    )

const byAge =
    Order.mapInput(
        Order.Number,
        (
            person: Person
        ) =>
            person.age
    )

const descendingAge =
    Order.flip(
        byAge
    )`,
        apis: [
            "Order.mapInput",
            "Order.String",
            "Order.Number",
            "Order.Date",
            "Order.flip",
        ],
        notice: "mapInput runs the projection on both compared values. Keep the projection pure so the derived comparator preserves the laws of the carrier Order.",
    },

    Compose: {
        eyebrow: "lexicographic tie-breaking",
        title: "Combine criteria manually or derive tuple, array, and struct ordering",
        description:
            "combine applies the first Order and only uses the second when the first returns 0. combineAll extends that to any finite collection. Tuple and Array compare lexicographically; Struct compares fields in the insertion order of the fields object.",
        code: `const byAgeThenName =
    Order.combine(
        byAge,
        byName
    )

const personOrder =
    Order.Struct({
        age:
            Order.Number,
        name:
            Order.String
    })

const tupleOrder =
    Order.Tuple([
        Order.Number,
        Order.String
    ])

const arrayOrder =
    Order.Array(
        Order.Number
    )`,
        apis: [
            "Order.combine",
            "Order.combineAll",
            "Order.alwaysEqual",
            "Order.Struct",
            "Order.Tuple",
            "Order.Array",
        ],
        notice: "Struct field order matters because earlier fields take precedence. Array compares matching elements first, then uses array length when all shared positions compare equal.",
    },

    Range: {
        eyebrow: "predicates, bounds, and reusable reduction",
        title: "Turn an Order into comparison predicates, extrema, clamping, range checks, or an Order reducer",
        description:
            "The predicate helpers produce dual boolean comparators. min and max select one of two values, clamp restricts a value to inclusive bounds, and isBetween checks the same bounds. makeReducer combines Orders using alwaysEqual as the identity.",
        code: `const lt =
    Order.isLessThan(
        Order.Number
    )

lt(
    1,
    2
)
// true

Order.min(
    Order.Number
)(
    5,
    2
)
// 2

const clamp =
    Order.clamp(
        Order.Number
    )({
        minimum: 10,
        maximum: 20
    })

clamp(
    25
)
// 20

const between =
    Order.isBetween(
        Order.Number
    )({
        minimum: 10,
        maximum: 20
    })

between(
    15
)
// true`,
        apis: [
            "Order.isLessThan",
            "Order.isGreaterThan",
            "Order.isLessThanOrEqualTo",
            "Order.isGreaterThanOrEqualTo",
            "Order.min",
            "Order.max",
            "Order.clamp",
            "Order.isBetween",
            "Order.makeReducer",
        ],
        notice: "clamp and isBetween use inclusive minimum / maximum bounds. min and max return the first argument on ties, which can matter when equal values carry different reference identity.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type CompareSnapshot = Readonly<{
    mode: CompareCase
    string: string
    numberEqual: string
    boolean: string
    bigInt: string
    date: string
    nan: string
    flipped: string
    alwaysEqual: string
}>

export const compare_snapshot = (model: Model): CompareSnapshot => ({
    mode: model.compareCase,
    string: compare_text(Order.String("apple", "banana")),
    numberEqual: compare_text(Order.Number(2, 2)),
    boolean: compare_text(Order.Boolean(false, true)),
    bigInt: compare_text(Order.BigInt(2n, 1n)),
    date: compare_text(
        Order.Date(
            new Date("2026-01-01T00:00:00Z"),
            new Date("2026-02-01T00:00:00Z")
        )
    ),
    nan: compare_text(Order.Number(Number.NaN, 1)),
    flipped: compare_text(Order.flip(Order.Number)(1, 2)),
    alwaysEqual: compare_text(Order.alwaysEqual<string>()("a", "z")),
})

export type DeriveSnapshot = Readonly<{
    mode: DeriveCase
    byName: string
    byAge: string
    byActive: string
    descendingAge: string
    dateProjection: string
}>

export const derive_snapshot = (model: Model): DeriveSnapshot => {
    const descendingAge = Order.flip(by_age)

    const byCreatedAt = Order.mapInput(
        Order.Date,
        (
            value: Readonly<{
                createdAt: Date
            }>
        ): Date => value.createdAt
    )

    return {
        mode: model.deriveCase,
        byName: sort_people(by_name),
        byAge: sort_people(by_age),
        byActive: sort_people(by_active),
        descendingAge: sort_people(descendingAge),
        dateProjection: compare_text(
            byCreatedAt(
                {
                    createdAt: new Date("2026-01-01T00:00:00Z"),
                },
                {
                    createdAt: new Date("2026-01-02T00:00:00Z"),
                }
            )
        ),
    }
}

export type ComposeSnapshot = Readonly<{
    mode: ComposeCase
    ageThenName: string
    struct: string
    tuple: string
    arrayPrefix: string
    arrayLength: string
    combinedAll: string
}>

export const compose_snapshot = (model: Model): ComposeSnapshot => {
    const byAgeNameActive = Order.combineAll([by_age, by_name, by_active])

    return {
        mode: model.composeCase,
        ageThenName: sort_people(by_age_then_name),
        struct: sort_people(by_struct),
        tuple: compare_text(pair_order([1, "b"], [1, "a"])),
        arrayPrefix: compare_text(number_array_order([1, 2], [1, 3])),
        arrayLength: compare_text(number_array_order([1, 2], [1, 2, 3])),
        combinedAll: sort_people(byAgeNameActive),
    }
}

export type RangeSnapshot = Readonly<{
    mode: RangeCase
    less: boolean
    greater: boolean
    lessEqual: boolean
    greaterEqual: boolean
    min: number
    max: number
    clampLow: number
    clampMid: number
    clampHigh: number
    betweenEdge: boolean
    betweenOutside: boolean
    reducer: string
}>

export const range_snapshot = (model: Model): RangeSnapshot => {
    const less = Order.isLessThan(Order.Number)
    const greater = Order.isGreaterThan(Order.Number)
    const lessEqual = Order.isLessThanOrEqualTo(Order.Number)
    const greaterEqual = Order.isGreaterThanOrEqualTo(Order.Number)
    const clamp = Order.clamp(Order.Number)({
        minimum: 10,
        maximum: 20,
    })
    const between = Order.isBetween(Order.Number)({
        minimum: 10,
        maximum: 20,
    })
    const reducer = Order.makeReducer<Person>()
    const reduced = reducer.combineAll([by_age, by_name])

    return {
        mode: model.rangeCase,
        less: less(1, 2),
        greater: greater(3, 2),
        lessEqual: lessEqual(2, 2),
        greaterEqual: greaterEqual(2, 2),
        min: Order.min(Order.Number)(5, 2),
        max: Order.max(Order.Number)(5, 2),
        clampLow: clamp(5),
        clampMid: clamp(15),
        clampHigh: clamp(25),
        betweenEdge: between(10),
        betweenOutside: between(21),
        reducer: sort_people(reduced),
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedOrderStage: {
        stage: Stage,
    },
    SelectedOrderCompareCase: {
        compareCase: CompareCase,
    },
    SelectedOrderDeriveCase: {
        deriveCase: DeriveCase,
    },
    SelectedOrderComposeCase: {
        composeCase: ComposeCase,
    },
    SelectedOrderRangeCase: {
        rangeCase: RangeCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Compare",
    compareCase: "Builtins",
    deriveCase: "MapInput",
    composeCase: "Combine",
    rangeCase: "Predicates",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type CompareCasePayload = Readonly<{
    compareCase: CompareCase
}>

type DeriveCasePayload = Readonly<{
    deriveCase: DeriveCase
}>

type ComposeCasePayload = Readonly<{
    composeCase: ComposeCase
}>

type RangeCasePayload = Readonly<{
    rangeCase: RangeCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedOrderStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedOrderCompareCase: ({ compareCase }: CompareCasePayload) => ({
            model: evo(model, {
                compareCase: () => compareCase,
            }),
        }),

        SelectedOrderDeriveCase: ({ deriveCase }: DeriveCasePayload) => ({
            model: evo(model, {
                deriveCase: () => deriveCase,
            }),
        }),

        SelectedOrderComposeCase: ({ composeCase }: ComposeCasePayload) => ({
            model: evo(model, {
                composeCase: () => composeCase,
            }),
        }),

        SelectedOrderRangeCase: ({ rangeCase }: RangeCasePayload) => ({
            model: evo(model, {
                rangeCase: () => rangeCase,
            }),
        }),
    })
