# LayerMap

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/LayerMap

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/LayerMap.ts` public surface consists of the
LayerMap model, its two constructors, the service wrapper / TagClass model, and
the five `LayerMap.Service` type helpers:

- `LayerMap`
- `make`
- `fromRecord`
- `TagClass`
- `Service`
- `Service.Key`
- `Service.Layers`
- `Service.Success`
- `Service.Error`
- `Service.Services`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `layer-map.ts` — real keyed layers, direct Context access, cache probing,
  invalidation, preloading, and a `LayerMap.Service` wrapper.
- `layer-map.view.ts` — interactive visual demo.
- `layer-map-preview.png` — static preview of the default Build stage.

## Intended location

```text
packages/features/src/labs/layer-map/
├── layer-map.ts
└── layer-map.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

A `LayerMap<K, I, E>` is a scoped cache for a **family of Layers selected by
key**.

Conceptually:

```text
key
 ↓
lookup(key)
 ↓
Layer<I, E, R>
 ↓ build once / retain
Context<I>
 ↓
cached by key
```

The internal cache is an `RcMap`.

That means a cached entry is reference-counted and tied to scopes that acquire
it.

This is useful for resource families such as:

```text
tenant clients
regional database pools
per-customer HTTP clients
environment-specific services
sharded resources
```

where each key should lazily produce one cached service context rather than
rebuilding the Layer for every use.

## 1. Build

### `LayerMap.make`

The dynamic constructor is:

```ts
const map =
    yield* LayerMap.make(
        (
            tenant: string
        ) =>
            tenant_layer(
                tenant
            )
    )
```

The lookup function converts each key into a Layer.

The returned `LayerMap` lives in a Scope because its cached contexts may contain
resources that require finalization.

### Idle time to live

`make` accepts:

```ts
{
    idleTimeToLive:
        Duration.Input
}
```

or a function:

```ts
{
    idleTimeToLive:
        (
            key: K
        ) =>
            Duration.Input
}
```

so different keys may receive different idle lifetimes.

The demo uses:

```text
hot tenant    → 30 seconds
other tenants → 5 seconds
```

The idle lifetime matters after an entry's active reference count reaches zero.

At that point the underlying `RcMap` behavior is:

```text
TTL = zero
    → remove + close immediately

finite TTL
    → schedule release after the idle period

infinite TTL
    → keep the unused entry cached
```

until something else, such as invalidation or map shutdown, removes it.

## Preloading

`make` also accepts:

```ts
preloadKeys
```

When supplied, those keys are built during construction.

Because preloading can execute the layer lookup / build process, errors from
those preloaded layers can appear in the constructor's error channel.

The demo preloads:

```text
hot
```

to make that type-level distinction visible.

## `fromRecord`

For a fixed set of keys:

```ts
const map =
    yield* LayerMap.fromRecord(
        {
            development:
                devLayer,
            production:
                prodLayer
        }
    )
```

the key type is derived from the record:

```text
"development" | "production"
```

This is useful when the complete keyed family is known statically.

### `preload`

`fromRecord` uses:

```ts
{
    preload: true
}
```

instead of `preloadKeys`.

That means every record key is preloaded.

## 2. Access

A LayerMap exposes three important retrieval surfaces.

### `get`

```ts
map.get(
    key
)
```

returns:

```text
Layer<I, E>
```

This is the most convenient form when the keyed services should be supplied to
another Effect:

```ts
yield* program.pipe(
    Effect.provide(
        map.get(
            "acme"
        )
    )
)
```

The demo exports a real `layer_access_program` using this pattern.

## `contextEffect`

```ts
map.contextEffect(
    key
)
```

returns:

```text
Effect<
    Context<I>,
    E,
    Scope
>
```

This directly acquires the cached Context.

The requesting Scope retains the cache entry.

The demo's `dynamic_map_program` retrieves a Context for:

```text
acme
```

then gets `TenantClient` from that Context directly.

## `contextEffectOption`

```ts
map.contextEffectOption(
    key
)
```

returns:

```text
Effect<
    Option<Context<I>>,
    E,
    Scope
>
```

This method has deliberately different semantics.

For a key that is not currently cached:

```text
None
```

is returned and the Layer lookup is **not run**.

For an existing entry, including one whose acquisition is still in flight, the
entry is retained for the requesting Scope and the existing acquisition is
awaited.

A closed map also returns:

```text
None
```

This is the right API for:

> Use the resource only if it already exists; do not create it.

## `rcMap`

The `LayerMap` model exposes its underlying:

```ts
readonly rcMap:
    RcMap<
        K,
        Context<I>,
        E
    >
```

This makes the underlying reference-counted storage model explicit.

The demo does not depend on RcMap internals directly; it surfaces the lifecycle
semantics that LayerMap delegates to it.

## 3. Cache

### Probe without build

The demo includes a real `cache_probe_program`.

It first calls:

```ts
map.contextEffectOption(
    "cold"
)
```

before that key has ever been acquired.

The expected state is:

```text
None
```

without running the tenant Layer.

It then calls:

```ts
map.contextEffect(
    "cold"
)
```

which creates / acquires the entry.

A later:

```ts
contextEffectOption(
    "cold"
)
```

can now observe and retain that cached Context.

## Invalidation

```ts
yield* map.invalidate(
    key
)
```

removes the current entry for that key from the map.

The next normal acquisition for the same key therefore builds a fresh entry.

