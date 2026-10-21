# ErrorReporter

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/ErrorReporter

The current API page reports Effect `4.0.0-rc.112` and 17 exports. The source
implementation was also checked against the current
`packages/effect/src/ErrorReporter.ts`.

The generated TypeScript contains no explicit `any` annotations, and all
destructured Foldkit message payloads have explicit types for `noImplicitAny`.

## Files

- `error-reporter.ts` — real ErrorReporter operations, snapshots, Foldkit Model /
  Message / update.
- `error-reporter.view.ts` — interactive teaching UI.
- `error-reporter-preview.png` — static preview of the default Capture stage.

## Intended location

```text
packages/features/src/learn/error-reporter/
├── error-reporter.ts
└── error-reporter.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. Capture

Shows three reporting boundaries:

- typed `Effect.fail`
- `Effect.die`
- manual `ErrorReporter.report(Cause)`

A reporter created with:

```ts
ErrorReporter.make(callback)
```

receives:

```text
Cause
Error
severity
attributes
fiber
timestamp
```

`Effect.withErrorReporting` observes a source failure without recovering it.

`ErrorReporter.report` is different: it reports a supplied Cause and itself
returns `Effect<void>`.

### 2. Annotations

Three error objects demonstrate the reporting metadata contract.

#### Plain `Error`

```text
ignore     false
severity   Info
attributes {}
```

#### Annotated error

Uses:

```ts
readonly [ErrorReporter.severity] =
    "Warn" as const
```

and:

```ts
get [ErrorReporter.attributes]() {
    return {
        requestId: this.requestId,
        route: "/checkout"
    }
}
```

The resolved callback receives the overridden severity and metadata.

#### Ignored error

Uses:

```ts
readonly [ErrorReporter.ignore] = true
```

The Effect can still fail normally, but the reporter callback is suppressed.

Helpers shown:

- `isIgnored`
- `getSeverity`
- `getAttributes`

`getSeverity` falls back to `"Info"`.

`getAttributes` returns the annotation value as-is; it does not validate or
clone the record.

### 3. Layers

`CurrentErrorReporters` is a Context Reference whose default value is an empty
set.

The stage installs:

```text
base reporter A
incoming reporter B
```

and toggles:

```ts
ErrorReporter.layer([reporterB])
```

versus:

```ts
ErrorReporter.layer(
    [reporterB],
    { mergeWithExisting: true }
)
```

Default behavior is replacement.

With `mergeWithExisting`, the incoming layer reads the existing reporter set
from the current fiber and adds the new reporters.

Reporter entries can also be Effects; `layer` resolves them while the layer is
built.

### 4. Dedupe

`ErrorReporter.make` keeps a WeakSet for already-reported Cause objects and
object errors.

The demo compares:

#### Same Cause object twice

```text
2 attempts
1 callback
```

#### Different Cause objects wrapping the same Error object

```text
2 attempts
1 callback
```

#### Distinct Error objects with the same message

```text
2 attempts
2 callbacks
```

Deduplication is by object identity, not message content.

#### Pure interruption

The reporter callback is not invoked because interruption reasons are skipped.

## Current public surface

### Annotations

- `attributes`
- `attributes` type
- `getAttributes`
- `getSeverity`
- `ignore`
- `ignore` type
- `Reportable`
- `severity`
- `severity` type

### Constructors / layers / reporting

- `make`
- `layer`
- `report`

### Predicates

- `isIgnored`

### Services

- `CurrentErrorReporters`
- `ErrorReporter`

### Type IDs

- `TypeId`
- `TypeId` type

## Type discipline

The generated code avoids explicit `any` annotations.

All `Message.match` payload parameters use named payload types rather than
depending on contextual typing, preventing the implicit-`any` issue encountered
in the earlier Equal demo.

## Integration expectation

Follow the same child-feature integration pattern as the neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `ErrorReporterDemo.Message` to the parent Message union,
3. initialize `ErrorReporterDemo.init`,
4. delegate child messages to `ErrorReporterDemo.update`,
5. render `ErrorReporterDemo.view(...)` from the ErrorReporter route.

This artifact intentionally performs none of those edits.
