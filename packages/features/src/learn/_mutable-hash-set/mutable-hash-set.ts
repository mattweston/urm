import { Equal, Hash, MutableHashSet, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN VALUE
// -----------------------------------------------------------------------------

export class UserId implements Equal.Equal {
    constructor(readonly value: string) {}

    [Equal.symbol](that: Equal.Equal): boolean {
        return that instanceof UserId && this.value === that.value
    }

    [Hash.symbol](): number {
        return Hash.string(this.value)
    }

    toString(): string {
        return `UserId(${this.value})`
    }
}

const values_text = <A>(set: MutableHashSet.MutableHashSet<A>): string =>
    Array.from(set)
        .map((value: A) => String(value))
        .join(" · ")

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Membership"),
    S.Literal("Mutate"),
    S.Literal("Equality"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Membership",
    "Mutate",
    "Equality",
]

export const CreateCase = S.Union([
    S.Literal("Empty"),
    S.Literal("Make"),
    S.Literal("Iterable"),
])
export type CreateCase = typeof CreateCase.Type

export const MembershipCase = S.Union([
    S.Literal("Has"),
    S.Literal("Iterate"),
    S.Literal("Size"),
])
export type MembershipCase = typeof MembershipCase.Type

export const MutateCase = S.Union([
    S.Literal("Add"),
    S.Literal("Remove"),
    S.Literal("Clear"),
])
export type MutateCase = typeof MutateCase.Type

export const EqualityCase = S.Union([
    S.Literal("Primitive"),
    S.Literal("EqualHash"),
    S.Literal("Duplicates"),
])
export type EqualityCase = typeof EqualityCase.Type

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    membershipCase: MembershipCase,
    mutateCase: MutateCase,
    equalityCase: EqualityCase,
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
        eyebrow: "unique values, mutable storage",
        title: "Create an empty set, explicit values, or any iterable while removing duplicates",
        description:
            "MutableHashSet is built on MutableHashMap. empty returns a fresh set, make accepts variadic values, and fromIterable consumes any iterable. Duplicate values collapse according to the underlying hashing and equality rules.",
        code: `const empty =
    MutableHashSet.empty<
        string
    >()

const made =
    MutableHashSet.make(
        "apple",
        "banana",
        "apple"
    )
// size = 2

const fromIterable =
    MutableHashSet.fromIterable(
        "hello"
    )
// h, e, l, o`,
        apis: [
            "MutableHashSet.MutableHashSet",
            "MutableHashSet.empty",
            "MutableHashSet.make",
            "MutableHashSet.fromIterable",
            "MutableHashSet.isMutableHashSet",
        ],
        notice: "The public model exposes keyMap, the underlying MutableHashMap<V, boolean>. Application code normally uses the set helpers rather than manipulating that map directly.",
    },

    Membership: {
        eyebrow: "fast uniqueness + iteration",
        title: "Check membership, count unique values, and iterate the set directly",
        description:
            "has delegates membership to the underlying MutableHashMap, size reads the map size, and MutableHashSet implements Iterable<V>. Array.from, spread syntax, and for...of therefore work without conversion helpers.",
        code: `const set =
    MutableHashSet.make(
        "apple",
        "banana",
        "cherry"
    )

MutableHashSet.has(
    set,
    "apple"
)
// true

MutableHashSet.has(
    set,
    "grape"
)
// false

MutableHashSet.size(
    set
)
// 3

Array.from(
    set
)
// ["apple", "banana", "cherry"]`,
        apis: [
            "MutableHashSet.has",
            "MutableHashSet.size",
            "MutableHashSet.MutableHashSet",
        ],
        notice: "MutableHashSet has no separate values() export because the set itself is the iterable of values.",
    },

    Mutate: {
        eyebrow: "same set, changed contents",
        title: "Add, remove, and clear mutate the original set and return that same instance",
        description:
            "add stores the value in the underlying key map, remove deletes it, and clear empties the backing map. Adding a duplicate or removing a missing value leaves the set's unique contents unchanged.",
        code: `const set =
    MutableHashSet.make(
        1,
        2,
        3
    )

const same =
    MutableHashSet.add(
        set,
        4
    )

same === set
// true

MutableHashSet.add(
    set,
    4
)
// duplicate: no new entry

MutableHashSet.remove(
    set,
    1
)

MutableHashSet.clear(
    set
)
// same object, size 0`,
        apis: [
            "MutableHashSet.add",
            "MutableHashSet.remove",
            "MutableHashSet.clear",
            "MutableHashSet.size",
        ],
        notice: "This is deliberately unlike immutable HashSet: mutation preserves object identity. Use MutableHashSet in controlled scopes where in-place changes are expected.",
    },

    Equality: {
        eyebrow: "uniqueness follows hash + equality",
        title: "Distinct objects can represent one logical set value when their Equal and Hash contracts agree",
        description:
            'Because MutableHashSet stores values as MutableHashMap keys, custom Equal / Hash values can de-duplicate by logical identity. Two UserId("42") objects compare equal and hash equally, so only one entry is stored.',
        code: `class UserId
    implements Equal.Equal
{
    constructor(
        readonly value: string
    ) {}

    [Equal.symbol](
        that: Equal.Equal
    ): boolean {
        return (
            that instanceof UserId &&
            this.value ===
                that.value
        )
    }

    [Hash.symbol](): number {
        return Hash.string(
            this.value
        )
    }
}

const set =
    MutableHashSet.make(
        new UserId("42")
    )

MutableHashSet.add(
    set,
    new UserId("42")
)

MutableHashSet.size(
    set
)
// 1`,
        apis: [
            "MutableHashSet.add",
            "MutableHashSet.has",
            "Equal.Equal",
            "Equal.symbol",
            "Hash.symbol",
            "Hash.string",
        ],
        notice: "Equal values must produce equal hashes. Keep fields involved in equality / hashing stable after insertion, because hash-based lookup assumes stable key semantics.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type CreateSnapshot = Readonly<{
    mode: CreateCase
    emptySize: number
    madeValues: string
    madeSize: number
    iterableValues: string
    iterableSize: number
    guard: boolean
    backing: string
}>

