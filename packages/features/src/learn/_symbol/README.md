# Effect 4 Symbol — Foldkit visual demo

## Important: this module is intentionally tiny

The current Effect 4 `Symbol` module exports **one function**:

```ts
Symbol.isSymbol(u)
// (u: unknown) => u is symbol
```

That is intentional. Native JavaScript already owns symbol creation, the
global symbol registry, and symbol-keyed object behavior.

Effect provides the runtime refinement that lets you safely cross from
`unknown` into that native symbol API.

## The four sections

### 1. Guard

At an untrusted boundary:

```ts
import { Symbol } from "effect"

Symbol.isSymbol(
  globalThis.Symbol.for("app/user")
)
// true

Symbol.isSymbol("app/user")
// false
```

The return type is a TypeScript type predicate:

```ts
(u: unknown) => u is symbol
```

### 2. Refine

That predicate narrows the value:

```ts
const describe = (value: unknown) => {
  if (!Symbol.isSymbol(value)) {
    return "not a symbol"
  }

  // value: symbol

  return {
    description: value.description,
    registryKey: globalThis.Symbol.keyFor(value)
  }
}
```

This is the main reason the Effect module exists: validating an `unknown`
boundary before treating the input as a symbol key, identifier, or
discriminant.

### 3. Filter

Refinements compose with Effect collection APIs:

```ts
import {
  Array,
  Symbol
} from "effect"

const values: Array<unknown> = [
  globalThis.Symbol.for("user"),
  "user",
  42,
  globalThis.Symbol("local")
]

const symbols = Array.filter(
  values,
  Symbol.isSymbol
)

// Array<symbol>
```

Because `isSymbol` is a refinement rather than merely `(u) => boolean`,
TypeScript keeps the narrowed `symbol` element type.

### 4. Identity

This section is native JavaScript context rather than additional Effect APIs.

Local symbols are unique:

```ts
globalThis.Symbol("token") ===
globalThis.Symbol("token")
// false
```

Global registry symbols are stable by key:

```ts
globalThis.Symbol.for("token") ===
globalThis.Symbol.for("token")
// true
```

Symbols also work as non-string property keys:

```ts
const Secret = globalThis.Symbol("secret")

const value = {
  visible: "public",
  [Secret]: "private"
}

Object.keys(value)
// ["visible"]

Object.getOwnPropertySymbols(value)
// [Secret]

Reflect.ownKeys(value)
// ["visible", Secret]
```

This helps explain the kinds of values `Effect.Symbol.isSymbol` is intended to
recognize at runtime.

## Real Effect 4 APIs used

The source uses:

- `Symbol.isSymbol`
- `Array.filter` with the refinement
- `Schema` for the Foldkit teaching model
- `Match` for Foldkit update dispatch

The native examples use:

- `globalThis.Symbol`
- `globalThis.Symbol.for`
- `globalThis.Symbol.keyFor`
- `Object.keys`
- `Object.getOwnPropertySymbols`
- `Reflect.ownKeys`
