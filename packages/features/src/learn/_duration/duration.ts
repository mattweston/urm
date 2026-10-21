import { Duration, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Convert"),
    S.Literal("Math"),
    S.Literal("Compare"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Convert",
    "Math",
    "Compare",
]

export const BuildCase = S.Union([
    S.Literal("String"),
    S.Literal("Object"),
    S.Literal("Nanos"),
    S.Literal("Infinity"),
    S.Literal("Invalid"),
])
export type BuildCase = typeof BuildCase.Type

export const ConvertCase = S.Union([
    S.Literal("Complex"),
    S.Literal("SubMillisecond"),
    S.Literal("Infinity"),
    S.Literal("Negative"),
])
export type ConvertCase = typeof ConvertCase.Type

export const MathCase = S.Union([
    S.Literal("Sum"),
    S.Literal("Subtract"),
    S.Literal("Times"),
    S.Literal("Divide"),
    S.Literal("Infinity"),
])
export type MathCase = typeof MathCase.Type

export const CompareCase = S.Union([
    S.Literal("Below"),
    S.Literal("Inside"),
    S.Literal("Above"),
])
export type CompareCase = typeof CompareCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    convertCase: ConvertCase,
    mathCase: MathCase,
    compareCase: CompareCase,
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
        eyebrow: "construct + decode",
        title: "Many inputs normalize to one Duration value",
        description:
            "Duration accepts unit constructors and a broad Input union: milliseconds, nanoseconds, hrtime tuples, strings, additive objects, existing Durations, and signed infinity.",
        code: `Duration.seconds(5)
Duration.millis(250)
Duration.nanos(1_500_000_001n)

Duration.fromInput("90 seconds")
// Option.some(Duration)

Duration.fromInput({
    minutes: 1,
    seconds: 30,
    milliseconds: 250
})

Duration.fromInput("invalid" as any)
// Option.none()`,
        apis: [
            "Duration.fromInput",
            "Duration.fromInputUnsafe",
            "Duration.nanos",
            "Duration.micros",
            "Duration.millis",
            "Duration.seconds",
            "Duration.minutes",
            "Duration.hours",
            "Duration.days",
            "Duration.weeks",
            "Duration.infinity",
            "Duration.negativeInfinity",
        ],
        notice: "Safe decoding returns Option. Fractional millisecond-based values are normalized to nanoseconds; the public value representation is one of Millis, Nanos, Infinity, or NegativeInfinity.",
    },
    Convert: {
        eyebrow: "inspect + convert",
        title: "One span can be viewed at different precisions",
        description:
            "Use ordinary numeric conversions for common units, toNanos when exact bigint precision matters, parts for normalized components, and format for compact human-readable output.",
        code: `const duration =
    Duration.fromInputUnsafe({
        days: 1,
        hours: 2,
        minutes: 30,
        seconds: 45,
        milliseconds: 123
    })

Duration.format(duration)
// "1d 2h 30m 45s 123ms"

Duration.parts(duration)

Duration.toMillis(duration)
Duration.toSeconds(duration)
Duration.toNanos(duration)
// Option.some(bigint)`,
        apis: [
            "Duration.format",
            "Duration.parts",
            "Duration.toHrTime",
            "Duration.toMillis",
            "Duration.toSeconds",
            "Duration.toMinutes",
            "Duration.toHours",
            "Duration.toDays",
            "Duration.toWeeks",
            "Duration.toNanos",
            "Duration.toNanosUnsafe",
        ],
        notice: "toNanos returns Option because ±Infinity cannot be represented as bigint. toNanosUnsafe is appropriate only when finiteness is already guaranteed.",
    },
    Math: {
        eyebrow: "signed arithmetic",
        title: "Duration math preserves sign and infinity semantics",
        description:
            "Durations can now be negative. Addition, subtraction, multiplication, division, absolute value, and negation all operate on finite and infinite values with explicit rules.",
        code: `Duration.sum(
    Duration.seconds(5),
    Duration.millis(750)
)
// 5.75s

Duration.subtract(
    Duration.seconds(3),
    Duration.seconds(5)
)
// -2s

Duration.divide(
    Duration.seconds(10),
    4
)
// Option.some(2.5s)

Duration.sum(
    Duration.infinity,
    Duration.negativeInfinity
)
// 0`,
        apis: [
            "Duration.sum",
            "Duration.subtract",
            "Duration.times",
            "Duration.divide",
            "Duration.divideUnsafe",
            "Duration.abs",
            "Duration.negate",
            "Duration.isZero",
            "Duration.isNegative",
            "Duration.isPositive",
            "Duration.isFinite",
        ],
        notice: "divide is the safe API: invalid divisors can produce Option.none. Nanosecond-backed durations require integer-compatible multipliers/divisors for bigint arithmetic.",
    },
    Compare: {
        eyebrow: "ordering + aggregation",
        title: "Compare, clamp, and aggregate duration values",
        description:
            "Duration ships an Order and Equivalence plus range helpers. v4 also exposes a sum Reducer and min/max Combiners for APIs that consume reusable aggregation strategies.",
        code: `const min = Duration.seconds(1)
const max = Duration.seconds(5)

Duration.between(value, {
    minimum: min,
    maximum: max
})

Duration.clamp(value, {
    minimum: min,
    maximum: max
})

Duration.ReducerSum.combineAll([
    Duration.millis(250),
    Duration.seconds(1),
    Duration.millis(2500)
])`,
        apis: [
            "Duration.Order",
            "Duration.Equivalence",
            "Duration.equals",
            "Duration.between",
            "Duration.clamp",
            "Duration.min",
            "Duration.max",
            "Duration.isLessThan",
            "Duration.isGreaterThan",
            "Duration.ReducerSum",
            "Duration.CombinerMin",
            "Duration.CombinerMax",
        ],
        notice: "Order places NegativeInfinity before every finite duration and Infinity after every finite duration. Equivalence compares the represented span, so 5 seconds equals 5000 milliseconds.",
    },
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const format_number = (value: number): string =>
    value === Infinity
        ? "Infinity"
        : value === -Infinity
          ? "-Infinity"
          : Number.isInteger(value)
            ? String(value)
            : String(Number(value.toFixed(9)))

