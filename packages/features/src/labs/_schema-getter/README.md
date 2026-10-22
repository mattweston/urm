# SchemaGetter

Standalone Foldkit teaching demo for:

https://effect.website/docs/v4/api/effect/SchemaGetter

The live Effect v4 API reference currently displays `4.0.0-rc.116` and contains
60 public exports.

URM is currently pinned to Effect `4.0.0-rc.112`. The vendored
`.context/effect/packages/effect/src/SchemaGetter.ts` file is byte-for-byte
identical to the upstream `effect@4.0.0-rc.112` source.

`SchemaGetter` changed substantially in `rc.116`, so this artifact is deliberately
written to run on the workspace pin while explaining the live API migration.

The Foldkit structure follows `.context/foldkit`: Schema-defined Model and
Message types, a pure update function, and a view that receives a
`to_parent_message` function.

## Files

- `schema-getter.ts` — real Getter examples, rc.112 / rc.116 operation adapters,
  Schema-defined Foldkit model, messages, update, and teaching snapshots.
- `schema-getter.view.ts` — interactive Foldkit view.

## Intended location

```text
packages/features/src/labs/_schema-getter/
├── README.md
├── schema-getter.ts
└── schema-getter.view.ts
```

This artifact intentionally does not edit that scaffold, any parent router,
Model, Message, update function, export map, package version, or Git state.

## What SchemaGetter is for

A `SchemaGetter.Getter<T, E, R>` describes one direction of a schema conversion.

Conceptually:

```text
Option<E>
    ↓
Getter
    ↓
Effect<Option<T>, SchemaIssue.Issue, R>
```

That shape carries three important ideas:

1. input can be absent (`Option.none()`),
2. conversion can fail with a schema issue,
3. conversion can require Effect services.

A getter is one-way. Higher-level schema transformations pair the appropriate
getters for decode and encode directions.

## Teaching flow

The visual lesson is organized as:

```text
Run
    ↓
Transform
    ↓
Validate
    ↓
Convert
```

This keeps the core mental model visible while the README inventories the full
public API.

# 1. Run

## `Some` input

A normal transformation operates only on a present value:

```ts
const parseNumber =
    SchemaGetter.transform<
        number,
        string
    >(Number)
```

On URM's `rc.112` pin:

```ts
parseNumber.run(
    Option.some("21"),
    {}
)
```

produces:

```text
Effect<Option.some(21), SchemaIssue.Issue>
```

## `None` input

For ordinary present-value transformations:

```text
Option.none()
    ↓
transform(...)
    ↓
Option.none()
```

The callback is not invoked.

This is why missing struct keys are not equivalent to passing `undefined` into
an ordinary transform.

## Composition

On `rc.112`, Getter has instance methods:

```ts
const composed =
    parseNumber.compose(
        SchemaGetter.transform(
            (n: number) => n * 2
        )
    )
```

`Some("21")` becomes `Some(42)`.

Passthrough getters are optimized out by composition.

## rc.116 migration

`rc.116` changes the public model substantially.

### `rc.112`

```text
Getter is a public class
getter.run(...)
getter.map(...)
getter.compose(...)
onSome(...)
onNone(...)
transformOrFail(...)
```

### live `rc.116`

```text
Getter is a tagged union
SchemaGetter.run(...)
SchemaGetter.map(...)
SchemaGetter.compose(...)
transformEffect(...)
transformOptionalEffect(...)
```

The public `Getter` constructor is removed.

The live release also removes:

```text
onSome
onNone
transformOrFail
```

and adds:

```text
Passthrough
Transform
TransformOptional
TransformEffect
TransformOptionalEffect
run
compose
map
forbiddenEncoding
transformEffect
transformOptionalEffect
```

The generated `schema-getter.ts` contains small adapters for only
`run` / `map` / `compose`. Those adapters use the `rc.112` instance methods when
present and the `rc.116` standalone functions otherwise.

The rest of the runnable examples deliberately use APIs shared by both versions.

# 2. Transform

## `transform`

Use for a pure present-value conversion:

```ts
SchemaGetter.transform(
    (input: string) =>
        Number(input)
)
```

It cannot fail through the schema issue channel and it skips `None`.

