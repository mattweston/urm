import { DateTime, Duration, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Instant"),
    S.Literal("Zones"),
    S.Literal("Math"),
    S.Literal("Format"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Instant",
    "Zones",
    "Math",
    "Format",
]

export const InstantCase = S.Union([
    S.Literal("Iso"),
    S.Literal("Parts"),
    S.Literal("Epoch"),
    S.Literal("Invalid"),
])
export type InstantCase = typeof InstantCase.Type

export const ZoneCase = S.Union([
    S.Literal("London"),
    S.Literal("NewYork"),
    S.Literal("Offset"),
])
export type ZoneCase = typeof ZoneCase.Type

export const DisambiguationCase = S.Union([
    S.Literal("Earlier"),
    S.Literal("Later"),
    S.Literal("Reject"),
])
export type DisambiguationCase = typeof DisambiguationCase.Type

export const MathMode = S.Union([S.Literal("Calendar"), S.Literal("Elapsed")])
export type MathMode = typeof MathMode.Type

export const FormatZone = S.Union([
    S.Literal("UTC"),
    S.Literal("London"),
    S.Literal("Auckland"),
])
export type FormatZone = typeof FormatZone.Type

export const Model = S.Struct({
    stage: Stage,
    instantCase: InstantCase,
    zoneCase: ZoneCase,
    disambiguation: DisambiguationCase,
    mathMode: MathMode,
    formatZone: FormatZone,
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
    Instant: {
        eyebrow: "absolute instants",
        title: "Every DateTime starts from one point on the timeline",
        description:
            "DateTime.make safely accepts strings, parts, Dates, epoch milliseconds, and existing DateTimes. Utc and Zoned values share the same epoch-millisecond identity.",
        code: `const parsed = DateTime.make(
    "2024-06-15T14:30:45.123Z"
)

if (Option.isSome(parsed)) {
    const dateTime = parsed.value

    DateTime.formatIso(dateTime)
    DateTime.toEpochMillis(dateTime)
    DateTime.toEpochSeconds(dateTime)
    DateTime.toPartsUtc(dateTime)
    DateTime.isUtc(dateTime)
}`,
        apis: [
            "DateTime.make",
            "DateTime.makeUnsafe",
            "DateTime.fromEpochSeconds",
            "DateTime.toEpochMillis",
            "DateTime.toPartsUtc",
            "DateTime.isUtc",
        ],
        notice: "Use DateTime.make when invalid external input should become Option.none. makeUnsafe is for trusted input where failure should throw.",
    },
    Zones: {
        eyebrow: "wall-clock context",
        title: "A zone changes calendar interpretation, not the instant",
        description:
            "Named IANA zones and fixed offsets attach wall-clock context to an absolute instant. When local wall time is ambiguous, disambiguation chooses which instant it means.",
        code: `const zone = DateTime.zoneMakeNamedUnsafe(
    "America/New_York"
)

const sameInstant = DateTime.makeZonedUnsafe(
    "2024-06-15T14:30:00Z",
    { timeZone: zone }
)

const repeatedLocalTime = DateTime.makeZoned(
    { year: 2025, month: 11, day: 2, hour: 1, minute: 30 },
    {
        timeZone: zone,
        adjustForTimeZone: true,
        disambiguation: "later"
    }
)`,
        apis: [
            "DateTime.zoneMakeNamed",
            "DateTime.zoneMakeOffset",
            "DateTime.makeZoned",
            "DateTime.setZone",
            "DateTime.zonedOffsetIso",
            "DateTime.Disambiguation",
        ],
        notice: "Attaching a zone normally preserves epoch milliseconds. adjustForTimeZone: true instead interprets input parts as local wall time, so DST gaps/repeats require a disambiguation policy.",
    },
    Math: {
        eyebrow: "two kinds of time",
        title: "Calendar arithmetic is not elapsed-duration arithmetic",
        description:
            "Adding one calendar day respects local zone rules. Adding 24 elapsed hours moves exactly 86,400,000 milliseconds—even across a daylight-saving transition.",
        code: `const noon = DateTime.makeZonedUnsafe(
    "2025-03-08T17:00:00Z",
    { timeZone: "America/New_York" }
)

const calendarTomorrow = DateTime.add(
    noon,
    { days: 1 }
)

const elapsed24Hours = DateTime.addDuration(
    noon,
    "24 hours"
)

DateTime.distance(noon, calendarTomorrow)
DateTime.startOf(noon, "day")`,
        apis: [
            "DateTime.add",
            "DateTime.subtract",
            "DateTime.addDuration",
            "DateTime.distance",
            "DateTime.startOf",
            "DateTime.endOf",
            "DateTime.nearest",
        ],
        notice: "Use add/subtract for calendar parts such as days and months. Use addDuration/subtractDuration when the requirement is an exact elapsed amount of time.",
    },
    Format: {
        eyebrow: "representation",
        title: "Choose whether formatting should preserve instant, date, or zone",
        description:
            "ISO helpers make the distinction explicit: formatIso is always UTC, formatIsoDate uses the attached zone, and formatIsoZoned includes both offset and zone identity.",
        code: `const zoned = DateTime.makeZonedUnsafe(
    "2024-01-01T23:30:00Z",
    { timeZone: "Pacific/Auckland" }
)

DateTime.formatIso(zoned)
// 2024-01-01T23:30:00.000Z

DateTime.formatIsoDate(zoned)
// 2024-01-02

DateTime.formatIsoDateUtc(zoned)
// 2024-01-01

DateTime.formatIsoZoned(zoned)`,
        apis: [
            "DateTime.formatIso",
            "DateTime.formatIsoDate",
            "DateTime.formatIsoDateUtc",
            "DateTime.formatIsoOffset",
            "DateTime.formatIsoZoned",
            "DateTime.format",
        ],
        notice: "The same epoch instant can have a different calendar date in another zone. Pick a formatter based on the semantic value you need to serialize or display.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

const stringify_parts = (
    parts: ReturnType<typeof DateTime.toPartsUtc>
): string =>
    JSON.stringify({
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: parts.hour,
        minute: parts.minute,
        second: parts.second,
        millisecond: parts.millisecond,
        weekDay: parts.weekDay,
    })

const instant_input = (instantCase: InstantCase) => {
    if (instantCase === "Parts") {
        return {
            year: 2024,
            month: 6,
            day: 15,
            hour: 14,
            minute: 30,
            second: 45,
            millisecond: 123,
        }
    }

    if (instantCase === "Epoch") {
        return 1_718_461_845_123
    }

    if (instantCase === "Invalid") {
        return "definitely-not-a-date"
    }

    return "2024-06-15T14:30:45.123Z"
}

export type InstantSnapshot = Readonly<{
    inputLabel: string
    optionTag: string
    isDateTime: boolean
    variant: string
    iso: string
    epochMillis: string
    epochSeconds: string
    partsUtc: string
}>

export const instant_snapshot = (model: Model): InstantSnapshot => {
    const input = instant_input(model.instantCase)
    const parsed = DateTime.make(input)

    if (Option.isNone(parsed)) {
        return {
            inputLabel:
                typeof input === "string" ? input : JSON.stringify(input),
            optionTag: "None",
            isDateTime: false,
            variant: "—",
            iso: "— invalid input",
            epochMillis: "—",
            epochSeconds: "—",
            partsUtc: "—",
        }
    }

    const value = parsed.value

    return {
        inputLabel: typeof input === "string" ? input : JSON.stringify(input),
        optionTag: "Some",
        isDateTime: DateTime.isDateTime(value),
        variant: value._tag,
        iso: DateTime.formatIso(value),
        epochMillis: String(DateTime.toEpochMillis(value)),
        epochSeconds: String(DateTime.toEpochSeconds(value)),
        partsUtc: stringify_parts(DateTime.toPartsUtc(value)),
    }
}

const selected_zone = (zoneCase: ZoneCase) => {
    if (zoneCase === "NewYork") {
        return DateTime.zoneMakeNamedUnsafe("America/New_York")
    }

    if (zoneCase === "Offset") {
        return DateTime.zoneMakeOffset(5.5 * 60 * 60 * 1000)
    }

    return DateTime.zoneMakeNamedUnsafe("Europe/London")
}

const selected_disambiguation = (value: DisambiguationCase) => {
    if (value === "Later") {
        return "later"
    }

    if (value === "Reject") {
        return "reject"
    }

    return "earlier"
}

export type ZoneSnapshot = Readonly<{
    zoneKind: string
    zoneName: string
    zonedIso: string
    offsetIso: string
    sameEpochAsUtc: boolean
    utcIso: string
    localDate: string
    repeatedResult: string
    repeatedUtc: string
    repeatedZoned: string
}>

export const zone_snapshot = (model: Model): ZoneSnapshot => {
    const zone = selected_zone(model.zoneCase)
    const utc = DateTime.makeUnsafe("2024-06-15T14:30:00Z")
    const zoned = DateTime.setZone(utc, zone)

    const repeated = DateTime.makeZoned(
        {
            year: 2025,
            month: 11,
            day: 2,
            hour: 1,
            minute: 30,
        },
        {
            timeZone: "America/New_York",
            adjustForTimeZone: true,
            disambiguation: selected_disambiguation(model.disambiguation),
        }
    )

    return {
        zoneKind: zone._tag,
        zoneName: DateTime.zoneToString(zone),
        zonedIso: DateTime.formatIsoZoned(zoned),
        offsetIso: DateTime.zonedOffsetIso(zoned),
        sameEpochAsUtc:
            DateTime.toEpochMillis(utc) === DateTime.toEpochMillis(zoned),
        utcIso: DateTime.formatIso(zoned),
        localDate: DateTime.formatIsoDate(zoned),
        repeatedResult: Option.isSome(repeated)
            ? "Some — local time resolved"
            : "None — ambiguity rejected",
        repeatedUtc: Option.isSome(repeated)
            ? DateTime.formatIso(repeated.value)
            : "—",
        repeatedZoned: Option.isSome(repeated)
            ? DateTime.formatIsoZoned(repeated.value)
            : "—",
    }
}

export type MathSnapshot = Readonly<{
    base: string
    calendar: string
    elapsed: string
    calendarHours: string
    elapsedHours: string
    selectedLabel: string
    selectedValue: string
    startOfDay: string
    endOfDay: string
}>

export const math_snapshot = (model: Model): MathSnapshot => {
    // Noon in New York on the day before the 2025 spring-forward change.
    const base = DateTime.makeZonedUnsafe("2025-03-08T17:00:00Z", {
        timeZone: "America/New_York",
    })
    const calendar = DateTime.add(base, { days: 1 })
    const elapsed = DateTime.addDuration(base, "24 hours")

    const calendarHours =
        Duration.toMillis(DateTime.distance(base, calendar)) / (60 * 60 * 1000)
    const elapsedHours =
        Duration.toMillis(DateTime.distance(base, elapsed)) / (60 * 60 * 1000)

    const selected = model.mathMode === "Calendar" ? calendar : elapsed

    return {
        base: DateTime.formatIsoZoned(base),
        calendar: DateTime.formatIsoZoned(calendar),
        elapsed: DateTime.formatIsoZoned(elapsed),
        calendarHours: String(calendarHours),
        elapsedHours: String(elapsedHours),
        selectedLabel:
            model.mathMode === "Calendar"
                ? "add({ days: 1 })"
                : 'addDuration("24 hours")',
        selectedValue: DateTime.formatIsoZoned(selected),
        startOfDay: DateTime.formatIsoZoned(DateTime.startOf(base, "day")),
        endOfDay: DateTime.formatIsoZoned(DateTime.endOf(base, "day")),
    }
}

const format_value = (zone: FormatZone) => {
    const utc = DateTime.makeUnsafe("2024-01-01T23:30:00Z")

    if (zone === "London") {
        return DateTime.setZoneNamedUnsafe(utc, "Europe/London")
    }

    if (zone === "Auckland") {
        return DateTime.setZoneNamedUnsafe(utc, "Pacific/Auckland")
    }

    return utc
}

export type FormatSnapshot = Readonly<{
    variant: string
    zone: string
    iso: string
    isoDate: string
    isoDateUtc: string
    isoOffset: string
    isoZoned: string
    intl: string
    matchResult: string
}>

export const format_snapshot = (model: Model): FormatSnapshot => {
    const value = format_value(model.formatZone)

    const matchResult = DateTime.match(value, {
        onUtc: () => "Utc — no zone attached",
        onZoned: (zoned) => `Zoned — ${DateTime.zoneToString(zoned.zone)}`,
    })

    return {
        variant: value._tag,
        zone: DateTime.isZoned(value)
            ? DateTime.zoneToString(value.zone)
            : "UTC",
        iso: DateTime.formatIso(value),
        isoDate: DateTime.formatIsoDate(value),
        isoDateUtc: DateTime.formatIsoDateUtc(value),
        isoOffset: DateTime.formatIsoOffset(value),
        isoZoned: DateTime.isZoned(value)
            ? DateTime.formatIsoZoned(value)
            : DateTime.formatIso(value),
        intl: DateTime.format(value, {
            locale: "en-GB",
            dateStyle: "full",
            timeStyle: "short",
        }),
        matchResult,
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedDateTimeStage: { stage: Stage },
    SelectedDateTimeInstantCase: { instantCase: InstantCase },
    SelectedDateTimeZoneCase: { zoneCase: ZoneCase },
    SelectedDateTimeDisambiguation: {
        disambiguation: DisambiguationCase,
    },
    SelectedDateTimeMathMode: { mathMode: MathMode },
    SelectedDateTimeFormatZone: { formatZone: FormatZone },
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Instant",
    instantCase: "Iso",
    zoneCase: "London",
    disambiguation: "Earlier",
    mathMode: "Calendar",
    formatZone: "Auckland",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedDateTimeStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),
        SelectedDateTimeInstantCase: ({ instantCase }) => ({
            model: evo(model, {
                instantCase: () => instantCase,
            }),
        }),
        SelectedDateTimeZoneCase: ({ zoneCase }) => ({
            model: evo(model, {
                zoneCase: () => zoneCase,
            }),
        }),
        SelectedDateTimeDisambiguation: ({ disambiguation }) => ({
            model: evo(model, {
                disambiguation: () => disambiguation,
            }),
        }),
        SelectedDateTimeMathMode: ({ mathMode }) => ({
            model: evo(model, {
                mathMode: () => mathMode,
            }),
        }),
        SelectedDateTimeFormatZone: ({ formatZone }) => ({
            model: evo(model, {
                formatZone: () => formatZone,
            }),
        }),
    })
