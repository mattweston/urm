import { ByteSize, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 ByteSize examples
// -----------------------------------------------------------------------------

export const decimalMegabyte = ByteSize.megabytes(1)
// 1_000_000 bytes

export const binaryMebibyte = ByteSize.mebibytes(1)
// 1_048_576 bytes

export const fractionalDecimal = ByteSize.fromString("1.5 kB")
// Option.some(1500 bytes)

export const fractionalBinary = ByteSize.fromString("1.5 KiB")
// Option.some(1536 bytes)

export const fractionalByte = ByteSize.fromString("0.1 B")
// Option.none() — not an integral number of bytes

export const safeSubtraction = ByteSize.subtract(
    ByteSize.megabytes(10),
    ByteSize.megabytes(3)
)

export const subtractionUnderflow = ByteSize.subtract(
    ByteSize.megabytes(3),
    ByteSize.megabytes(10)
)
// Option.none()

export const scaled = ByteSize.times(ByteSize.kibibytes(4), 3)

export const divided = ByteSize.divide(ByteSize.bytes(10), 3)
// Option.some(3 bytes), remainder discarded

export const formattedDecimal = ByteSize.format(ByteSize.bytes(1_500_000), {
    system: "decimal",
})
// "1.5 MB"

export const formattedBinary = ByteSize.format(ByteSize.bytes(1_572_864), {
    system: "binary",
})
// "1.5 MiB"

export const aggregateSum = ByteSize.ReducerSum.combineAll([
    ByteSize.kilobytes(250),
    ByteSize.kilobytes(750),
])
// 1 MB

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Parse", "Units", "Math", "Format"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = ["Parse", "Units", "Math", "Format"]

export const ParseCase = S.Literals([
    "Decimal",
    "Binary",
    "FractionalByte",
    "LongName",
    "InvalidUnit",
])
export type ParseCase = typeof ParseCase.Type

export const UnitCase = S.Literals([
    "MBvsMiB",
    "GBvsGiB",
    "Constructors",
    "ToUnit",
])
export type UnitCase = typeof UnitCase.Type

export const MathMode = S.Literals([
    "Sum",
    "Subtract",
    "Underflow",
    "Times",
    "Divide",
    "InvalidScalar",
])
export type MathMode = typeof MathMode.Type

export const FormatMode = S.Literals([
    "AutoDecimal",
    "AutoBinary",
    "FixedUnit",
    "Precision",
    "Compare",
    "Aggregate",
])
export type FormatMode = typeof FormatMode.Type

export const Model = S.Struct({
    stage: Stage,
    parseCase: ParseCase,
    unitCase: UnitCase,
    mathMode: MathMode,
    formatMode: FormatMode,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedByteSizeStage: {
        stage: Stage,
    },
    SelectedByteSizeParseCase: {
        parseCase: ParseCase,
    },
    SelectedByteSizeUnitCase: {
        unitCase: UnitCase,
    },
    SelectedByteSizeMathMode: {
        mathMode: MathMode,
    },
    SelectedByteSizeFormatMode: {
        formatMode: FormatMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Parse",
    parseCase: "Decimal",
    unitCase: "MBvsMiB",
    mathMode: "Subtract",
    formatMode: "AutoBinary",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedByteSizeStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedByteSizeParseCase: ({ parseCase }) => ({
            model: evo(model, {
                parseCase: () => parseCase,
            }),
        }),

        SelectedByteSizeUnitCase: ({ unitCase }) => ({
            model: evo(model, {
                unitCase: () => unitCase,
            }),
        }),

        SelectedByteSizeMathMode: ({ mathMode }) => ({
            model: evo(model, {
                mathMode: () => mathMode,
            }),
        }),

        SelectedByteSizeFormatMode: ({ formatMode }) => ({
            model: evo(model, {
                formatMode: () => formatMode,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

const optionLabel = (value: Option.Option<ByteSize.ByteSize>): string =>
    Option.match(value, {
        onNone: () => "Option.none()",
        onSome: (size) => `Option.some(${ByteSize.toBigInt(size)} B)`,
    })

export const parseResult = (
    mode: ParseCase
): Readonly<{
    input: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Decimal": {
            const input = "1.5 kB"
            return {
                input,
                output: optionLabel(ByteSize.fromString(input)),
                detail: "Decimal SI: 1 kB = 1000 bytes, so 1.5 kB is exactly 1500 bytes.",
            }
        }

        case "Binary": {
            const input = "1.5 KiB"
            return {
                input,
                output: optionLabel(ByteSize.fromString(input)),
                detail: "Binary IEC: 1 KiB = 1024 bytes, so 1.5 KiB is exactly 1536 bytes.",
            }
        }

        case "FractionalByte": {
            const input = "0.1 B"
            return {
                input,
                output: optionLabel(ByteSize.fromString(input)),
                detail: "A ByteSize must represent an integral byte count. 0.1 B is rejected instead of being rounded.",
            }
        }

        case "LongName": {
            const input = "2.5 mebibytes"
            return {
                input,
                output: optionLabel(ByteSize.fromString(input)),
                detail: "External string parsing accepts canonical symbols and lowercase unit names, including fractional quantities that resolve to integral bytes.",
            }
        }

        case "InvalidUnit": {
            const input = "5 bananas"
            return {
                input,
                output: optionLabel(ByteSize.fromString(input)),
                detail: "Unsupported syntax or unit names are Option.none(); fromStringUnsafe is the throwing form.",
            }
        }
    }
}

export const unitResult = (
    mode: UnitCase
): Readonly<{
    left: string
    right: string
    detail: string
}> => {
    switch (mode) {
        case "MBvsMiB": {
            const mb = ByteSize.megabytes(1)
            const mib = ByteSize.mebibytes(1)

            return {
                left: `1 MB = ${ByteSize.toBigInt(mb)} B`,
                right: `1 MiB = ${ByteSize.toBigInt(mib)} B`,
                detail: "Decimal units use powers of 1000; binary IEC units use powers of 1024.",
            }
        }

        case "GBvsGiB": {
            const gb = ByteSize.gigabytes(1)
            const gib = ByteSize.gibibytes(1)

            return {
                left: `1 GB = ${ByteSize.toBigInt(gb)} B`,
                right: `1 GiB = ${ByteSize.toBigInt(gib)} B`,
                detail: "The gap grows with larger units: GB and GiB are not interchangeable labels.",
            }
        }

        case "Constructors":
            return {
                left: `kilobytes(1.5) = ${ByteSize.toBigInt(ByteSize.kilobytes(1.5))} B`,
                right: `kibibytes(1.5) = ${ByteSize.toBigInt(ByteSize.kibibytes(1.5))} B`,
                detail: "Unit constructors accept number or bigint quantities only when the final byte count is an exact non-negative safe integer (for number inputs).",
            }

        case "ToUnit": {
            const value = ByteSize.bytes(1_500_000)

            return {
                left: `toUnit(MB) = ${ByteSize.toUnit(value, "MB")}`,
                right: `toUnit(MiB) = ${ByteSize.toUnit(value, "MiB")}`,
                detail: "toUnit returns an approximate JavaScript number for display/interoperability; toBigInt keeps the exact byte count.",
            }
        }
    }
}

export const mathResult = (
    mode: MathMode
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Sum": {
            const result = ByteSize.sum(
                ByteSize.megabytes(2),
                ByteSize.kilobytes(500)
            )

            return {
                expression: "ByteSize.sum(2 MB, 500 kB)",
                output: ByteSize.format(result, {
                    system: "decimal",
                }),
                detail: "sum adds exact underlying bigint byte counts.",
            }
        }

        case "Subtract": {
            const result = ByteSize.subtract(
                ByteSize.megabytes(10),
                ByteSize.megabytes(3)
            )

            return {
                expression: "ByteSize.subtract(10 MB, 3 MB)",
                output: optionLabel(result),
                detail: "ByteSize is non-negative, so subtraction is safe and returns Option.",
            }
        }

        case "Underflow": {
            const result = ByteSize.subtract(
                ByteSize.megabytes(3),
                ByteSize.megabytes(10)
            )

            return {
                expression: "ByteSize.subtract(3 MB, 10 MB)",
                output: optionLabel(result),
                detail: "Underflow is Option.none(); subtractUnsafe throws instead.",
            }
        }

        case "Times": {
            const result = ByteSize.times(ByteSize.kibibytes(4), 3)

            return {
                expression: "ByteSize.times(4 KiB, 3)",
                output: optionLabel(result),
                detail: "times accepts only a non-negative integer scalar; the result remains an exact byte count.",
            }
        }

        case "Divide": {
            const result = ByteSize.divide(ByteSize.bytes(10), 3)

            return {
                expression: "ByteSize.divide(10 B, 3)",
                output: optionLabel(result),
                detail: "divide accepts a positive integer divisor and discards any remainder, so 10 B / 3 becomes 3 B.",
            }
        }

        case "InvalidScalar": {
            const result = ByteSize.times(ByteSize.bytes(10), 1.5)

            return {
                expression: "ByteSize.times(10 B, 1.5)",
                output: optionLabel(result),
                detail: "Scalar math intentionally accepts only integer scalars. Fractional scalar multiplication returns None.",
            }
        }
    }
}

export const formatResult = (
    mode: FormatMode
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "AutoDecimal": {
            const value = ByteSize.bytes(1_500_000)

            return {
                expression: 'ByteSize.format(1500000 B, { system: "decimal" })',
                output: ByteSize.format(value, {
                    system: "decimal",
                }),
                detail: "Automatic decimal formatting chooses the largest useful SI unit.",
            }
        }

        case "AutoBinary": {
            const value = ByteSize.bytes(1_572_864)

            return {
                expression: 'ByteSize.format(1572864 B, { system: "binary" })',
                output: ByteSize.format(value, {
                    system: "binary",
                }),
                detail: "Binary formatting chooses IEC symbols such as KiB, MiB, and GiB.",
            }
        }

        case "FixedUnit": {
            const value = ByteSize.bytes(1_500_000)

            return {
                expression: 'ByteSize.format(value, { unit: "kB" })',
                output: ByteSize.format(value, {
                    unit: "kB",
                }),
                detail: "Specifying a unit disables automatic unit choice and formats in exactly that unit.",
            }
        }

        case "Precision": {
            const value = ByteSize.bytes(1_536)

            return {
                expression:
                    'format(1536 B, { unit: "KiB", precision: 3, trailingZeros: true })',
                output: ByteSize.format(value, {
                    unit: "KiB",
                    precision: 3,
                    trailingZeros: true,
                }),
                detail: "Formatting precision is 0..20. trailingZeros controls whether the requested precision is kept visually.",
            }
        }

        case "Compare": {
            const value = ByteSize.megabytes(12)
            const minimum = ByteSize.megabytes(5)
            const maximum = ByteSize.megabytes(10)
            const clamped = ByteSize.clamp(value, {
                minimum,
                maximum,
            })

            return {
                expression: "between / equals / clamp / Order",
                output: `between=${ByteSize.between(value, { minimum, maximum })} · clamp=${ByteSize.format(clamped, { system: "decimal" })}`,
                detail: "ByteSize reuses bigint ordering semantics and provides Order, Equivalence, equality, range, min/max, and clamp helpers.",
            }
        }

        case "Aggregate": {
            const values = [ByteSize.kilobytes(250), ByteSize.kilobytes(750)]
            const sum = ByteSize.ReducerSum.combineAll(values)
            const max = ByteSize.CombinerMax.combine(values[0], values[1])

            return {
                expression: "ReducerSum / CombinerMax / CombinerMin",
                output: `sum=${ByteSize.format(sum, { system: "decimal" })} · max=${ByteSize.format(max, { system: "decimal" })}`,
                detail: "ReducerSum folds from zero; CombinerMax/Min are reusable non-empty pairwise combination instances.",
            }
        }
    }
}
