import { Equal, Hash, Match as M, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Hash examples
// -----------------------------------------------------------------------------

export const primitive_hashes = {
    number: Hash.hash(42),
    string: Hash.hash("hello"),
    boolean: Hash.hash(true),
    bigint: Hash.hash(42n),
    symbol: Hash.hash(globalThis.Symbol.for("user")),
}

export const person_a = {
    name: "Ada",
    age: 36,
}

export const person_b = {
    name: "Ada",
    age: 36,
}

export const person_c = {
    name: "Grace",
    age: 36,
}

// Plain objects are hashed structurally.
export const same_structure_hash = Hash.hash(person_a) === Hash.hash(person_b)

export const different_structure_hash =
    Hash.hash(person_a) === Hash.hash(person_c)

// Hash only selected fields.
export const london_user = {
    name: "Ada",
    age: 36,
    city: "London",
}

export const paris_user = {
    name: "Ada",
    age: 36,
    city: "Paris",
}

export const identity_hash_london = Hash.structureKeys(london_user, [
    "name",
    "age",
])

export const identity_hash_paris = Hash.structureKeys(paris_user, [
    "name",
    "age",
])

export const same_selected_hash = identity_hash_london === identity_hash_paris

// Custom domain value with matching Equal + Hash implementations.
export class UserId implements Equal.Equal {
    constructor(readonly value: string) {}

    [Equal.symbol](that: Equal.Equal): boolean {
        return that instanceof UserId && this.value === that.value
    }

    [Hash.symbol](): number {
        return Hash.string(this.value)
    }
}

export const user_1a = new UserId("u-1")
export const user_1b = new UserId("u-1")
export const user_2 = new UserId("u-2")

export const custom_checks = {
    isHash: Hash.isHash(user_1a),
    equalSameId: Equal.equals(user_1a, user_1b),
    equalDifferentId: Equal.equals(user_1a, user_2),
    hashSameId: Hash.hash(user_1a) === Hash.hash(user_1b),
}

// A collision example from the iterable hash implementation.
// Hash.array folds element hashes with XOR, so order can collide.
export const forward = [1, 2, 3] as const
export const reversed = [3, 2, 1] as const

export const array_hash_collision = Hash.array(forward) === Hash.array(reversed)

export const arrays_are_equal = Equal.equals(forward, reversed)

// Reference hashing is different from structural hashing.
export const ref_a = { id: 1 }
export const ref_b = { id: 1 }

export const structural_same = Hash.hash(ref_a) === Hash.hash(ref_b)

export const reference_same_object = Hash.random(ref_a) === Hash.random(ref_a)

// These are intentionally separate references. Their random hashes are
// identity-based and are not a structural equality mechanism.
export const reference_equal = ref_a === ref_b

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Fingerprint"),
    S.Literal("Structure"),
    S.Literal("Custom"),
    S.Literal("Contract"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Fingerprint",
    "Structure",
    "Custom",
    "Contract",
]

export const FingerprintKind = S.Union([
    S.Literal("Number"),
    S.Literal("String"),
    S.Literal("Boolean"),
    S.Literal("Array"),
    S.Literal("Object"),
])
export type FingerprintKind = typeof FingerprintKind.Type

export const StructureMode = S.Union([
    S.Literal("AllFields"),
    S.Literal("SelectedFields"),
    S.Literal("Reference"),
])
export type StructureMode = typeof StructureMode.Type

export const CustomId = S.Union([
    S.Literal("u-1a"),
    S.Literal("u-1b"),
    S.Literal("u-2"),
])
export type CustomId = typeof CustomId.Type

export const ContractMode = S.Union([
    S.Literal("Collision"),
    S.Literal("Equality"),
    S.Literal("Mutation"),
])
export type ContractMode = typeof ContractMode.Type

export const Model = S.Struct({
    stage: Stage,

    fingerprint_kind: FingerprintKind,

    structure_mode: StructureMode,

    custom_left: CustomId,
    custom_right: CustomId,

    contract_mode: ContractMode,
})
export type Model = typeof Model.Type

export const SelectedHashStage = taggedStruct("SelectedHashStage", {
    stage: Stage,
})

export const SelectedFingerprintKind = taggedStruct("SelectedFingerprintKind", {
    fingerprint_kind: FingerprintKind,
})

export const SelectedHashStructureMode = taggedStruct(
    "SelectedHashStructureMode",
    { structure_mode: StructureMode }
)

export const SelectedCustomHashLeft = taggedStruct("SelectedCustomHashLeft", {
    custom_left: CustomId,
})

export const SelectedCustomHashRight = taggedStruct("SelectedCustomHashRight", {
    custom_right: CustomId,
})

export const SelectedHashContractMode = taggedStruct(
    "SelectedHashContractMode",
    { contract_mode: ContractMode }
)

export const Message = S.Union([
    SelectedHashStage,
    SelectedFingerprintKind,
    SelectedHashStructureMode,
    SelectedCustomHashLeft,
    SelectedCustomHashRight,
    SelectedHashContractMode,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Fingerprint",

    fingerprint_kind: "String",

    structure_mode: "AllFields",

    custom_left: "u-1a",
    custom_right: "u-1b",

    contract_mode: "Collision",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedHashStage: ({ stage }) => ({
                model: evo(model, {
                    stage: () => stage,
                }),
                commands: [],
            }),

            SelectedFingerprintKind: ({ fingerprint_kind }) => ({
                model: evo(model, {
                    fingerprint_kind: () => fingerprint_kind,
                }),
                commands: [],
            }),

            SelectedHashStructureMode: ({ structure_mode }) => ({
                model: evo(model, {
                    structure_mode: () => structure_mode,
                }),
                commands: [],
            }),

            SelectedCustomHashLeft: ({ custom_left }) => ({
                model: evo(model, {
                    custom_left: () => custom_left,
                }),
                commands: [],
            }),

            SelectedCustomHashRight: ({ custom_right }) => ({
                model: evo(model, {
                    custom_right: () => custom_right,
                }),
                commands: [],
            }),

            SelectedHashContractMode: ({ contract_mode }) => ({
                model: evo(model, {
                    contract_mode: () => contract_mode,
                }),
                commands: [],
            }),
        })
    )

