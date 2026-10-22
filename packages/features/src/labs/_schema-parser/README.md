# SchemaParser

Standalone FoldKit teaching demo for:

https://effect.website/docs/v4/api/effect/SchemaParser

The live API reference currently displays Effect `4.0.0-rc.116` and **25 public
exports**. URM is pinned to Effect `4.0.0-rc.112`. The same 25 documented public
operation names exist in the workspace version, so the generated TypeScript is
written against the pinned workspace API while the explanations are checked
against the live page.

## Files

- `schema-parser.ts` — real parser examples, Schema-defined teaching model,
  messages, update, and visual snapshots.
- `schema-parser.view.ts` — interactive FoldKit view.

## Intended location

```text
packages/features/src/labs/_schema-parser/
├── README.md
├── schema-parser.ts
└── schema-parser.view.ts
```

No parent router, model, message, update, export map, scaffold file, or GitHub
file is changed by this artifact.

## Mental model

`SchemaParser` is the execution layer behind a `Schema`.

A schema describes the relationship between:

```text
Encoded  ⇄  Type
```

`SchemaParser` runs that relationship against real values and chooses how the
outcome crosses the calling boundary.

The same underlying schema semantics can be exposed as:

```text
Effect
Promise
Exit
Result
throwing synchronous functions
Option (construction only on the public page)
type guards / assertions
```

The important choice is therefore usually not _which validator_ to use, but
which **failure and execution boundary** your caller needs.

## Teaching stages

### 1. Construct

The constructor family works on the schema's decoded / `Type` side:

```ts
SchemaParser.make(schema)
SchemaParser.makeEffect(schema)
SchemaParser.makeOption(schema)
```

They share construction semantics but expose failure differently:

```text
make
    Type | throws Error(cause = SchemaIssue.Issue)

makeEffect
    Effect<Type, SchemaIssue.Issue>

makeOption
    Option<Type>
```

`makeOption` deliberately discards issue detail when the cause is made entirely
of schema issues.

The two guards also validate the decoded side:

```ts
SchemaParser.is(schema)
SchemaParser.asserts(schema, value)
```

Use `decodeUnknown*` instead when the value is an untrusted encoded input that
must pass through schema transformations.

### 2. Decode

Decoding runs:

```text
Encoded → Type
```

For untrusted boundary input, use an `Unknown` variant. For input already typed
as `S["Encoded"]`, use the corresponding typed variant.

The public decoding family is:

```text
decodeEffect
decodeExit
decodePromise
decodeResult
decodeSync

decodeUnknownEffect
decodeUnknownExit
decodeUnknownPromise
decodeUnknownResult
decodeUnknownSync
```

#### Effect

`decodeUnknownEffect` / `decodeEffect` are the most general adapters. They keep:

```text
SchemaIssue.Issue
    in the typed error channel

DecodingServices
    in the Effect environment

async transformations
    representable
```

Use these when the schema may require services or asynchronous work.

#### Promise

Promise adapters are for service-free schemas. On schema validation failure they
reject with an `Error` whose `cause` is the `SchemaIssue.Issue`.

The wrapper message is intentionally generic:

```text
Schema validation failed
```

Format the cause explicitly when human-readable detail is required.

#### Exit

Exit adapters run synchronously and preserve a full `Exit` / `Cause` outcome.
Schema failures become a failure cause containing `SchemaIssue.Issue`.

If asynchronous parser work reaches this synchronous boundary, the failure may
instead contain a defect cause. The adapter does not mislabel arbitrary runtime
failures as validation issues.

#### Result

Result adapters turn schema-only failures into:

```text
Result.fail(SchemaIssue.Issue)
```

They are useful for UI or API validation paths that want the issue tree as
ordinary data.

Non-schema reasons still throw at this synchronous adapter.

#### Sync

Sync adapters return the decoded value or throw an `Error` with the issue in
`cause`.

Prefer `Result` or `Exit` when failure should remain explicit data rather than
an exception.

### 3. Encode

Encoding mirrors decoding in the opposite direction:

```text
Type → Encoded
```

The public encoding family is:

```text
encodeEffect
encodeExit
encodePromise
encodeResult
encodeSync

encodeUnknownEffect
encodeUnknownExit
encodeUnknownPromise
encodeUnknownResult
encodeUnknownSync
```

