import { Equal, Hash, HashSet, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN VALUES
// -----------------------------------------------------------------------------

export class Person implements Equal.Equal, Hash.Hash {
    constructor(readonly name: string) {}

    [Equal.symbol](other: unknown): boolean {
        return other instanceof Person && other.name === this.name
    }

    [Hash.symbol](): number {
        return Hash.string(this.name)
    }
}

const sorted_values = <A>(
    set: HashSet.HashSet<A>,
    format: (value: A) => string
): string =>
    Array.from(set)
        .map((value: A) => format(value))
        .sort()
        .join(", ")

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Membership"),
    S.Literal("Algebra"),
    S.Literal("Transform"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Membership",
    "Algebra",
    "Transform",
]

export const BuildCase = S.Union([
    S.Literal("Construct"),
    S.Literal("Unique"),
    S.Literal("Typed"),
])
export type BuildCase = typeof BuildCase.Type

export const MembershipCase = S.Union([
    S.Literal("Structural"),
    S.Literal("Immutable"),
    S.Literal("Predicates"),
])
export type MembershipCase = typeof MembershipCase.Type

export const AlgebraCase = S.Union([
    S.Literal("Union"),
    S.Literal("Intersection"),
    S.Literal("Difference"),
    S.Literal("Subset"),
])
export type AlgebraCase = typeof AlgebraCase.Type

export const TransformCase = S.Union([
    S.Literal("Map"),
    S.Literal("Filter"),
    S.Literal("Reduce"),
])
export type TransformCase = typeof TransformCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    membershipCase: MembershipCase,
    algebraCase: AlgebraCase,
    transformCase: TransformCase,
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
        eyebrow: "immutable uniqueness",
        title: "Construct sets from values while collapsing equal duplicates",
        description:
            "HashSet is an immutable set backed by HashMap. make and fromIterable keep at most one representative for each Effect Hash / Equal equivalence class, and the set itself is iterable.",
        code: `const set =
    HashSet.make(
        "apple",
        "banana",
        "apple",
        "cherry"
    )

HashSet.size(set)
// 3

HashSet.isEmpty(set)
// false

const fromText =
    HashSet.fromIterable(
        "hello"
    )
// h, e, l, o`,
        apis: [
            "HashSet.HashSet",
            "HashSet.HashSet.Value",
            "HashSet.empty",
            "HashSet.make",
            "HashSet.fromIterable",
            "HashSet.size",
            "HashSet.isEmpty",
            "HashSet.isHashSet",
        ],
        notice: "HashSet stores equality classes, not insertion occurrences. Duplicate values collapse during construction. Iteration order is an implementation detail; sort derived arrays when deterministic display order matters.",
    },

    Membership: {
        eyebrow: "Hash + Equal membership",
        title: "Membership follows Effect equality, while updates remain persistent",
        description:
            "has uses the same hashing/equality model as HashMap. add and remove return set values without mutating the original; adding an existing equal value or removing a missing value can reuse the same instance.",
        code: `const people =
    HashSet.make(
        new Person("Alice"),
        new Person("Bob")
    )

HashSet.has(
    people,
    new Person("Alice")
)
// true

const withAda =
    HashSet.add(
        people,
        new Person("Ada")
    )

HashSet.size(people)
// 2

HashSet.size(withAda)
// 3`,
        apis: [
            "HashSet.has",
            "HashSet.add",
            "HashSet.remove",
            "HashSet.some",
            "HashSet.every",
            "HashSet.isEmpty",
        ],
        notice: "Custom value types used as structural set members should keep Hash and Equal consistent. Persistent updates preserve the original set, but no-op updates may return the same object for efficiency.",
    },

    Algebra: {
        eyebrow: "set relationships",
        title: "Union, intersection, difference, and subset checks use set equality semantics",
        description:
            "The core algebra works directly on HashSet values. union collects either side, intersection keeps common equality classes, difference keeps only left-only values, and isSubset checks containment.",
        code: `const left =
    HashSet.make(
        "a",
        "b",
        "c"
    )

const right =
    HashSet.make(
        "b",
        "c",
        "d"
    )

HashSet.union(
    left,
    right
)
// a, b, c, d

HashSet.intersection(
    left,
    right
)
// b, c

HashSet.difference(
    left,
    right
)
// a`,
        apis: [
            "HashSet.union",
            "HashSet.intersection",
            "HashSet.difference",
            "HashSet.isSubset",
        ],
        notice: "difference is directional: left \\ right differs from right \\ left. isSubset is reflexive, so every HashSet is a subset of itself.",
    },

    Transform: {
        eyebrow: "map, filter, fold",
        title: "Transformations preserve set semantics, so mapped duplicates collapse",
        description:
            "map can change the value type but still returns a HashSet, filter supports predicates and refinements, and reduce folds the unique values into an arbitrary accumulator.",
        code: `const fruit =
    HashSet.make(
        "apple",
        "banana",
        "cherry"
    )

HashSet.map(
    fruit,
    (value) =>
        value.length
)
// 5, 6

HashSet.filter(
    HashSet.make(
        1, 2, 3, 4, 5, 6
    ),
    (value) =>
        value % 2 === 0
)
// 2, 4, 6

HashSet.reduce(
    HashSet.make(1, 2, 3),
    0,
    (sum, value) =>
        sum + value
)
// 6`,
        apis: [
            "HashSet.map",
            "HashSet.filter",
            "HashSet.reduce",
            "HashSet.some",
            "HashSet.every",
        ],
        notice: "map does not preserve cardinality: if two inputs map to equal outputs, only one output remains. every on an empty set is true; some on an empty set is false.",
    },
}

