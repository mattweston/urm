# Resource

Standalone FoldKit teaching demo for:

https://effect.website/docs/v4/api/effect/Resource

The current Effect v4 API reference displays `4.0.0-rc.116` and reports 6
exports. The URM workspace pins Effect `4.0.0-rc.112`, while the vendored
`.context/effect` snapshot identifies itself as `4.0.0-rc.108`. The Resource
surface used by this lesson is present in the vendored source and matches the
current v4 concepts covered here.

## Files

- `resource.ts` — real Effect programs, Schema model, messages, pure update, and
  visual teaching snapshots.
- `resource.view.ts` — interactive FoldKit view.
- `resource-preview.png` — static preview of the initial Create / Manual state.

## Intended location

```text
packages/features/src/labs/_resource/
├── README.md
├── resource.ts
└── resource.view.ts
```

The existing `_resource` git scaffold is intentionally left untouched. No
parent router, model, message, update, export map, or repository file is changed
by this artifact.

## What Resource is for

`Resource<A, E>` is a scoped holder for one refreshable acquisition result.

It stores:

```text
acquire: Effect<A, E>
scopedRef: ScopedRef<Exit<A, E>>
```

and gives callers two main operations:

```text
Resource.get(resource)
    read the currently stored acquisition result

Resource.refresh(resource)
    run acquisition again and replace the stored scoped value on success
```

That makes Resource useful for values such as refreshed configuration,
connections, credentials, metadata, or other state that has a lifecycle and can
be reacquired.

## Public surface

The current API page reports 6 exports:

### Model

- `Resource`

### Constructors

- `manual`
- `auto`

### Read

- `get`

### Guard

- `isResource`

### Lifecycle

- `refresh`

## 1. Create

### `manual`

```ts
import { Effect, Resource } from "effect"

const program = Effect.scoped(
    Effect.gen(function* () {
        const resource = yield* Resource.manual(
            Effect.succeed("config-v1")
        )

        return yield* Resource.get(resource)
    })
)
```

`manual` requires a `Scope` because the acquired value may itself own scoped
resources.

Its signature is important:

```text
Effect<Resource<A, E>, never, Scope | R>
```

The constructor does **not** fail with `E`. The initial acquisition is captured
as an `Exit<A, E>` and stored inside the Resource.

### Initial acquisition failure

```ts
const resource = yield* Resource.manual(
    Effect.fail("offline")
)
```

The Resource still constructs successfully.

The failure appears when the value is read:

```ts
const result = yield* Effect.exit(
    Resource.get(resource)
)
```

So the mental model is:

```text
construct Resource
    stores success or failure

get Resource
    translates that stored Exit back into Effect<A, E>
```

### `isResource`

```ts
Resource.isResource(value)
```

Use the guard at runtime boundaries before treating unknown data as a Resource.

## 2. Read

### `get`

```ts
const value = yield* Resource.get(resource)
```

`get` reads the currently stored result. It does not run acquisition again.

Repeated reads without refresh therefore observe the same acquisition result:

```text
get
get
get
    no reacquisition
```

If the stored result is a failure, `get` fails with that stored error.

## 3. Refresh

### Successful refresh

```ts
yield* Resource.refresh(resource)
```

`refresh` re-runs the acquisition effect captured when the Resource was
constructed.

On success:

```text
new acquisition succeeds
    ↓
new scoped value is installed
    ↓
old scoped value is released
```

This is why Resource is more than a mutable variable. Replacing the value is a
scope transition that safely runs the previous value's finalizers.

### Failed refresh

A failed refresh behaves differently from an initial failed acquisition.

If the Resource currently contains a working value and the next acquisition
fails:

```text
Resource.refresh(resource)
    fails

Resource.get(resource)
    still reads the previous value
```

The failed refresh does **not** overwrite the previous stored result.

That is useful for stale-but-working behavior where refresh failure should be
reported without discarding the last usable resource.

### Captured acquisition context

`manual` captures the Effect Context available when the Resource is created and
provides it to future acquisitions.

That means later refreshes reuse the dependencies available at construction
time rather than requiring callers of `refresh` to provide them again.

## 4. Schedule

### `auto`

```ts
import { Resource, Schedule } from "effect"

const resource = yield* Resource.auto(
    loadConfiguration,
    Schedule.spaced("30 seconds")
)
```

`auto` is conceptually:

```text
manual(acquire)
    +
scoped background repeat(refresh, schedule)
```

The implementation creates the normal Resource first, then starts a scoped
fiber that repeats `refresh` according to the supplied Schedule.

### Scope controls the background loop

Because the refresh fiber is scoped:

```text
scope open
    current Resource value alive
    auto refresh fiber alive

scope closes
    refresh fiber interrupted
    current scoped value finalized
```

The background work cannot outlive the scope that owns the Resource.

### Automatic does not mean manual refresh is disabled

The value returned by `auto` is still an ordinary `Resource<A, E>`.

You can still call:

```ts
yield* Resource.refresh(resource)
```

for exceptional events while normal freshness is schedule-driven.

## FoldKit boundary

A live Resource should generally stay outside the pure serializable FoldKit
Model.

A useful arrangement is:

```text
runtime / Effect service
    owns Resource<A, E>
    runs get / refresh

command / handler
    converts meaningful values or failures
    into plain FoldKit Messages

FoldKit Model
    stores UI-visible plain state
```

This prevents scoped runtime identity and finalizers from leaking into view
state.

## Type discipline

The generated demo has no explicit `any` annotations.

Every custom Effect callback, FoldKit Message payload, and UI callback that can
lose contextual typing has an explicit type where appropriate.

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
resolved, so this check catches local syntax and implicit-any problems rather
than replacing a full typecheck inside the target monorepo.

The generated files pass this standalone check apart from the expected unresolved
workspace-package imports.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos if this lesson is later wired into the app:

1. add the child Model to the parent learn Model,
2. add `ResourceDemo.Message` to the parent Message union,
3. initialize `ResourceDemo.init`,
4. delegate child messages to `ResourceDemo.update`,
5. render `ResourceDemo.view(...)` from the Resource route.

This artifact intentionally performs none of those edits.
