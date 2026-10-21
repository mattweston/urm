# References

Standalone FoldKit teaching demo for:

https://effect.website/docs/v4/api/effect/References

The live Effect v4 API reference currently displays `4.0.0-rc.115` and reports
**22 exports**. The URM workspace pins Effect `4.0.0-rc.112`; the vendored
`.context/effect` snapshot identifies itself as `4.0.0-rc.108`. The references
used in this lesson are present in the vendored source and match the documented
v4 model used here.

## Files

- `references.ts` — real Effect programs, Schema model, messages, pure update,
  and visual teaching snapshots.
- `references.view.ts` — interactive FoldKit view.
- `references-preview.png` — static preview of the initial Read / Default state.

## Intended location

```text
packages/features/src/learn/_references/
├── README.md
├── references.ts
└── references.view.ts
```

The existing `_references` git scaffold is intentionally left untouched. No
parent router, model, message, update, export map, or repository file is changed
by this artifact.

## What References is for

`References` is the module-level collection of built-in `Context.Reference`
values consulted by the Effect runtime.

A reference is a service key with a default value:

```text
no override
    → read the reference default

Effect.provideService(reference, value)
    → nested Effect work reads value

outside the provided scope
    → original context/default remains
```

That makes references a good fit for cross-cutting runtime policy such as log
severity, trace sampling, scheduler fairness, or instrumentation metadata.

They are not a replacement for application domain state.

## Public surface

The current API page reports 22 exports.

### Logging / diagnostic references

- `CurrentLogAnnotations`
- `CurrentLoggers`
- `CurrentLogLevel`
- `CurrentLogSpans`
- `CurrentStackFrame`
- `LogToStderr`
- `MinimumLogLevel`
- `TracerEnabled`
- `TracerSpanAnnotations`
- `TracerSpanLinks`
- `TracerTimingEnabled`
- `UnhandledLogLevel`

### Low-level diagnostic model

- `StackFrame` interface

### Re-exported tracing / scheduler services

- `CurrentTraceLevel`
- `DisablePropagation`
- `MaxOpsBeforeYield`
- `MinimumTraceLevel`
- `PreventSchedulerYield`
- `Scheduler`
- `Scheduler` interface
- `Tracer`
- `Tracer` interface

The value/interface pairs for `Scheduler` and `Tracer` share their TypeScript
names: one side is the `Context.Reference` service value and the other is the
service contract type.

## 1. Read

Every built-in reference has a default and is directly yieldable in an Effect:

```ts
import { Effect, References } from "effect"

const program = Effect.gen(function* () {
    const level = yield* References.CurrentLogLevel
    return level
})
```

With no override, `CurrentLogLevel` defaults to `"Info"`.

### Scoped override

```ts
const configured = program.pipe(
    Effect.provideService(
        References.CurrentLogLevel,
        "Error"
    )
)
```

The provided value belongs to that Effect context. The reference itself is not a
process-global mutable variable.

Nested work and fibers started in the configured scope inherit the context in the
normal Effect runtime model.

## 2. Logging

The logging family separates several concerns that are easy to conflate.

### Message severity vs threshold

```text
CurrentLogLevel
    default severity for unqualified Effect.log
    default: Info

MinimumLogLevel
    filter threshold
    default: Info
```

Changing one does not imply changing the other.

### Shared metadata

```text
CurrentLogAnnotations
    ReadonlyRecord<string, unknown>
    default: {}

CurrentLogSpans
    ReadonlyArray<[label, timestamp]>
    default: []
```

Use higher-level logging combinators in ordinary application code. The raw
references are most useful when writing integration/runtime code or focused
tests.

### Destinations / unhandled reports

`CurrentLoggers` is the complete active logger set.

`LogToStderr` controls whether built-in console loggers use stderr and defaults
to `false`.

`UnhandledLogLevel` controls the severity used when a pool finalizer reports an
unhandled error. It defaults to `"Error"`; providing `undefined` suppresses that
specific report instead of falling back to `CurrentLogLevel`.

## 3. Tracing

Tracing exposes independent controls for different parts of span behavior.

### Enablement and timing

```text
TracerEnabled
    default: true
    controls span registration

TracerTimingEnabled
    default: true
    controls timing capture
```

Do not treat those as the same switch.

### Trace levels

```text
CurrentTraceLevel
    default: Info
    level assigned when span options do not specify one

MinimumTraceLevel
    default: All
    threshold used for sampling decisions
```

An explicit span `sampled` option can bypass threshold computation.

### Shared span metadata

`TracerSpanAnnotations` and `TracerSpanLinks` both default empty and let runtime
configuration flow metadata into newly created spans.

Links model relationships that are not parent-child relationships.

### Propagation / backend / stack frames

`DisablePropagation` defaults to `false`. It is different from
`TracerEnabled`: disabling propagation prevents tracing context from propagating
without simply meaning “turn all tracing off”.

`Tracer` is the active tracing backend service.

`CurrentStackFrame` carries Effect's low-level captured diagnostic frame chain and
defaults to `undefined`. A `StackFrame` contains:

```text
name
stack() → string | undefined
parent → StackFrame | undefined
```

Application code should normally use tracing combinators rather than manipulate
this chain directly.

## 4. Scheduler

The scheduler family contains the active scheduler service and two yield knobs.

### `MaxOpsBeforeYield`

Default:

```text
2048 operations
```

The default `MixedScheduler` asks a fiber to yield when its current operation
count reaches this budget.

### `PreventSchedulerYield`

Default:

```text
false
```

When `true`, the runtime bypasses scheduler yield checks rather than merely
changing the operation budget.

That can allow long-running fibers to monopolize the JavaScript thread, so it is
a specialized runtime control rather than a routine optimization.

### `Scheduler`

The service defaults to a `MixedScheduler`.

The `Scheduler` interface exposes:

```text
executionMode
shouldYield(fiber)
makeDispatcher()
```

Replacing it is primarily useful for runtime configuration and tests.

## Foldkit boundary

References should normally stay on the Effect runtime side of a Foldkit feature:

```text
Foldkit Model / Message / update
    plain explicit application state

handler / service / runtime integration
    Effect context
    References overrides
    logging / tracing / scheduling policy
```

Do not place reference objects or runtime configuration into a serializable
Foldkit Model merely to transport them through the view layer.

## Type discipline

The generated demo has no explicit `any` annotations.

The upstream `CurrentLoggers` public type contains `Logger<unknown, any>` in
Effect's own source. The demo does not reproduce that generic `any` in its
implementation.

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

In this environment the actual workspace packages are not resolved by that
standalone command, so unresolved package-import diagnostics are expected. The
check is used to catch local syntax and implicit-any problems in the generated
files.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `ReferencesDemo.Message` to the parent Message union,
3. initialize `ReferencesDemo.init`,
4. delegate child messages to `ReferencesDemo.update`,
5. render `ReferencesDemo.view(...)` from the References route.

This artifact intentionally performs none of those edits.
