# `Tracer`

Standalone Foldkit lesson for the Effect v4 `Tracer` module.

- Live docs checked: `4.0.0-rc.115`
- Live docs surface: **22 exports**
- Workspace target: `effect@4.0.0-rc.112`
- Live source: **21 unique top-level names** because `Tracer` is documented twice: once as the backend interface and once as the active `Context.Reference`
- Lesson stages: **Create → Enrich → Propagate → Filter**
- Git / `packages/features/src/labs/_tracer`: untouched

## What `Tracer` is

`Tracer` is Effect's low-level tracing model. A tracer backend creates `Span` values, while spans carry trace identity, parentage, attributes, links, events, sampling state, operation kind, and lifecycle status.

Application code normally creates spans through higher-level APIs such as `Effect.withSpan`. Those APIs resolve the active `Tracer.Tracer` reference from Context and ask that backend to allocate the actual span.

The pure Foldkit model in this lesson stores only stage/case selections. Live tracer objects, spans, Context references, and captured-span arrays stay at module scope and do not enter serializable UI state.

## Four-stage teaching model

### 1. Create

Cases: `Native`, `External`, `Backend`, `Service`.

- `NativeSpan` is Effect's default in-memory implementation of `Span`.
- `externalSpan` creates trace identity imported from another tracing system.
- `make` creates a custom tracer backend value; it returns the supplied implementation unchanged.
- `Tracer` is also the active tracer `Context.Reference` used by Effect span creation.

### 2. Enrich

Cases: `Attribute`, `Event`, `Link`, `Status`.

A managed `Span` exposes:

- `attribute(key, value)` for indexed metadata,
- `event(name, time, attributes?)` for timestamped observations,
- `addLinks(links)` for non-parent relationships,
- `end(endTime, exit)` to transition the lifecycle to `SpanStatus.Ended`.

`SpanStatus.Ended` retains the `Exit`, so completion can preserve success, typed failure, defects, or interruption information for tracing backends.

### 3. Propagate

Cases: `Parent`, `Root`, `Disable`, `AnySpan`.

- `ParentSpan` is the Context service used as the inherited parent.
- `AnySpan = Span | ExternalSpan` lets parent/link code accept both Effect-managed and imported trace identity.
- `SpanOptions.root: true` forces the new span to be a root instead of inheriting the current parent.
- `DisablePropagation` is a boolean Context reference used to prevent tracing context propagation through a scope.

### 4. Filter

Cases: `Level`, `Minimum`, `Sampled`, `NativeTracer`.

- `CurrentTraceLevel` supplies the default level for a span when `SpanOptions.level` is absent. Its default is `"Info"`.
- `MinimumTraceLevel` is the threshold used to derive the default sampling decision. Its default is `"All"`.
- An explicit `SpanOptions.sampled` bypasses threshold-based sampling.
- `nativeTracer` is the default in-memory tracer value exported in rc.115+.

## Public surface inventory

The live rc.115 docs show **22 entries**.

### Constants — 2

- `ParentSpanKey`
- `TracerKey`

### Constructors — 2

- `externalSpan`
- `make`

### Models — 8

- `AnySpan`
- `EffectPrimitive`
- `ExternalSpan`
- `NativeSpan`
- `Span`
- `SpanKind`
- `SpanLink`
- `SpanStatus`

### Options — 3

- `SpanOptions`
- `SpanOptionsNoTrace`
- `TraceOptions`

### References — 1

- `nativeTracer`

### Services — 6 docs entries

- `CurrentTraceLevel`
- `DisablePropagation`
- `MinimumTraceLevel`
- `ParentSpan`
- `Tracer` — active `Context.Reference<Tracer>`
- `Tracer` — backend interface

Because `Tracer` is both an interface and a value, those last two docs entries correspond to one source-level name. That is why rc.115 source has **21 unique top-level names** while the docs show **22 entries**.

## Version notes: rc.112 → rc.115

The workspace rc.112 source has **20 unique names**. rc.115 adds:

- `nativeTracer`

In rc.112, the `Tracer` Context reference constructs an equivalent native tracer inline as its default. In rc.115, that same default is factored into and exported as `nativeTracer`, allowing runtime code to compare the active tracer with the default implementation.

The rc.115 `NativeSpan` implementation also lazily initializes trace/span ids and attribute/event storage on first access. This is an allocation detail rather than a change to the public `Span` contract.

The generated TypeScript includes a small version bridge:

```ts
 type TracerModuleWithNative = typeof Tracer & {
   readonly nativeTracer?: Tracer.Tracer
 }

 const liveNativeTracer = (Tracer as TracerModuleWithNative).nativeTracer
```

This keeps the demo runnable against rc.112 while still exposing the rc.115 addition in the lesson.

## Important semantics

### `make` is intentionally thin

`Tracer.make(implementation)` returns the supplied implementation object unchanged. It is a type-level / API constructor, not a middleware layer.

### Parentage and links are different

A parent defines the tree relationship and trace inheritance. A `SpanLink` records an additional relationship and does not change parentage.

### External spans are not owned by Effect

`ExternalSpan` carries trace/span ids, sampling state, and annotations, but it does not implement the managed `Span` lifecycle methods such as `end`, `attribute`, or `event`.

### Sampling is contextual

When a span does not explicitly set `sampled`, Effect derives sampling from the effective trace level and `MinimumTraceLevel`. Explicit `sampled` takes precedence over that threshold calculation.

### The native tracer is not an exporter

The native tracer creates in-memory `NativeSpan` values. It does not export trace data to an external observability backend by itself.

## Generated files

- `tracer.ts` — real Effect examples plus pure Foldkit model/update logic
- `tracer.view.ts` — Foldkit UI
- `README.md` — this inventory and semantic guide
- `tracer-preview.png` — initial `Create / Native` state preview

## Validation

The standalone validation command is:

```sh
tsc --noEmit --noResolve --allowImportingTsExtensions \
  --target ES2022 --module ESNext --moduleResolution bundler \
  --skipLibCheck --noImplicitAny tracer.ts tracer.view.ts
```

Expected diagnostics are only unresolved workspace imports:

- `effect`
- `foldkit`
- `foldkit/message`
- `foldkit/struct`
- `@foldkit/ui`
- `foldkit/html`

There are no additional local TypeScript diagnostics and no explicit `any` annotations in the generated lesson files.
