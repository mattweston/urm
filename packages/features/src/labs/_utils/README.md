# Utils

Based on:

- https://effect.website/docs/v4/api/effect/Utils
- `.context/effect/packages/effect/src/Utils.ts`
- `.context/foldkit`

The live API page currently documents Effect `4.0.0-rc.117`. The repository's
vendored Effect source is the authority for code compatibility.

## Public API

The public `Utils` API has exactly three exports:

- `Utils.SingleShotGen`
- `Utils.Gen`
- `Utils.Variance`

The vendored source also exports `internalCall`, but it is marked `@internal`
and does not appear in the public API documentation, so this lesson does not
present it as user-facing API.

## Mental model

`Utils` is not a general-purpose grab bag of helpers.

It is infrastructure for Effect-style generator APIs and HKT inference:

```text
SingleShotGen
    runtime iterator protocol
    makes an Effect-style value usable with yield*

Variance
    type-level channel directions
    F invariant, R contravariant, O/E covariant

Gen
    generic type signature
    turns generator yields into a Kind<F, ...>
```

Application code usually uses:

```ts
Option.gen(...)
Result.gen(...)
Effect.gen(...)
```

rather than importing `Utils` directly.

## 1. `SingleShotGen`

A `SingleShotGen<T, A>` is an `IterableIterator<T, A>` that yields its wrapped
value once.

```ts
const gen = new Utils.SingleShotGen<string, number>("hello")

gen.next(0)
// { value: "hello", done: false }

gen.next(42)
// { value: 42, done: true }
```

The first `next` exposes the wrapped Effect-style value to the outer generator
driver.

The next value sent back into the iterator becomes the result of the `yield*`
expression.

An important detail is:

```ts
gen[Symbol.iterator]()
```

returns a **fresh** `SingleShotGen` around the same `self` value. It does not
return the already-consumed iterator instance.

That is the small runtime protocol seam that lets types such as `Option` expose:

```ts
[Symbol.iterator]()
```

and participate in generator syntax.

## 2. `Gen`

`Utils.Gen<F>` is a reusable type signature for generator-based composition over
a `TypeLambda`.

The Effect source uses it directly for modules including `Option` and `Result`:

```ts
const optionGen: Utils.Gen<Option.OptionTypeLambda> = Option.gen
const resultGen: Utils.Gen<Result.ResultTypeLambda> = Result.gen
```

The same generic signature can therefore describe different runtime semantics.

### Option

```ts
optionGen(function* () {
    const left = yield* Option.some(2)
    const right = yield* Option.some(3)
    return left + right
})
// Option.some(5)
```

If a yielded value is `None`, `Option.gen` stops with `None`.

### Result

```ts
resultGen(function* () {
    const left = yield* Result.succeed(2)
    const right = yield* Result.succeed(3)
    return left + right
})
// Result.succeed(5)
```

If a yielded value is `Failure`, `Result.gen` stops with that failure.

`Utils.Gen` does not implement those short-circuit rules. It types the common
shape; each module supplies its own runtime driver.

## 3. `Variance`

`Utils.Variance<F, R, O, E>` tells `Gen` how its type channels vary:

```ts
interface Variance<
    in out F extends TypeLambda,
    in R,
    out O,
    out E
> {
    readonly _F: Types.Invariant<F>
    readonly _R: Types.Contravariant<R>
    readonly _O: Types.Covariant<O>
    readonly _E: Types.Covariant<E>
}
```

The four slots mean:

```text
_F  TypeLambda itself     invariant
_R  input / requirements  contravariant
_O  output channel        covariant
_E  error channel         covariant
```

This is type-level machinery. A runtime object satisfying `Variance` can be
constructed as a witness, but Effect does not require application code to pass
such objects around in ordinary use.

## How `Gen` uses the channels

The return type of `Utils.Gen<F>` is conceptually:

```ts
Kind<
    F,
    inferred R,
    inferred O,
    inferred E,
    generator return A
>
```

The yielded values supply the `R`, `O`, and `E` channels; the generator's final
`return` value becomes the target `A`.

That is why one generic type can support containers with different numbers of
meaningful channels:

- `Option` mainly uses the target value
- `Result` uses target + error
- Effect-like types can also use requirements / environment channels

## Relationship to HKT

`Utils.Gen` depends on Effect's HKT encoding:

```text
TypeLambda
    ↓
Kind<F, R, O, E, A>
    ↓
concrete Effect-style type
```

If the `_hkt` lesson is read first, `Utils.Gen` is a practical example of why
`TypeLambda` and `Kind` exist.

## Files

- `utils.ts` — real `SingleShotGen`, `Gen`, and `Variance` examples plus the
  Foldkit teaching model and update function.
- `utils.view.ts` — three-stage interactive visual explanation.

## Intended location

```text
packages/features/src/labs/_utils/
├── README.md
├── utils.ts
└── utils.view.ts
```

No parent router/model/message/update files are modified by this bundle.
