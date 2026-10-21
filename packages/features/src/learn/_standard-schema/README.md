# StandardSchema

Standalone lesson artifacts for the `effect/StandardSchema` module. The repository scaffold at `packages/features/src/learn/_standard-schema` is intentionally left untouched; these files are generated under `/mnt/data/standard-schema` only.

## Lesson shape

The UI teaches four stages:

- **Typed** — the shared `~standard` metadata contract and compile-time input/output inference.
- **Validate** — `StandardSchemaV1.validate`, including its synchronous-or-Promise result boundary and Effect's `Schema.toStandardSchemaV1` adapter.
- **Issues** — portable `{ message, path? }` failures and the difference between Standard Schema issue output and Effect's richer `SchemaIssue` tree.
- **JSON** — `StandardJSONSchemaV1` input/output converters, dialect targets, and implementation-specific target support.

The Foldkit `Model` stores only the selected stage/cases. Standard Schema objects and Effect Schema values remain module/runtime values rather than serializable application state.

## Current API surface

The live Effect v4 page currently identifies `effect` as **4.0.0-rc.117** and lists **6 API entries** for `StandardSchema`. Those six entries are the namespace/interface pairs for three merged top-level TypeScript symbols:

- `StandardTypedV1`
- `StandardSchemaV1`
- `StandardJSONSchemaV1`

The page states that these declarations are vendored verbatim from `@standard-schema/spec` **1.1.0**.

The repo's workspace is pinned to Effect **rc.112**. Upstream `StandardSchema.ts` at rc.112 and rc.117 is byte-identical, so there is no compatibility shim in this lesson.

## Why this module is different

`effect/StandardSchema` is a **type-definition module**. It declares the portable Standard Schema contracts; it does not itself provide executable validators or converters.

Effect's runtime adapters live in `Schema`:

- `Schema.toStandardSchemaV1(schema)` exposes an Effect schema through `StandardSchemaV1`.
- `Schema.toStandardJSONSchemaV1(schema)` exposes input/output JSON Schema conversion through `StandardJSONSchemaV1`.

This distinction is deliberate in the lesson: the portable types describe the boundary, while `Schema` supplies Effect's implementation of that boundary.

## The three contracts

### `StandardTypedV1<Input, Output>`

Every Standard Typed value exposes a `"~standard"` property with:

- `version: 1`
- `vendor: string`
- optional `types` metadata for inferred input/output types

`StandardTypedV1.InferInput<S>` and `InferOutput<S>` provide generic type extraction without depending on a particular schema library.

The `types` field is optional. Treat it as type metadata rather than a runtime reflection API.

### `StandardSchemaV1<Input, Output>`

Adds:

```ts
validate(value: unknown, options?): Result<Output> | Promise<Result<Output>>
```

A successful result is structurally:

```ts
{ value: output }
```

A failed result is:

```ts
{ issues: ReadonlyArray<Issue> }
```

The validator accepts `unknown` at runtime even though the contract retains an `Input` type parameter for static interoperability.

Effect's `Schema.toStandardSchemaV1` adapter requires a decoder with no decoding service requirements. It first attempts to run synchronously; asynchronous schema work causes `validate` to return a `Promise` instead.

### `StandardJSONSchemaV1<Input, Output>`

Adds a `jsonSchema` converter with separate `input` and `output` methods:

```ts
jsonSchema.input({ target })
jsonSchema.output({ target })
```

That split matters for codecs. For `Schema.NumberFromString`, for example, the input side is string-shaped while the output side is number-shaped.

The Standard JSON Schema target type includes:

- `"draft-2020-12"`
- `"draft-07"`
- `"openapi-3.0"`
- future string identifiers

The contract explicitly allows implementations to throw for targets they do not support. Effect rc.112's experimental adapter handles Draft 2020-12 and Draft 07 and throws `Unsupported target` for other target identifiers.

## Issue model

`StandardSchemaV1.Issue` contains:

- `message: string`
- optional `path`

Each path element may be either a `PropertyKey` or a `{ key: PropertyKey }` `PathSegment`. Integrations that need a flat property-key path should normalize both forms.

Effect uses `SchemaIssue.makeFormatterStandardSchemaV1` under its adapter, so its richer internal issue tree is flattened into this portable structure at the Standard Schema boundary. Keep the richer Effect issue when application logic needs full schema diagnostics; use the Standard Schema shape for ecosystem interoperability.

## Examples in `standard-schema.ts`

The generated file contains real runtime examples for:

- a raw `StandardTypedV1<string, number>` descriptor
- a handwritten `StandardSchemaV1<string, number>` validator
- an asynchronous Standard Schema validator
- `Schema.toStandardSchemaV1(Person)`
- `InferInput` / `InferOutput`
- Effect validation success/failure shape
- issue path normalization
- `Schema.toStandardJSONSchemaV1(Schema.NumberFromString)`
- input vs output JSON Schema for Draft 2020-12
- Draft 07 conversion

## Boundaries worth remembering

1. **This module is types only.** Runtime adapters are in `Schema`.
2. **Do not assume validation is synchronous.** Always allow `Result | Promise<Result>` at a generic Standard Schema boundary.
3. **Do not branch on vendor when feature detection is enough.** Check for `validate` / `jsonSchema` capabilities instead.
4. **Standard Schema issues are intentionally portable and smaller than Effect's internal issue tree.**
5. **Input and output JSON Schema can differ.** Transforming schemas make that distinction observable.
6. **Allowed target identifiers do not imply every vendor supports every target.** Converter methods may throw.

## Validation

The standalone syntax/type-shape check used:

```sh
tsc --noEmit --noResolve --allowImportingTsExtensions \
  --target ES2022 --module ESNext --moduleResolution bundler \
  --skipLibCheck --noImplicitAny \
  standard-schema.ts standard-schema.view.ts
```

With imports deliberately unresolved, the only diagnostics are the expected missing workspace modules:

- `effect`
- `foldkit`
- `foldkit/message`
- `foldkit/struct`
- `@foldkit/ui`
- `foldkit/html`

No additional TypeScript diagnostics are present, and the generated lesson files contain no explicit `any` annotations.

## Sources checked

- Live Effect v4 `StandardSchema` API page.
- Upstream Effect `packages/effect/src/StandardSchema.ts` at rc.112 and rc.117.
- Upstream Effect `Schema.toStandardSchemaV1` and `Schema.toStandardJSONSchemaV1` implementations at rc.112.
- Existing Foldkit lesson conventions used by the surrounding generated modules (`defineMessageUnion`, `evo`, generic view mapping, and serializable Model state).
