# Context

## Mental model

Effect's `Context` is an immutable typed map of service implementations.
`Context.Service` and `Context.Reference` create the keys used to identify
services, while the `Context` type tracks which required service identifiers are
available.

The key idea is that Effect requirements are not ordinary function arguments.
A service key can itself be yielded inside an Effect, and the runtime resolves
that key from the current Context.

This visual demo keeps the Foldkit side deliberately small:

1. the Model stores only the selected teaching stage and a few UI toggles
2. `update` stays pure and changes those controls
3. exported snapshot functions build real Effect `Context` values
4. the view renders the resulting service slots and lookup results
5. no repository wiring, route changes, or parent feature edits are included

Unlike the Console demo, Context construction and lookup are pure operations, so
this demo does not need a Foldkit `Command`.

## The four sections

### 1. Keys

A function-style service key:

```ts
const Database = Context.Service<{
    query: (sql: string) => string
}>("Database")
```

A class-style service key:

```ts
class Config extends Context.Service<Config, {
    port: number
}>()("Config") {}
```

Both are `Context.Key` values. The runtime string is exposed as `.key`, and the
key is also an Effect that requests its service:

```ts
const program = Effect.gen(function* () {
    const database = yield* Database
    return database.query("select 1")
})
```

That is why a service key participates in the `Requirements` / environment type
of an Effect.

The demo also shows `Context.isKey` and `Context.isReference` so the runtime
identity of each key is visible.

## 2. Build

`Context.make` starts a Context with one service and `Context.add` returns a new
Context with another service stored under its key:

```ts
const context = Context.make(Database, primary).pipe(
    Context.add(Cache, memoryCache),
    Context.add(Config, liveConfig)
)
```

The Build stage lets you switch the Database implementation and add/remove Cache
or Config. The resulting slots are rebuilt with the real Context API.

It then demonstrates three lookup styles:

```ts
Context.get(context, Database)
Context.getOption(context, Cache)
Context.getOrElse(context, Config, () => fallbackConfig)
```

`get` is for a service known to be present. `getOption` represents absence as an
`Option`. `getOrElse` supplies a lazy fallback for a missing ordinary service.

Adding a value under a key already present in the Context replaces that key's
previous service in the returned Context.

## 3. Merge

Two Context values can be combined:

```ts
const left = Context.make(Database, primary).pipe(
    Context.add(Config, liveConfig)
)

const right = Context.make(Database, replica).pipe(
    Context.add(Telemetry, telemetry)
)

const merged = Context.merge(left, right)
```

Both sides contain `Database`. The right-hand Context wins, so the merged
Database is `replica`.

The interactive result can then be filtered with:

```ts
merged.pipe(Context.pick(Database))
merged.pipe(Context.omit(Telemetry))
```

`pick` keeps an allowlist of service keys. `omit` removes the selected keys.
`Context.mergeAll` is the variadic form for combining more than two Contexts.

## 4. Reference

`Context.Reference` creates a key with a lazy cached default:

```ts
const RequestLabel = Context.Reference<string>(
    "RequestLabel",
    { defaultValue: () => "public" }
)
```

An empty Context can still resolve it:

```ts
const context = Context.empty()

Context.get(context, RequestLabel)
// "public"
```

An explicit value overrides that default:

```ts
const custom = Context.make(RequestLabel, "admin-preview")

Context.get(custom, RequestLabel)
// "admin-preview"
```

The demo also shows that `getOption` resolves the Reference default and that
`getOrElse` does not use its fallback when a Reference can resolve its own
default.

A `Context.Reference<Shape>` carries `never` as its service identifier, so it
does not add a required service to an Effect merely because its default is used.

## Files

Place these three files together under the learn feature, for example:

```text
packages/features/src/learn/context/
├── context.ts
├── context.view.ts
└── README.md
```

`context.ts` contains the Effect service keys, real Context operations,
Schema-defined Foldkit Model and Message union, pure update, and derived visual
snapshots.

`context.view.ts` is the pure Foldkit view. Like the Console demo, it accepts a
`to_parent_message` function so a parent feature can lift the demo's Messages
without coupling this file to a particular parent Message union.

No integration patch, route edit, parent Model edit, archive, or repository
mutation is included.

## Effect APIs covered

### Keys and services

```ts
Context.Service
Context.Reference
Context.isKey
Context.isReference
```

### Construction and combination

```ts
Context.empty
Context.make
Context.add
Context.merge
Context.mergeAll
```

### Filtering

```ts
Context.pick
Context.omit
```

### Lookup

```ts
Context.get
Context.getOption
Context.getOrElse
```

## Reference

The implementation follows the current Effect v4 Context API reference:

```text
https://effect.website/docs/v4/api/effect/Context
```

The reference checked while preparing these files reports Effect
`4.0.0-rc.116`.
