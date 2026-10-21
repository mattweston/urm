import { BigInt as BI, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 BigInt examples
// -----------------------------------------------------------------------------

export const hugeExact = BI.sum(9007199254740993n, 7n)

export const safeDivision = BI.divide(17n, 5n)

export const divideByZero = BI.divide(17n, 0n)

export const integerSqrt = BI.sqrt(99n)

export const gcdExample = BI.gcd(48n, 18n)

export const lcmExample = BI.lcm(48n, 18n)

export const sumReducer = BI.ReducerSum.combineAll([2n, 3n, 4n])

export const productReducer = BI.ReducerMultiply.combineAll([2n, 3n, 4n])

// -----------------------------------------------------------------------------
// Teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Literals([
    "Convert",
    "Arithmetic",
    "IntegerMath",
    "Aggregate",
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Convert",
    "Arithmetic",
    "IntegerMath",
    "Aggregate",
]

export const ConvertCase = S.Literals([
    "HugeString",
    "Whitespace",
    "InvalidDecimal",
    "SafeNumber",
    "UnsafeNumber",
    "HugeToNumber",
])
export type ConvertCase = typeof ConvertCase.Type

export const ArithmeticMode = S.Literals([
    "Sum",
    "Multiply",
    "Subtract",
    "Divide",
    "DivideZero",
    "Remainder",
])
export type ArithmeticMode = typeof ArithmeticMode.Type

export const IntegerMathMode = S.Literals([
    "Gcd",
    "Lcm",
    "Sqrt",
    "SqrtFloor",
    "SqrtNegative",
    "Range",
])
export type IntegerMathMode = typeof IntegerMathMode.Type

export const AggregateMode = S.Literals([
    "SumAll",
    "MultiplyAll",
    "ReducerSum",
    "ReducerMultiply",
    "CombinerMax",
    "CombinerMin",
])
export type AggregateMode = typeof AggregateMode.Type