const duration_tag = (duration: Duration.Duration): string =>
    duration.value._tag

const input_for_build_case = (buildCase: BuildCase): unknown => {
    if (buildCase === "String") {
        return "90 seconds"
    }

    if (buildCase === "Object") {
        return {
            minutes: 1,
            seconds: 30,
            milliseconds: 250,
        }
    }

    if (buildCase === "Nanos") {
        return 1_500_000_001n
    }

    if (buildCase === "Infinity") {
        return "Infinity"
    }

    return "not a duration"
}

export const format_input = (input: unknown): string => {
    if (typeof input === "bigint") {
        return `${input}n`
    }

    if (typeof input === "string") {
        return `"${input}"`
    }

    try {
        return JSON.stringify(input)
    } catch {
        return String(input)
    }
}

// -----------------------------------------------------------------------------
// BUILD SNAPSHOT
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    input: string
    decoded: boolean
    tag: string
    formatted: string
    millis: string
    finite: string
    positive: string
    negative: string
    isDuration: string
}>

export const build_snapshot = (model: Model): BuildSnapshot => {
    const raw = input_for_build_case(model.buildCase)

    const decoded = Duration.fromInput(raw as Duration.Input)

    if (Option.isNone(decoded)) {
        return {
            input: format_input(raw),
            decoded: false,
            tag: "—",
            formatted: "—",
            millis: "—",
            finite: "—",
            positive: "—",
            negative: "—",
            isDuration: "false",
        }
    }

    const duration = decoded.value

    return {
        input: format_input(raw),
        decoded: true,
        tag: duration_tag(duration),
        formatted: Duration.format(duration),
        millis: format_number(Duration.toMillis(duration)),
        finite: String(Duration.isFinite(duration)),
        positive: String(Duration.isPositive(duration)),
        negative: String(Duration.isNegative(duration)),
        isDuration: String(Duration.isDuration(duration)),
    }
}

