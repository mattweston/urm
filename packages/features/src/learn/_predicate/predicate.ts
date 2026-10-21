import { Predicate, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN PREDICATES / REFINEMENTS
// -----------------------------------------------------------------------------

export const is_positive: Predicate.Predicate<number> = (
    value: number
): boolean => value > 0

export const is_even: Predicate.Predicate<number> = (value: number): boolean =>
    value % 2 === 0

export const is_integer: Predicate.Refinement<number, number> = (
    value: number
): value is number => Number.isInteger(value)

export const is_non_empty_string = Predicate.compose(
    Predicate.isString,
    (value: string): boolean => value.length > 0
)

export const is_string_or_number = Predicate.or(
    Predicate.isString,
    Predicate.isNumber
)

export const is_positive_even = Predicate.and(is_positive, is_even)

export const is_long_string = Predicate.mapInput(
    (value: string): number => value.length
)((length: number): boolean => length >= 5)

export const has_id = Predicate.hasProperty("id")

export const is_ok = Predicate.isTagged("Ok")

export const user_shape = Predicate.Struct({
    id: Predicate.isNumber,
    name: Predicate.isString,
    active: Predicate.isBoolean,
})

export const pair_shape = Predicate.Tuple([
    Predicate.isNumber,
    Predicate.isString,
])

export const all_number_rules = Predicate.every<number>([
    is_positive,
    is_even,
    is_integer,
])

export const some_number_rule = Predicate.some<number>([
    (value: number): boolean => value < 0,
    (value: number): boolean => value > 100,
])

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Guard"),
    S.Literal("Shape"),
    S.Literal("Combine"),
    S.Literal("Refine"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Guard",
    "Shape",
    "Combine",
    "Refine",
]

export const GuardCase = S.Union([
    S.Literal("Primitive"),
    S.Literal("Nullish"),
    S.Literal("Runtime"),
])
export type GuardCase = typeof GuardCase.Type

export const ShapeCase = S.Union([
    S.Literal("Property"),
    S.Literal("Tuple"),
    S.Literal("Struct"),
])
export type ShapeCase = typeof ShapeCase.Type

export const CombineCase = S.Union([
    S.Literal("Boolean"),
    S.Literal("Collections"),
    S.Literal("Projection"),
])
export type CombineCase = typeof CombineCase.Type

export const RefineCase = S.Union([
    S.Literal("Narrow"),
    S.Literal("Compose"),
    S.Literal("Types"),
])
export type RefineCase = typeof RefineCase.Type

export const Model = S.Struct({
    stage: Stage,
    guardCase: GuardCase,
    shapeCase: ShapeCase,
    combineCase: CombineCase,
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
    Guard: {
        eyebrow: "runtime checks that can narrow unknown values",
        title: "Use built-in guards for primitives, nullability, objects, collections, promises, and common JavaScript values",
        description:
            "Predicate includes boolean checks and Refinements. Guards such as isString, isNumber, isDate, isIterable, and isPromiseLike inspect unknown values at runtime and narrow the TypeScript type when they succeed.",
        code: `const input:
    unknown =
    "hello"

if (
    Predicate.isString(
        input
    )
) {
    input.toUpperCase()
}

Predicate.isNotNullish(
    input
)
// true

Predicate.isIterable(
    input
)
// true`,
        apis: [
            "Predicate.isString",
            "Predicate.isNumber",
            "Predicate.isBoolean",
            "Predicate.isBigInt",
            "Predicate.isSymbol",
            "Predicate.isUndefined",
            "Predicate.isNull",
            "Predicate.isNullish",
            "Predicate.isObject",
            "Predicate.isIterable",
            "Predicate.isPromiseLike",
        ],
        notice: 'isNumber uses typeof === "number", so NaN and Infinity still count as numbers. isObject excludes arrays, while isObjectKeyword accepts objects, arrays, and functions but still excludes null.',
    },

    Shape: {
        eyebrow: "structural checks for keys, tags, tuples, and records",
        title: "Lift smaller guards into property, tuple, and object-shape predicates",
        description:
            "hasProperty and isTagged narrow unknown structures. Tuple applies one predicate per tuple position. Struct checks only the declared fields and ignores extra keys. isTupleOf and isTupleOfAtLeast refine arrays by length.",
        code: `const isUser =
    Predicate.Struct({
        id:
            Predicate.isNumber,
        name:
            Predicate.isString,
        active:
            Predicate.isBoolean
    })

isUser({
    id: 1,
    name: "Ada",
    active: true,
    extra: "ignored"
})
// true

const pair =
    Predicate.Tuple([
        Predicate.isNumber,
        Predicate.isString
    ])

pair([
    1,
    "ok"
])
// true`,
        apis: [
            "Predicate.hasProperty",
            "Predicate.isTagged",
            "Predicate.isTupleOf",
            "Predicate.isTupleOfAtLeast",
            "Predicate.Tuple",
            "Predicate.Struct",
        ],
        notice: "Struct validates only the specified fields; it is not an exact-object validator. Tuple applies the supplied predicates position-by-position and short-circuits on the first failure.",
    },

    Combine: {
        eyebrow: "boolean algebra for reusable checks",
        title: "Build larger rules with logical combinators, dynamic predicate collections, or input projection",
        description:
            "not, and, or, xor, eqv, implies, nor, and nand combine predicates. every and some combine dynamic collections with short-circuiting. mapInput adapts a predicate to a larger input by projecting before checking.",
        code: `const positiveEven =
    Predicate.and(
        isPositive,
        isEven
    )

positiveEven(
    4
)
// true

const longString =
    Predicate.mapInput(
        (
            value: string
        ) =>
            value.length
    )(
        (
            length: number
        ) =>
            length >= 5
    )

longString(
    "effect"
)
// true`,
        apis: [
            "Predicate.mapInput",
            "Predicate.not",
            "Predicate.or",
            "Predicate.and",
            "Predicate.xor",
            "Predicate.eqv",
            "Predicate.implies",
            "Predicate.nor",
            "Predicate.nand",
            "Predicate.every",
            "Predicate.some",
        ],
        notice: "and / compose / every stop on the first false; or / some stop on the first true. implies returns true whenever the antecedent is false.",
    },

    Refine: {
        eyebrow: "boolean check + TypeScript narrowing",
        title: "Use Refinement when success should carry a narrower type through control flow and composition",
        description:
            "Predicate<A> returns boolean. Refinement<A, B> returns a is B. compose can progressively narrow from unknown to a subtype, while and/or preserve intersection or union information for refinement inputs.",
        code: `const isNonEmptyString =
    Predicate.compose(
        Predicate.isString,
        (
            value: string
        ) =>
            value.length > 0
    )

const value:
    unknown =
    "effect"

if (
    isNonEmptyString(
        value
    )
) {
    // value is string
    value.toUpperCase()
}

type Input =
    Predicate.Refinement.In<
        typeof Predicate.isString
    >

type Output =
    Predicate.Refinement.Out<
        typeof Predicate.isString
    >`,
        apis: [
            "Predicate.Predicate",
            "Predicate.PredicateTypeLambda",
            "Predicate.Predicate.In",
            "Predicate.Predicate.Any",
            "Predicate.Refinement",
            "Predicate.Refinement.In",
            "Predicate.Refinement.Out",
            "Predicate.Refinement.Any",
            "Predicate.compose",
        ],
        notice: "A plain Predicate cannot narrow TypeScript by itself. Use a Refinement or a built-in type guard when the true branch should change the static type.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type GuardSnapshot = Readonly<{
    mode: GuardCase
    string: boolean
    number: boolean
    nanIsNumber: boolean
    nullish: boolean
    object: boolean
    arrayIsObject: boolean
    arrayIsObjectOrArray: boolean
    functionIsObjectKeyword: boolean
    iterableString: boolean
    promiseLike: boolean
}>

export const guard_snapshot = (model: Model): GuardSnapshot => ({
    mode: model.guardCase,
    string: Predicate.isString("effect"),
    number: Predicate.isNumber(42),
    nanIsNumber: Predicate.isNumber(Number.NaN),
    nullish: Predicate.isNullish(null),
    object: Predicate.isObject({
        a: 1,
    }),
    arrayIsObject: Predicate.isObject([1, 2]),
    arrayIsObjectOrArray: Predicate.isObjectOrArray([1, 2]),
    functionIsObjectKeyword: Predicate.isObjectKeyword(() => 1),
    iterableString: Predicate.isIterable("abc"),
    promiseLike: Predicate.isPromiseLike({
        then: (_onfulfilled: (value: number) => unknown) => Promise.resolve(1),
    }),
})

export type ShapeSnapshot = Readonly<{
    mode: ShapeCase
    hasId: boolean
    hasMissing: boolean
    okTag: boolean
    wrongTag: boolean
    tuple: boolean
    tupleWrong: boolean
    exactTwo: boolean
    atLeastTwo: boolean
    struct: boolean
    extraKeys: string
}>

export const shape_snapshot = (model: Model): ShapeSnapshot => ({
    mode: model.shapeCase,
    hasId: has_id({
        id: 1,
    }),
    hasMissing: has_id({
        name: "Ada",
    }),
    okTag: is_ok({
        _tag: "Ok",
        value: 1,
    }),
    wrongTag: is_ok({
        _tag: "Error",
    }),
    tuple: pair_shape([1, "ok"]),
    tupleWrong: pair_shape([1, 2]),
    exactTwo: Predicate.isTupleOf([1, 2], 2),
    atLeastTwo: Predicate.isTupleOfAtLeast([1, 2, 3], 2),
    struct: user_shape({
        id: 1,
        name: "Ada",
        active: true,
    }),
    extraKeys: "Struct checks declared keys only · extra keys are ignored",
})

export type CombineSnapshot = Readonly<{
    mode: CombineCase
    andTrue: boolean
    andFalse: boolean
    or: boolean
    not: boolean
    xor: boolean
    eqv: boolean
    implies: boolean
    nor: boolean
    nand: boolean
    every: boolean
    some: boolean
    projected: boolean
}>

export const combine_snapshot = (model: Model): CombineSnapshot => ({
    mode: model.combineCase,
    andTrue: is_positive_even(4),
    andFalse: is_positive_even(3),
    or: is_string_or_number("effect"),
    not: Predicate.not(Predicate.isString)(42),
    xor: Predicate.xor(is_positive, is_even)(-2),
    eqv: Predicate.eqv(is_positive, is_even)(2),
    implies: Predicate.implies(
        is_positive,
        (value: number): boolean => value < 10
    )(-5),
    nor: Predicate.nor(is_positive, is_even)(-3),
    nand: Predicate.nand(is_positive, is_even)(4),
    every: all_number_rules(4),
    some: some_number_rule(120),
    projected: is_long_string("effect"),
})

export type RefineSnapshot = Readonly<{
    mode: RefineCase
    predicate: string
    refinement: string
    composeHit: boolean
    composeMiss: boolean
    union: string
    intersection: string
    utilityTypes: string
}>

export const refine_snapshot = (model: Model): RefineSnapshot => ({
    mode: model.refineCase,
    predicate: "Predicate<A>: (a: A) => boolean",
    refinement: "Refinement<A, B extends A>: (a: A) => a is B",
    composeHit: is_non_empty_string("effect"),
    composeMiss: is_non_empty_string(""),
    union: "or(refinementA, refinementB) narrows to A | B",
    intersection: "and(refinementA, refinementB) narrows to A & B",
    utilityTypes: "Predicate.In / Any · Refinement.In / Out / Any",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedPredicateStage: {
        stage: Stage,
    },
    SelectedPredicateGuardCase: {
        guardCase: GuardCase,
    },
    SelectedPredicateShapeCase: {
        shapeCase: ShapeCase,
    },
    SelectedPredicateCombineCase: {
        combineCase: CombineCase,
    },
    SelectedPredicateRefineCase: {
        refineCase: RefineCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Guard",
    guardCase: "Primitive",
    shapeCase: "Property",
    combineCase: "Boolean",
    refineCase: "Narrow",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type GuardCasePayload = Readonly<{
    guardCase: GuardCase
}>

type ShapeCasePayload = Readonly<{
    shapeCase: ShapeCase
}>

type CombineCasePayload = Readonly<{
    combineCase: CombineCase
}>

type RefineCasePayload = Readonly<{
    refineCase: RefineCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedPredicateStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedPredicateGuardCase: ({ guardCase }: GuardCasePayload) => ({
            model: modifyFields(model, {
                guardCase: () => guardCase,
            }),
        }),

        SelectedPredicateShapeCase: ({ shapeCase }: ShapeCasePayload) => ({
            model: modifyFields(model, {
                shapeCase: () => shapeCase,
            }),
        }),

        SelectedPredicateCombineCase: ({
            combineCase,
        }: CombineCasePayload) => ({
            model: modifyFields(model, {
                combineCase: () => combineCase,
            }),
        }),

        SelectedPredicateRefineCase: ({ refineCase }: RefineCasePayload) => ({
            model: modifyFields(model, {
                refineCase: () => refineCase,
            }),
        }),
    })
