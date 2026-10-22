# Cause

Based on the current Effect v4 API:

- <https://effect.website/docs/v4/api/effect/Cause>

The API reference is `effect 4.0.0-rc.115`.

## Mental model

A `Cause<E>` is the structured explanation of why an Effect did not complete
successfully.

In Effect 4, the central shape is:

```ts
interface Cause<E> {
  readonly reasons:
    ReadonlyArray<
      Cause.Reason<E>
    >
}
```

and a `Reason<E>` is one of:

```ts
Fail<E>
Die
Interrupt
```

This is important when more than one failure reason must be retained, for
example when independent concurrent work fails.

`Cause` implements `Equal`, `Pipeable`, and `Inspectable`.

## `Fail<E>`

```ts
Cause.fail(
  "validation failed"
)
```

represents an expected failure from the Effect typed error channel.

Its reason carries:

```ts
{
  _tag: "Fail",
  error: E
}
```

Use `Fail` for domain / expected errors represented by the `E` type.

## `Die`

```ts
Cause.die(
  new Error(
    "unexpected defect"
  )
)
```

represents a defect outside the typed error channel.

Its payload is:

```ts
unknown
```

via:

```ts
reason.defect
```

`Die` is for unexpected defects rather than ordinary typed failures.

## `Interrupt`

```ts
Cause.interrupt(42)
```

represents fiber interruption.

Its reason may carry:

```ts
fiberId: number | undefined
```

Interruption is different from both typed failure and defect.

## `empty`

```ts
Cause.empty
```

has no reasons.

It acts as the identity for:

```ts
Cause.combine
```

and:

```ts
Cause.hasInterruptsOnly(
  Cause.empty
)
// false
```

because interrupt-only requires at least one reason.

# Cause is flat in Effect 4

The v4 Cause representation exposes:

```ts
cause.reasons
```

as a flat immutable reason collection.

Create from individual reasons:

```ts
Cause.fromReasons([
  Cause.makeFailReason("A"),
  Cause.makeDieReason("defect"),
  Cause.makeInterruptReason(42)
])
```

The individual reason constructors are useful when you need to operate at the
reason level rather than create one-reason Causes first.

Treat the reasons array passed to `fromReasons` as immutable after construction.

# Narrowing reasons

```ts
for (
  const reason
  of cause.reasons
) {
  if (
    Cause.isFailReason(
      reason
    )
  ) {
    reason.error
  }

  if (
    Cause.isDieReason(
      reason
    )
  ) {
    reason.defect
  }

  if (
    Cause.isInterruptReason(
      reason
    )
  ) {
    reason.fiberId
  }
}
```

There are also broad guards:

```ts
Cause.isCause(value)
Cause.isReason(value)
```

# Combining Causes

```ts
const cause =
  Cause.combine(
    Cause.fail("A"),
    Cause.fail("B")
  )
```

keeps both reasons.

Combining with empty:

```ts
Cause.combine(
  Cause.empty,
  Cause.fail("boom")
)
```

returns the non-empty cause.

`combine` also de-duplicates reasons by value equality.

So combining:

```text
Fail("same")
Fail("same")
Fail("other")
```

results in two distinct Fail reasons rather than three.

This is useful for combining independent structured failures without reducing
them prematurely to one thrown value.

# Mapping typed errors

```ts
Cause.map(
  cause,
  error =>
    transform(error)
)
```

changes only `Fail<E>` reasons.

It does **not** change:

```text
Die
Interrupt
```

This mirrors the type channel:

```text
E
```

is transformable while defects and interruption remain structural runtime
failure information.

# Predicates

Check kinds:

```ts
Cause.hasFails(cause)
Cause.hasDies(cause)
Cause.hasInterrupts(cause)
```

Interrupt-only:

```ts
Cause.hasInterruptsOnly(
  cause
)
```

is true only when:

```text
there is at least one reason
+
every reason is Interrupt
```

# Extract typed failures

First full Fail reason:

```ts
Cause.findFail(
  cause
)
```

returns a `Result`.

First `E` value while preserving the original cause on absence:

```ts
Cause.findError(
  cause
)
```

Simpler Option form:

```ts
Cause.findErrorOption(
  cause
)
```

Use the Option version when the original cause is not needed if no typed error
exists.

# Extract defects

Full Die reason:

```ts
Cause.findDie(
  cause
)
```

Raw defect:

```ts
Cause.findDefect(
  cause
)
```

Both Result-based APIs preserve the original Cause in the failure channel when
the relevant reason is absent.

# Interrupts

First Interrupt reason:

```ts
Cause.findInterrupt(
  cause
)
```

All defined fiber ids:

```ts
Cause.interruptors(
  cause
)
// ReadonlySet<number>
```

The set ignores interrupt reasons whose `fiberId` is undefined.

Result-based variant:

```ts
Cause.filterInterruptors(
  cause
)
```

differs in its absence semantics:

```text
no Interrupt reason
  → Result failure(original Cause)

Interrupt reason(s),
but all ids undefined
  → Success(empty Set)
```