// -----------------------------------------------------------------------------
// CONVERT SNAPSHOT
// -----------------------------------------------------------------------------

const duration_for_convert_case = (
    convertCase: ConvertCase
): Duration.Duration => {
    if (convertCase === "Complex") {
        return Duration.fromInputUnsafe({
            days: 1,
            hours: 2,
            minutes: 30,
            seconds: 45,
            milliseconds: 123,
        })
    }

    if (convertCase === "SubMillisecond") {
        return Duration.nanos(1_500_001n)
    }

    if (convertCase === "Infinity") {
        return Duration.infinity
    }

    return Duration.fromInputUnsafe("-90 seconds")
}

export type ConvertSnapshot = Readonly<{
    tag: string
    formatted: string
    millis: string
    seconds: string
    minutes: string
    hours: string
    days: string
    weeks: string
    nanos: string
    hrtime: string
    parts: Readonly<{
        days: string
        hours: string
        minutes: string
        seconds: string
        millis: string
        nanos: string
    }>
}>

export const convert_snapshot = (model: Model): ConvertSnapshot => {
    const duration = duration_for_convert_case(model.convertCase)

    const nanos = Duration.toNanos(duration)

    const parts = Duration.parts(duration)

    const hrtime = Duration.isFinite(duration)
        ? Duration.toHrTime(duration)
        : undefined

    return {
        tag: duration_tag(duration),
        formatted: Duration.format(duration),
        millis: format_number(Duration.toMillis(duration)),
        seconds: format_number(Duration.toSeconds(duration)),
        minutes: format_number(Duration.toMinutes(duration)),
        hours: format_number(Duration.toHours(duration)),
        days: format_number(Duration.toDays(duration)),
        weeks: format_number(Duration.toWeeks(duration)),
        nanos: Option.isSome(nanos) ? `${nanos.value}n` : "None",
        hrtime:
            hrtime === undefined
                ? "not finite"
                : `[${format_number(hrtime[0])}, ${format_number(hrtime[1])}]`,
        parts: {
            days: format_number(parts.days),
            hours: format_number(parts.hours),
            minutes: format_number(parts.minutes),
            seconds: format_number(parts.seconds),
            millis: format_number(parts.millis),
            nanos: format_number(parts.nanos),
        },
    }
}

// -----------------------------------------------------------------------------
// MATH SNAPSHOT
// -----------------------------------------------------------------------------

export type MathSnapshot = Readonly<{
    expression: string
    left: string
    operator: string
    right: string
    result: string
    resultTag: string
    safe: string
    note: string
}>

export const math_snapshot = (model: Model): MathSnapshot => {
    if (model.mathCase === "Sum") {
        const left = Duration.seconds(5)
        const right = Duration.millis(750)
        const result = Duration.sum(left, right)

        return {
            expression: "5 seconds + 750 millis",
            left: Duration.format(left),
            operator: "+",
            right: Duration.format(right),
            result: Duration.format(result),
            resultTag: duration_tag(result),
            safe: "direct",
            note: "Finite values preserve sub-millisecond precision when needed.",
        }
    }

    if (model.mathCase === "Subtract") {
        const left = Duration.seconds(3)
        const right = Duration.seconds(5)
        const result = Duration.subtract(left, right)

        return {
            expression: "3 seconds − 5 seconds",
            left: Duration.format(left),
            operator: "−",
            right: Duration.format(right),
            result: Duration.format(result),
            resultTag: duration_tag(result),
            safe: "direct",
            note: "Subtraction may return a negative Duration.",
        }
    }

    if (model.mathCase === "Times") {
        const left = Duration.seconds(1.5)
        const result = Duration.times(left, 3)

        return {
            expression: "1.5 seconds × 3",
            left: Duration.format(left),
            operator: "×",
            right: "3",
            result: Duration.format(result),
            resultTag: duration_tag(result),
            safe: "direct",
            note: "Fractional millisecond constructors can be nanosecond-backed.",
        }
    }

    if (model.mathCase === "Divide") {
        const left = Duration.seconds(10)
        const divided = Duration.divide(left, 4)

        const result = Option.isSome(divided) ? divided.value : Duration.zero

        return {
            expression: "10 seconds ÷ 4",
            left: Duration.format(left),
            operator: "÷",
            right: "4",
            result: Option.isSome(divided)
                ? Duration.format(divided.value)
                : "None",
            resultTag: duration_tag(result),
            safe: Option.isSome(divided) ? "Some" : "None",
            note: "Duration.divide reports invalid divisors with Option.none.",
        }
    }

    const left = Duration.infinity
    const right = Duration.negativeInfinity
    const result = Duration.sum(left, right)

    return {
        expression: "Infinity + -Infinity",
        left: Duration.format(left),
        operator: "+",
        right: Duration.format(right),
        result: Duration.format(result),
        resultTag: duration_tag(result),
        safe: "direct",
        note: "Opposite signed infinities cancel to Duration.zero in sum.",
    }
}

