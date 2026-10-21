import { Equivalence, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN TYPES
// -----------------------------------------------------------------------------

export type User = Readonly<{
    id: number
    name: string
    email: string
}>

export type Person = Readonly<{
    name: string
    age: number
}>

const case_insensitive_string = Equivalence.mapInput(
    Equivalence.String,
    (value: string) => value.toLowerCase()
)

const person_name_equivalence = Equivalence.mapInput(
    case_insensitive_string,
    (person: Person) => person.name
)

const person_age_equivalence = Equivalence.mapInput(
    Equivalence.Number,
    (person: Person) => person.age
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Primitives"),
    S.Literal("Derive"),
    S.Literal("Shapes"),
    S.Literal("Combine"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Primitives",
    "Derive",
    "Shapes",
    "Combine",
]

export const PrimitiveCase = S.Union([
    S.Literal("NumberNaN"),
    S.Literal("StrictNaN"),
    S.Literal("Date"),
    S.Literal("Tolerance"),
])
export type PrimitiveCase = typeof PrimitiveCase.Type

export const DeriveCase = S.Union([
    S.Literal("UserId"),
    S.Literal("CaseInsensitive"),
    S.Literal("NormalizeEmail"),
])
export type DeriveCase = typeof DeriveCase.Type

export const ShapeCase = S.Union([
    S.Literal("Tuple"),
    S.Literal("Array"),
    S.Literal("Struct"),
    S.Literal("Record"),
])
export type ShapeCase = typeof ShapeCase.Type

export const CombineCase = S.Union([
    S.Literal("Two"),
    S.Literal("Many"),
    S.Literal("Reducer"),
    S.Literal("Empty"),
])
export type CombineCase = typeof CombineCase.Type

export const Model = S.Struct({
    stage: Stage,
    primitiveCase: PrimitiveCase,
    deriveCase: DeriveCase,
    shapeCase: ShapeCase,
    combineCase: CombineCase,
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
    Primitives: {
        eyebrow: "base relations",
        title: "Choose the equality law you actually mean",
        description:
            "Equivalence is a reusable comparison function for one type. Built-in instances cover primitives and Date, while make and strictEqual let you define exact semantics.",
        code: `Equivalence.strictEqual<number>()(
    NaN,
    NaN
)
// false

Equivalence.Number(
    NaN,
    NaN
)
// true

Equivalence.Date(
    new Date(0),
    new Date(0)
)
// true`,
        apis: [
            "Equivalence.Equivalence",
            "Equivalence.make",
            "Equivalence.strictEqual",
            "Equivalence.String",
            "Equivalence.Number",
            "Equivalence.Boolean",
            "Equivalence.BigInt",
            "Equivalence.Date",
        ],
        notice: "An Equivalence must be reflexive, symmetric, and transitive. strictEqual uses JavaScript ===, while Equivalence.Number additionally treats NaN as equivalent to itself.",
    },

    Derive: {
        eyebrow: "compare through a projection",
        title: "mapInput derives equality from the value you care about",
        description:
            "Instead of comparing a whole object, project both inputs to an ID, normalized string, or another stable key and reuse an existing Equivalence there.",
        code: `const userById =
    Equivalence.mapInput(
        Equivalence.Number,
        (user: User) => user.id
    )

userById(
    {
        id: 1,
        name: "Ada",
        email: "ada@old.test"
    },
    {
        id: 1,
        name: "A. Lovelace",
        email: "ada@new.test"
    }
)
// true`,
        apis: [
            "Equivalence.mapInput",
            "Equivalence.String",
            "Equivalence.Number",
        ],
        notice: "mapInput applies the projection to both operands before comparing. Keep projections pure and deterministic so the resulting relation continues to obey equivalence laws.",
    },

    Shapes: {
        eyebrow: "composite values",
        title: "Build typed equality for tuples, arrays, structs, and records",
        description:
            "Shape combinators lift smaller equivalences into larger data structures while preserving positional or field-level intent.",
        code: `const person =
    Equivalence.Struct({
        name: caseInsensitive,
        age: Equivalence.Number
    })

person(
    {
        name: "Ada",
        age: 36,
        note: "left"
    },
    {
        name: "ADA",
        age: 36,
        note: "right"
    }
)
// true — note is not part of the Struct`,
        apis: [
            "Equivalence.Tuple",
            "Equivalence.Array",
            "Equivalence.Struct",
            "Equivalence.Record",
        ],
        notice: "Tuple and Array compare positionally. Struct checks only the fields declared in its definition. Record compares every own key and requires both records to have the same key set.",
    },

    Combine: {
        eyebrow: "logical AND",
        title: "Combine several equivalence rules into one relation",
        description:
            "combine and combineAll require every supplied relation to agree. makeReducer packages the same operation with an always-true identity for collection folds.",
        code: `const person =
    Equivalence.combine(
        personName,
        personAge
    )

const all =
    Equivalence.combineAll([
        personName,
        personAge
    ])

const reducer =
    Equivalence.makeReducer<Person>()

reducer.combineAll([
    personName,
    personAge
])`,
        apis: [
            "Equivalence.combine",
            "Equivalence.combineAll",
            "Equivalence.makeReducer",
        ],
        notice: "Combination uses short-circuiting logical AND. An empty combineAll collection produces an equivalence that always returns true, which is also the Reducer's identity.",
    },
}

// -----------------------------------------------------------------------------
// PRIMITIVE SNAPSHOT
// -----------------------------------------------------------------------------

export type PrimitiveSnapshot = Readonly<{
    name: string
    left: string
    right: string
    result: boolean
    comparator: string
    lawNote: string
}>

export const primitive_snapshot = (model: Model): PrimitiveSnapshot => {
    if (model.primitiveCase === "StrictNaN") {
        const equivalence = Equivalence.strictEqual<number>()

        return {
            name: "strictEqual<number>",
            left: "NaN",
            right: "NaN",
            result: equivalence(Number.NaN, Number.NaN),
            comparator: "===",
            lawNote: "JavaScript strict equality",
        }
    }

    if (model.primitiveCase === "Date") {
        const left = new Date("2024-01-01T00:00:00Z")

        const right = new Date("2024-01-01T00:00:00Z")

        return {
            name: "Equivalence.Date",
            left: left.toISOString(),
            right: right.toISOString(),
            result: Equivalence.Date(left, right),
            comparator: "Date#getTime → Number",
            lawNote: "distinct Date objects, same timestamp",
        }
    }

    if (model.primitiveCase === "Tolerance") {
        const tolerance = Equivalence.make<number>(
            (self: number, that: number) => Math.abs(self - that) <= 0.01
        )

        return {
            name: "make(tolerance ≤ 0.01)",
            left: "1",
            right: "1.005",
            result: tolerance(1, 1.005),
            comparator: "|a - b| ≤ 0.01",
            lawNote: "custom relation supplied by caller",
        }
    }

    return {
        name: "Equivalence.Number",
        left: "NaN",
        right: "NaN",
        result: Equivalence.Number(Number.NaN, Number.NaN),
        comparator: "=== plus NaN case",
        lawNote: "numeric instance makes NaN reflexive",
    }
}

// -----------------------------------------------------------------------------
// DERIVE SNAPSHOT
// -----------------------------------------------------------------------------

export type DeriveSnapshot = Readonly<{
    name: string
    left: string
    right: string
    projectedLeft: string
    projectedRight: string
    result: boolean
    projection: string
}>

export const derive_snapshot = (model: Model): DeriveSnapshot => {
    if (model.deriveCase === "CaseInsensitive") {
        const equivalence = Equivalence.mapInput(
            Equivalence.String,
            (value: string) => value.toLowerCase()
        )

        return {
            name: "case-insensitive string",
            left: '"Hello"',
            right: '"HELLO"',
            projectedLeft: '"hello"',
            projectedRight: '"hello"',
            result: equivalence("Hello", "HELLO"),
            projection: "value.toLowerCase()",
        }
    }

    if (model.deriveCase === "NormalizeEmail") {
        const normalize_email = (value: string): string =>
            value.trim().toLowerCase()

        const equivalence = Equivalence.mapInput(
            Equivalence.String,
            normalize_email
        )

        const left = " Ada@Example.COM "
        const right = "ada@example.com"

        return {
            name: "normalized email",
            left: JSON.stringify(left),
            right: JSON.stringify(right),
            projectedLeft: JSON.stringify(normalize_email(left)),
            projectedRight: JSON.stringify(normalize_email(right)),
            result: equivalence(left, right),
            projection: "trim().toLowerCase()",
        }
    }

    const user_by_id = Equivalence.mapInput(
        Equivalence.Number,
        (user: User) => user.id
    )

    const left: User = {
        id: 1,
        name: "Ada",
        email: "ada@old.test",
    }

    const right: User = {
        id: 1,
        name: "A. Lovelace",
        email: "ada@new.test",
    }

    return {
        name: "User by id",
        left: "1 · Ada · ada@old.test",
        right: "1 · A. Lovelace · ada@new.test",
        projectedLeft: String(left.id),
        projectedRight: String(right.id),
        result: user_by_id(left, right),
        projection: "user.id",
    }
}

// -----------------------------------------------------------------------------
// SHAPE SNAPSHOT
// -----------------------------------------------------------------------------

export type ShapeSnapshot = Readonly<{
    name: string
    left: string
    right: string
    result: boolean
    rule: string
    extra: string
}>

export const shape_snapshot = (model: Model): ShapeSnapshot => {
    if (model.shapeCase === "Array") {
        const equivalence = Equivalence.Array(case_insensitive_string)

        const left: ReadonlyArray<string> = ["Hello", "World"]

        const right: ReadonlyArray<string> = ["HELLO", "WORLD"]

        return {
            name: "Array(case-insensitive)",
            left: '["Hello", "World"]',
            right: '["HELLO", "WORLD"]',
            result: equivalence(left, right),
            rule: "same length + positional element comparison",
            extra: "empty arrays are equivalent",
        }
    }

    if (model.shapeCase === "Struct") {
        const equivalence = Equivalence.Struct({
            name: case_insensitive_string,
            age: Equivalence.Number,
        })

        const left = {
            name: "Ada",
            age: 36,
            note: "left",
        }

        const right = {
            name: "ADA",
            age: 36,
            note: "right",
        }

        return {
            name: "Struct({ name, age })",
            left: 'Ada · 36 · note "left"',
            right: 'ADA · 36 · note "right"',
            result: equivalence(left, right),
            rule: "only declared Struct fields are compared",
            extra: "note differs but is intentionally ignored",
        }
    }

    if (model.shapeCase === "Record") {
        const equivalence = Equivalence.Record(Equivalence.Number)

        const left: Record<PropertyKey, number> = {
            ada: 100,
            grace: 90,
        }

        const right: Record<PropertyKey, number> = {
            grace: 90,
            ada: 100,
        }

        return {
            name: "Record(Number)",
            left: "{ ada: 100, grace: 90 }",
            right: "{ grace: 90, ada: 100 }",
            result: equivalence(left, right),
            rule: "same own-key set + equivalent values",
            extra: "property insertion order does not matter",
        }
    }

    const equivalence = Equivalence.Tuple([
        Equivalence.String,
        Equivalence.Number,
        Equivalence.Boolean,
    ] as const)

    const left = ["Ada", 36, true] as const

    const right = ["Ada", 36, true] as const

    return {
        name: "Tuple([String, Number, Boolean])",
        left: '["Ada", 36, true]',
        right: '["Ada", 36, true]',
        result: equivalence(left, right),
        rule: "fixed length + per-position equivalence",
        extra: "heterogeneous tuple elements keep their types",
    }
}

// -----------------------------------------------------------------------------
// COMBINE SNAPSHOT
// -----------------------------------------------------------------------------

export type CombineSnapshot = Readonly<{
    name: string
    left: string
    right: string
    nameRule: boolean
    ageRule: boolean
    result: boolean
    ruleCount: number
    identity: string
}>

const person_left: Person = {
    name: "Ada",
    age: 36,
}

const person_right: Person = {
    name: "ADA",
    age: 37,
}

export const combine_snapshot = (model: Model): CombineSnapshot => {
    if (model.combineCase === "Many") {
        const equivalence = Equivalence.combineAll<Person>([
            person_name_equivalence,
            person_age_equivalence,
        ])

        return {
            name: "combineAll([name, age])",
            left: "Ada · 36",
            right: "ADA · 37",
            nameRule: person_name_equivalence(person_left, person_right),
            ageRule: person_age_equivalence(person_left, person_right),
            result: equivalence(person_left, person_right),
            ruleCount: 2,
            identity: "all rules must return true",
        }
    }

    if (model.combineCase === "Reducer") {
        const reducer = Equivalence.makeReducer<Person>()

        const equivalence = reducer.combineAll([
            person_name_equivalence,
            person_age_equivalence,
        ])

        return {
            name: "makeReducer<Person>().combineAll",
            left: "Ada · 36",
            right: "ADA · 37",
            nameRule: person_name_equivalence(person_left, person_right),
            ageRule: person_age_equivalence(person_left, person_right),
            result: equivalence(person_left, person_right),
            ruleCount: 2,
            identity: "Reducer initial equivalence always returns true",
        }
    }

    if (model.combineCase === "Empty") {
        const equivalence = Equivalence.combineAll<Person>([])

        return {
            name: "combineAll([])",
            left: "Ada · 36",
            right: "Grace · 99",
            nameRule: true,
            ageRule: true,
            result: equivalence(person_left, {
                name: "Grace",
                age: 99,
            }),
            ruleCount: 0,
            identity: "empty collection → always true",
        }
    }

    const equivalence = Equivalence.combine(
        person_name_equivalence,
        person_age_equivalence
    )

    return {
        name: "combine(name, age)",
        left: "Ada · 36",
        right: "ADA · 37",
        nameRule: person_name_equivalence(person_left, person_right),
        ageRule: person_age_equivalence(person_left, person_right),
        result: equivalence(person_left, person_right),
        ruleCount: 2,
        identity: "logical AND with short-circuiting",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedEquivalenceStage: {
        stage: Stage,
    },
    SelectedEquivalencePrimitiveCase: {
        primitiveCase: PrimitiveCase,
    },
    SelectedEquivalenceDeriveCase: {
        deriveCase: DeriveCase,
    },
    SelectedEquivalenceShapeCase: {
        shapeCase: ShapeCase,
    },
    SelectedEquivalenceCombineCase: {
        combineCase: CombineCase,
    },
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Primitives",
    primitiveCase: "NumberNaN",
    deriveCase: "UserId",
    shapeCase: "Tuple",
    combineCase: "Two",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

type StagePayload = Readonly<{
    stage: Stage
}>

type PrimitiveCasePayload = Readonly<{
    primitiveCase: PrimitiveCase
}>

type DeriveCasePayload = Readonly<{
    deriveCase: DeriveCase
}>

type ShapeCasePayload = Readonly<{
    shapeCase: ShapeCase
}>

type CombineCasePayload = Readonly<{
    combineCase: CombineCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedEquivalenceStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedEquivalencePrimitiveCase: ({
            primitiveCase,
        }: PrimitiveCasePayload) => ({
            model: evo(model, {
                primitiveCase: () => primitiveCase,
            }),
        }),

        SelectedEquivalenceDeriveCase: ({ deriveCase }: DeriveCasePayload) => ({
            model: evo(model, {
                deriveCase: () => deriveCase,
            }),
        }),

        SelectedEquivalenceShapeCase: ({ shapeCase }: ShapeCasePayload) => ({
            model: evo(model, {
                shapeCase: () => shapeCase,
            }),
        }),

        SelectedEquivalenceCombineCase: ({
            combineCase,
        }: CombineCasePayload) => ({
            model: evo(model, {
                combineCase: () => combineCase,
            }),
        }),
    })
