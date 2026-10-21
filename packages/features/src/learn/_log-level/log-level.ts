import { Effect, LogLevel, References, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL LOG-LEVEL HELPERS
// -----------------------------------------------------------------------------

export const enabled_at = (
    level: LogLevel.LogLevel,
    minimum: LogLevel.LogLevel
): Effect.Effect<boolean> =>
    Effect.provideService(
        LogLevel.isEnabled(level),
        References.MinimumLogLevel,
        minimum
    )

export const threshold_table = (
    minimum: LogLevel.LogLevel
): ReadonlyArray<
    Readonly<{
        level: LogLevel.LogLevel
        enabled: boolean
    }>
> =>
    LogLevel.values.map((level: LogLevel.LogLevel) => ({
        level,
        enabled: LogLevel.isGreaterThanOrEqualTo(level, minimum),
    }))

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Levels"),
    S.Literal("Order"),
    S.Literal("Threshold"),
    S.Literal("Enabled"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Levels",
    "Order",
    "Threshold",
    "Enabled",
]

export const LevelsCase = S.Union([
    S.Literal("AllValues"),
    S.Literal("Severity"),
    S.Literal("Sentinels"),
])
export type LevelsCase = typeof LevelsCase.Type

export const OrderCase = S.Union([
    S.Literal("Ordinals"),
    S.Literal("Compare"),
    S.Literal("Equivalence"),
])
export type OrderCase = typeof OrderCase.Type

export const ThresholdCase = S.Union([
    S.Literal("Minimum"),
    S.Literal("Maximum"),
    S.Literal("Curried"),
])
export type ThresholdCase = typeof ThresholdCase.Type

export const EnabledCase = S.Union([
    S.Literal("Warn"),
    S.Literal("All"),
    S.Literal("None"),
])
export type EnabledCase = typeof EnabledCase.Type

export const Model = S.Struct({
    stage: Stage,
    levelsCase: LevelsCase,
    orderCase: OrderCase,
    thresholdCase: ThresholdCase,
    enabledCase: EnabledCase,
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
    Levels: {
        eyebrow: "configuration sentinels + emitted severities",
        title: "LogLevel includes All and None; Severity contains only real message levels",
        description:
            "LogLevel is the full configuration type. Severity narrows that to Fatal, Error, Warn, Info, Debug, and Trace. values enumerates all eight accepted strings in the module's display order.",
        code: `type LogLevel =
    | "All"
    | "Fatal"
    | "Error"
    | "Warn"
    | "Info"
    | "Debug"
    | "Trace"
    | "None"

type Severity =
    | "Fatal"
    | "Error"
    | "Warn"
    | "Info"
    | "Debug"
    | "Trace"

LogLevel.values
// [
//   "All", "Fatal", "Error",
//   "Warn", "Info", "Debug",
//   "Trace", "None"
// ]`,
        apis: ["LogLevel.LogLevel", "LogLevel.Severity", "LogLevel.values"],
        notice: "All and None are filtering sentinels, not emitted message severities. Use Severity when a value represents an actual log-event level.",
    },

    Order: {
        eyebrow: "severity comparison",
        title: "Order compares levels using numeric ordinals, while Equivalence is exact string equality",
        description:
            "getOrdinal exposes the sort key used by Order. Concrete severities rise from Trace to Fatal; All uses Number.MIN_SAFE_INTEGER and None uses Number.MAX_SAFE_INTEGER so the sentinel thresholds sit at the two extremes.",
        code: `LogLevel.getOrdinal(
    "Trace"
)
// 0

LogLevel.getOrdinal(
    "Info"
)
// 20000

LogLevel.getOrdinal(
    "Fatal"
)
// 50000

LogLevel.Order(
    "Error",
    "Info"
)
// 1

LogLevel.Equivalence(
    "Error",
    "Error"
)
// true`,
        apis: ["LogLevel.Order", "LogLevel.Equivalence", "LogLevel.getOrdinal"],
        notice: "The numeric ordinals are internal sort keys rather than external severity codes. Prefer Order or the comparison helpers unless an integration specifically needs a number.",
    },

    Threshold: {
        eyebrow: "comparison helpers",
        title: "Use greater-than checks for minimum thresholds and less-than checks for maximum thresholds",
        description:
            "The four dual comparison helpers support both data-first and curried use. isGreaterThanOrEqualTo is the direct minimum-log-level predicate: Error meets an Info minimum, while Debug does not.",
        code: `LogLevel
    .isGreaterThanOrEqualTo(
        "Error",
        "Info"
    )
// true

LogLevel
    .isGreaterThanOrEqualTo(
        "Debug",
        "Info"
    )
// false

const infoOrAbove =
    LogLevel
        .isGreaterThanOrEqualTo(
            "Info"
        )

infoOrAbove(
    "Warn"
)
// true`,
        apis: [
            "LogLevel.isGreaterThan",
            "LogLevel.isGreaterThanOrEqualTo",
            "LogLevel.isLessThan",
            "LogLevel.isLessThanOrEqualTo",
        ],
        notice: "The helper names refer to the module's severity order: Fatal / Error are greater than Info, while Debug / Trace are less than Info.",
    },

    Enabled: {
        eyebrow: "current fiber threshold",
        title: "isEnabled reads References.MinimumLogLevel from the current fiber",
        description:
            "isEnabled is the Effect-aware predicate. It checks whether a candidate level meets the current MinimumLogLevel reference, so configuration can change logging thresholds without changing individual call sites.",
        code: `const program =
    Effect.gen(function* () {
        const debug =
            yield* LogLevel
                .isEnabled(
                    "Debug"
                )

        const error =
            yield* LogLevel
                .isEnabled(
                    "Error"
                )

        return {
            debug,
            error
        }
    }).pipe(
        Effect.provideService(
            References
                .MinimumLogLevel,
            "Warn"
        )
    )

// {
//   debug: false,
//   error: true
// }`,
        apis: [
            "LogLevel.isEnabled",
            "References.MinimumLogLevel",
            "LogLevel.isGreaterThanOrEqualTo",
        ],
        notice: "All is the least restrictive minimum and allows every level. None is the most restrictive minimum and suppresses every ordinary emitted Severity.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type LevelsSnapshot = Readonly<{
    mode: LevelsCase
    values: string
    count: number
    severities: string
    sentinels: string
    useCase: string
}>

export const levels_snapshot = (model: Model): LevelsSnapshot => ({
    mode: model.levelsCase,
    values: LogLevel.values.join(" → "),
    count: LogLevel.values.length,
    severities: "Fatal · Error · Warn · Info · Debug · Trace",
    sentinels: "All · None",
    useCase:
        model.levelsCase === "Severity"
            ? "Severity = actual emitted message levels"
            : model.levelsCase === "Sentinels"
              ? "All / None = configuration boundaries"
              : "LogLevel = Severity + sentinels",
})

export type OrderSnapshot = Readonly<{
    mode: OrderCase
    ordinals: string
    errorVsInfo: number
    debugVsError: number
    infoVsInfo: number
    equal: boolean
    different: boolean
}>

export const order_snapshot = (model: Model): OrderSnapshot => ({
    mode: model.orderCase,
    ordinals: LogLevel.values
        .map(
            (level: LogLevel.LogLevel) =>
                `${level}=${LogLevel.getOrdinal(level)}`
        )
        .join(" · "),
    errorVsInfo: LogLevel.Order("Error", "Info"),
    debugVsError: LogLevel.Order("Debug", "Error"),
    infoVsInfo: LogLevel.Order("Info", "Info"),
    equal: LogLevel.Equivalence("Warn", "Warn"),
    different: LogLevel.Equivalence("Warn", "Info"),
})

export type ThresholdSnapshot = Readonly<{
    mode: ThresholdCase
    minimum: string
    maximum: string
    strictGreater: string
    strictLess: string
    curried: string
}>

export const threshold_snapshot = (model: Model): ThresholdSnapshot => {
    const infoOrAbove = LogLevel.isGreaterThanOrEqualTo("Info")

    const errorOrBelow = LogLevel.isLessThanOrEqualTo("Error")

    return {
        mode: model.thresholdCase,
        minimum: `Error>=Info ${LogLevel.isGreaterThanOrEqualTo("Error", "Info")} · Debug>=Info ${LogLevel.isGreaterThanOrEqualTo("Debug", "Info")}`,
        maximum: `Debug<=Info ${LogLevel.isLessThanOrEqualTo("Debug", "Info")} · Error<=Info ${LogLevel.isLessThanOrEqualTo("Error", "Info")}`,
        strictGreater: `Fatal>Warn ${LogLevel.isGreaterThan("Fatal", "Warn")} · Info>Info ${LogLevel.isGreaterThan("Info", "Info")}`,
        strictLess: `Trace<Info ${LogLevel.isLessThan("Trace", "Info")} · Fatal<Info ${LogLevel.isLessThan("Fatal", "Info")}`,
        curried: `infoOrAbove(Warn)=${infoOrAbove("Warn")} · errorOrBelow(Info)=${errorOrBelow("Info")}`,
    }
}

export type EnabledSnapshot = Readonly<{
    mode: EnabledCase
    minimum: LogLevel.LogLevel
    enabled: string
    fatal: boolean
    info: boolean
    debug: boolean
    trace: boolean
}>

export const enabled_snapshot = (model: Model): EnabledSnapshot => {
    const minimum: LogLevel.LogLevel =
        model.enabledCase === "All"
            ? "All"
            : model.enabledCase === "None"
              ? "None"
              : "Warn"

    const table = threshold_table(minimum)

    const read = (level: LogLevel.LogLevel): boolean =>
        table.find(
            (
                row: Readonly<{
                    level: LogLevel.LogLevel
                    enabled: boolean
                }>
            ) => row.level === level
        )?.enabled ?? false

    return {
        mode: model.enabledCase,
        minimum,
        enabled: table
            .map(
                (
                    row: Readonly<{
                        level: LogLevel.LogLevel
                        enabled: boolean
                    }>
                ) => `${row.level}:${row.enabled ? "on" : "off"}`
            )
            .join(" · "),
        fatal: read("Fatal"),
        info: read("Info"),
        debug: read("Debug"),
        trace: read("Trace"),
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedLogLevelStage: {
        stage: Stage,
    },
    SelectedLogLevelLevelsCase: {
        levelsCase: LevelsCase,
    },
    SelectedLogLevelOrderCase: {
        orderCase: OrderCase,
    },
    SelectedLogLevelThresholdCase: {
        thresholdCase: ThresholdCase,
    },
    SelectedLogLevelEnabledCase: {
        enabledCase: EnabledCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Levels",
    levelsCase: "AllValues",
    orderCase: "Ordinals",
    thresholdCase: "Minimum",
    enabledCase: "Warn",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type LevelsCasePayload = Readonly<{
    levelsCase: LevelsCase
}>

type OrderCasePayload = Readonly<{
    orderCase: OrderCase
}>

type ThresholdCasePayload = Readonly<{
    thresholdCase: ThresholdCase
}>

type EnabledCasePayload = Readonly<{
    enabledCase: EnabledCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedLogLevelStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedLogLevelLevelsCase: ({ levelsCase }: LevelsCasePayload) => ({
            model: evo(model, {
                levelsCase: () => levelsCase,
            }),
        }),

        SelectedLogLevelOrderCase: ({ orderCase }: OrderCasePayload) => ({
            model: evo(model, {
                orderCase: () => orderCase,
            }),
        }),

        SelectedLogLevelThresholdCase: ({
            thresholdCase,
        }: ThresholdCasePayload) => ({
            model: evo(model, {
                thresholdCase: () => thresholdCase,
            }),
        }),

        SelectedLogLevelEnabledCase: ({ enabledCase }: EnabledCasePayload) => ({
            model: evo(model, {
                enabledCase: () => enabledCase,
            }),
        }),
    })
