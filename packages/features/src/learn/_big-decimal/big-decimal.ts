import { BigDecimal, Match, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 BigDecimal examples
// -----------------------------------------------------------------------------

export const oneTenth = BigDecimal.fromStringUnsafe("0.1")

export const twoTenths = BigDecimal.fromStringUnsafe("0.2")

export const exactThreeTenths = BigDecimal.sum(oneTenth, twoTenths)

export const jsThreeTenths = 0.1 + 0.2

export const stored = BigDecimal.fromStringUnsafe("123.4500")
// value = 1234500n, scale = 4

export const normalized = BigDecimal.normalize(stored)
// value = 12345n, scale = 2

export const safeParsed = BigDecimal.fromString("123.456")
// Option.some(BigDecimal)

export const invalidParsed = BigDecimal.fromString("123.abc")
// Option.none()

export const emptyStringParsed = BigDecimal.fromString("")
// Option.some(0)

export const exponentParsed = BigDecimal.fromString("1.25e3")
// Option.some(1250)

export const sumExample = BigDecimal.sum(
    BigDecimal.fromStringUnsafe("12.34"),
    BigDecimal.fromStringUnsafe("0.66")
)
// 13

export const multiplyExample = BigDecimal.multiply(
    BigDecimal.fromStringUnsafe("12.5"),
    BigDecimal.fromStringUnsafe("4")
)
// 50

export const divideExample = BigDecimal.divide(
    BigDecimal.fromStringUnsafe("1"),
    BigDecimal.fromStringUnsafe("3")
)
// Option.some(0.3333... up to default precision)

export const divideByZero = BigDecimal.divide(
    BigDecimal.fromStringUnsafe("1"),
    BigDecimal.fromStringUnsafe("0")
)
// Option.none()

export const remainderExample = BigDecimal.remainder(
    BigDecimal.fromStringUnsafe("10.5"),
    BigDecimal.fromStringUnsafe("4")
)
// Option.some(2.5)

export const equalAcrossScale = BigDecimal.equals(
    BigDecimal.fromStringUnsafe("1.0"),
    BigDecimal.fromStringUnsafe("1.00")
)
// true

export const roundedHalfEven = BigDecimal.round(
    BigDecimal.fromStringUnsafe("2.5"),
    {
        mode: "half-even",
        scale: 0,
    }
)
// 2

export const roundedHalfOdd = BigDecimal.round(
    BigDecimal.fromStringUnsafe("2.5"),
    {
        mode: "half-odd",
        scale: 0,
    }
)
// 3

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Parse", "Arithmetic", "Round", "Compare"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Parse",
    "Arithmetic",
    "Round",
    "Compare",
]

export const ParseCase = S.Literals([
    "Decimal",
    "TrailingZeros",
    "Exponent",
    "Empty",
    "Invalid",
])
export type ParseCase = typeof ParseCase.Type

export const ArithmeticMode = S.Literals([
    "ExactSum",
    "Sum",
    "Multiply",
    "Divide",
    "DivideZero",
    "Remainder",
])
export type ArithmeticMode = typeof ArithmeticMode.Type

export const RoundMode = S.Literals([
    "half-from-zero",
    "half-even",
    "half-odd",
    "ceil",
    "floor",
    "to-zero",
    "from-zero",
])
export type RoundMode = typeof RoundMode.Type

export const RoundInput = S.Literals(["2.5", "-2.5", "145", "-145"])
export type RoundInput = typeof RoundInput.Type

export const RoundScale = S.Union([S.Literal(0), S.Literal(-1)])
export type RoundScale = typeof RoundScale.Type

export const CompareMode = S.Literals([
    "Equals",
    "Order",
    "Clamp",
    "Format",
    "Predicates",
])
export type CompareMode = typeof CompareMode.Type