// -----------------------------------------------------------------------------
// BUILD SNAPSHOT
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    mode: BuildCase
    size: number
    values: string
    isEmpty: boolean
    isHashSet: boolean
    sourceCount: number
    uniqueCount: number
    extractedTypeExample: string
}>

export const build_snapshot = (model: Model): BuildSnapshot => {
    if (model.buildCase === "Unique") {
        const source: ReadonlyArray<string> = ["a", "b", "a", "c", "b", "d"]

        const set = HashSet.fromIterable(source)

        return {
            mode: model.buildCase,
            size: HashSet.size(set),
            values: sorted_values(set, (value: string) => value),
            isEmpty: HashSet.isEmpty(set),
            isHashSet: HashSet.isHashSet(set),
            sourceCount: source.length,
            uniqueCount: HashSet.size(set),
            extractedTypeExample: "Value<typeof set> = string",
        }
    }

    if (model.buildCase === "Typed") {
        const fruits = HashSet.make("apple", "banana", "cherry")

        type Fruit = HashSet.HashSet.Value<typeof fruits>

        const display = (fruit: Fruit): string => `fruit:${fruit}`

        return {
            mode: model.buildCase,
            size: HashSet.size(fruits),
            values: sorted_values(fruits, display),
            isEmpty: HashSet.isEmpty(fruits),
            isHashSet: HashSet.isHashSet(fruits),
            sourceCount: 3,
            uniqueCount: HashSet.size(fruits),
            extractedTypeExample: "HashSet.Value → string",
        }
    }

    const empty = HashSet.empty<string>()

    const set = HashSet.make("apple", "banana", "apple", "cherry")

    return {
        mode: model.buildCase,
        size: HashSet.size(set),
        values: sorted_values(set, (value: string) => value),
        isEmpty: HashSet.isEmpty(empty),
        isHashSet: HashSet.isHashSet(set),
        sourceCount: 4,
        uniqueCount: HashSet.size(set),
        extractedTypeExample: 'fromIterable("hello") → e, h, l, o',
    }
}

// -----------------------------------------------------------------------------
// MEMBERSHIP SNAPSHOT
// -----------------------------------------------------------------------------

export type MembershipSnapshot = Readonly<{
    mode: MembershipCase
    alicePresent: boolean
    adaPresent: boolean
    originalSize: number
    addedSize: number
    removedSize: number
    originalStillHasBob: boolean
    addExistingSameInstance: boolean
    removeMissingSameInstance: boolean
    someLongName: boolean
    everyNonEmpty: boolean
}>

export const membership_snapshot = (model: Model): MembershipSnapshot => {
    const people = HashSet.make(new Person("Alice"), new Person("Bob"))

    const alicePresent = HashSet.has(people, new Person("Alice"))

    const withAda = HashSet.add(people, new Person("Ada"))

    const withoutAlice = HashSet.remove(withAda, new Person("Alice"))

    const addExisting = HashSet.add(people, new Person("Alice"))

    const removeMissing = HashSet.remove(people, new Person("Missing"))

    return {
        mode: model.membershipCase,
        alicePresent,
        adaPresent: HashSet.has(people, new Person("Ada")),
        originalSize: HashSet.size(people),
        addedSize: HashSet.size(withAda),
        removedSize: HashSet.size(withoutAlice),
        originalStillHasBob: HashSet.has(people, new Person("Bob")),
        addExistingSameInstance: addExisting === people,
        removeMissingSameInstance: removeMissing === people,
        someLongName: HashSet.some(
            people,
            (person: Person) => person.name.length > 3
        ),
        everyNonEmpty: HashSet.every(
            people,
            (person: Person) => person.name.length > 0
        ),
    }
}

// -----------------------------------------------------------------------------
// ALGEBRA SNAPSHOT
// -----------------------------------------------------------------------------

export type AlgebraSnapshot = Readonly<{
    mode: AlgebraCase
    left: string
    right: string
    result: string
    resultSize: number
    subsetSmallLarge: boolean
    subsetLargeSmall: boolean
    reflexive: boolean
    rule: string
}>

