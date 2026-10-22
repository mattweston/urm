# Exit

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Exit

The current API page is Effect `4.0.0-rc.115` and reports 31 exports. The
implementation was also checked against the current `packages/effect/src/Exit.ts`.

The generated TypeScript contains no explicit `any` annotations. All destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`.

## Files

- `exit.ts` — real Exit / Cause / Option / Result operations, snapshots, Foldkit
  Model / Message / update.
- `exit.view.ts` — interactive visual demo.
- `exit-preview.png` — static preview of the default Outcomes stage.

## Intended location

```text
packages/features/src/labs/exit/
├── exit.ts
└── exit.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. Outcomes

Shows the completed result channels:

```ts
Exit.succeed(42)
Exit.fail("not found")
Exit.die(new Error("boom"))
Exit.interrupt(42)
```

plus the full-Cause constructor:

```ts
Exit.failCause(
    Cause.fail("typed error")
)
```

and the shared `Exit.void`.

The Cause-kind guards make the failure channel explicit:

```text
typed failure -> hasFails
defect        -> hasDies
interruption  -> hasInterrupts
```

Defects and interruptions do not widen the typed `E` channel.

Every Exit is also an Effect:

```ts
Effect.isEffect(
    Exit.succeed(42)
)
// true

Effect.runSync(
    Exit.succeed(42)
)
// 42
```

so an Exit can be run or yielded directly.

### 2. Inspect

Covers:

- `isExit`
- `isSuccess`
- `isFailure`
- `hasFails`
- `hasDies`
- `hasInterrupts`
- `match`

`Exit.match` receives either the success value or the full `Cause<E>`.

The stage also contrasts three Option getters:

```ts
Exit.getSuccess(exit)
Exit.getCause(exit)
Exit.findErrorOption(exit)
```

`findErrorOption` only searches for the first typed Fail reason. Defect-only and
interrupt-only failures return `Option.none()`.

### 3. Transform

Completed results can be changed without rerunning the original Effect.

Covered APIs:

```ts
Exit.map
Exit.mapError
Exit.mapBoth
Exit.asVoid
Exit.asVoidAll
```

`mapError` and the failure side of `mapBoth` change typed Fail reasons. Defects
and interruptions pass through unchanged.

`asVoidAll` walks the complete iterable and combines all failure Causes instead
of stopping at the first failure.

### 4. Extract

Focuses on the Result-based v4 helpers:

```ts
Exit.filterSuccess
Exit.filterValue
Exit.filterFailure
Exit.filterCause
Exit.findError
Exit.findDefect
```

These return plain `Result` data, not Effect.

A rejected extraction preserves the opposite Exit branch inside
`Result.Failure`, which differs from the Option getters that simply return
`None`.

For example:

```ts
Exit.filterValue(
    Exit.fail("err")
)
```

returns a Result failure containing the original Exit Failure.

`findError` searches for the first typed error; `findDefect` searches for the
first defect.

## Current public surface

### Combinators

- `asVoid`
- `asVoidAll`
- `map`
- `mapBoth`
- `mapError`

### Constructors

- `die`
- `fail`
- `failCause`
- `interrupt`
- `succeed`
- `void`

### Filtering

- `filterCause`
- `filterFailure`
- `filterSuccess`
- `filterValue`
- `findDefect`
- `findError`

### Getters

- `findErrorOption`
- `getCause`
- `getSuccess`

### Guards

- `hasDies`
- `hasFails`
- `hasInterrupts`
- `isExit`
- `isFailure`
- `isSuccess`

### Models

- `Exit`
- `Exit.Proto`
- `Failure`
- `Success`

### Pattern matching

- `match`

## Why Exit keeps Cause

The outer shape is conceptually:

```text
Success<A>
Failure<Cause<E>>
```

The Cause preserves distinctions between:

```text
expected typed error
unexpected defect
fiber interruption
```

after the runtime has completed.

That makes Exit more expressive than a plain typed-error result when the full
Effect outcome needs to remain inspectable as data.

## Type discipline

The generated demo has no explicit `any` annotations.

Every `Message.match` payload parameter uses a named payload type so destructured
properties remain typed under `noImplicitAny`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `ExitDemo.Message` to the parent Message union,
3. initialize `ExitDemo.init`,
4. delegate child messages to `ExitDemo.update`,
5. render `ExitDemo.view(...)` from the Exit route.

This artifact intentionally performs none of those edits.