export const Model = S.Struct({
    stage: Stage,

    parseCase: ParseCase,

    arithmeticMode: ArithmeticMode,

    roundMode: RoundMode,
    roundInput: RoundInput,
    roundScale: RoundScale,

    compareMode: CompareMode,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedBigDecimalStage: {
        stage: Stage,
    },

    SelectedBigDecimalParseCase: {
        parseCase: ParseCase,
    },

    SelectedBigDecimalArithmeticMode: {
        arithmeticMode: ArithmeticMode,
    },

    SelectedBigDecimalRoundMode: {
        roundMode: RoundMode,
    },

    SelectedBigDecimalRoundInput: {
        roundInput: RoundInput,
    },

    SelectedBigDecimalRoundScale: {
        roundScale: RoundScale,
    },

    SelectedBigDecimalCompareMode: {
        compareMode: CompareMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Parse",

    parseCase: "TrailingZeros",

    arithmeticMode: "ExactSum",

    roundMode: "half-even",
    roundInput: "2.5",
    roundScale: 0,

    compareMode: "Equals",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedBigDecimalStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedBigDecimalParseCase: ({ parseCase }) => ({
            model: evo(model, {
                parseCase: () => parseCase,
            }),
        }),

        SelectedBigDecimalArithmeticMode: ({ arithmeticMode }) => ({
            model: evo(model, {
                arithmeticMode: () => arithmeticMode,
            }),
        }),

        SelectedBigDecimalRoundMode: ({ roundMode }) => ({
            model: evo(model, {
                roundMode: () => roundMode,
            }),
        }),

        SelectedBigDecimalRoundInput: ({ roundInput }) => ({
            model: evo(model, {
                roundInput: () => roundInput,
            }),
        }),

        SelectedBigDecimalRoundScale: ({ roundScale }) => ({
            model: evo(model, {
                roundScale: () => roundScale,
            }),
        }),

        SelectedBigDecimalCompareMode: ({ compareMode }) => ({
            model: evo(model, {
                compareMode: () => compareMode,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

const optionDecimalLabel = (
    value: Option.Option<BigDecimal.BigDecimal>
): string =>
    Option.match(value, {
        onNone: () => "Option.none()",
        onSome: (decimal) => `Option.some(${BigDecimal.format(decimal)})`,
    })

export const parseText = (parseCase: ParseCase): string => {
    switch (parseCase) {
        case "Decimal":
            return "123.456"
        case "TrailingZeros":
            return "123.4500"
        case "Exponent":
            return "1.25e3"
        case "Empty":
            return ""
        case "Invalid":
            return "123.abc"
    }
}

export const parseResult = (
    parseCase: ParseCase
): Readonly<{
    input: string
    option: string
    value: string
    scale: string
    normalized: string
    detail: string
}> => {
    const input = parseText(parseCase)
    const parsed = BigDecimal.fromString(input)

    return Option.match(parsed, {
        onNone: () => ({
            input,
            option: "Option.none()",
            value: "—",
            scale: "—",
            normalized: "—",
            detail: "fromString represents invalid external decimal text with Option.none() instead of throwing.",
        }),

        onSome: (decimal) => {
            const normalized = BigDecimal.normalize(decimal)

            return {
                input,
                option: `Option.some(${BigDecimal.format(decimal)})`,
                value: `${decimal.value}n`,
                scale: String(decimal.scale),
                normalized: `${BigDecimal.format(normalized)} · value=${normalized.value}n · scale=${normalized.scale}`,
                detail:
                    parseCase === "TrailingZeros"
                        ? "BigDecimal stores an unscaled bigint plus a decimal scale. normalize removes trailing decimal zeros into a canonical representation."
                        : parseCase === "Empty"
                          ? "The empty string is a valid BigDecimal input and parses as zero."
                          : "fromString accepts ordinary decimal and exponent notation when the resulting scale is a safe integer.",
            }
        },
    })
}

export const arithmeticResult = (
    mode: ArithmeticMode
): Readonly<{
    expression: string
    output: string
    detail: string
    secondary?: string
}> => {
    switch (mode) {
        case "ExactSum":
            return {
                expression:
                    'BigDecimal.sum(BigDecimal.fromStringUnsafe("0.1"), BigDecimal.fromStringUnsafe("0.2"))',
                output: BigDecimal.format(exactThreeTenths),
                secondary: `JavaScript 0.1 + 0.2 = ${String(jsThreeTenths)}`,
                detail: "BigDecimal keeps decimal arithmetic in bigint + scale form instead of using binary floating-point representation.",
            }

        case "Sum": {
            const a = BigDecimal.fromStringUnsafe("12.34")
            const b = BigDecimal.fromStringUnsafe("0.66")
            const result = BigDecimal.sum(a, b)

            return {
                expression: "BigDecimal.sum(12.34, 0.66)",
                output: BigDecimal.format(result),
                detail: "sum aligns scales before adding the unscaled bigint values.",
            }
        }

        case "Multiply": {
            const result = BigDecimal.multiply(
                BigDecimal.fromStringUnsafe("12.5"),
                BigDecimal.fromStringUnsafe("4")
            )

            return {
                expression: "BigDecimal.multiply(12.5, 4)",
                output: BigDecimal.format(result),
                detail: "multiply multiplies the bigint values and adds their decimal scales.",
            }
        }

        case "Divide": {
            const result = BigDecimal.divide(
                BigDecimal.fromStringUnsafe("1"),
                BigDecimal.fromStringUnsafe("3")
            )

            return {
                expression: "BigDecimal.divide(1, 3)",
                output: optionDecimalLabel(result),
                detail: "Safe divide returns Option. Non-terminating decimal quotients are represented with up to the module's default division precision.",
            }
        }

        case "DivideZero": {
            const result = BigDecimal.divide(
                BigDecimal.fromStringUnsafe("1"),
                BigDecimal.fromStringUnsafe("0")
            )

            return {
                expression: "BigDecimal.divide(1, 0)",
                output: optionDecimalLabel(result),
                detail: "Division by zero is Option.none(). divideUnsafe is the variant that throws a RangeError instead.",
            }
        }

        case "Remainder": {
            const result = BigDecimal.remainder(
                BigDecimal.fromStringUnsafe("10.5"),
                BigDecimal.fromStringUnsafe("4")
            )

            return {
                expression: "BigDecimal.remainder(10.5, 4)",
                output: optionDecimalLabel(result),
                detail: "remainder is also safe and returns Option.none() when the divisor is zero.",
            }
        }
    }
}

export const roundResult = (
    model: Model
): Readonly<{
    before: string
    after: string
    storage: string
    detail: string
}> => {
    const decimal = BigDecimal.fromStringUnsafe(model.roundInput)

    const rounded = BigDecimal.round(decimal, {
        mode: model.roundMode,
        scale: model.roundScale,
    })

    return {
        before: BigDecimal.format(decimal),
        after: BigDecimal.format(rounded),
        storage: `value=${rounded.value}n · scale=${rounded.scale}`,
        detail:
            model.roundScale === -1
                ? "Negative scales round positions to the left of the decimal point: scale -1 means tens."
                : "Scale 0 rounds to an integer. Half modes differ only when the value is exactly between two candidates.",
    }
}

export const scaleExample = (input: string, scale: number): string => {
    const decimal = BigDecimal.fromStringUnsafe(input)
    const scaled = BigDecimal.scale(decimal, scale)

    return `${BigDecimal.format(scaled)} · value=${scaled.value}n · scale=${scaled.scale}`
}

export const compareResult = (
    mode: CompareMode
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Equals": {
            const a = BigDecimal.fromStringUnsafe("1.0")
            const b = BigDecimal.fromStringUnsafe("1.00")

            return {
                expression: "BigDecimal.equals(1.0, 1.00)",
                output: String(BigDecimal.equals(a, b)),
                detail: "equals compares decimal value rather than raw storage scale. Equivalent normalized values are equal.",
            }
        }

        case "Order": {
            const a = BigDecimal.fromStringUnsafe("1.25")
            const b = BigDecimal.fromStringUnsafe("1.3")

            return {
                expression: "BigDecimal.Order(1.25, 1.3)",
                output: String(BigDecimal.Order(a, b)),
                detail: "Order supplies standard comparison semantics for APIs that accept an Order<BigDecimal>.",
            }
        }

        case "Clamp": {
            const minimum = BigDecimal.fromStringUnsafe("1")
            const maximum = BigDecimal.fromStringUnsafe("5")
            const input = BigDecimal.fromStringUnsafe("8.2")
            const clamped = BigDecimal.clamp(input, {
                minimum,
                maximum,
            })

            return {
                expression: "BigDecimal.clamp(8.2, { minimum: 1, maximum: 5 })",
                output: BigDecimal.format(clamped),
                detail: "between checks an inclusive range; clamp forces a value into that range.",
            }
        }

        case "Format": {
            const value = BigDecimal.fromStringUnsafe(
                "1234567890123456789012345.125"
            )

            return {
                expression: "format / toExponential / toNumberUnsafe",
                output: `format=${BigDecimal.format(value)} · exp=${BigDecimal.toExponential(value)} · number=${String(BigDecimal.toNumberUnsafe(value))}`,
                detail: "format preserves decimal text. toNumberUnsafe crosses into JavaScript number representation, so integer/fraction precision may be lost or overflow to Infinity.",
            }
        }

        case "Predicates": {
            const value = BigDecimal.fromStringUnsafe("-12.00")

            return {
                expression: "sign / isInteger / isNegative / isZero / abs",
                output: `sign=${BigDecimal.sign(value)} · integer=${BigDecimal.isInteger(value)} · negative=${BigDecimal.isNegative(value)} · zero=${BigDecimal.isZero(value)} · abs=${BigDecimal.format(BigDecimal.abs(value))}`,
                detail: "Predicates operate on decimal value semantics; normalize makes values like -12.00 recognizable as integers.",
            }
        }
    }
}
