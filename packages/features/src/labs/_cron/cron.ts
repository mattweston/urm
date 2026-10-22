import { Cron, DateTime, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Effect Cron values used by the teaching demo
// -----------------------------------------------------------------------------

const UTC = DateTime.zoneMakeNamedUnsafe("UTC")

export const weekday_morning = Cron.parseUnsafe("0 9 * * 1-5", "UTC")

export const every_ten_seconds = Cron.parseUnsafe("*/10 * * * * *", "UTC")

// Cron.make accepts explicit allowed values. Empty sets leave a field
// unrestricted. When both days and weekdays are restricted, `and` controls
// whether either field or both fields must match.
const make_day_rule = (and: boolean) =>
    Cron.make({
        seconds: [0],
        minutes: [0],
        hours: [9],
        days: [15],
        months: [],
        weekdays: [1],
        and,
        tz: UTC,
    })

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Parse"),
    S.Literal("Build"),
    S.Literal("Match"),
    S.Literal("Sequence"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Parse",
    "Build",
    "Match",
    "Sequence",
]

export const ParsePreset = S.Union([
    S.Literal("Weekdays"),
    S.Literal("Seconds"),
    S.Literal("Invalid"),
])
export type ParsePreset = typeof ParsePreset.Type

export const DayMode = S.Union([S.Literal("Or"), S.Literal("And")])
export type DayMode = typeof DayMode.Type

export const MatchCase = S.Union([
    S.Literal("Both"),
    S.Literal("WeekdayOnly"),
    S.Literal("DayOnly"),
    S.Literal("Neither"),
])
export type MatchCase = typeof MatchCase.Type

export const SequenceCount = S.Union([
    S.Literal("Three"),
    S.Literal("Five"),
    S.Literal("Seven"),
])
export type SequenceCount = typeof SequenceCount.Type

export const Model = S.Struct({
    stage: Stage,
    parsePreset: ParsePreset,
    dayMode: DayMode,
    matchCase: MatchCase,
    sequenceCount: SequenceCount,
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
    Parse: {
        eyebrow: "safe parsing",
        title: "Cron expressions become typed schedule values",
        description:
            "Cron.parse accepts five or six fields and returns a Result. Formatting can turn a parsed Cron back into an expression without throwing.",
        code: `const parsed = Cron.parse(
    "0 9 * * 1-5",
    "UTC"
)

if (Result.isSuccess(parsed)) {
    Cron.format(parsed.success)
    Cron.format(parsed.success, {
        includeSeconds: true
    })
}

Cron.parseUnsafe("*/10 * * * * *", "UTC")`,
        apis: [
            "Cron.parse",
            "Cron.parseUnsafe",
            "Cron.format",
            "Cron.isCron",
            "Cron.isCronParseError",
        ],
        notice: "Five-field expressions default seconds to 0. Six-field expressions can constrain seconds explicitly. Cron.parse keeps invalid user/config input in Result instead of throwing.",
    },
    Build: {
        eyebrow: "field constraints",
        title: "Build schedules directly from allowed calendar values",
        description:
            "Cron.make stores allowed seconds, minutes, hours, days, months, and weekdays. Empty collections mean unrestricted fields.",
        code: `const schedule = Cron.make({
    seconds: [0],
    minutes: [0],
    hours: [9],
    days: [15],
    months: [],
    weekdays: [1], // Monday
    and: false,
    tz: DateTime.zoneMakeNamedUnsafe("UTC")
})

Cron.isCron(schedule)
Cron.equals(schedule, rebuilt)
Cron.Equivalence(schedule, rebuilt)`,
        apis: [
            "Cron.make",
            "Cron.format",
            "Cron.isCron",
            "Cron.equals",
            "Cron.Equivalence",
        ],
        notice: "When both day-of-month and weekday are restricted, the default is OR. Setting and: true requires both. Cron.format does not preserve the timezone or this and flag.",
    },
    Match: {
        eyebrow: "calendar predicate",
        title: "Match reads calendar fields in the schedule timezone",
        description:
            "Cron.match tests one instant against the schedule. Here the same dates make the difference between OR and AND day matching visible.",
        code: `const schedule = Cron.make({
    seconds: [0],
    minutes: [0],
    hours: [9],
    days: [15],
    months: [],
    weekdays: [1],
    and: true,
    tz: utc
})

Cron.match(
    schedule,
    "2026-06-15T09:00:00Z"
)`,
        apis: ["Cron.match", "Cron.make"],
        notice: "The timezone belongs to the Cron value. If no timezone is stored, matching uses the host system timezone, so explicit zones are useful for deterministic jobs and tests.",
    },
    Sequence: {
        eyebrow: "scheduled occurrences",
        title: "Walk backward once or lazily iterate forward",
        description:
            "prev and next find strict neighboring occurrences. sequence returns an infinite iterator, so consumers decide how many future runs to pull.",
        code: `const cron = Cron.parseUnsafe(
    "0 9 * * 1-5",
    "UTC"
)

Cron.prev(cron, anchor)
Cron.next(cron, anchor)

const runs = Cron.sequence(cron, anchor)
const firstFive = Array.from(
    { length: 5 },
    () => runs.next().value
)`,
        apis: ["Cron.prev", "Cron.next", "Cron.sequence"],
        notice: "next and prev are strict: the returned occurrence is after or before the supplied instant. sequence is lazy and infinite, so take only what your caller needs.",
    },
}

// -----------------------------------------------------------------------------
// Derived visual snapshots
// -----------------------------------------------------------------------------

const expression_for_preset = (preset: ParsePreset): string => {
    if (preset === "Seconds") {
        return "*/10 * * * * *"
    }

    if (preset === "Invalid") {
        return "not a cron"
    }

    return "0 9 * * 1-5"
}

const set_text = (values: ReadonlySet<number>): string => {
    const items = Array.from(values)
    return items.length === 0 ? "*" : items.join(", ")
}

export type CronFields = Readonly<{
    seconds: string
    minutes: string
    hours: string
    days: string
    months: string
    weekdays: string
}>

const fields_of = (cron: Cron.Cron): CronFields => ({
    seconds: set_text(cron.seconds),
    minutes: set_text(cron.minutes),
    hours: set_text(cron.hours),
    days: set_text(cron.days),
    months: set_text(cron.months),
    weekdays: set_text(cron.weekdays),
})

export type ParseSnapshot = Readonly<{
    expression: string
    status: "success" | "failure"
    formatted: string
    formattedWithSeconds: string
    error: string
    isCron: boolean
    isCronParseError: boolean
    fields: CronFields
}>

const empty_fields: CronFields = {
    seconds: "—",
    minutes: "—",
    hours: "—",
    days: "—",
    months: "—",
    weekdays: "—",
}

export const parse_snapshot = (model: Model): ParseSnapshot => {
    const expression = expression_for_preset(model.parsePreset)
    const parsed = Cron.parse(expression, "UTC")

    if (Result.isFailure(parsed)) {
        return {
            expression,
            status: "failure",
            formatted: "—",
            formattedWithSeconds: "—",
            error: parsed.failure.message,
            isCron: false,
            isCronParseError: Cron.isCronParseError(parsed.failure),
            fields: empty_fields,
        }
    }

    return {
        expression,
        status: "success",
        formatted: Cron.format(parsed.success),
        formattedWithSeconds: Cron.format(parsed.success, {
            includeSeconds: true,
        }),
        error: "—",
        isCron: Cron.isCron(parsed.success),
        isCronParseError: false,
        fields: fields_of(parsed.success),
    }
}

export type BuildSnapshot = Readonly<{
    formatted: string
    includeSeconds: string
    isCron: boolean
    equalsRebuilt: boolean
    equivalentToRebuilt: boolean
    dayRule: string
    timezone: string
    fields: CronFields
}>

export const build_snapshot = (model: Model): BuildSnapshot => {
    const and = model.dayMode === "And"
    const schedule = make_day_rule(and)
    const rebuilt = make_day_rule(and)

    return {
        formatted: Cron.format(schedule),
        includeSeconds: Cron.format(schedule, {
            includeSeconds: true,
        }),
        isCron: Cron.isCron(schedule),
        equalsRebuilt: Cron.equals(schedule, rebuilt),
        equivalentToRebuilt: Cron.Equivalence(schedule, rebuilt),
        dayRule: and ? "day 15 AND Monday" : "day 15 OR Monday",
        timezone: "UTC",
        fields: fields_of(schedule),
    }
}

type MatchFixture = Readonly<{
    label: string
    iso: string
    dayMatches: boolean
    weekdayMatches: boolean
}>

const match_fixtures: Record<MatchCase, MatchFixture> = {
    Both: {
        label: "Monday · day 15",
        iso: "2026-06-15T09:00:00Z",
        dayMatches: true,
        weekdayMatches: true,
    },
    WeekdayOnly: {
        label: "Monday · day 22",
        iso: "2026-06-22T09:00:00Z",
        dayMatches: false,
        weekdayMatches: true,
    },
    DayOnly: {
        label: "Tuesday · day 15",
        iso: "2026-09-15T09:00:00Z",
        dayMatches: true,
        weekdayMatches: false,
    },
    Neither: {
        label: "Tuesday · day 22",
        iso: "2026-09-22T09:00:00Z",
        dayMatches: false,
        weekdayMatches: false,
    },
}

export type MatchSnapshot = Readonly<{
    label: string
    iso: string
    dayMode: DayMode
    dayMatches: boolean
    weekdayMatches: boolean
    matched: boolean
    explanation: string
}>

export const match_snapshot = (model: Model): MatchSnapshot => {
    const fixture = match_fixtures[model.matchCase]
    const schedule = make_day_rule(model.dayMode === "And")
    const matched = Cron.match(schedule, fixture.iso)

    return {
        label: fixture.label,
        iso: fixture.iso,
        dayMode: model.dayMode,
        dayMatches: fixture.dayMatches,
        weekdayMatches: fixture.weekdayMatches,
        matched,
        explanation:
            model.dayMode === "And"
                ? "Both day constraints must match."
                : "Either day constraint may match.",
    }
}

const sequence_count = (count: SequenceCount): number => {
    if (count === "Three") {
        return 3
    }

    if (count === "Seven") {
        return 7
    }

    return 5
}

const SEQUENCE_ANCHOR = "2026-09-18T16:30:00Z"

export type SequenceSnapshot = Readonly<{
    expression: string
    anchor: string
    previous: string
    next: string
    count: number
    upcoming: ReadonlyArray<string>
}>

export const sequence_snapshot = (model: Model): SequenceSnapshot => {
    const count = sequence_count(model.sequenceCount)
    const iterator = Cron.sequence(weekday_morning, SEQUENCE_ANCHOR)
    const upcoming = Array.from({ length: count }, () =>
        iterator.next().value.toISOString()
    )

    return {
        expression: Cron.format(weekday_morning),
        anchor: new Date(SEQUENCE_ANCHOR).toISOString(),
        previous: Cron.prev(weekday_morning, SEQUENCE_ANCHOR).toISOString(),
        next: Cron.next(weekday_morning, SEQUENCE_ANCHOR).toISOString(),
        count,
        upcoming,
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedCronStage: { stage: Stage },
    SelectedCronParsePreset: { preset: ParsePreset },
    ClickedToggleCronDayMode: {},
    SelectedCronMatchCase: { matchCase: MatchCase },
    ClickedCycleCronSequenceCount: {},
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Parse",
    parsePreset: "Weekdays",
    dayMode: "Or",
    matchCase: "Both",
    sequenceCount: "Five",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedCronStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),
        SelectedCronParsePreset: ({ preset }) => ({
            model: modifyFields(model, {
                parsePreset: () => preset,
            }),
        }),
        ClickedToggleCronDayMode: () => ({
            model: modifyFields(model, {
                dayMode: (mode) => (mode === "Or" ? "And" : "Or"),
            }),
        }),
        SelectedCronMatchCase: ({ matchCase }) => ({
            model: modifyFields(model, {
                matchCase: () => matchCase,
            }),
        }),
        ClickedCycleCronSequenceCount: () => ({
            model: modifyFields(model, {
                sequenceCount: (count) =>
                    count === "Three"
                        ? "Five"
                        : count === "Five"
                          ? "Seven"
                          : "Three",
            }),
        }),
    })
