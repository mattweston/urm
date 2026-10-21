import { Match as M, Number as Num, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Number examples
// -----------------------------------------------------------------------------

export const parsed_integer = Num.parse("42")
export const parsed_decimal = Num.parse("3.14")
export const parsed_nan = Num.parse("NaN")
export const parsed_infinity = Num.parse("Infinity")
export const parsed_invalid = Num.parse("not a number")

// isNumber narrows unknown -> number. Like JavaScript typeof, NaN and
// Infinity are still numbers.
export const number_guard = Num.isNumber(42)
export const string_guard = Num.isNumber("42")
export const nan_guard = Num.isNumber(Number.NaN)

// Pipe-friendly arithmetic helpers are dual.
export const arithmetic = {
    sum: Num.sum(12, 4),
    subtract: Num.subtract(12, 4),
    multiply: Num.multiply(12, 4),
    divide: Num.divide(12, 4),
    divideByZero: Num.divide(12, 0),
    remainder: Num.remainder(12, 5),
    rounded: Num.round(1.567, 2),
}

// Range / ordering helpers.
export const between_0_and_10 = Num.between({
    minimum: 0,
    maximum: 10,
})

export const clamp_0_to_10 = Num.clamp({
    minimum: 0,
    maximum: 10,
})

export const range_examples = {
    inside: between_0_and_10(4),
    below: clamp_0_to_10(-3),
    above: clamp_0_to_10(14),
    sign: Num.sign(-5),
    comparison: Num.Order(4, 9),
}

// Collection helpers and Reducer instances.
export const values = [3, 5, 2, 8]

export const total = Num.sumAll(values)
export const product = Num.multiplyAll(values)

export const reducer_total = Num.ReducerSum.combineAll(values)

export const reducer_product = Num.ReducerMultiply.combineAll(values)

export const reducer_min = Num.ReducerMin.combineAll(values)

export const reducer_max = Num.ReducerMax.combineAll(values)

export const next_capacity = Num.nextPow2(17)
// 32

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Parse"),
    S.Literal("Math"),
    S.Literal("Range"),
    S.Literal("Aggregate"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Parse",
    "Math",
    "Range",
    "Aggregate",
]

export const ParsePreset = S.Union([
    S.Literal("Integer"),
    S.Literal("Decimal"),
    S.Literal("NaN"),
    S.Literal("Infinity"),
    S.Literal("Invalid"),
    S.Literal("Empty"),
])
export type ParsePreset = typeof ParsePreset.Type

export const MathMode = S.Union([
    S.Literal("Sum"),
    S.Literal("Subtract"),
    S.Literal("Multiply"),
    S.Literal("Divide"),
    S.Literal("Remainder"),
    S.Literal("Round"),
])
export type MathMode = typeof MathMode.Type

export const RangeValue = S.Union([S.Literal(-3), S.Literal(4), S.Literal(14)])
export type RangeValue = typeof RangeValue.Type

export const AggregateMode = S.Union([
    S.Literal("Sum"),
    S.Literal("Multiply"),
    S.Literal("Min"),
    S.Literal("Max"),
    S.Literal("NextPow2"),
])
export type AggregateMode = typeof AggregateMode.Type

export const Model = S.Struct({
    stage: Stage,

    parse_preset: ParsePreset,

    math_mode: MathMode,
    math_left: S.Number,
    math_right: S.Number,

    range_value: RangeValue,

    aggregate_mode: AggregateMode,
})
export type Model = typeof Model.Type

export const SelectedNumberStage = taggedStruct("SelectedNumberStage", {
    stage: Stage,
})

export const SelectedNumberParsePreset = taggedStruct(
    "SelectedNumberParsePreset",
    { parse_preset: ParsePreset }
)

export const SelectedNumberMathMode = taggedStruct("SelectedNumberMathMode", {
    math_mode: MathMode,
})
export const SelectedNumberMathLeft = taggedStruct("SelectedNumberMathLeft", {
    value: S.Number,
})
export const SelectedNumberMathRight = taggedStruct("SelectedNumberMathRight", {
    value: S.Number,
})

export const SelectedNumberRangeValue = taggedStruct(
    "SelectedNumberRangeValue",
    { range_value: RangeValue }
)

export const SelectedNumberAggregateMode = taggedStruct(
    "SelectedNumberAggregateMode",
    { aggregate_mode: AggregateMode }
)

export const Message = S.Union([
    SelectedNumberStage,

    SelectedNumberParsePreset,

    SelectedNumberMathMode,
    SelectedNumberMathLeft,
    SelectedNumberMathRight,

    SelectedNumberRangeValue,

    SelectedNumberAggregateMode,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Parse",

    parse_preset: "Integer",

    math_mode: "Divide",
    math_left: 12,
    math_right: 4,

    range_value: 4,

    aggregate_mode: "Sum",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedNumberStage: ({ stage }) => ({
                model: evo(model, { stage: () => stage }),
                commands: [],
            }),

            SelectedNumberParsePreset: ({ parse_preset }) => ({
                model: evo(model, {
                    parse_preset: () => parse_preset,
                }),
                commands: [],
            }),

            SelectedNumberMathMode: ({ math_mode }) => ({
                model: evo(model, {
                    math_mode: () => math_mode,
                }),
                commands: [],
            }),

            SelectedNumberMathLeft: ({ value }) => ({
                model: evo(model, {
                    math_left: () => value,
                }),
                commands: [],
            }),

            SelectedNumberMathRight: ({ value }) => ({
                model: evo(model, {
                    math_right: () => value,
                }),
                commands: [],
            }),

            SelectedNumberRangeValue: ({ range_value }) => ({
                model: evo(model, {
                    range_value: () => range_value,
                }),
                commands: [],
            }),

            SelectedNumberAggregateMode: ({ aggregate_mode }) => ({
                model: evo(model, {
                    aggregate_mode: () => aggregate_mode,
                }),
                commands: [],
            }),
        })
    )

