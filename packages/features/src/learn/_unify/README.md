# Unify

Based on:

- <https://effect.website/docs/v4/api/effect/Unify>
- `.context/effect/packages/effect/src/Unify.ts`
- `.context/foldkit`

The workspace is pinned to Effect `4.0.0-rc.112`. The live API page is
currently `4.0.0-rc.117`; the eight public `Unify` exports used by this lesson
are present in the vendored workspace source.

## Mental model

`Unify` is Effect's **type-level normalization protocol**.

It solves a problem like this:

```ts
Option.Option<string> |
Option.Option<number>
```

The two union members are the same public data type with different type
parameters. Effect types opt into the `Unify` protocol so that union can become:

```ts
Option.Option<string | number>
```

Likewise:

```ts
Result.Result<string, "err-1"> |
Result.Result<number, "err-2">
```

can normalize to:

```ts
Result.Result<
  string | number,
  "err-1" | "err-2"
>
```

and an Effect union can normalize all three Effect channels:

```ts
Effect.Effect<
  string | number,
  "err-1" | "err-2",
  "dep-1" | "dep-2"
>
```

This is mainly infrastructure for Effect data types and advanced library code.
Ordinary application code usually benefits from it indirectly.

## It is not a runtime conversion

The most important rule is:

```text
runtime value stays the same
inferred TypeScript type changes
```

`Unify.unify` is implemented as an identity function.

So this:

```ts
const unified = Unify.unify(value)
```

does not execute or transform `value`.

It asks TypeScript to view its type through:

```ts
Unify.Unify<typeof value>
```

## It is not a generic union flattener

`Unify` only has special behavior for values whose types expose Effect's
unification protocol.

The protocol is built from three unique-symbol keys:

```ts
Unify.typeSymbol
Unify.unifySymbol
Unify.ignoreSymbol
```

Types without that protocol are preserved rather than magically rewritten.
This is why the module is primarily useful to Effect data-type maintainers and
library authors.

# 1. `Unify.Unify<A>`

`Unify.Unify<A>` performs the normalization entirely at the type level.

The lesson contains compile-time checks for real Effect types:

```ts
type OptionUnion =
  | Option.Option<string>
  | Option.Option<number>

type UnifiedOption =
  Unify.Unify<OptionUnion>

// Option.Option<string | number>
```

and:

```ts
type ResultUnion =
  | Result.Result<string, "err-1">
  | Result.Result<number, "err-2">

type UnifiedResult =
  Unify.Unify<ResultUnion>

// Result.Result<
//   string | number,
//   "err-1" | "err-2"
// >
```

The checks use `Types.Equals` so the examples are part of the compiled lesson,
not labels that only claim a type result.

# 2. `typeSymbol`

A protocol-enabled type exposes:

```ts
[Unify.typeSymbol]?: ...
```

During unification, Effect uses this slot to make the complete source union
available to the protocol machinery.

A custom example can look like:

```ts
interface TextProtocol {
  readonly value: string

  [Unify.typeSymbol]?: string

  [Unify.unifySymbol]?: {
    readonly Public: () => string
  }
}
```

`typeSymbol` is a compile-time protocol key. It is not application state or a
property that you are expected to read at runtime.

# 3. `unifySymbol`

`unifySymbol` contains named protocol entries describing public widened types.

For example:

```ts
interface NumberProtocol {
  readonly value: number

  [Unify.typeSymbol]?: number

  [Unify.unifySymbol]?: {
    readonly Public: () => number
  }
}
```

Given:

```ts
type Input =
  | TextProtocol
  | NumberProtocol
```

this lesson checks:

```ts
type Output = Unify.Unify<Input>
// string | number
```

Effect's built-in `Option`, `Result`, `Effect`, `Stream`, `Layer`, and other
protocol-enabled data types use the same mechanism with richer generic types.

# 4. `ignoreSymbol`

Sometimes a protocol map contains entries that should not contribute to the
public widened type.

For example:

```ts
interface VisibleAndDebug<A> {
  [Unify.typeSymbol]?: A

  [Unify.unifySymbol]?: {
    readonly Public: () => A
    readonly Debug: () => {
      readonly debug: A
    }
  }

  [Unify.ignoreSymbol]?: {
    readonly Debug: true
  }
}
```

The `Debug` entry is filtered from unification:

```ts
type Output =
  Unify.Unify<VisibleAndDebug<string>>

// string
```

Without `ignoreSymbol`, both protocol entries contribute:

```ts
string |
{ readonly debug: string }
```

Again, this is only type-level filtering. It does not remove JavaScript object
properties at runtime.

# 5. Symbol value/type pairs

The API reference counts six exports for the three protocol symbols because
each symbol also has a corresponding type alias:

```ts
Unify.unifySymbol
Unify.unifySymbol // type

Unify.typeSymbol
Unify.typeSymbol // type

Unify.ignoreSymbol
Unify.ignoreSymbol // type
```

The lesson references those type aliases explicitly:

```ts
type UnifySymbolType = Unify.unifySymbol
type TypeSymbolType = Unify.typeSymbol
type IgnoreSymbolType = Unify.ignoreSymbol
```

The symbol declarations exist so they can be used as unique computed property
keys in TypeScript protocol definitions. They do not represent normal runtime
configuration values.

# 6. `Unify.unify`

For a value:

```ts
const result = Unify.unify(value)
```

its runtime identity is preserved while the inferred type becomes:

```ts
Unify.Unify<typeof value>
```

The helper is especially useful for functions.

This lesson declares an explicit union-returning function:

```ts
const optionStringOrNumber = (
  kind: "String" | "Number"
):
  | Option.Option<string>
  | Option.Option<number> =>
    kind === "String"
      ? Option.some("Ada")
      : Option.some(42)
```

Then:

```ts
const unified =
  Unify.unify(optionStringOrNumber)
```

has the cleaner return type:

```ts
(
  kind: "String" | "Number"
) => Option.Option<string | number>
```

while calling it returns the exact same Option value at runtime.

## Curried functions

The vendored source has explicit overloads through five nested function layers.
That means a curried function keeps its argument structure while `Unify` is
applied to the final result:

```ts
const curried =
  (prefix: string) =>
  (kind: "String" | "Number"):
    | Option.Option<string>
    | Option.Option<number> =>
      kind === "String"
        ? Option.some(`${prefix}Ada`)
        : Option.some(42)

const unifiedCurried =
  Unify.unify(curried)
```

The final return becomes:

```ts
Option.Option<string | number>
```

# The three protocol symbols are type-level

This distinction is worth keeping explicit:

```text
Unify.Unify<A>
  → type-level normalization

Unify.typeSymbol
Unify.unifySymbol
Unify.ignoreSymbol
  → type-level protocol keys

Unify.unify(value)
  → runtime identity function with a normalized static type
```

You generally should not build application-domain behavior around these
symbols. They exist to improve the public types of Effect-style generic data
types.

# Real Effect 4 API covered

All eight exports on the module page are represented:

- `Unify.Unify`
- `Unify.unifySymbol` — symbol declaration
- `Unify.unifySymbol` — symbol type
- `Unify.typeSymbol` — symbol declaration
- `Unify.typeSymbol` — symbol type
- `Unify.ignoreSymbol` — symbol declaration
- `Unify.ignoreSymbol` — symbol type
- `Unify.unify`

## Suggested placement

The repository already contains empty placeholders at:

```text
packages/features/src/learn/_unify/
├── README.md
├── unify.ts
└── unify.view.ts
```

The files in this bundle are intended to fill those three slots.

No Git operations are required by this bundle.
