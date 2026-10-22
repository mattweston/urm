# Effect v4 · SchemaTransformation lesson

Standalone Foldkit teaching demo for Effect's `SchemaTransformation` module.

- Intended repo location: `packages/features/src/labs/_schema-transformation/`
- Repo scaffold was inspected only; **no git/repository files were edited**.
- Workspace Effect pin: `4.0.0-rc.112`
- Live API page checked on 2026-09-21: `4.0.0-rc.115`, **50 exports**.
- Local reference: `.context/effect/packages/effect/src/SchemaTransformation.ts`
- Foldkit conventions: `.context/foldkit`

## Lesson shape

The UI is intentionally organized around four concepts rather than a flat list of helpers:

1. **Build** — pure, effectful, optional, or prebuilt-Getter transformations.
2. **Compose** — composition order, `flip`, directionality, and `Middleware`.
3. **Normalize** — trim/case/splitting/passthrough and the difference between canonicalization and a lossless round trip.
4. **Convert** — ready-made numeric, time, binary/text, JSON, form, and URL conversions.

The Foldkit `Model` contains only serializable UI state. `Transformation`, `Middleware`, `Getter`, Schema, Effect, and other runtime values stay at module/runtime boundaries.

## The core model

A transformation is bidirectional:

```ts
Transformation<T, E, RD, RE>
```

- **decode**: encoded `E` → decoded `T`
- **encode**: decoded `T` → encoded `E`
- each direction is represented by a `SchemaGetter.Getter`
- `RD` and `RE` are the Effect service requirements for decode and encode
- missing struct keys flow through the directional Getter as `Option.None`
- schema-level conversion failures use `SchemaIssue.Issue`

That makes a transformation more than a pair of ordinary functions: it carries optionality, failure, and Effect requirements in both directions.

## Build

### `transform`

Use for synchronous, infallible conversions.

The demo uses dollars ⇄ cents:

```ts
const centsFromDollars = SchemaTransformation.transform({
  decode: (dollars: number) => Math.round(dollars * 100),
  encode: (cents: number) => cents / 100
})
```

### Effectful transformation

The workspace (`rc.112`) calls this `transformOrFail`; the live API calls it `transformEffect`.

The demo includes a version bridge and a strict integer-string parser that returns `SchemaIssue.InvalidValue` for invalid input.

Use the effectful constructor when conversion:

- can fail,
- requires Effect services,
- or performs asynchronous work.

### `transformOptional`

This operates on the full `Option` in each direction.

`Option.None` means a key is absent. Returning `Option.None` omits it in the output direction. The demo shows a missing value decoding to `"guest"` and the sentinel value encoding back to absence.

### Existing Getters

When directional `SchemaGetter.Getter` values already exist, pair them into a Transformation.

- workspace: `SchemaTransformation.make(...)`
- live API: `SchemaTransformation.makeTransformation(...)`

## Compose

### Decode order and encode order

For transformations:

```text
A ⇄ B
B ⇄ C
```

composition produces:

```text
A ⇄ C
```

but the directions run differently:

```text
decode: A → B → C
encode: C → B → A
```

This reversal is the main reason transformation composition should not be treated as ordinary one-direction function piping.

The workspace used the instance method:

```ts
first.compose(second)
```

The live API exposes:

```ts
SchemaTransformation.composeTransformation(first, second)
```

The generated lesson contains a small compatibility bridge.

### `flip()`

`Transformation.flip()` swaps decode and encode and returns the reversed transformation. Service requirements swap with their directions too.

### `Middleware`

`Middleware` is deliberately separate from `Transformation`.

A Transformation handles values via Getters. Middleware receives the **whole parsing Effect** and can therefore:

- catch or recover from issues,
- retry,
- observe the parse pipeline,
- replace the result,
- or perform pipeline-level effects.

Use value transformations for representation changes; use middleware for parsing-pipeline behavior.

## Normalize

Several helpers intentionally canonicalize rather than preserve the original encoded spelling.

### `trim`

- decode: trims whitespace
- encode: passthrough

`"  hello  "` becomes `"hello"`, and the removed whitespace is not reconstructed later.

### Case helpers

`toLowerCase`, `toUpperCase`, `capitalize`, and `uncapitalize` normalize on decode and use passthrough encoding.

`snakeToCamel` is different: decode uses snake → camel and encode uses camel → snake, so it has an explicit inverse for the supported naming convention.

### `splitKeyValue`

Turns delimited key/value text into a record and encodes the record back to text. Malformed pairs without both key and value are skipped, so it should not be treated as a general escaped serialization grammar.

### Passthrough variants

`passthrough`, `passthroughSubtype`, and `passthroughSupertype` perform no runtime conversion. Their purpose is expressing type relationships safely where the two schema sides already share the same runtime representation.