### Invalidation while still retained

Invalidation does not necessarily mean:

> synchronously destroy the resource this instant.

If the cached entry still has active references, RcMap removes it from the map
so it can no longer be found by future lookups, but the resource remains alive
for those active references.

It is closed when those references are later released.

This preserves scoped resource safety.

## Invalidation and cached-only lookup

After invalidation:

```ts
map.contextEffectOption(
    key
)
```

returns:

```text
None
```

because that old entry is no longer in the map.

A subsequent:

```ts
map.contextEffect(
    key
)
```

creates a fresh resource entry.

## Idle lifecycle

When the final active reference to a normal cached entry is released, the entry
becomes idle.

Then `idleTimeToLive` determines how long it remains available for reuse before
being closed.

This is what makes LayerMap suitable for resource caches where repeatedly
constructing the underlying Layer would be expensive.

## 4. Service

`LayerMap.Service` packages a LayerMap as an Effect Context service.

The demo defines:

```ts
class TenantClients
    extends LayerMap.Service<
        TenantClients
    >()(
        "TenantClients",
        {
            lookup:
                (
                    tenant: string
                ) =>
                    tenant_layer(
                        tenant
                    ),
            idleTimeToLive:
                "30 seconds",
            preloadKeys: [
                "alpha"
            ]
        }
    )
{}
```

The resulting class is both a Context service tag and a collection of static
LayerMap helpers.

## Service helpers

A generated service class exposes:

```text
layer
layerNoDeps
get
contextEffect
contextEffectOption
invalidate
```

### `get`

```ts
TenantClients.get(
    "alpha"
)
```

returns a Layer that requires the `TenantClients` service and provides the
keyed resource services.

That allows consumers to write:

```ts
TenantClient.use(
    (
        client
    ) =>
        client.request(
            "/status"
        )
).pipe(
    Effect.provide(
        TenantClients.get(
            "alpha"
        )
    ),
    Effect.provide(
        TenantClients.layer
    )
)
```

without manually retrieving a LayerMap value first.

## `layer` versus `layerNoDeps`

`layerNoDeps` constructs only the LayerMap service itself and leaves any
dependencies required by its lookup layers to the caller.

If the `Service` options declare:

```ts
dependencies
```

then `layer` provides those dependencies to `layerNoDeps`.

So conceptually:

```text
layerNoDeps
    LayerMap service,
    dependencies still required

layer
    LayerMap service,
    declared dependencies already supplied
```

When no dependencies are configured they are effectively the same service
construction path.

## `TagClass`

`TagClass` is the public type describing the generated service-class shape.

It combines:

```text
Context.ServiceClass
+
LayerMap<K, I, E>
+
default layers
+
keyed helper functions
```

It is useful when APIs need to type a class returned by `LayerMap.Service`.

## `Service` type helpers

The namespace exposes:

```ts
LayerMap.Service.Key<Options>
LayerMap.Service.Layers<Options>
LayerMap.Service.Success<Options>
LayerMap.Service.Error<Options>
LayerMap.Service.Services<Options>
```

These extract the key type and the Layer channels from a Service definition.

For lookup mode:

```text
Key
    inferred from lookup(key)

Layers
    inferred from lookup's Layer return type
```

For record mode:

```text
Key
    keyof layers

Layers
    union of record Layer values
```

The remaining helpers extract:

```text
Success  → Layer.Success
Error    → Layer.Error
Services → Layer.Services
```

## `Service` with fixed layers

`LayerMap.Service` also accepts the record form:

```ts
{
    layers: {
        development: devLayer,
        production: prodLayer
    },
    preload: true
}
```

instead of a dynamic:

```ts
{
    lookup: ...
}
```

So the service wrapper preserves the same two construction models exposed by
`make` and `fromRecord`.

## Layer memoization

`LayerMap.make` captures the current Layer memo map when it is constructed.

Each keyed lookup is later built against that memo map.

This matters because dependencies shared by keyed Layers can participate in the
same Layer memoization environment rather than each key blindly starting from an
unrelated memoization state.

## Scope model

There are two important scopes involved conceptually:

```text
LayerMap owning Scope
    owns the RcMap and its cached resources

requesting Scope
    retains one acquired cached entry
```

When the requesting Scope ends, its reference is released.

When the LayerMap's owning Scope ends, the cache shuts down and resources are
finalized according to the RcMap lifecycle.

## `LayerMap` versus ordinary Layer memoization

Normal Layer memoization answers:

> If I build this same Layer in this memo map, can I reuse the result?

LayerMap answers:

> For this runtime key, which Layer should I build and cache as the resource for
> that key?

The key is part of the cache identity, which makes LayerMap appropriate for
dynamic resource families.

## Type discipline

The generated demo has no explicit `any` annotations.

Every key callback, service callback, Message payload, and UI callback that
could lose contextual typing has an explicit type.

Button attributes are derived from `HtmlBuilder`.

The Effect source itself uses internal `any` types in some generic machinery;
that is separate from the generated artifact constraint.

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
resolved, so this check catches local syntax and implicit-any issues rather than
replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `LayerMapDemo.Message` to the parent Message union,
3. initialize `LayerMapDemo.init`,
4. delegate child messages to `LayerMapDemo.update`,
5. render `LayerMapDemo.view(...)` from the LayerMap route.

This artifact intentionally performs none of those edits.
