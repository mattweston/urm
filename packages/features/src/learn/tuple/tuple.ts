import {
    Match as M,
    Number as Num,
    Schema as S,
    String as Str,
    Tuple,
} from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Tuple examples
// -----------------------------------------------------------------------------

// Tuple.make preserves the exact fixed positions and literal values.
export const person = Tuple.make("Ada", 36, true)
// type: ["Ada", 36, true]

export const person_name = Tuple.get(person, 0)
// "Ada"

export const person_age = Tuple.get(person, 1)
// 36

export const compact_person = Tuple.pick(person, [0, 2])
// ["Ada", true]

export const without_age = Tuple.omit(person, [1])
// ["Ada", true]

export const with_role = Tuple.appendElement(person, "admin")
// ["Ada", 36, true, "admin"]

export const with_location = Tuple.appendElements(person, ["UK", 2026] as const)
// ["Ada", 36, true, "UK", 2026]

// Evolve lets every selected position use its own transformation.
export const evolved = Tuple.evolve(person, [
    (name) => name.toUpperCase(),
    (age) => age + 1,
])
// [string, number, true]

// Reorder by source index while keeping position-specific types.
export const reversed = Tuple.renameIndices(person, ["2", "1", "0"])
// [true, 36, "Ada"]

// Runtime length guards also narrow arrays to fixed-length tuple types.
export const sum_three = (input: Array<number>): number | undefined => {
    if (!Tuple.isTupleOf(input, 3)) {
        return undefined
    }

    // input is [number, number, number]
    return input[0] + input[1] + input[2]
}

// Per-position ordering.
export const PersonOrder = Tuple.makeOrder([Str.Order, Num.Order])

export const person_comparison = PersonOrder(["Ada", 36], ["Grace", 28])
// -1

// Per-position accumulation.
export const SummaryReducer = Tuple.makeReducer<readonly [number, string]>([
    Num.ReducerSum,
    Str.ReducerConcat,
])

export const summary = SummaryReducer.combineAll([
    [1, "a"],
    [2, "b"],
    [3, "c"],
])
// [6, "abc"]

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Make"),
    S.Literal("Select"),
    S.Literal("Transform"),
    S.Literal("Instances"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Make",
    "Select",
    "Transform",
    "Instances",
]

export const TupleIndex = S.Union([S.Literal(0), S.Literal(1), S.Literal(2)])
export type TupleIndex = typeof TupleIndex.Type

export const SelectMode = S.Union([
    S.Literal("Pick"),
    S.Literal("Omit"),
    S.Literal("Append"),
])
export type SelectMode = typeof SelectMode.Type

export const TransformMode = S.Union([S.Literal("Evolve"), S.Literal("Rename")])
export type TransformMode = typeof TransformMode.Type

export const InstanceMode = S.Union([
    S.Literal("Guard"),
    S.Literal("Order"),
    S.Literal("Reduce"),
])
export type InstanceMode = typeof InstanceMode.Type

export const GuardLength = S.Union([S.Literal(2), S.Literal(3), S.Literal(4)])
export type GuardLength = typeof GuardLength.Type

export const Model = S.Struct({
    stage: Stage,

    selected_index: TupleIndex,

    select_mode: SelectMode,

    transform_mode: TransformMode,

    instance_mode: InstanceMode,
    guard_length: GuardLength,
})
export type Model = typeof Model.Type

export const SelectedTupleStage = taggedStruct("SelectedTupleStage", {
    stage: Stage,
})

export const SelectedTupleIndex = taggedStruct("SelectedTupleIndex", {
    index: TupleIndex,
})

export const SelectedTupleSelectMode = taggedStruct("SelectedTupleSelectMode", {
    mode: SelectMode,
})

export const SelectedTupleTransformMode = taggedStruct(
    "SelectedTupleTransformMode",
    { mode: TransformMode }
)

export const SelectedTupleInstanceMode = taggedStruct(
    "SelectedTupleInstanceMode",
    { mode: InstanceMode }
)

export const SelectedTupleGuardLength = taggedStruct(
    "SelectedTupleGuardLength",
    { length: GuardLength }
)

export const Message = S.Union([
    SelectedTupleStage,
    SelectedTupleIndex,
    SelectedTupleSelectMode,
    SelectedTupleTransformMode,
    SelectedTupleInstanceMode,
    SelectedTupleGuardLength,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Make",

    selected_index: 0,

    select_mode: "Pick",

    transform_mode: "Evolve",

    instance_mode: "Guard",
    guard_length: 3,
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedTupleStage: ({ stage }) => ({
                model: evo(model, { stage: () => stage }),
                commands: [],
            }),

            SelectedTupleIndex: ({ index }) => ({
                model: evo(model, {
                    selected_index: () => index,
                }),
                commands: [],
            }),

            SelectedTupleSelectMode: ({ mode }) => ({
                model: evo(model, {
                    select_mode: () => mode,
                }),
                commands: [],
            }),

            SelectedTupleTransformMode: ({ mode }) => ({
                model: evo(model, {
                    transform_mode: () => mode,
                }),
                commands: [],
            }),

            SelectedTupleInstanceMode: ({ mode }) => ({
                model: evo(model, {
                    instance_mode: () => mode,
                }),
                commands: [],
            }),

            SelectedTupleGuardLength: ({ length }) => ({
                model: evo(model, {
                    guard_length: () => length,
                }),
                commands: [],
            }),
        })
    )

export const tuple_values = ["Ada", 36, true] as const

export const tuple_types = ["string", "number", "boolean"] as const

export const selected_value = (index: TupleIndex): string =>
    JSON.stringify(Tuple.get(person, index))

export const select_result = (mode: SelectMode): ReadonlyArray<unknown> => {
    switch (mode) {
        case "Pick":
            return Tuple.pick(person, [0, 2])
        case "Omit":
            return Tuple.omit(person, [1])
        case "Append":
            return Tuple.appendElement(person, "admin")
    }
}

export const transform_result = (mode: TransformMode): ReadonlyArray<unknown> =>
    mode === "Evolve"
        ? Tuple.evolve(person, [(name) => name.toUpperCase(), (age) => age + 1])
        : Tuple.renameIndices(person, ["2", "1", "0"])

export const guard_values = [10, 20, 30] as Array<number>

export const guard_result = (length: GuardLength): boolean =>
    Tuple.isTupleOf(guard_values, length)

export const instance_result = (
    model: Model
): Readonly<{
    label: string
    output: string
    detail: string
}> => {
    switch (model.instance_mode) {
        case "Guard":
            return {
                label: `Tuple.isTupleOf(values, ${model.guard_length})`,
                output: String(guard_result(model.guard_length)),
                detail:
                    model.guard_length === 3
                        ? "true: the Array<number> is narrowed to [number, number, number]."
                        : "false: the runtime length does not match the requested tuple length.",
            }

        case "Order":
            return {
                label: 'PersonOrder(["Ada",36], ["Grace",28])',
                output: String(person_comparison),
                detail: "-1 means the first tuple sorts before the second. Tuple ordering compares positions left-to-right.",
            }

        case "Reduce":
            return {
                label: "SummaryReducer.combineAll([[1,'a'],[2,'b'],[3,'c']])",
                output: JSON.stringify(summary),
                detail: "Each tuple position uses its own Reducer: numbers sum while strings concatenate.",
            }
    }
}
