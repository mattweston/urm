# Effect 4 Layer — Foldkit visual demo

## What the lesson teaches

The demo is split into four panels:

### 1. Construct

Shows the difference between:

- `Layer.succeed(Service, value)` — the service value already exists.
- `Layer.effect(Service, effect)` — construction is effectful and may require other services.

It also introduces the type:

```ts
Layer<ROut, E, RIn>
```

where:

- `ROut` = services the Layer provides
- `E` = possible construction errors
- `RIn` = services required to build it

### 2. Merge

Shows `Layer.mergeAll` combining independent outputs:

```ts
Layer<Database> + Layer<Logger>
→ Layer<Database | Logger>
```

Merge combines outputs; it does not feed one Layer into another Layer's dependencies.

### 3. Provide

Shows the difference between:

```ts
UserServiceLive.pipe(
  Layer.provide(AppDependencies)
)
```

and:

```ts
UserServiceLive.pipe(
  Layer.provideMerge(AppDependencies)
)
```

`provide` satisfies the requirements and keeps those dependency services private.

`provideMerge` satisfies the same requirements while retaining the dependency
services in the resulting `ROut`.

### 4. Lifetime

Uses a real scoped Layer built from:

```ts
Layer.effect(
  Connection,
  Effect.acquireRelease(acquire, release)
)
```

The panel demonstrates two important Layer behaviours:

1. Layer acquisition lives in the Layer's scope; closing that scope runs resource finalizers.
2. Reusing the same Layer instance in one scope is memoized, so it is normally acquired once.

`Layer.fresh` opts out of that memoization and causes independent acquisitions.

## Real Effect examples in `examples/layer.ts`

The source contains real Effect 4 examples for:

- `Context.Service`
- `Layer.succeed`
- `Layer.effect`
- `Layer.merge` / `Layer.mergeAll`
- `Layer.provide`
- `Layer.provideMerge`
- `Effect.provide`
- `Effect.acquireRelease`
- `Layer.fresh`

The examples target the Layer APIs available in the URM Effect 4 RC line.