export const create_snapshot = (model: Model): CreateSnapshot => {
    const empty = MutableHashSet.empty<string>()

    const made = MutableHashSet.make("apple", "banana", "apple", "cherry")

    const iterable = MutableHashSet.fromIterable("hello")

    return {
        mode: model.createCase,
        emptySize: MutableHashSet.size(empty),
        madeValues: values_text(made),
        madeSize: MutableHashSet.size(made),
        iterableValues: values_text(iterable),
        iterableSize: MutableHashSet.size(iterable),
        guard: MutableHashSet.isMutableHashSet(made),
        backing: "keyMap: MutableHashMap<V, boolean>",
    }
}

export type MembershipSnapshot = Readonly<{
    mode: MembershipCase
    apple: boolean
    grape: boolean
    size: number
    iterable: string
    spread: string
    duplicateSize: number
}>

export const membership_snapshot = (model: Model): MembershipSnapshot => {
    const set = MutableHashSet.make("apple", "banana", "cherry")

    const duplicate = MutableHashSet.make("apple", "apple", "apple")

    return {
        mode: model.membershipCase,
        apple: MutableHashSet.has(set, "apple"),
        grape: MutableHashSet.has(set, "grape"),
        size: MutableHashSet.size(set),
        iterable: values_text(set),
        spread: [...set].join(" · "),
        duplicateSize: MutableHashSet.size(duplicate),
    }
}

export type MutateSnapshot = Readonly<{
    mode: MutateCase
    before: string
    afterAdd: string
    addSameReference: boolean
    duplicateSizeStable: boolean
    afterRemove: string
    missingRemoveStable: boolean
    clearSameReference: boolean
    finalSize: number
}>

