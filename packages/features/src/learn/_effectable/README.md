# Effectable

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Effectable

The current reference page is Effect `4.0.0-rc.116` and exposes exactly three
items:

- `Effectable.Class`
- `Effectable.Mixin`
- `Effectable.Prototype`

The implementation and Effect's own `Effectable.test.ts` were also checked.

## Files

- `effectable.ts` — real Effectable examples, snapshots, Foldkit Model / Message /
  update.
- `effectable.view.ts` — interactive visual demo.
- `effectable-preview.png` — static preview of the default Class stage.

## Intended location

```text
packages/features/src/learn/effectable/
├── effectable.ts
└── effectable.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. Class

A small domain class extends:

```ts
Effectable.Class<number>
```

and implements:

```ts
asEffect() {
    return Effect.succeed(this.text.length)
}
```

The instance still owns its domain field, but:

```text
Effect.isEffect(instance) -> true
Effect.runSync(instance)  -> number
instance.pipe(Effect.map(...)) -> ordinary Effect composition
```

The important type rule is that `A`, `E`, and `R` come from the Effect returned
by `asEffect`.

### 2. Yield

`ScaleValue` demonstrates all three Effect channels:

```ts
class ScaleValue extends Effectable.Class<
    number,
    ScaleError,
    Multiplier
>
```

Its `asEffect()` reads a service and may fail.

The demo then does this directly:

```ts
const scaled =
    yield* new ScaleValue(7)
```

inside `Effect.gen`.

This is the payoff of Effectable: the custom domain value is not merely
convertible to an Effect through a helper function. The value itself implements
the Effect protocol.

### 3. Mixin

A pre-existing class:

```ts
class Box {
    constructor(readonly value: number) {}

    double() {
        return this.value * 2
    }
}
```

is adapted with:

```ts
class EffectBox extends Effectable.Mixin(Box) {
    asEffect() {
        return Effect.succeed(this.value)
    }
}
```

The demo verifies the same behavior covered by Effect's own tests:

- the original constructor and fields survive,
- `double()` survives,
- the mixed value is still `instanceof Box`,
- the mixed value is an Effect,
- the original `Box` is not modified.

The API docs also call out an important inheritance detail: Effect prototype
members shadow same-named members on the wrapped base prototype. This applies
to `pipe`, `toString`, `toJSON`, `[Symbol.iterator]`, and Node's custom inspect
symbol.

### 4. Prototype

`Prototype` is the lower-level alternative to extending a class.

The demo creates:

```ts
interface PrimitiveNumber
    extends Effect.Effect<number> {
    readonly value: number
}
```

then builds the prototype:

```ts
const proto =
    Effectable.Prototype<PrimitiveNumber>({
        label: "PrimitiveNumber",

        evaluate(fiber) {
            return Effect.succeed(
                this.value
            )
        }
    })
```

and creates a value with `Object.create(proto)`.

The resulting object supports:

- `Effect.isEffect`
- `Effect.runSync`
- `pipe`
- direct `yield*`

The evaluator receives the current Fiber because `Prototype` operates directly
on Effect's primitive evaluation path.

## Current API notes

### `Effectable.Class<A, E, R>`

An abstract base class with one required method:

```ts
abstract asEffect(): Effect.Effect<A, E, R>
```

Use this when designing a new class whose instances should themselves be
Effects.

### `Effectable.Mixin(Base)`

Returns an abstract subclass of an existing constructor and inserts the Effect
prototype into its inheritance chain.

Use this when:

- the base class already exists,
- you want to preserve its constructor and ordinary members,
- you do not want to modify the original prototype.

The success/error/service types are inferred from the final class's concrete
`asEffect()` return type.

### `Effectable.Prototype(options)`

Accepts:

```ts
{
    label: string
    evaluate(this, fiber): Effect
}
```

Use this for custom low-level Effect-like primitives where class inheritance is
not the right model.

## Integration expectation

Follow the same child-feature integration pattern as the neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `EffectableDemo.Message` to the parent Message union,
3. initialize `EffectableDemo.init`,
4. delegate child messages to `EffectableDemo.update`,
5. render `EffectableDemo.view(...)` from the Effectable route.

This artifact intentionally performs none of those edits.
