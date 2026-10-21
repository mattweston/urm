import { Match as M, Option, Record as R, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Record examples
// -----------------------------------------------------------------------------

export const scores: Readonly<Record<string, number>> = R.fromEntries([
    ["ada", 92],
    ["grace", 81],
    ["alan", 67],
    ["linus", 74],
] as Array<readonly [string, number]>)

// Safe lookup returns Option.
export const ada_score = R.get(scores, "ada")
export const missing_score = R.get(scores, "missing")

// Immutable-style updates return new records.
export const with_katherine = R.set(scores, "katherine", 88)

export const without_alan = R.remove(scores, "alan")

// modify is safe: missing keys return Option.none().
export const boosted_ada = R.modify(scores, "ada", (score) => score + 5)

export const missing_boost = R.modify(scores, "missing", (score) => score + 5)

// map can use both value and key.
export const labelled_scores = R.map(scores, (score, key) => `${key}:${score}`)

export const doubled_scores = R.map(scores, (score) => score * 2)

// filter keeps matching entries and preserves their keys.
export const passing_scores = R.filter(scores, (score) => score >= 75)

// partition uses Result: failures go left, successes go right.
export const [below_75, at_least_75] = R.partition(scores, (score) =>
    score >= 75 ? Result.succeed(score) : Result.fail(score)
)

// Convert / fold.
export const score_keys = R.keys(scores)
export const score_values = R.values(scores)
export const score_entries = R.toEntries(scores)

export const score_labels = R.collect(scores, (key, score) => `${key}=${score}`)

export const total_score = R.reduce(scores, 0, (total, score) => total + score)

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Lookup"),
    S.Literal("Transform"),
    S.Literal("Partition"),
    S.Literal("Fold"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Lookup",
    "Transform",
    "Partition",
    "Fold",
]

export const LookupKey = S.Union([
    S.Literal("ada"),
    S.Literal("alan"),
    S.Literal("missing"),
])
export type LookupKey = typeof LookupKey.Type

export const Mutation = S.Union([
    S.Literal("Set"),
    S.Literal("Remove"),
    S.Literal("Modify"),
])
export type Mutation = typeof Mutation.Type

export const Transform = S.Union([
    S.Literal("Double"),
    S.Literal("Label"),
    S.Literal("BoostAda"),
])
export type Transform = typeof Transform.Type

export const FoldMode = S.Union([
    S.Literal("Keys"),
    S.Literal("Values"),
    S.Literal("Entries"),
    S.Literal("Collect"),
    S.Literal("Reduce"),
])
export type FoldMode = typeof FoldMode.Type

export const Model = S.Struct({
    stage: Stage,

    lookup_key: LookupKey,
    mutation: Mutation,
    mutation_applied: S.Boolean,

    transform: Transform,

    threshold: S.Number,

    fold_mode: FoldMode,
})
export type Model = typeof Model.Type

export const SelectedRecordStage = taggedStruct("SelectedRecordStage", {
    stage: Stage,
})

export const SelectedRecordLookupKey = taggedStruct("SelectedRecordLookupKey", {
    key: LookupKey,
})
export const SelectedRecordMutation = taggedStruct("SelectedRecordMutation", {
    mutation: Mutation,
})
export const ClickedApplyRecordMutation = taggedStruct(
    "ClickedApplyRecordMutation"
)
export const ClickedResetRecordMutation = taggedStruct(
    "ClickedResetRecordMutation"
)

export const SelectedRecordTransform = taggedStruct("SelectedRecordTransform", {
    transform: Transform,
})

export const SelectedRecordThreshold = taggedStruct("SelectedRecordThreshold", {
    threshold: S.Number,
})

export const SelectedRecordFoldMode = taggedStruct("SelectedRecordFoldMode", {
    mode: FoldMode,
})

export const Message = S.Union([
    SelectedRecordStage,

    SelectedRecordLookupKey,
    SelectedRecordMutation,
    ClickedApplyRecordMutation,
    ClickedResetRecordMutation,

    SelectedRecordTransform,

    SelectedRecordThreshold,

    SelectedRecordFoldMode,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Lookup",

    lookup_key: "ada",
    mutation: "Set",
    mutation_applied: false,

    transform: "Double",

    threshold: 75,

    fold_mode: "Entries",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedRecordStage: ({ stage }) => ({
                model: modifyFields(model, { stage: () => stage }),
                commands: [],
            }),

            SelectedRecordLookupKey: ({ key }) => ({
                model: modifyFields(model, { lookup_key: () => key }),
                commands: [],
            }),

            SelectedRecordMutation: ({ mutation }) => ({
                model: modifyFields(model, {
                    mutation: () => mutation,
                    mutation_applied: () => false,
                }),
                commands: [],
            }),

            ClickedApplyRecordMutation: () => ({
                model: modifyFields(model, { mutation_applied: () => true }),
                commands: [],
            }),

            ClickedResetRecordMutation: () => ({
                model: modifyFields(model, { mutation_applied: () => false }),
                commands: [],
            }),

            SelectedRecordTransform: ({ transform }) => ({
                model: modifyFields(model, { transform: () => transform }),
                commands: [],
            }),

            SelectedRecordThreshold: ({ threshold }) => ({
                model: modifyFields(model, { threshold: () => threshold }),
                commands: [],
            }),

            SelectedRecordFoldMode: ({ mode }) => ({
                model: modifyFields(model, { fold_mode: () => mode }),
                commands: [],
            }),
        })
    )

export const lookup_result = (key: LookupKey): Option.Option<number> =>
    R.get(scores, key)

export const mutation_result = (
    model: Model
): Readonly<Record<string, number>> => {
    if (!model.mutation_applied) {
        return scores
    }

    switch (model.mutation) {
        case "Set":
            return R.set(scores, "katherine", 88)
        case "Remove":
            return R.remove(scores, "alan")
        case "Modify":
            return Option.getOrElse(
                R.modify(scores, "ada", (score) => score + 5),
                () => scores
            )
    }
}

export const transform_result = (
    transform: Transform
): Readonly<Record<string, string | number>> => {
    switch (transform) {
        case "Double":
            return R.map(scores, (score) => score * 2)
        case "Label":
            return R.map(scores, (score, key) => `${key}:${score}`)
        case "BoostAda":
            return Option.getOrElse(
                R.modify(scores, "ada", (score) => score + 5),
                () => scores
            )
    }
}

export const filtered = (threshold: number): Readonly<Record<string, number>> =>
    R.filter(scores, (score) => score >= threshold)

export const partitioned = (
    threshold: number
): readonly [
    Readonly<Record<string, number>>,
    Readonly<Record<string, number>>,
] =>
    R.partition(scores, (score) =>
        score >= threshold ? Result.succeed(score) : Result.fail(score)
    )

export const fold_result = (mode: FoldMode): ReadonlyArray<string> => {
    switch (mode) {
        case "Keys":
            return R.keys(scores)
        case "Values":
            return R.values(scores).map(String)
        case "Entries":
            return R.toEntries(scores).map(
                ([key, value]) => `[${key}, ${value}]`
            )
        case "Collect":
            return R.collect(scores, (key, value) => `${key}=${value}`)
        case "Reduce":
            return [
                `total = ${R.reduce(
                    scores,
                    0,
                    (total, value) => total + value
                )}`,
            ]
    }
}