export const fingerprint_value = (kind: FingerprintKind): unknown => {
    switch (kind) {
        case "Number":
            return 42
        case "String":
            return "hello"
        case "Boolean":
            return true
        case "Array":
            return [1, 2, 3]
        case "Object":
            return {
                name: "Ada",
                age: 36,
            }
    }
}

export const fingerprint_label = (kind: FingerprintKind): string => {
    switch (kind) {
        case "Number":
            return "42"
        case "String":
            return '"hello"'
        case "Boolean":
            return "true"
        case "Array":
            return "[1, 2, 3]"
        case "Object":
            return '{ name: "Ada", age: 36 }'
    }
}

export const fingerprint_hash = (kind: FingerprintKind): number =>
    Hash.hash(fingerprint_value(kind))

export const structure_result = (
    mode: StructureMode
): Readonly<{
    left: string
    right: string
    equal_hash: boolean
    detail: string
}> => {
    switch (mode) {
        case "AllFields": {
            const left = {
                name: "Ada",
                age: 36,
            }
            const right = {
                name: "Ada",
                age: 36,
            }

            return {
                left: '{ name:"Ada", age:36 }',
                right: '{ name:"Ada", age:36 }',
                equal_hash: Hash.hash(left) === Hash.hash(right),
                detail: "Hash.hash structurally hashes plain objects, so equal fresh structures produce the same fingerprint.",
            }
        }

        case "SelectedFields":
            return {
                left: '{ name:"Ada", age:36, city:"London" }',
                right: '{ name:"Ada", age:36, city:"Paris" }',
                equal_hash:
                    Hash.structureKeys(london_user, ["name", "age"]) ===
                    Hash.structureKeys(paris_user, ["name", "age"]),
                detail: 'structureKeys(["name","age"]) deliberately ignores city, so both objects hash the same for that selected identity.',
            }

        case "Reference":
            return {
                left: "object A",
                right: "object B",
                equal_hash: Hash.random(ref_a) === Hash.random(ref_b),
                detail: "Hash.random hashes object identity rather than fields. The same reference is stable; separate references are not structural values.",
            }
    }
}

export const custom_value = (id: CustomId): UserId => {
    switch (id) {
        case "u-1a":
            return user_1a
        case "u-1b":
            return user_1b
        case "u-2":
            return user_2
    }
}

export const custom_label = (id: CustomId): string =>
    id === "u-2" ? 'new UserId("u-2")' : 'new UserId("u-1")'

export const custom_result = (
    model: Model
): Readonly<{
    equal: boolean
    same_hash: boolean
    left_hash: number
    right_hash: number
}> => {
    const left = custom_value(model.custom_left)
    const right = custom_value(model.custom_right)

    return {
        equal: Equal.equals(left, right),
        same_hash: Hash.hash(left) === Hash.hash(right),
        left_hash: Hash.hash(left),
        right_hash: Hash.hash(right),
    }
}

export const contract_result = (
    mode: ContractMode
): Readonly<{
    headline: string
    left: string
    right: string
    hash_relation: string
    equality_relation: string
    detail: string
}> => {
    switch (mode) {
        case "Collision":
            return {
                headline: "same hash ≠ same value",
                left: "[1, 2, 3]",
                right: "[3, 2, 1]",
                hash_relation: String(
                    Hash.array(forward) === Hash.array(reversed)
                ),
                equality_relation: String(Equal.equals(forward, reversed)),
                detail: "The iterable hash uses XOR, so these different arrays collide. Hashes are bucket hints, never equality proofs.",
            }

        case "Equality":
            return {
                headline: "equal ⇒ same hash",
                left: 'new UserId("u-1")',
                right: 'new UserId("u-1")',
                hash_relation: String(
                    Hash.hash(user_1a) === Hash.hash(user_1b)
                ),
                equality_relation: String(Equal.equals(user_1a, user_1b)),
                detail: "When you implement custom Equal, equal values must return the same hash. This is the required contract for hash-based collections.",
            }

        case "Mutation":
            return {
                headline: "hash structural objects as immutable",
                left: "object before hash",
                right: "same object after mutation",
                hash_relation: "cached hash can be stale",
                equality_relation: "structure changed",
                detail: "Hash.hash caches object hashes. Do not mutate structural objects after their first hash; for mutable identity objects, use a reference-oriented custom hash.",
            }
    }
}
