# Request

Standalone Foldkit teaching demo for:

https://effect.website/docs/v4/api/effect/Request

The live API reference currently displays Effect `4.0.0-rc.116`. The URM
workspace catalog pins Effect `4.0.0-rc.112`. The demo is based on the current
public API and the vendored Effect source under `.context/effect`.

## Files

- `request.ts` — real Effect examples, Schema model, messages, update, and visual
  teaching snapshots.
- `request.view.ts` — interactive Foldkit view.

## Intended location

```text
packages/features/src/learn/_request/
├── README.md
├── request.ts
└── request.view.ts
```

No parent router, model, message, update, export map, scaffold file, or Git file
is changed by this artifact.

## Mental model

A `Request<A, E, R>` is a typed description of one logical data-loading
operation:

```text
A = success value
E = typed request error
R = services required while resolving the request
```

Creating a request does **not** perform the backend work.

The runtime flow is closer to:

```text
request value
    ↓
Effect.request
    ↓
RequestResolver
    ↓
Request.Entry
    ↓
complete / succeed / fail / failCause / completeEffect
    ↓
Exit<A, E>
```

`Request` defines the values and completion protocol. `RequestResolver` owns the
backend-specific execution strategy.

## Teaching stages

### 1. Define

Four public constructor styles are shown:

```text
Request.tagged
Request.of
Request.Class
Request.TaggedClass
```

`tagged` and `TaggedClass` supply a fixed `_tag`, which is useful for
discriminated request unions.

`of` and `Class` do not invent a tag.

All built-in constructors attach Effect's Request marker/prototype while keeping
your request-specific readonly fields.

### 2. Inspect

The lesson covers:

```text
Request.isRequest
Request.RequestPrototype
```

and the type-level helpers:

```text
Request.Any
Request.Variance
Request.Constructor
Request.Success
Request.Error
Request.Services
Request.Result
```

For the example request:

```ts
interface GetUser
    extends Request.Request<
        User,
        LookupError
    > {
    readonly _tag: "GetUser"
    readonly id: string
}
```

the important extractors are conceptually:

```text
Success<GetUser>  -> User
Error<GetUser>    -> LookupError
Services<GetUser> -> never
Result<GetUser>   -> Exit<User, LookupError>
```

`isRequest` checks the Request marker. A plain object with the same `_tag` and
fields is not automatically a Request.

## 3. Entry

A resolver works with `Request.Entry<R>` values.

An entry contains:

```text
request
context
uninterruptible
completeUnsafe
```

The `context` type is derived from the request's service requirement type.

`makeEntry` is also public, but it is a low-level runtime/resolver helper. Most
application code should receive entries from request infrastructure rather than
constructing them manually.

Likewise, `completeUnsafe` is the raw completion hook. The normal resolver-side
helpers wrap it in Effects and preserve the request types.

## 4. Complete

The five completion helpers are:

### `succeed`

```ts
yield* Request.succeed(
    entry,
    user
)
```

Completes with `Request.Success<R>`.

### `fail`

```ts
yield* Request.fail(
    entry,
    "NotFound"
)
```

Completes with a typed `Request.Error<R>`.

### `failCause`

```ts
yield* Request.failCause(
    entry,
    cause
)
```

Use when the full structured `Cause` should be preserved.

### `complete`

```ts
yield* Request.complete(
    entry,
    exit
)
```

Use when the resolver already has the final `Request.Result<R>` / `Exit`.

### `completeEffect`

```ts
yield* Request.completeEffect(
    entry,
    loadUser
)
```

This detail is easy to miss:

```text
loadUser fails with Request.Error<R>
        ↓
that failure is captured into the request's final Exit
        ↓
the completion Effect itself does not fail with that request error
```

Any service requirements of `loadUser` remain requirements of the returned
completion Effect.

## Public surface

The current API page lists **21 exports**.

### Models / type contract

- `Request`
- `Any`
- `Variance`
- `Constructor`
- `Error`
- `Success`
- `Services`
- `Result`

### Prototype / guard

- `RequestPrototype`
- `isRequest`

### Constructors

- `of`
- `tagged`
- `Class`
- `TaggedClass`

### Entry model

- `Entry`
- `makeEntry`

### Completion

- `complete`
- `completeEffect`
- `fail`
- `failCause`
- `succeed`

That accounts for all 21 current exports.

## Request and Foldkit

Keep request execution on the Effect/runtime side of the Foldkit boundary.

A useful architecture is:

```text
Foldkit update
    emits Command / describes intent

Effect handler
    constructs Request value
    calls Effect.request

RequestResolver
    batches / loads / completes Entry values

handler result
    becomes Foldkit Message

Foldkit update
    remains pure
```

Do not put `Request.Entry` objects into a pure UI Model. Entries carry runtime
context, a mutable `uninterruptible` flag, and an unsafe completion callback.

A Request value itself is descriptive data plus Effect's runtime marker, but it
is usually cleaner to construct it at the command/runtime boundary unless the
UI genuinely needs the request description as state.

## Request vs RequestResolver

The module split is intentional:

```text
Request
    what work is requested
    success/error/services types
    fields the resolver needs
    completion contract

RequestResolver
    how requests are executed
    batching
    backend calls
    completion of entries
```

Do not move backend behavior into Request classes just because class-based
constructors exist.

## Type discipline

The generated demo has no explicit `any` annotations.

Every custom callback, Foldkit Message payload, and UI callback that could lose
contextual typing is explicitly typed where appropriate.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect implementation itself contains internal generic `any` casts
in constructor/completion plumbing. That is separate from the generated
artifact constraint.

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

The result contains only the expected unresolved-import diagnostics.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `RequestDemo.Message` to the parent Message union,
3. initialize `RequestDemo.init`,
4. delegate child messages to `RequestDemo.update`,
5. render `RequestDemo.view(...)` from the Request route.

This artifact intentionally performs none of those edits.