// -----------------------------------------------------------------------------
// COMPARE SNAPSHOT
// -----------------------------------------------------------------------------

const compare_value = (compareCase: CompareCase): Duration.Duration =>
    compareCase === "Below"
        ? Duration.millis(750)
        : compareCase === "Inside"
          ? Duration.seconds(3)
          : Duration.seconds(7)

export type CompareSnapshot = Readonly<{
    value: string
    minimum: string
    maximum: string
    between: boolean
    clamped: string
    orderVsMinimum: number
    orderVsMaximum: number
    minWithMaximum: string
    maxWithMinimum: string
    equivalentUnits: boolean
    reducerSum: string
    combinerMin: string
    combinerMax: string
}>

export const compare_snapshot = (model: Model): CompareSnapshot => {
    const value = compare_value(model.compareCase)

    const minimum = Duration.seconds(1)

    const maximum = Duration.seconds(5)

    const aggregate = [
        Duration.millis(250),
        Duration.seconds(1),
        Duration.millis(2500),
    ]

    return {
        value: Duration.format(value),
        minimum: Duration.format(minimum),
        maximum: Duration.format(maximum),
        between: Duration.between(value, {
            minimum,
            maximum,
        }),
        clamped: Duration.format(
            Duration.clamp(value, {
                minimum,
                maximum,
            })
        ),
        orderVsMinimum: Duration.Order(value, minimum),
        orderVsMaximum: Duration.Order(value, maximum),
        minWithMaximum: Duration.format(Duration.min(value, maximum)),
        maxWithMinimum: Duration.format(Duration.max(value, minimum)),
        equivalentUnits: Duration.Equivalence(
            Duration.seconds(5),
            Duration.millis(5000)
        ),
        reducerSum: Duration.format(Duration.ReducerSum.combineAll(aggregate)),
        combinerMin: Duration.format(
            aggregate.reduce((current, next) =>
                Duration.CombinerMin.combine(current, next)
            )
        ),
        combinerMax: Duration.format(
            aggregate.reduce((current, next) =>
                Duration.CombinerMax.combine(current, next)
            )
        ),
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedDurationStage: {
        stage: Stage,
    },
    SelectedDurationBuildCase: {
        buildCase: BuildCase,
    },
    SelectedDurationConvertCase: {
        convertCase: ConvertCase,
    },
    SelectedDurationMathCase: {
        mathCase: MathCase,
    },
    SelectedDurationCompareCase: {
        compareCase: CompareCase,
    },
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "String",
    convertCase: "Complex",
    mathCase: "Sum",
    compareCase: "Inside",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedDurationStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedDurationBuildCase: ({ buildCase }) => ({
            model: evo(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedDurationConvertCase: ({ convertCase }) => ({
            model: evo(model, {
                convertCase: () => convertCase,
            }),
        }),

        SelectedDurationMathCase: ({ mathCase }) => ({
            model: evo(model, {
                mathCase: () => mathCase,
            }),
        }),

        SelectedDurationCompareCase: ({ compareCase }) => ({
            model: evo(model, {
                compareCase: () => compareCase,
            }),
        }),
    })