With:

```ts
const schema = Schema.NumberFromString
```

then:

```text
decode "42" → 42
encode 42    → "42"
```

Use `encode*` when the value is already statically `S["Type"]`. Use
`encodeUnknown*` when runtime validation of an unknown value is part of the
boundary contract.

### 4. Boundary

The parser itself is only half of the design. The other half is deciding what
information the caller needs to retain.

A useful default mapping is:

```text
external untrusted input
    decodeUnknownEffect / decodeUnknownResult

trusted internal encoded value
    decodeEffect / decodeResult

Effect-native service / async path
    Effect adapter

Promise-native service-free integration
    Promise adapter

synchronous data-oriented validation
    Result or Exit

throwing convenience API
    Sync
```

## ParseOptions

`SchemaAST.ParseOptions` configures parser behavior at the call site.

Important options include:

```text
errors
    "first" | "all"

onExcessProperty
    "ignore" | "error" | "preserve"

propertyOrder
    "none" | "original"

disableChecks
    boolean

concurrency
    number | "unbounded"

reportInput
    boolean
```

Options supplied when creating a decoder/encoder can be overridden by options
passed when the returned parser function is invoked.

### `reportInput` warning

When enabled, rejected input may be retained by `SchemaIssue` nodes and can be
included by issue formatters. Do not enable it blindly around secrets, PII, or
large object graphs.

## Public surface

The live API page exposes **25 documented operations**.

### Constructors

- `make`
- `makeEffect`
- `makeOption`

### Decoding

- `decodeEffect`
- `decodeExit`
- `decodePromise`
- `decodeResult`
- `decodeSync`
- `decodeUnknownEffect`
- `decodeUnknownExit`
- `decodeUnknownPromise`
- `decodeUnknownResult`
- `decodeUnknownSync`

### Encoding

- `encodeEffect`
- `encodeExit`
- `encodePromise`
- `encodeResult`
- `encodeSync`
- `encodeUnknownEffect`
- `encodeUnknownExit`
- `encodeUnknownPromise`
- `encodeUnknownResult`
- `encodeUnknownSync`

### Guards

- `asserts`
- `is`

That is the complete **25-export public API** shown by the live reference.

## Internal source exports are not the public API

The source file also exports several names marked `@internal`, including
low-level compiler / runner helpers and Option adapters such as:

```text
run
Parser
Compiler
_is
_issue
asOption
decodeUnknownOption
decodeOption
encodeUnknownOption
encodeOption
```

They are intentionally absent from the public API reference. Do not build normal
application code against them merely because they are visible in source.

## Why sync adapters sometimes throw non-schema failures

The parser can represent effectful schema work. A synchronous adapter cannot
turn every possible Effect cause into a `SchemaIssue.Issue` without losing
meaning.

So synchronous adapters only convert a cause when it is made entirely of schema
issues. Defects, interruption, or asynchronous work retain their runtime cause
semantics.

This is why:

```text
Result / Option / boolean / throwing sync adapter
```

is not automatically equivalent to:

```text
Effect adapter
```

for every schema.

## Foldkit boundary

Parser effects, promises, exits, and issue trees should not be stored in the
pure Foldkit `Model` merely to drive the teaching UI.

The generated model stores only serializable stage and case names:

```text
Model
    stage
    constructCase
    decodeCase
    encodeCase
    boundaryCase
```

Real Schema / SchemaParser examples remain module or runtime values.

A typical application boundary is:

```text
external data
    → SchemaParser.decodeUnknownEffect / Result
    → domain value or SchemaIssue
    → Foldkit Message
    → pure Foldkit update
```

## Type discipline

The generated demo has no explicit `any` annotations.

Every Foldkit Message payload and UI callback that can lose contextual typing is
explicitly typed where appropriate. Button attributes are derived from
`HtmlBuilder`.

The upstream implementation contains internal casts in generic compiler and
adapter plumbing; those are separate from this generated artifact constraint.

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
resolved, so the standalone check catches local syntax and implicit-any problems
rather than replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `SchemaParserDemo.Message` to the parent Message union,
3. initialize `SchemaParserDemo.init`,
4. delegate child messages to `SchemaParserDemo.update`,
5. render `SchemaParserDemo.view(...)` from the SchemaParser route.

This artifact intentionally performs none of those edits.
