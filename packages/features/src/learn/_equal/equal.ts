import { Array as Arr, Equal, Hash, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// CUSTOM EQUAL DOMAIN TYPE
// -----------------------------------------------------------------------------

export class Coordinate implements Equal.Equal {
    constructor(
        readonly x: number,
        readonly y: number
    ) {}

    [Equal.symbol](that: Equal.Equal): boolean {
        return (
            that instanceof Coordinate && this.x === that.x && this.y === that.y
        )
    }

    [Hash.symbol](): number {
        return Hash.string(`${this.x},${this.y}`)
    }
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Structural"),
    S.Literal("Custom"),
    S.Literal("Reference"),
    S.Literal("Equivalence"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Structural",
    "Custom",
    "Reference",
    "Equivalence",
]

export const StructuralCase = S.Union([
    S.Literal("Objects"),
    S.Literal("Collections"),
    S.Literal("Specials"),
    S.Literal("Mismatch"),
])
export type StructuralCase = typeof StructuralCase.Type

export const CustomCase = S.Union([
    S.Literal("Same"),
    S.Literal("Different"),
    S.Literal("OneSided"),
])
export type CustomCase = typeof CustomCase.Type

export const ReferenceCase = S.Union([
    S.Literal("Structural"),
    S.Literal("Proxy"),
    S.Literal("Unsafe"),
])
export type ReferenceCase = typeof ReferenceCase.Type

export const EquivalenceCase = S.Union([
    S.Literal("Numbers"),
    S.Literal("Objects"),
])
export type EquivalenceCase = typeof EquivalenceCase.Type

export const Model = S.Struct({
    stage: Stage,
    structuralCase: StructuralCase,
    customCase: CustomCase,
    referenceCase: ReferenceCase,
    equivalenceCase: EquivalenceCase,
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
    Structural: {
        eyebrow: "deep structural equality",
        title: "equals compares built-in data by value",
        description:
            "Primitives, arrays, plain objects, typed arrays, Dates, RegExps, Maps, and Sets use Effect's structural rules. Maps and Sets ignore insertion order.",
        code: `Equal.equals(
    { user: { id: 1 }, roles: ["admin"] },
    { user: { id: 1 }, roles: ["admin"] }
)
// true

Equal.equals(
    new Map([["a", 1], ["b", 2]]),
    new Map([["b", 2], ["a", 1]])
)
// true

Equal.equals(NaN, NaN)
// true`,
        apis: ["Equal.equals", "Equal.symbol"],
        notice: "Comparison results for object pairs are cached. Treat objects as immutable after their first comparison. Map and Set comparison is order-independent but O(n²).",
    },

    Custom: {
        eyebrow: "domain-defined equality",
        title: "Equal + Hash let classes define value identity",
        description:
            "Implement Equal.Equal when a class needs domain equality instead of plain object structure. Equal extends Hash.Hash, so equal values must also hash equally.",
        code: `class Coordinate
    implements Equal.Equal {

    constructor(
        readonly x: number,
        readonly y: number
    ) {}

    [Equal.symbol](that: Equal.Equal) {
        return (
            that instanceof Coordinate &&
            this.x === that.x &&
            this.y === that.y
        )
    }

    [Hash.symbol]() {
        return Hash.string(
            \`\${this.x},\${this.y}\`
        )
    }
}`,
        apis: [
            "Equal.Equal",
            "Equal.symbol",
            "Equal.isEqual",
            "Equal.equals",
            "Hash.symbol",
        ],
        notice: "If only one operand implements Equal, equals returns false. When both do, comparison delegates to the custom equality method after the hash fast-path.",
    },

    Reference: {
        eyebrow: "opt out of structure",
        title: "Reference equality can be chosen per object",
        description:
            "byReference wraps an object in a proxy without changing the original. byReferenceUnsafe marks the original object itself and is irreversible for that object's lifetime.",
        code: `const a = { x: 1 }
const b = { x: 1 }

Equal.equals(a, b)
// true

const ref =
    Equal.byReference(a)

Equal.equals(ref, b)
// false

Equal.equals(ref, ref)
// true`,
        apis: ["Equal.byReference", "Equal.byReferenceUnsafe", "Equal.equals"],
        notice: "byReference is the safer choice because it leaves the source object structurally comparable. byReferenceUnsafe returns the same object but permanently marks it as reference-only.",
    },

    Equivalence: {
        eyebrow: "adapter",
        title: "asEquivalence plugs Equal semantics into generic APIs",
        description:
            "Some Effect APIs accept an Equivalence rather than a module-specific equality function. asEquivalence returns a typed wrapper around Equal.equals.",
        code: `const equivalence =
    Equal.asEquivalence<number>()

Arr.dedupeWith(
    [1, 2, 2, 3, 1],
    equivalence
)
// [1, 2, 3]

const objectEquivalence =
    Equal.asEquivalence<{
        readonly id: number
    }>()`,
        apis: ["Equal.asEquivalence", "Equal.equals", "Array.dedupeWith"],
        notice: "asEquivalence does not introduce a new equality algorithm. It is a thin typed adapter, useful anywhere an Equivalence<A> is required.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type StructuralSnapshot = Readonly<{
    label: string
    left: string
    right: string
    equal: boolean
    rule: string
    orderIndependent: boolean
}>

export const structural_snapshot = (model: Model): StructuralSnapshot => {
    if (model.structuralCase === "Collections") {
        const leftMap = new Map<string, number>([
            ["a", 1],
            ["b", 2],
        ])

        const rightMap = new Map<string, number>([
            ["b", 2],
            ["a", 1],
        ])

        const leftSet = new Set([1, 2, 3])

        const rightSet = new Set([3, 1, 2])

        return {
            label: "Map + Set",
            left: 'Map{"a"→1, "b"→2} · Set{1,2,3}',
            right: 'Map{"b"→2, "a"→1} · Set{3,1,2}',
            equal:
                Equal.equals(leftMap, rightMap) &&
                Equal.equals(leftSet, rightSet),
            rule: "entry/member order does not matter",
            orderIndependent: true,
        }
    }

    if (model.structuralCase === "Specials") {
        const leftDate = new Date("2024-01-01T00:00:00Z")

        const rightDate = new Date("2024-01-01T00:00:00Z")

        return {
            label: "Date + RegExp + NaN",
            left: "2024-01-01 · /effect/gi · NaN",
            right: "2024-01-01 · /effect/gi · NaN",
            equal:
                Equal.equals(leftDate, rightDate) &&
                Equal.equals(/effect/gi, /effect/gi) &&
                Equal.equals(Number.NaN, Number.NaN),
            rule: "dates by time, regex by representation, NaN equals NaN",
            orderIndependent: false,
        }
    }

    if (model.structuralCase === "Mismatch") {
        const left = {
            user: {
                id: 1,
            },
            roles: ["admin"],
        }

        const right = {
            user: {
                id: 2,
            },
            roles: ["admin"],
        }

        return {
            label: "nested mismatch",
            left: '{ user: { id: 1 }, roles: ["admin"] }',
            right: '{ user: { id: 2 }, roles: ["admin"] }',
            equal: Equal.equals(left, right),
            rule: "nested values differ",
            orderIndependent: false,
        }
    }

    const left = {
        user: {
            id: 1,
        },
        roles: ["admin"],
    }

    const right = {
        user: {
            id: 1,
        },
        roles: ["admin"],
    }

    return {
        label: "plain nested objects",
        left: '{ user: { id: 1 }, roles: ["admin"] }',
        right: '{ user: { id: 1 }, roles: ["admin"] }',
        equal: Equal.equals(left, right),
        rule: "enumerable keys recurse structurally",
        orderIndependent: false,
    }
}

export type CustomSnapshot = Readonly<{
    left: string
    right: string
    leftIsEqual: boolean
    rightIsEqual: boolean
    equals: boolean
    leftHash: number
    rightHash: string
    delegated: boolean
}>

export const custom_snapshot = (model: Model): CustomSnapshot => {
    const left = new Coordinate(1, 2)

    if (model.customCase === "OneSided") {
        const right = {
            x: 1,
            y: 2,
        }

        return {
            left: "Coordinate(1, 2)",
            right: "{ x: 1, y: 2 }",
            leftIsEqual: Equal.isEqual(left),
            rightIsEqual: Equal.isEqual(right),
            equals: Equal.equals(left, right),
            leftHash: Hash.hash(left),
            rightHash: "plain structural hash",
            delegated: false,
        }
    }

    const right =
        model.customCase === "Same"
            ? new Coordinate(1, 2)
            : new Coordinate(3, 4)

    return {
        left: "Coordinate(1, 2)",
        right: `Coordinate(${right.x}, ${right.y})`,
        leftIsEqual: Equal.isEqual(left),
        rightIsEqual: Equal.isEqual(right),
        equals: Equal.equals(left, right),
        leftHash: Hash.hash(left),
        rightHash: String(Hash.hash(right)),
        delegated: true,
    }
}

export type ReferenceSnapshot = Readonly<{
    mode: string
    sameShape: boolean
    comparedEqual: boolean
    selfEqual: boolean
    returnedSameObject: boolean
    sourceStillStructural: boolean
    permanent: boolean
}>

export const reference_snapshot = (model: Model): ReferenceSnapshot => {
    if (model.referenceCase === "Proxy") {
        const source = {
            x: 1,
        }

        const peer = {
            x: 1,
        }

        const ref = Equal.byReference(source)

        return {
            mode: "byReference proxy",
            sameShape: true,
            comparedEqual: Equal.equals(ref, peer),
            selfEqual: Equal.equals(ref, ref),
            returnedSameObject: ref === source,
            sourceStillStructural: Equal.equals(source, peer),
            permanent: false,
        }
    }

    if (model.referenceCase === "Unsafe") {
        const source = {
            x: 1,
        }

        const peer = {
            x: 1,
        }

        const marked = Equal.byReferenceUnsafe(source)

        return {
            mode: "byReferenceUnsafe mark",
            sameShape: true,
            comparedEqual: Equal.equals(source, peer),
            selfEqual: Equal.equals(source, source),
            returnedSameObject: marked === source,
            sourceStillStructural: false,
            permanent: true,
        }
    }

    const left = {
        x: 1,
    }

    const right = {
        x: 1,
    }

    return {
        mode: "default structural",
        sameShape: true,
        comparedEqual: Equal.equals(left, right),
        selfEqual: Equal.equals(left, left),
        returnedSameObject: false,
        sourceStillStructural: true,
        permanent: false,
    }
}

type Person = Readonly<{
    id: number
    name: string
}>

const format_people = (people: ReadonlyArray<Person>): string =>
    people.map((person) => `${person.id}:${person.name}`).join(", ")

export type EquivalenceSnapshot = Readonly<{
    input: string
    output: string
    beforeCount: number
    afterCount: number
    equivalenceResult: boolean
    algorithm: string
}>

export const equivalence_snapshot = (model: Model): EquivalenceSnapshot => {
    if (model.equivalenceCase === "Objects") {
        const input: ReadonlyArray<Person> = [
            {
                id: 1,
                name: "Ada",
            },
            {
                id: 1,
                name: "Ada",
            },
            {
                id: 2,
                name: "Grace",
            },
        ]

        const equivalence = Equal.asEquivalence<Person>()

        const output = Arr.dedupeWith(input, equivalence)

        return {
            input: format_people(input),
            output: format_people(output),
            beforeCount: input.length,
            afterCount: output.length,
            equivalenceResult: equivalence(input[0], input[1]),
            algorithm: "Equal.equals structural semantics",
        }
    }

    const input = [1, 2, 2, 3, 1]

    const equivalence = Equal.asEquivalence<number>()

    const output = Arr.dedupeWith(input, equivalence)

    return {
        input: input.join(", "),
        output: output.join(", "),
        beforeCount: input.length,
        afterCount: output.length,
        equivalenceResult: equivalence(5, 5),
        algorithm: "Equal.equals wrapped as Equivalence<number>",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedEqualStage: {
        stage: Stage,
    },
    SelectedEqualStructuralCase: {
        structuralCase: StructuralCase,
    },
    SelectedEqualCustomCase: {
        customCase: CustomCase,
    },
    SelectedEqualReferenceCase: {
        referenceCase: ReferenceCase,
    },
    SelectedEqualEquivalenceCase: {
        equivalenceCase: EquivalenceCase,
    },
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Structural",
    structuralCase: "Objects",
    customCase: "Same",
    referenceCase: "Structural",
    equivalenceCase: "Numbers",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedEqualStage: ({ stage }: { readonly stage: Stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedEqualStructuralCase: ({
            structuralCase,
        }: {
            readonly structuralCase: StructuralCase
        }) => ({
            model: modifyFields(model, {
                structuralCase: () => structuralCase,
            }),
        }),

        SelectedEqualCustomCase: ({
            customCase,
        }: {
            readonly customCase: CustomCase
        }) => ({
            model: modifyFields(model, {
                customCase: () => customCase,
            }),
        }),

        SelectedEqualReferenceCase: ({
            referenceCase,
        }: {
            readonly referenceCase: ReferenceCase
        }) => ({
            model: modifyFields(model, {
                referenceCase: () => referenceCase,
            }),
        }),

        SelectedEqualEquivalenceCase: ({
            equivalenceCase,
        }: {
            readonly equivalenceCase: EquivalenceCase
        }) => ({
            model: modifyFields(model, {
                equivalenceCase: () => equivalenceCase,
            }),
        }),
    })