export const algebra_snapshot = (model: Model): AlgebraSnapshot => {
    const left = HashSet.make("a", "b", "c")

    const right = HashSet.make("b", "c", "d")

    const large = HashSet.make("a", "b", "c", "d")

    const result =
        model.algebraCase === "Intersection"
            ? HashSet.intersection(left, right)
            : model.algebraCase === "Difference"
              ? HashSet.difference(left, right)
              : HashSet.union(left, right)

    return {
        mode: model.algebraCase,
        left: sorted_values(left, (value: string) => value),
        right: sorted_values(right, (value: string) => value),
        result:
            model.algebraCase === "Subset"
                ? "predicate only"
                : sorted_values(result, (value: string) => value),
        resultSize: model.algebraCase === "Subset" ? 0 : HashSet.size(result),
        subsetSmallLarge: HashSet.isSubset(left, large),
        subsetLargeSmall: HashSet.isSubset(large, left),
        reflexive: HashSet.isSubset(left, left),
        rule:
            model.algebraCase === "Union"
                ? "either side"
                : model.algebraCase === "Intersection"
                  ? "both sides"
                  : model.algebraCase === "Difference"
                    ? "left only"
                    : "containment predicate",
    }
}

// -----------------------------------------------------------------------------
// TRANSFORM SNAPSHOT
// -----------------------------------------------------------------------------

export type TransformSnapshot = Readonly<{
    mode: TransformCase
    input: string
    result: string
    inputSize: number
    resultSize: number
    reduced: string
    some: boolean
    every: boolean
}>

export const transform_snapshot = (model: Model): TransformSnapshot => {
    if (model.transformCase === "Filter") {
        const input = HashSet.make(1, 2, 3, 4, 5, 6)

        const result = HashSet.filter(input, (value: number) => value % 2 === 0)

        return {
            mode: model.transformCase,
            input: sorted_values(input, (value: number) => String(value)),
            result: sorted_values(result, (value: number) => String(value)),
            inputSize: HashSet.size(input),
            resultSize: HashSet.size(result),
            reduced: "not selected",
            some: HashSet.some(result, (value: number) => value > 4),
            every: HashSet.every(result, (value: number) => value % 2 === 0),
        }
    }

    if (model.transformCase === "Reduce") {
        const input = HashSet.make(1, 2, 3, 4, 5)

        const total = HashSet.reduce(
            input,
            0,
            (sum: number, value: number) => sum + value
        )

        return {
            mode: model.transformCase,
            input: sorted_values(input, (value: number) => String(value)),
            result: "same set",
            inputSize: HashSet.size(input),
            resultSize: HashSet.size(input),
            reduced: String(total),
            some: HashSet.some(input, (value: number) => value > 4),
            every: HashSet.every(input, (value: number) => value > 0),
        }
    }

    const input = HashSet.make("apple", "banana", "cherry")

    const result = HashSet.map(input, (value: string) => value.length)

    return {
        mode: model.transformCase,
        input: sorted_values(input, (value: string) => value),
        result: sorted_values(result, (value: number) => String(value)),
        inputSize: HashSet.size(input),
        resultSize: HashSet.size(result),
        reduced: "5 and 6 only",
        some: HashSet.some(result, (value: number) => value === 6),
        every: HashSet.every(result, (value: number) => value >= 5),
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedHashSetStage: {
        stage: Stage,
    },
    SelectedHashSetBuildCase: {
        buildCase: BuildCase,
    },
    SelectedHashSetMembershipCase: {
        membershipCase: MembershipCase,
    },
    SelectedHashSetAlgebraCase: {
        algebraCase: AlgebraCase,
    },
    SelectedHashSetTransformCase: {
        transformCase: TransformCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Construct",
    membershipCase: "Structural",
    algebraCase: "Union",
    transformCase: "Map",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type MembershipCasePayload = Readonly<{
    membershipCase: MembershipCase
}>

type AlgebraCasePayload = Readonly<{
    algebraCase: AlgebraCase
}>

type TransformCasePayload = Readonly<{
    transformCase: TransformCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedHashSetStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedHashSetBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: evo(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedHashSetMembershipCase: ({
            membershipCase,
        }: MembershipCasePayload) => ({
            model: evo(model, {
                membershipCase: () => membershipCase,
            }),
        }),

        SelectedHashSetAlgebraCase: ({ algebraCase }: AlgebraCasePayload) => ({
            model: evo(model, {
                algebraCase: () => algebraCase,
            }),
        }),

        SelectedHashSetTransformCase: ({
            transformCase,
        }: TransformCasePayload) => ({
            model: evo(model, {
                transformCase: () => transformCase,
            }),
        }),
    })