## `transformOptional`

Use when the callback must own presence as well as value:

```ts
SchemaGetter.transformOptional<
    string,
    string
>(input => {
    if (Option.isNone(input)) {
        return input
    }

    const value = input.value.trim()

    return value.length > 0
        ? Option.some(value)
        : Option.none()
})
```

This can:

```text
Some → Some
Some → None
None → None
None → Some
```

## `withDefault`

`withDefault` fills either:

```text
Option.none()
```

or:

```text
Option.some(undefined)
```

For example:

```ts
const name =
    SchemaGetter.withDefault(
        Effect.succeed("anonymous")
    )
```

A present non-undefined value passes through unchanged.

That is intentionally broader than a handler for only a missing key.

## `omit`

```ts
SchemaGetter.omit<string>()
```

always succeeds with:

```text
Option.none()
```

Omission is not a validation failure.

Use a forbidden/failing getter when the conversion direction itself should be
invalid.

## `succeed`

`succeed(value)` ignores the encoded input and always returns `Some(value)`.

# 3. Validate

## `required`

```ts
SchemaGetter.required<string>()
```

behaves as:

```text
Some(value) → Some(value)
None        → MissingKey issue
```

It validates presence only. It does not validate the contents of a present
value.

## `checkEffect`

`checkEffect` validates a present value while preserving that value on success:

```ts
const nonNegative =
    SchemaGetter.checkEffect<number>(
        value =>
            Effect.succeed(
                value >= 0
                    ? undefined
                    : "must be non-negative"
            )
    )
```

Accepted validation outputs include:

```text
undefined
true
false
string
SchemaIssue.Issue
{ path, issue }
```

`undefined` / `true` mean success. Invalid outcomes are translated to schema
issues.

Because the callback returns an Effect, the check can also require services.

## `fail`

`fail` always rejects and lets the callback construct the exact
`SchemaIssue.Issue`.

The callback receives:

```text
original Option input
ParseOptions
```

so a custom issue can retain the same parsing context as the rest of the schema.

## `forbidden`

`forbidden` is the convenience form for an intentionally unavailable direction.

On live `rc.116`, `forbiddenEncoding` is also available as a dedicated helper.

# 4. Convert

SchemaGetter includes a large set of ready-made one-way conversions.

Use these before writing custom transformation code.

## Primitive coercion

```text
String
Number
Boolean
BigInt
Date
```

These intentionally mirror JavaScript constructors.

Important consequences:

```text
Number("not-a-number") → NaN
new Date(invalid)       → Invalid Date
BigInt(invalid)         → may throw
```

Use the validating decoders when conversion validity must enter the schema issue
channel.

## String normalization

```text
trim
capitalize
uncapitalize
snakeToCamel
camelToSnake
toLowerCase
toUpperCase
```

## JSON

```text
parseJson
stringifyJson
JsonReplacer
```

`parseJson` fails with an `InvalidValue` issue for invalid JSON.

`stringifyJson` fails when `JSON.stringify` throws or cannot produce a string.

## Delimited text

```text
split
splitKeyValue
joinKeyValue
```

`splitKeyValue` is intentionally simple: malformed pairs without both a key and
value are skipped. It is not an escaping-aware configuration-file parser.

## Binary and URI codecs

```text
encodeBase64
decodeBase64
encodeBase64Url
decodeBase64Url
encodeHex
decodeHex
decodeBase64String
decodeBase64UrlString
decodeHexString
encodeUriComponent
decodeUriComponent
```

The decoding helpers translate invalid encoded input into schema issues.

## DateTime

```text
dateTimeUtcFromInput
```

Unlike the plain `Date` coercion getter, this validates a `DateTime.Input` and
fails with a schema issue when it cannot be parsed.

## FormData and URLSearchParams

```text
decodeFormData
encodeFormData
decodeURLSearchParams
encodeURLSearchParams
```

They use bracket-path notation such as:

```text
user[name]
user[tags][]
items[0]
```

to move between flat boundary formats and nested `TreeRecord` values.

## Tree helpers

```text
makeTreeRecord
collectBracketPathEntries
```

`makeTreeRecord` turns bracket-path entries into a nested structure.