export const mutate_snapshot = (model: Model): MutateSnapshot => {
    const set = MutableHashSet.make(1, 2, 3)

    const before = values_text(set)

    const added = MutableHashSet.add(set, 4)

    const afterAdd = values_text(set)

    const sizeBeforeDuplicate = MutableHashSet.size(set)

    MutableHashSet.add(set, 4)

    const duplicateSizeStable = MutableHashSet.size(set) === sizeBeforeDuplicate

    MutableHashSet.remove(set, 1)

    const afterRemove = values_text(set)

    const sizeBeforeMissing = MutableHashSet.size(set)

    MutableHashSet.remove(set, 999)

    const missingRemoveStable = MutableHashSet.size(set) === sizeBeforeMissing

    const cleared = MutableHashSet.clear(set)

    return {
        mode: model.mutateCase,
        before,
        afterAdd,
        addSameReference: added === set,
        duplicateSizeStable,
        afterRemove,
        missingRemoveStable,
        clearSameReference: cleared === set,
        finalSize: MutableHashSet.size(set),
    }
}

export type EqualitySnapshot = Readonly<{
    mode: EqualityCase
    primitive: string
    distinctObjects: boolean
    equal: boolean
    sameHash: boolean
    sizeAfterDuplicate: number
    equalLookup: boolean
    differentLookup: boolean
    warning: string
}>

export const equality_snapshot = (model: Model): EqualitySnapshot => {
    const first = new UserId("42")

    const second = new UserId("42")

    const different = new UserId("43")

    const set = MutableHashSet.make(first)

    MutableHashSet.add(set, second)

    return {
        mode: model.equalityCase,
        primitive: "primitive duplicates collapse by ordinary value semantics",
        distinctObjects: first !== second,
        equal: Equal.equals(first, second),
        sameHash: Hash.hash(first) === Hash.hash(second),
        sizeAfterDuplicate: MutableHashSet.size(set),
        equalLookup: MutableHashSet.has(set, second),
        differentLookup: MutableHashSet.has(set, different),
        warning:
            "Equal / Hash identity must stay stable while a value is stored",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedMutableHashSetStage: {
        stage: Stage,
    },
    SelectedMutableHashSetCreateCase: {
        createCase: CreateCase,
    },
    SelectedMutableHashSetMembershipCase: {
        membershipCase: MembershipCase,
    },
    SelectedMutableHashSetMutateCase: {
        mutateCase: MutateCase,
    },
    SelectedMutableHashSetEqualityCase: {
        equalityCase: EqualityCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Create",
    createCase: "Empty",
    membershipCase: "Has",
    mutateCase: "Add",
    equalityCase: "EqualHash",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type CreateCasePayload = Readonly<{
    createCase: CreateCase
}>

type MembershipCasePayload = Readonly<{
    membershipCase: MembershipCase
}>

type MutateCasePayload = Readonly<{
    mutateCase: MutateCase
}>

type EqualityCasePayload = Readonly<{
    equalityCase: EqualityCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedMutableHashSetStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedMutableHashSetCreateCase: ({
            createCase,
        }: CreateCasePayload) => ({
            model: modifyFields(model, {
                createCase: () => createCase,
            }),
        }),

        SelectedMutableHashSetMembershipCase: ({
            membershipCase,
        }: MembershipCasePayload) => ({
            model: modifyFields(model, {
                membershipCase: () => membershipCase,
            }),
        }),

        SelectedMutableHashSetMutateCase: ({
            mutateCase,
        }: MutateCasePayload) => ({
            model: modifyFields(model, {
                mutateCase: () => mutateCase,
            }),
        }),

        SelectedMutableHashSetEqualityCase: ({
            equalityCase,
        }: EqualityCasePayload) => ({
            model: modifyFields(model, {
                equalityCase: () => equalityCase,
            }),
        }),
    })
