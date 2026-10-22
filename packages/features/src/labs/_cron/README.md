# Cron

## Mental model

Effect's `Cron` module represents recurring calendar schedules as values rather
than as running jobs. A `Cron.Cron` stores constraints for seconds, minutes,
hours, days of month, months, weekdays, and an optional timezone.

That separation is useful in a teaching demo because every operation is pure:

1. parse or construct a schedule
2. inspect its allowed fields
3. ask whether a concrete instant matches
4. calculate neighboring or future occurrences

The Foldkit side therefore stays deliberately small. The Model contains only
which teaching stage is selected and a few visual toggles; `update` is pure;
the exported snapshot functions call the real Effect `Cron` APIs; and the view
renders those derived values. There is no Foldkit `Command` because nothing in
this demo performs I/O.

## The four sections

### 1. Parse

`Cron.parse` is the safe constructor for text input:

```ts
const parsed = Cron.parse(
    "0 9 * * 1-5",
    "UTC"
)
```

It returns `Result<Cron, CronParseError>`, so invalid config or user input stays
explicit instead of throwing.

The demo cycles among:

```text
0 9 * * 1-5       # 09:00 Monday-Friday (five fields)
*/10 * * * * *    # every ten seconds (six fields)
not a cron         # parse failure
```

Five-field syntax omits seconds, which default to `0`. Six-field syntax includes
seconds explicitly.

On success, the demo renders the actual sets stored on the parsed value and
shows both formatting modes:

```ts
Cron.format(cron)
Cron.format(cron, { includeSeconds: true })
```

It also surfaces:

```ts
Cron.isCron(cron)
Cron.isCronParseError(error)
```

`Cron.parseUnsafe` is included in the reference code for places where the input
is known to be valid and a throwing constructor is appropriate.

## 2. Build

`Cron.make` constructs a schedule from explicit allowed values:

```ts
const schedule = Cron.make({
    seconds: [0],
    minutes: [0],
    hours: [9],
    days: [15],
    months: [],
    weekdays: [1],
    and: false,
    tz: DateTime.zoneMakeNamedUnsafe("UTC")
})
```

Empty collections mean that field is unrestricted. This example therefore means
09:00 UTC where the day rule is based on day-of-month `15` and weekday `1`
(Monday).

The important interaction is the `and` flag:

```ts
and: false // day 15 OR Monday
and: true  // day 15 AND Monday
```

When both day-of-month and weekday are restricted, the default behavior is OR;
`and: true` requires both constraints.

The stage also demonstrates structural schedule comparison:

```ts
Cron.isCron(schedule)
Cron.equals(schedule, rebuilt)
Cron.Equivalence(schedule, rebuilt)
```

The view intentionally calls out a formatting gotcha: `Cron.format` drops the
stored timezone and the `and` day-matching mode, so formatting and reparsing is
not guaranteed to produce an equivalent Cron value.

## 3. Match

`Cron.match` checks one instant against the stored calendar constraints:

```ts
Cron.match(
    schedule,
    "2026-06-15T09:00:00Z"
)
```

The interactive fixtures are chosen so the day rule is visible:

```text
Monday 15   -> day matches, weekday matches
Monday 22   -> weekday only
Tuesday 15  -> day only
Tuesday 22  -> neither
```

Switching between OR and AND mode changes the real `Cron.match` result. For
example, "Monday 22" matches the OR schedule but not the AND schedule.

The Cron's timezone controls which calendar fields are read from the input.
Without a timezone, matching uses the host system timezone; this demo stores
UTC explicitly so the snapshots are deterministic.

## 4. Sequence

The final stage uses a fixed weekday schedule and fixed anchor:

```ts
const cron = Cron.parseUnsafe(
    "0 9 * * 1-5",
    "UTC"
)

const anchor = "2026-09-18T16:30:00Z"
```

`prev` and `next` return strict neighboring occurrences:

```ts
Cron.prev(cron, anchor)
Cron.next(cron, anchor)
```

`sequence` returns an infinite lazy iterator:

```ts
const runs = Cron.sequence(cron, anchor)

const firstFive = Array.from(
    { length: 5 },
    () => runs.next().value
)
```

The demo lets the viewer cycle between taking 3, 5, and 7 values. The iterator
itself remains unbounded; the consumer decides how much of it to pull.

## Files

Place these three files together under the labs feature, for example:

```text
packages/features/src/labs/cron/
├── cron.ts
├── cron.view.ts
└── README.md
```

`cron.ts` contains the real Effect Cron examples, Schema-defined Foldkit Model
and Message union, pure update, and derived visual snapshots.

`cron.view.ts` is the pure Foldkit view. It accepts a `to_parent_message`
function so a parent feature can lift the demo's Messages without coupling this
file to a particular parent Message union.

No integration patch, route edit, parent Model edit, archive, or repository
mutation is included.

## Effect APIs covered

### Construction and parsing

```ts
Cron.make
Cron.parse
Cron.parseUnsafe
Cron.CronParseError
```

### Formatting and guards

```ts
Cron.format
Cron.isCron
Cron.isCronParseError
```

### Comparison

```ts
Cron.equals
Cron.Equivalence
```

### Calendar operations

```ts
Cron.match
Cron.prev
Cron.next
Cron.sequence
```

The demo also uses:

```ts
DateTime.zoneMakeNamedUnsafe
Result.isFailure
```

for deterministic timezone construction and safe parse-result inspection.

## Reference

The implementation follows the Effect v4 Cron API reference and its linked
source:

```text
https://effect.website/docs/v4/api/effect/Cron
https://github.com/Effect-TS/effect/blob/4a05d4914fa2327a42bd75fe77c22c188becf3b4/packages/effect/src/Cron.ts
```

The API reference checked while preparing these files reports Effect
`4.0.0-rc.115`.
