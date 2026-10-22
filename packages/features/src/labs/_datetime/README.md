# DateTime

## Mental model

Effect's `DateTime` module separates two related ideas:

```text
absolute instant
    epochMilliseconds
          │
          ├── Utc
          │
          └── Zoned + TimeZone
                    │
                    └── wall-clock parts / formatting / calendar math
```

A `DateTime` always represents an absolute point on the timeline. A `Zoned`
value additionally carries either a named IANA zone or a fixed offset so the
same instant can be interpreted as local calendar fields.

The current v4 API is broad (96 exports), so this demo deliberately teaches four
clusters instead of presenting an API catalog:

```text
Instant  -> construction, Option safety, UTC identity, epoch/parts
Zones    -> named + offset zones, DST disambiguation, CurrentTimeZone
Math     -> calendar arithmetic vs elapsed Duration arithmetic
Format   -> UTC ISO vs zone-aware date/offset/zoned formatting
```

The Foldkit model contains presentation choices only. Snapshot functions compute
real `DateTime` values synchronously from fixed inputs, keeping the view pure and
deterministic.

## 1. Instant

`DateTime.make` safely accepts the module's supported `DateTime.Input` forms and
returns `Option`:

```ts
const parsed = DateTime.make("2024-06-15T14:30:45.123Z")
```

The demo switches between:

```text
ISO string
partial calendar parts
Unix epoch milliseconds
invalid string
```

For valid input it shows:

```ts
DateTime.formatIso(value)
DateTime.toEpochMillis(value)
DateTime.toEpochSeconds(value)
DateTime.toPartsUtc(value)
DateTime.isDateTime(value)
DateTime.isUtc(value)
```

Use `DateTime.makeUnsafe` when the input is trusted and invalid construction
should throw rather than become `Option.none`.

A core invariant is that epoch milliseconds are the absolute identity. Zoned
values preserve that identity unless an API is explicitly told to reinterpret
calendar parts as local wall-clock time.

## 2. Zones

A time zone is one of two variants:

```text
TimeZone.Named   -> IANA id such as Europe/London
TimeZone.Offset  -> fixed milliseconds from UTC
```

The demo switches one fixed UTC instant between:

```text
Europe/London
America/New_York
+05:30 fixed offset
```

and displays:

```ts
DateTime.zoneToString(zone)
DateTime.setZone(utc, zone)
DateTime.zonedOffsetIso(zoned)
DateTime.formatIso(zoned)
DateTime.formatIsoZoned(zoned)
```

Normal `setZone` / `makeZoned` usage attaches a zone while preserving the same
epoch instant.

### DST ambiguity

The second half uses a real repeated local wall time:

```text
America/New_York
2025-11-02 01:30
```

That wall-clock time occurs twice when daylight-saving time ends. The demo lets
the viewer select:

```ts
"earlier"
"later"
"reject"
```

with:

```ts
DateTime.makeZoned(parts, {
    timeZone: "America/New_York",
    adjustForTimeZone: true,
    disambiguation,
})
```

`earlier` and `later` resolve to different UTC instants; `reject` produces
`Option.none`.

The stage also calls out the ambient zone service:

```ts
DateTime.CurrentTimeZone
DateTime.nowInCurrentZone
DateTime.setZoneCurrent
DateTime.withCurrentZoneNamed
DateTime.layerCurrentZoneNamed
```

That makes "current local time" testable instead of hard-wiring the host time
zone.

## 3. Math

The most important arithmetic distinction is between calendar time and elapsed
time.

The demo starts at noon in New York on March 8, 2025, immediately before the
spring-forward transition.

Calendar arithmetic:

```ts
DateTime.add(base, { days: 1 })
```

means "same local calendar time tomorrow". Across spring-forward that is only
23 elapsed hours.

Elapsed arithmetic:

```ts
DateTime.addDuration(base, "24 hours")
```

means exactly 86,400,000 milliseconds. Local wall time therefore lands one hour
later after the DST transition.

The demo measures both using:

```ts
DateTime.distance(base, result)
Duration.toMillis(...)
```

and also exposes local calendar boundaries:

```ts
DateTime.startOf(base, "day")
DateTime.endOf(base, "day")
DateTime.nearest(base, "day")
```

Rule of thumb:

```text
add / subtract                 -> calendar parts
addDuration / subtractDuration -> exact elapsed time
```

## 4. Format

This stage keeps one fixed instant:

```text
2024-01-01T23:30:00.000Z
```

and switches its representation between UTC, London, and Auckland.

The API makes several serialization/display semantics explicit:

```ts
DateTime.formatIso(value)
// always the UTC instant

DateTime.formatIsoDate(value)
// calendar date after applying the attached zone

DateTime.formatIsoDateUtc(value)
// calendar date in UTC

DateTime.formatIsoOffset(value)
// instant plus numeric offset

DateTime.formatIsoZoned(zoned)
// local date-time + offset + named zone when available
```

For Auckland, that late-night UTC instant is already January 2 locally. That is
why `formatIsoDate` and `formatIsoDateUtc` intentionally differ.

`DateTime.format` delegates human-readable output to `Intl.DateTimeFormat`. The
demo fixes the locale to `en-GB` so the output is reasonably stable while still
showing the role of the attached zone.

## Files

Place these files together under the labs feature, for example:

```text
packages/features/src/labs/datetime/
├── datetime.ts
├── datetime.view.ts
└── README.md
```

`datetime.ts` contains the Schema-defined Foldkit model/message union, pure
update function, stage copy, and deterministic snapshots built with the actual
Effect DateTime API.

`datetime.view.ts` is the pure Foldkit visual layer and accepts a
`to_parent_message` function so it does not depend on a specific parent Message
union.

No integration patch, route edit, parent Model edit, repository mutation, or
archive is included.

## Effect APIs covered

### Construction / identity

```ts
DateTime.make
DateTime.makeUnsafe
DateTime.fromEpochSeconds
DateTime.isDateTime
DateTime.isUtc
DateTime.isZoned
DateTime.toEpochMillis
DateTime.toEpochSeconds
DateTime.toPartsUtc
DateTime.match
```

### Time zones

```ts
DateTime.TimeZone
DateTime.zoneMakeNamed
DateTime.zoneMakeNamedUnsafe
DateTime.zoneMakeOffset
DateTime.zoneToString
DateTime.setZone
DateTime.setZoneNamedUnsafe
DateTime.makeZoned
DateTime.makeZonedUnsafe
DateTime.zonedOffset
DateTime.zonedOffsetIso
DateTime.Disambiguation
```

### Ambient zone service

```ts
DateTime.CurrentTimeZone
DateTime.nowInCurrentZone
DateTime.setZoneCurrent
DateTime.withCurrentZoneNamed
DateTime.layerCurrentZoneNamed
```

### Comparisons / math

```ts
DateTime.Equivalence
DateTime.Order
DateTime.between
DateTime.distance
DateTime.add
DateTime.subtract
DateTime.addDuration
DateTime.subtractDuration
DateTime.startOf
DateTime.endOf
DateTime.nearest
```

### Formatting

```ts
DateTime.format
DateTime.formatLocal
DateTime.formatUtc
DateTime.formatIntl
DateTime.formatIso
DateTime.formatIsoDate
DateTime.formatIsoDateUtc
DateTime.formatIsoOffset
DateTime.formatIsoZoned
```

## Reference checked

The demo was checked against the current Effect v4 `DateTime` API reference and
the `Effect-TS/effect` `main` implementation of
`packages/effect/src/DateTime.ts`.