# `squash`

```ts
Cause.squash(
  cause
)
```

collapses the structured Cause to **one** `unknown` value.

Priority:

```text
1. first Fail error
2. first Die defect
3. generic interrupt Error
4. generic empty-cause Error
```

This is the policy used by synchronous / Promise Effect runners when they must
choose one value to throw.

It is deliberately lossy.

Do not squash when you still need the complete diagnostic structure.

# `prettyErrors`

```ts
Cause.prettyErrors(
  cause
)
```

turns renderable failure information into:

```ts
Array<Error>
```

Unlike squash, this can retain multiple Fail/Die reasons for diagnostics.

If the cause contains only interrupts, it returns one interrupt-oriented Error
describing those interruptors.

Empty Cause:

```ts
Cause.prettyErrors(
  Cause.empty
)
// []
```

# `pretty`

```ts
Cause.pretty(
  cause
)
```

renders the whole Cause as a human-readable string for logging.

It uses the same formatting pipeline as `prettyErrors`, including stack /
nested cause rendering where available.

For structured logging or custom UI, it can be better to inspect `reasons`
directly.

# Annotations

Every reason supports diagnostic annotations.

Annotate a whole Cause:

```ts
Cause.annotate(
  cause,
  context
)
```

By default existing annotation keys are preserved.

To replace matching keys:

```ts
Cause.annotate(
  cause,
  context,
  {
    overwrite: true
  }
)
```

Read merged annotations:

```ts
Cause.annotations(
  cause
)
```

Read one reason:

```ts
Cause.reasonAnnotations(
  reason
)
```

The Effect runtime uses annotations for information such as stack frames and
interruptor stack traces.

When duplicate annotation keys occur across reasons, later reasons win in the
merged `annotations(cause)` result.

# Built-in Yieldable errors

The Cause module also hosts several common Effect error values.

They implement `YieldableError`, so they can be yielded directly in
`Effect.gen`.

## NoSuchElementError

```ts
new Cause.NoSuchElementError(
  "missing value"
)
```

Guard:

```ts
Cause.isNoSuchElementError(
  value
)
```

Useful for APIs that deliberately turn expected absence into a failed Effect.

Prefer `Option` when absence is a normal domain case.

## TimeoutError

```ts
new Cause.TimeoutError(
  "operation timed out"
)
```

Guard:

```ts
Cause.isTimeoutError(
  value
)
```

Used by timeout-related Effect APIs.

## IllegalArgumentError

```ts
new Cause.IllegalArgumentError(
  "must be positive"
)
```

Guard:

```ts
Cause.isIllegalArgumentError(
  value
)
```

## ExceededCapacityError

Represents capacity/resource-limit failures.

Guard:

```ts
Cause.isExceededCapacityError(
  value
)
```

## AsyncFiberError

Represents invalid synchronous observation of an async fiber.

Guard:

```ts
Cause.isAsyncFiberError(
  value
)
```

## UnknownError

Wraps unknown error values in APIs that need a standard typed error.

Guard:

```ts
Cause.isUnknownError(
  value
)
```

# `Done`

`Done<A>` is not an ordinary failure in the domain sense.

It models graceful producer completion through an error channel, especially
for queues / streams.

Construct the value:

```ts
Cause.Done(
  "final payload"
)
```

or create an Effect that fails with it:

```ts
Cause.done(
  "final payload"
)
```

Check:

```ts
Cause.isDone(
  value
)
```

Think:

```text
Done
  = producer has finished normally
  = no more elements

not
  = defect
```

# What Cause is for

Most application code should handle its ordinary typed `E` errors using normal
Effect operators.

Reach for `Cause` when you need the _full runtime failure structure_:

- diagnostics
- defect handling
- interruption analysis
- concurrent failure aggregation
- logging
- test assertions
- low-level runtime / library behavior

Do not turn every ordinary domain error into manual Cause manipulation.

# Real Effect 4 APIs used

The source uses:

- `Cause.fail`
- `Cause.die`
- `Cause.interrupt`
- `Cause.empty`
- `Cause.combine`
- `Cause.map`
- `Cause.isFailReason`
- `Cause.isDieReason`
- `Cause.findErrorOption`
- `Cause.findDefect`
- `Cause.hasFails`
- `Cause.hasDies`
- `Cause.hasInterrupts`
- `Cause.hasInterruptsOnly`
- `Cause.interruptors`
- `Cause.squash`
- `Cause.prettyErrors`
- `Cause.pretty`
- `Option`

The README additionally covers:

- `Cause.fromReasons`
- `makeFailReason`
- `makeDieReason`
- `makeInterruptReason`
- `findFail`
- `findError`
- `findDie`
- `findInterrupt`
- `filterInterruptors`
- annotations
- built-in Yieldable errors
- `Done` / `done`

## Suggested placement

```text
packages/features/src/labs/foldkit/
├── examples/
│   └── cause.ts
└── cause.view.ts
```