export const parse_input = (preset: ParsePreset): string => {
    switch (preset) {
        case "Integer":
            return "42"
        case "Decimal":
            return "3.14"
        case "NaN":
            return "NaN"
        case "Infinity":
            return "Infinity"
        case "Invalid":
            return "not a number"
        case "Empty":
            return "   "
    }
}

export const parse_result = (preset: ParsePreset): Option.Option<number> =>
    Num.parse(parse_input(preset))

export const parse_guard_label = (preset: ParsePreset): string =>
    Option.match(parse_result(preset), {
        onNone: () => "No number produced, so there is nothing to guard.",
        onSome: (value) =>
            `Number.isNumber(${String(value)}) → ${String(
                Num.isNumber(value)
            )}`,
    })

export const math_result = (
    model: Model
): Readonly<{
    expression: string
    output: string
    is_optional: boolean
}> => {
    const left = model.math_left
    const right = model.math_right

    switch (model.math_mode) {
        case "Sum":
            return {
                expression: `Number.sum(${left}, ${right})`,
                output: String(Num.sum(left, right)),
                is_optional: false,
            }

        case "Subtract":
            return {
                expression: `Number.subtract(${left}, ${right})`,
                output: String(Num.subtract(left, right)),
                is_optional: false,
            }

        case "Multiply":
            return {
                expression: `Number.multiply(${left}, ${right})`,
                output: String(Num.multiply(left, right)),
                is_optional: false,
            }

        case "Divide": {
            const result = Num.divide(left, right)
            return {
                expression: `Number.divide(${left}, ${right})`,
                output: Option.match(result, {
                    onNone: () => "Option.none()",
                    onSome: (value) => `Option.some(${value})`,
                }),
                is_optional: true,
            }
        }

        case "Remainder":
            return {
                expression: `Number.remainder(${left}, ${right})`,
                output: String(Num.remainder(left, right)),
                is_optional: false,
            }

        case "Round":
            return {
                expression: `Number.round(${left}, ${right})`,
                output: String(Num.round(left, right)),
                is_optional: false,
            }
    }
}

export const range_result = (
    value: RangeValue
): Readonly<{
    between: boolean
    clamped: number
    sign: number
    compared_to_five: number
}> => ({
    between: Num.between(value, {
        minimum: 0,
        maximum: 10,
    }),
    clamped: Num.clamp(value, {
        minimum: 0,
        maximum: 10,
    }),
    sign: Num.sign(value),
    compared_to_five: Num.Order(value, 5),
})

export const aggregate_values = [3, 5, 2, 8] as const

export const aggregate_result = (
    mode: AggregateMode
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Sum":
            return {
                expression: "Number.ReducerSum.combineAll([3,5,2,8])",
                output: String(Num.ReducerSum.combineAll(aggregate_values)),
                detail: "ReducerSum starts from 0 and adds every value.",
            }

        case "Multiply":
            return {
                expression: "Number.ReducerMultiply.combineAll([3,5,2,8])",
                output: String(
                    Num.ReducerMultiply.combineAll(aggregate_values)
                ),
                detail: "ReducerMultiply starts from 1 and multiplies every value.",
            }

        case "Min":
            return {
                expression: "Number.ReducerMin.combineAll([3,5,2,8])",
                output: String(Num.ReducerMin.combineAll(aggregate_values)),
                detail: "ReducerMin starts from Infinity and keeps the smallest value.",
            }

        case "Max":
            return {
                expression: "Number.ReducerMax.combineAll([3,5,2,8])",
                output: String(Num.ReducerMax.combineAll(aggregate_values)),
                detail: "ReducerMax starts from -Infinity and keeps the largest value.",
            }

        case "NextPow2":
            return {
                expression: "Number.nextPow2(17)",
                output: String(Num.nextPow2(17)),
                detail: "nextPow2 rounds capacity-like values upward to the next power of two.",
            }
    }
}