`collectBracketPathEntries` performs the opposite flattening step for leaves
accepted by the supplied type guard.

The notation intentionally does not escape `.`, `[` or `]` in property names,
so arbitrary object keys cannot always round-trip losslessly.

# Live rc.116 public surface

The current live API has **60** unique exported names.

## Models

- `Passthrough`
- `Transform`
- `TransformOptional`
- `TransformEffect`
- `TransformOptionalEffect`
- `Getter`

## Running / composition

- `run`
- `compose`
- `map`

## Constructors / presence

- `succeed`
- `fail`
- `forbidden`
- `forbiddenEncoding`
- `passthrough`
- `passthroughSupertype`
- `passthroughSubtype`
- `required`

## Validation / transformation

- `checkEffect`
- `transform`
- `transformEffect`
- `transformOptional`
- `transformOptionalEffect`
- `omit`
- `withDefault`

## Primitive and string conversion

- `String`
- `Number`
- `Boolean`
- `BigInt`
- `Date`
- `trim`
- `capitalize`
- `uncapitalize`
- `snakeToCamel`
- `camelToSnake`
- `toLowerCase`
- `toUpperCase`

## JSON / delimited text

- `parseJson`
- `JsonReplacer`
- `stringifyJson`
- `splitKeyValue`
- `joinKeyValue`
- `split`

## Binary / URI

- `encodeBase64`
- `encodeBase64Url`
- `encodeHex`
- `decodeBase64`
- `decodeBase64String`
- `decodeBase64Url`
- `decodeBase64UrlString`
- `decodeHex`
- `decodeHexString`
- `encodeUriComponent`
- `decodeUriComponent`

## Date / forms / tree records

- `dateTimeUtcFromInput`
- `decodeFormData`
- `encodeFormData`
- `decodeURLSearchParams`
- `encodeURLSearchParams`
- `makeTreeRecord`
- `collectBracketPathEntries`

That accounts for all **60** live exports.

# Workspace rc.112 public surface

URM's installed version contains **52** unique exported names.

Relative to live rc.116, the workspace version additionally has:

```text
onNone
onSome
transformOrFail
```

and does not yet have:

```text
Passthrough
Transform
TransformOptional
TransformEffect
TransformOptionalEffect
run
compose
map
forbiddenEncoding
transformEffect
transformOptionalEffect
```

The remaining public names are shared.

# Foldkit boundary

Getter values are conversion/runtime machinery.

Do not place them in a serializable Foldkit `Model` merely to transport a schema
pipeline through the UI.

The demo keeps the boundary as:

```text
module / schema layer
    SchemaGetter values
    Option / Effect execution
    SchemaIssue failures

Foldkit Model
    stage names
    selected cases
    serializable display state only
```

A production feature would normally define its complete schema outside the
Foldkit state loop and convert successful / failed boundary outcomes into
messages or domain values as appropriate.

# Type discipline

The generated demo contains no explicit `any` annotations.

The upstream Effect `rc.112` implementation itself uses internal `any` casts in
its generic Getter implementation and tree helpers. Those internals are separate
from the generated artifact constraint.

The version-bridge adapters use `unknown` plus explicit structural types instead
of `any`.

# Validation note

The standalone validation command is:

```text
tsc --noEmit --noResolve --allowImportingTsExtensions
    --target ES2022
    --module ESNext
    --moduleResolution bundler
    --skipLibCheck
    --noImplicitAny
```

In this environment the standalone check cannot resolve the real `effect`,
`foldkit`, and `@foldkit/ui` workspace packages. The resulting diagnostics are
therefore only those expected unresolved imports; there are no additional local
TypeScript errors or implicit-`any` diagnostics.

# Integration expectation

If this demo is later integrated into the learn application, follow the same
child-feature pattern as the neighboring lessons:

1. add the child Model to the parent learn Model,
2. add `SchemaGetterDemo.Message` to the parent Message union,
3. initialize `SchemaGetterDemo.init`,
4. delegate child messages to `SchemaGetterDemo.update`,
5. render `SchemaGetterDemo.view(...)` from the SchemaGetter route.

This artifact intentionally performs none of those edits.