export const Model = S.Struct({
    stage: Stage,
    convertCase: ConvertCase,
    arithmeticMode: ArithmeticMode,
    integerMathMode: IntegerMathMode,
    aggregateMode: AggregateMode,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedBigIntStage: {
        stage: Stage,
    },
    SelectedBigIntConvertCase: {
        convertCase: ConvertCase,
    },
    SelectedBigIntArithmeticMode: {
        arithmeticMode: ArithmeticMode,
    },
    SelectedBigIntIntegerMathMode: {
        integerMathMode: IntegerMathMode,
    },
    SelectedBigIntAggregateMode: {
        aggregateMode: AggregateMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Convert",
    convertCase: "HugeString",
    arithmeticMode: "Divide",
    integerMathMode: "Gcd",
    aggregateMode: "ReducerSum",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedBigIntStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedBigIntConvertCase: ({ convertCase }) => ({
            model: evo(model, {
                convertCase: () => convertCase,
            }),
        }),

        SelectedBigIntArithmeticMode: ({ arithmeticMode }) => ({
            model: evo(model, {
                arithmeticMode: () => arithmeticMode,
            }),
        }),

        SelectedBigIntIntegerMathMode: ({ integerMathMode }) => ({
            model: evo(model, {
                integerMathMode: () => integerMathMode,
            }),
        }),

        SelectedBigIntAggregateMode: ({ aggregateMode }) => ({
            model: evo(model, {
                aggregateMode: () => aggregateMode,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

const optionBigIntLabel = (value: Option.Option<bigint>): string =>
    Option.match(value, {
        onNone: () => "Option.none()",
        onSome: (n) => `Option.some(${n}n)`,
    })

const optionNumberLabel = (value: Option.Option<number>): string =>
    Option.match(value, {
        onNone: () => "Option.none()",
        onSome: (n) => `Option.some(${n})`,
    })

export const convertResult = (
    mode: ConvertCase
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "HugeString":
            return {
                expression: 'BigInt.fromString("90071992547409931234567890")',
                output: optionBigIntLabel(
                    BI.fromString("90071992547409931234567890")
                ),
                detail: "fromString parses arbitrary-size integer text safely.",
            }

        case "Whitespace":
            return {
                expression: 'BigInt.fromString("   ")',
                output: optionBigIntLabel(BI.fromString("   ")),
                detail: 'Effect fromString rejects blank text; native BigInt(" ") instead coerces to 0n.',
            }

        case "InvalidDecimal":
            return {
                expression: 'BigInt.fromString("12.5")',
                output: optionBigIntLabel(BI.fromString("12.5")),
                detail: "BigInt is integer-only, so decimal text is invalid.",
            }

        case "SafeNumber":
            return {
                expression: "BigInt.fromNumber(Number.MAX_SAFE_INTEGER)",
                output: optionBigIntLabel(
                    BI.fromNumber(Number.MAX_SAFE_INTEGER)
                ),
                detail: "fromNumber only accepts safe integer Numbers.",
            }

        case "UnsafeNumber":
            return {
                expression: "BigInt.fromNumber(Number.MAX_SAFE_INTEGER + 1)",
                output: optionBigIntLabel(
                    BI.fromNumber(Number.MAX_SAFE_INTEGER + 1)
                ),
                detail: "Unsafe integer Numbers return Option.none() rather than freezing already-lost precision into a bigint.",
            }

        case "HugeToNumber":
            return {
                expression: "BigInt.toNumber(9007199254740992n)",
                output: optionNumberLabel(BI.toNumber(9007199254740992n)),
                detail: "toNumber is also safe: values outside the safe integer range return None.",
            }
    }
}

export const arithmeticResult = (
    mode: ArithmeticMode
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Sum":
            return {
                expression: "BigInt.sum(9007199254740993n, 7n)",
                output: `${BI.sum(9007199254740993n, 7n)}n`,
                detail: "Integer arithmetic remains exact beyond Number.MAX_SAFE_INTEGER.",
            }

        case "Multiply":
            return {
                expression: "BigInt.multiply(12345678901234567890n, 1000n)",
                output: `${BI.multiply(12345678901234567890n, 1000n)}n`,
                detail: "Multiplication remains exact for arbitrarily large integers.",
            }

        case "Subtract":
            return {
                expression: "BigInt.subtract(2n, 9n)",
                output: `${BI.subtract(2n, 9n)}n`,
                detail: "Negative bigint results are ordinary exact integers.",
            }

        case "Divide":
            return {
                expression: "BigInt.divide(17n, 5n)",
                output: optionBigIntLabel(BI.divide(17n, 5n)),
                detail: "BigInt division truncates toward zero: 17n / 5n = 3n.",
            }

        case "DivideZero":
            return {
                expression: "BigInt.divide(17n, 0n)",
                output: optionBigIntLabel(BI.divide(17n, 0n)),
                detail: "Safe divide returns None for zero; divideUnsafe throws RangeError.",
            }

        case "Remainder":
            return {
                expression: "BigInt.remainder(-17n, 5n)",
                output: `${BI.remainder(-17n, 5n)}n`,
                detail: "remainder follows native signed remainder semantics and throws for divisor 0n.",
            }
    }
}

export const integerMathResult = (
    mode: IntegerMathMode
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Gcd":
            return {
                expression: "BigInt.gcd(48n, 18n)",
                output: `${BI.gcd(48n, 18n)}n`,
                detail: "gcd computes a non-negative greatest common divisor.",
            }

        case "Lcm":
            return {
                expression: "BigInt.lcm(48n, 18n)",
                output: `${BI.lcm(48n, 18n)}n`,
                detail: "lcm computes the least common multiple; any zero input yields 0n.",
            }

        case "Sqrt":
            return {
                expression: "BigInt.sqrt(144n)",
                output: optionBigIntLabel(BI.sqrt(144n)),
                detail: "sqrt is safe and returns Option.some for non-negative inputs.",
            }

        case "SqrtFloor":
            return {
                expression: "BigInt.sqrt(99n)",
                output: optionBigIntLabel(BI.sqrt(99n)),
                detail: "For non-perfect squares, sqrt returns floor(sqrt(n)): 9n for 99n.",
            }

        case "SqrtNegative":
            return {
                expression: "BigInt.sqrt(-1n)",
                output: optionBigIntLabel(BI.sqrt(-1n)),
                detail: "Negative input returns None; sqrtUnsafe throws RangeError.",
            }

        case "Range": {
            const minimum = 10n
            const maximum = 100n
            const input = 120n
            return {
                expression: "between / clamp with 10n..100n",
                output: `between=${BI.between(input, { minimum, maximum })} · clamp=${BI.clamp(input, { minimum, maximum })}n`,
                detail: "between checks an inclusive range; clamp forces a bigint into it.",
            }
        }
    }
}

export const aggregateResult = (
    mode: AggregateMode
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    const values = [2n, 3n, 4n]

    switch (mode) {
        case "SumAll":
            return {
                expression: "BigInt.sumAll([2n, 3n, 4n])",
                output: `${BI.sumAll(values)}n`,
                detail: "sumAll directly aggregates an iterable; the empty identity is 0n.",
            }

        case "MultiplyAll":
            return {
                expression: "BigInt.multiplyAll([2n, 3n, 4n])",
                output: `${BI.multiplyAll(values)}n`,
                detail: "multiplyAll directly aggregates an iterable; the empty identity is 1n.",
            }

        case "ReducerSum":
            return {
                expression: "BigInt.ReducerSum.combineAll([2n, 3n, 4n])",
                output: `${BI.ReducerSum.combineAll(values)}n`,
                detail: "ReducerSum is the reusable Reducer<bigint> instance with identity 0n.",
            }

        case "ReducerMultiply":
            return {
                expression: "BigInt.ReducerMultiply.combineAll([2n, 3n, 4n])",
                output: `${BI.ReducerMultiply.combineAll(values)}n`,
                detail: "ReducerMultiply is the reusable Reducer<bigint> instance with identity 1n.",
            }

        case "CombinerMax":
            return {
                expression: "BigInt.CombinerMax.combine(12n, 99n)",
                output: `${BI.CombinerMax.combine(12n, 99n)}n`,
                detail: "CombinerMax keeps the larger bigint in APIs that consume a Combiner.",
            }

        case "CombinerMin":
            return {
                expression: "BigInt.CombinerMin.combine(12n, 99n)",
                output: `${BI.CombinerMin.combine(12n, 99n)}n`,
                detail: "CombinerMin keeps the smaller bigint using BigInt.Order.",
            }
    }
}
