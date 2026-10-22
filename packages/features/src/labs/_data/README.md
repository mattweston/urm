# Data

## Mental model

Effect's `Data` module is a compact toolkit for small readonly domain models.
It covers four related needs:

```text
Data.Class        -> readonly value class
Data.TaggedClass  -> value class + _tag
Data.Error        -> yieldable typed error
Data.TaggedError  -> yieldable typed error + _tag
Data.TaggedEnum   -> closed discriminated union type
Data.taggedEnum   -> constructors + $is + $match
```

The module is intentionally small. The current Effect v4 API surface has seven
exports, with most of the type-level detail living under the `TaggedEnum`
namespace.

The Foldkit model in this demo contains only presentation choices. Snapshot
functions construct and evaluate real Effect `Data` values synchronously, so the
view stays pure and deterministic.

## The four sections

### 1. Class

The first stage contrasts `Data.Class` and `Data.TaggedClass`.

```ts
class Person extends Data.Class<{
    readonly name: string
    readonly role: string
}> {}
```

The constructor accepts one object containing the declared fields. The resulting
instance is readonly at the TypeScript/value-model level and supports `.pipe()`.
The current API reference also demonstrates structural equality through
`Equal.equals`:

```ts
Equal.equals(
    new Person({ name: "Ada", role: "admin" }),
    new Person({ name: "Ada", role: "admin" })
)
// true
```

`Data.TaggedClass` adds a discriminator without adding `_tag` to the constructor
arguments:

```ts
class TaggedPerson extends Data.TaggedClass("Person")<{
    readonly name: string
    readonly role: string
}> {}

new TaggedPerson({
    name: "Ada",
    role: "admin",
})._tag
// "Person"
```

An important nuance: the implementation assigns readonly properties; it does not
call `Object.freeze`. Treat immutability here as part of the typed value contract,
not runtime deep freezing.

## 2. Enum

`Data.TaggedEnum` transforms a record of variants into a discriminated union:

```ts
type RequestState = Data.TaggedEnum<{
    Idle: {}
    Loading: { readonly requestId: string }
    Success: { readonly value: string }
    Failure: { readonly reason: string }
}>
```

Each key becomes the `_tag` for one union member. Variant definitions must not
supply `_tag` themselves.

`Data.taggedEnum` creates the runtime helper object:

```ts
const State = Data.taggedEnum<RequestState>()

const value = State.Success({
    value: "profile loaded",
})

State.$is("Success")(value)
// true

State.$match(value, {
    Idle: () => "idle",
    Loading: ({ requestId }) => `loading ${requestId}`,
    Success: ({ value }) => `ready ${value}`,
    Failure: ({ reason }) => `failed ${reason}`,
})
```

The demo lets the viewer switch all four variants and watch the constructor,
`$is`, and `$match` results update together.

Two current API gotchas are called out visually:

1. `taggedEnum` constructors return **plain objects**, not class instances.
2. `$is(tag)` checks only the `_tag` property. It is a useful narrowing helper
   for values created by your constructors, but it is not validation. Validate
   untrusted input with `Schema` first.

## 3. Errors

`Data.Error` is a yieldable error base class:

```ts
class NetworkError extends Data.Error<{
    readonly code: number
    readonly message: string
}> {}
```

Instances can participate directly in `Effect.gen` failure control flow:

```ts
const program = Effect.gen(function* () {
    return yield* new NetworkError({
        code: 503,
        message: "upstream unavailable",
    })
})
```

`Data.TaggedError` adds the discriminator that Effect's tag-based recovery uses:

```ts
class NotFound extends Data.TaggedError("NotFound")<{
    readonly resource: string
}> {}

const program = Effect.gen(function* () {
    return yield* new NotFound({
        resource: "/users/42",
    })
})

const recovered = program.pipe(
    Effect.catchTag("NotFound", (error) =>
        Effect.succeed(`missing: ${error.resource}`)
    )
)
```

The demo switches between:

```text
NetworkError  -> Data.Error, no _tag
NotFound      -> Data.TaggedError("NotFound")
Forbidden     -> Data.TaggedError("Forbidden")
```

All three fail an Effect when yielded. The tagged variants additionally support
selective `catchTag` / `catchTags` recovery.

If a `message` field is supplied to `Data.Error`, it becomes the JavaScript
Error `.message`. Tagged errors are also `Cause.YieldableError` values.

## 4. Generics

The final stage makes the `Data.TaggedEnum` type namespace visible.

A generic tagged union can be defined like this:

```ts
type DemoResult<E, A> = Data.TaggedEnum<{
    Failure: { readonly error: E }
    Success: { readonly value: A }
}>

interface DemoResultDef
    extends Data.TaggedEnum.WithGenerics<2> {
    readonly taggedEnum:
        DemoResult<this["A"], this["B"]>
}

const ResultData = Data.taggedEnum<DemoResultDef>()
```

The runtime constructors remain ordinary tagged-object constructors:

```ts
ResultData.Success({ value: 42 })
ResultData.Failure({ error: "bad input" })
```

The namespace utilities preserve precise TypeScript relationships:

```ts
type Concrete = Data.TaggedEnum.Kind<
    DemoResultDef,
    string,
    number
>

type SuccessArgs = Data.TaggedEnum.Args<
    Concrete,
    "Success"
>
// { readonly value: number }

type FailureValue = Data.TaggedEnum.Value<
    Concrete,
    "Failure"
>
// { readonly _tag: "Failure"; readonly error: string }
```

The current namespace also exposes `TaggedEnum.Constructor`,
`TaggedEnum.ConstructorFrom`, and generic matcher types. Those are useful when
annotating reusable constructor bundles and helpers; the visual demo focuses on
`WithGenerics`, `Kind`, `Args`, and `Value` because they make the type flow most
obvious.

## Files

Place these three files together under the learn feature, for example:

```text
packages/features/src/learn/data/
├── data.ts
├── data.view.ts
└── README.md
```

`data.ts` contains the domain examples, Schema-defined Foldkit model/message
union, pure update function, and deterministic snapshots.

`data.view.ts` is the pure Foldkit view. It accepts a `to_parent_message`
function so the parent feature can lift Messages without this demo depending on
a specific parent union.

No integration patch, route edit, parent Model edit, repository mutation, or
archive is included.

## Effect APIs covered

### Value classes

```ts
Data.Class
Data.TaggedClass
Equal.equals
```

### Tagged unions

```ts
Data.TaggedEnum
Data.taggedEnum
$is
$match
```

### Typed errors

```ts
Data.Error
Data.TaggedError
Effect.gen
Effect.catchTag
Effect.catchTags
Effect.exit
```

### TaggedEnum type utilities

```ts
Data.TaggedEnum.WithGenerics
Data.TaggedEnum.Kind
Data.TaggedEnum.Args
Data.TaggedEnum.Value
Data.TaggedEnum.Constructor
Data.TaggedEnum.ConstructorFrom
```

## Reference checked

The demo was checked against the current Effect v4 `Data` API reference and the
`Effect-TS/effect` `main` implementation of `packages/effect/src/Data.ts`.