## Convert

The module includes many ready-made transformations so application schemas do not have to recreate common boundary conversions.

### Numeric / primitive

- `numberFromString`
- `bigintFromString`
- `dateFromString`
- `dateFromMillis`
- `bigDecimalFromString`

`numberFromString` follows JavaScript `Number(...)` coercion semantics; add checks when the wire protocol is stricter than JavaScript coercion.

### Duration / ByteSize / time

- `durationFromString`
- `durationFromNanos`
- `durationFromMillis`
- live additions: `byteSizeFromString`, `byteSizeFromBigInt`, `byteSizeFromNumber`
- `timeZoneOffsetFromNumber`
- `timeZoneNamedFromString`
- `timeZoneFromString`
- `dateTimeUtcFromString`
- `dateTimeZonedFromString`

### Encoded text / bytes

- `uint8ArrayFromBase64String`
- `stringFromBase64String`
- `stringFromBase64UrlString`
- `stringFromHexString`
- `stringFromUriComponent`

### Structured boundaries

- `fromJsonString`
- `fromFormData`
- `fromURLSearchParams`
- `urlFromString`

FormData and URLSearchParams use bracket-path tree conversion under the hood.

### Option-like / errors

- `optionFromNullOr`
- `optionFromUndefinedOr`
- `optionFromNullishOr`
- `optionFromOptionalKey`
- `optionFromOptional`
- `errorFromJsonError`
- `defectFromJson`

## rc.112 → live API delta

The repository is pinned to Effect `4.0.0-rc.112`; the current API page labels itself `4.0.0-rc.115` and exposes 50 entries.

| rc.112 workspace                | live API                                       | Meaning                               |
| ------------------------------- | ---------------------------------------------- | ------------------------------------- |
| `make`                          | `makeTransformation`                           | pair directional Getters              |
| `transformOrFail`               | `transformEffect`                              | effectful / fallible conversion       |
| `transformation.compose(other)` | `composeTransformation(transformation, other)` | compose bidirectional transformations |
| —                               | `byteSizeFromString`                           | ByteSize from textual input           |
| —                               | `byteSizeFromBigInt`                           | ByteSize from bigint count            |
| —                               | `byteSizeFromNumber`                           | ByteSize from number count            |

`Transformation.flip()` remains a directional reversal operation.

The generated TypeScript uses small adapters for the renamed/moved operations so the demo remains runnable on the workspace pin while teaching the live naming.

## Live 50-export surface

Grouped by role:

### Models / construction / composition

`Middleware`, `Transformation`, `composeTransformation`, `isTransformation`, `makeTransformation`, `transformEffect`, `transform`, `transformOptional`, `passthrough`, `passthroughSupertype`, `passthroughSubtype`.

### String normalization

`trim`, `snakeToCamel`, `toLowerCase`, `toUpperCase`, `capitalize`, `uncapitalize`, `splitKeyValue`.

### Numeric, date, duration, ByteSize

`numberFromString`, `bigintFromString`, `dateFromString`, `dateFromMillis`, `durationFromString`, `durationFromNanos`, `durationFromMillis`, `byteSizeFromString`, `byteSizeFromBigInt`, `byteSizeFromNumber`, `bigDecimalFromString`.

### Errors / options / URL

`errorFromJsonError`, `defectFromJson`, `optionFromNullOr`, `optionFromUndefinedOr`, `optionFromNullishOr`, `optionFromOptionalKey`, `optionFromOptional`, `urlFromString`.

### Binary / textual encodings

`uint8ArrayFromBase64String`, `stringFromBase64String`, `stringFromBase64UrlString`, `stringFromHexString`, `stringFromUriComponent`.

### Structured formats

`fromJsonString`, `fromFormData`, `fromURLSearchParams`.

### Time zones / DateTime

`timeZoneOffsetFromNumber`, `timeZoneNamedFromString`, `timeZoneFromString`, `dateTimeUtcFromString`, `dateTimeZonedFromString`.

## Files

- `schema-transformation.ts` — Foldkit model/update plus real Effect examples and version bridges.
- `schema-transformation.view.ts` — Foldkit UI lesson.
- `schema-transformation-preview.png` — static initial-state preview.
- `schema-transformation-bundle.zip` — portable bundle of the files above plus this README.

## Validation

Standalone check used:

```sh
tsc --noEmit --noResolve --allowImportingTsExtensions \
  --target ES2022 --module ESNext --moduleResolution bundler \
  --skipLibCheck --noImplicitAny \
  schema-transformation.ts schema-transformation.view.ts
```

Expected diagnostics are only unresolved workspace imports because `--noResolve` intentionally does not load the monorepo dependency graph. No extra local TypeScript diagnostics remain, and the generated lesson contains no explicit `any` annotations.
