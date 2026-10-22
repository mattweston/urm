# LogLevel

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/LogLevel

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/LogLevel.ts` source exposes **11 public
exports**:

- `LogLevel`
- `Severity`
- `values`
- `Order`
- `Equivalence`
- `getOrdinal`
- `isGreaterThan`
- `isGreaterThanOrEqualTo`
- `isLessThan`
- `isLessThanOrEqualTo`
- `isEnabled`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `log-level.ts` — runtime values, order / equivalence examples, threshold
  predicates, and an Effect-aware `MinimumLogLevel` helper.
- `log-level.view.ts` — interactive visual demo.
- `log-level-preview.png` — static preview of the default Levels stage.

## Intended location

```text
packages/features/src/labs/log-level/
├── log-level.ts
└── log-level.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`LogLevel` models both emitted message severities and two configuration
sentinels.

The full type is:

```text
All
Fatal
Error
Warn
Info
Debug
Trace
None
```

The narrower `Severity` type contains only:

```text
Fatal
Error
Warn
Info
Debug
Trace
```

So a useful distinction is:

```text
LogLevel
    message severities + threshold sentinels

Severity
    only real emitted message levels
```

## 1. Levels

### `LogLevel`

The public union is:

```ts
type LogLevel =
    | "All"
    | "Fatal"
    | "Error"
    | "Warn"
    | "Info"
    | "Debug"
    | "Trace"
    | "None"
```

`All` and `None` are useful for logging configuration.

They are not ordinary emitted severities.

### `Severity`

The public `Severity` union excludes both sentinels:

```ts
type Severity =
    | "Fatal"
    | "Error"
    | "Warn"
    | "Info"
    | "Debug"
    | "Trace"
```

Use `Severity` when a type represents the level attached to a real log message.

### `values`

```ts
LogLevel.values
```

returns all eight accepted strings:

```text
All
Fatal
Error
Warn
Info
Debug
Trace
None
```

The array is useful for:

```text
enumeration
UI choices
validation
display
```

It includes both sentinels.

## 2. Order

Effect defines a severity `Order<LogLevel>`.

### Numeric ordinals

`getOrdinal` exposes the numeric key used by that ordering:

```text
All   -> Number.MIN_SAFE_INTEGER

Trace -> 0
Debug -> 10000
Info  -> 20000
Warn  -> 30000
Error -> 40000
Fatal -> 50000

None  -> Number.MAX_SAFE_INTEGER
```

These are internal sort keys, not a logging interoperability standard.

Avoid serializing them as if they were standardized severity numbers.

### Concrete severity direction

Among emitted severities:

```text
Trace < Debug < Info < Warn < Error < Fatal
```

so:

```ts
LogLevel.Order(
    "Error",
    "Info"
)
// 1
```

and:

```ts
LogLevel.Order(
    "Debug",
    "Error"
)
// -1
```

Equal levels return `0`.

### Sentinel positions

`All` has the smallest ordinal.

That makes it the least restrictive minimum threshold:

```text
minimum = All
→ every ordinary severity meets the threshold
```

`None` has the largest ordinal.

That makes it the most restrictive minimum threshold:

```text
minimum = None
→ ordinary emitted severities do not meet the threshold
```

The names are therefore about filtering behavior, not "severity" in the same
sense as Fatal / Error / Info.

### `Equivalence`

```ts
LogLevel.Equivalence(
    left,
    right
)
```

uses strict equality.

For example:

```text
Warn == Warn → true
Warn == Info → false
```

Use `Equivalence` for exact level identity.

Use `Order` or the comparison helpers for threshold semantics.

## 3. Threshold

The module provides four dual comparison helpers.

They support either:

```ts
helper(
    self,
    that
)
```

or curried form:

```ts
const predicate =
    helper(
        that
    )

predicate(
    self
)
```

## Minimum threshold

The normal minimum-log-level test is:

```ts
LogLevel.isGreaterThanOrEqualTo(
    level,
    minimum
)
```

For an `Info` minimum:

```text
Fatal → true
Error → true
Warn  → true
Info  → true

Debug → false
Trace → false
```

This is the same ordering principle used by `isEnabled`.

## `isGreaterThan`

Strictly more severe / greater in the LogLevel ordering:

```ts
LogLevel.isGreaterThan(
    "Fatal",
    "Warn"
)
// true
```

Equal values return false.

## `isLessThan`

Strictly less severe / lower in the ordering:

```ts
LogLevel.isLessThan(
    "Trace",
    "Info"
)
// true
```

## `isLessThanOrEqualTo`

This can express a maximum-order boundary.

For example:

```ts
LogLevel.isLessThanOrEqualTo(
    "Debug",
    "Info"
)
// true
```

while:

```ts
LogLevel.isLessThanOrEqualTo(
    "Error",
    "Info"
)
// false
```

## Curried usage

The demo includes:

```ts
const infoOrAbove =
    LogLevel
        .isGreaterThanOrEqualTo(
            "Info"
        )

infoOrAbove(
    "Warn"
)
// true
```

This is useful in array filtering or higher-order APIs.

## 4. Enabled

### `isEnabled`

```ts
LogLevel.isEnabled(
    level
)
```

returns:

```text
Effect<boolean>
```

rather than a plain boolean.

It reads the current fiber's:

```ts
References.MinimumLogLevel
```

and checks the candidate level against that threshold.

The implementation is equivalent in intent to:

```text
candidate >= current minimum
```

under `LogLevel.Order`.

### Example: Warn minimum

With:

```text
MinimumLogLevel = Warn
```

ordinary message levels behave as:

```text
Fatal → enabled
Error → enabled
Warn  → enabled

Info  → disabled
Debug → disabled
Trace → disabled
```

The source documentation gives the specific example:

```text
Debug with Warn minimum → false
Error with Warn minimum → true
```

### All minimum

With:

```text
MinimumLogLevel = All
```

every ordinary severity is enabled because `All` has the smallest ordinal.

### None minimum

With:

```text
MinimumLogLevel = None
```

ordinary severities are disabled because `None` has the largest ordinal.

This is how the two sentinels act as natural ends of a threshold configuration.

## Real Effect helper

The generated file exports:

```ts
enabled_at(
    level,
    minimum
)
```

implemented with:

```ts
Effect.provideService(
    LogLevel.isEnabled(
        level
    ),
    References.MinimumLogLevel,
    minimum
)
```

This makes it easy to demonstrate the actual Effect-aware predicate under a
specific threshold.

## `values` order versus `Order`

One subtle point is worth keeping explicit.

`LogLevel.values` is presented as:

```text
All
Fatal
Error
Warn
Info
Debug
Trace
None
```

which reads naturally as:

```text
all-enabled sentinel
highest concrete severity
...
lowest concrete severity
none-enabled sentinel
```

But `LogLevel.Order` uses the ordinal keys:

```text
All < Trace < Debug < Info < Warn < Error < Fatal < None
```

for comparisons.

So do not assume that sorting `values` by array position is equivalent to using
`Order`.

For threshold logic, use the comparison helpers or `Order`.

## Relationship to Logger

The preceding `Logger` module decides how log events are:

```text
formatted
routed
installed
```

`LogLevel` decides the severity ordering and whether a level meets a configured
minimum threshold.

Conceptually:

```text
Effect.logDebug(...)
        ↓
candidate level = Debug
        ↓
References.MinimumLogLevel
        ↓
LogLevel.isEnabled
        ↓
event admitted / filtered
        ↓
active Logger set
```

This separation lets logging backends change independently from logging
thresholds.

## Relationship to References.MinimumLogLevel

`MinimumLogLevel` is a Context reference used by the current fiber.

Changing it through Effect context changes `LogLevel.isEnabled` behavior for
that program without changing global constants or individual `LogLevel`
comparison functions.

That makes minimum levels compositional and local to Effect context.

## Type discipline

The generated demo has no explicit `any` annotations.

Every LogLevel mapper, threshold-table callback, row predicate, Message payload,
and UI callback that could lose contextual typing has an explicit type.

Button attributes are derived from `HtmlBuilder`.

## Validation note

The standalone validation command is:

```text
tsc --noEmit --noResolve --allowImportingTsExtensions
    --target ES2022
    --module ESNext
    --moduleResolution bundler
    --skipLibCheck
    --noImplicitAny
```

In this environment the actual `effect`, `foldkit`, and UI packages are not
resolved, so this check catches local syntax and implicit-any issues rather than
replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `LogLevelDemo.Message` to the parent Message union,
3. initialize `LogLevelDemo.init`,
4. delegate child messages to `LogLevelDemo.update`,
5. render `LogLevelDemo.view(...)` from the LogLevel route.

This artifact intentionally performs none of those edits.
