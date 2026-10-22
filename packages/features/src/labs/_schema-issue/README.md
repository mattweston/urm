# SchemaIssue

Standalone Foldkit teaching demo for:

https://effect.website/docs/v4/api/effect/SchemaIssue

The live Effect v4 API reference currently displays `4.0.0-rc.115` and reports
**33 exports**.

URM is pinned to Effect `4.0.0-rc.112`. The public concepts and constructor call
shapes used by this demo are shared by `rc.112` and `rc.115`, so no runtime
compatibility shim is required.

One representation detail did change: `rc.112` implements the concrete issue
nodes as public classes, while `rc.115` exposes each node as an interface plus a
constructor value. Code such as:

```ts
new SchemaIssue.InvalidType(
    Schema.String.ast
)
```

continues to work on both surfaces.

The Foldkit structure follows `.context/foldkit`: a Schema-defined Model and
Message union, a pure update function, and a view that receives a
`to_parent_message` function.

## Files

- `schema-issue.ts` — real issue values, formatter examples, Schema-defined
  Foldkit model, messages, update, and visual teaching snapshots.
- `schema-issue.view.ts` — interactive Foldkit view.

## Intended location

```text
packages/features/src/learn/_schema-issue/
├── README.md
├── schema-issue.ts
└── schema-issue.view.ts
```

This artifact intentionally does not edit that scaffold, a parent route, Model,
Message union, update function, export map, package version, or Git state.

## What SchemaIssue is for

`SchemaIssue` is the structured error language used by Effect Schema.

A useful mental model is:

```text
schema parsing / checking
        ↓
SchemaIssue.Issue tree
        ↓
formatter / UI / interoperability boundary
```

Do not flatten an issue into a string too early if callers still need to inspect
its path, failure kind, union branch information, filter metadata, or retained
input.

## Teaching flow

The visual lesson is organized as:

```text
Inspect
   ↓
Compose
   ↓
Report
   ↓
Format
```

# 1. Inspect

## `Issue` and `_tag`

`SchemaIssue.Issue` is a discriminated union. Every concrete node has a `_tag`.

```ts
const issue =
    new SchemaIssue.InvalidType(
        Schema.String.ast
    )

switch (issue._tag) {
    case "InvalidType":
        issue.ast
        break
}
```

Use:

```ts
SchemaIssue.isIssue(value)
```

at an `unknown` boundary before relying on the issue model.

## `Leaf`

`SchemaIssue.Leaf` contains only terminal issue types:

```text
InvalidType
InvalidValue
MissingKey
UnexpectedKey
Forbidden
OneOf
```

Composite / wrapper nodes are deliberately excluded.

## `InvalidType` vs `InvalidValue`

Use `InvalidType` when the runtime kind or structural shape is wrong:

```text
42 supplied where string is expected
```

Use `InvalidValue` when the value has the right broad type but violates a rule:

```text
"" supplied where a non-empty string is required
```

For `InvalidValue`, a `message` annotation takes precedence over `expected`, and
`expected` takes precedence over the generic fallback.

## `MissingKey` / `UnexpectedKey`

These model opposite object / tuple failures:

```text
MissingKey
    required location absent

UnexpectedKey
    undeclared location present
```

The leaf itself does not carry its structural location. `Pointer` does.

## `Forbidden`

`Forbidden` is for a parsing operation that is not allowed in the current mode,
for example an asynchronous schema operation reached through a synchronous
parser.

It is not the generic replacement for `InvalidValue`.

# 2. Compose

## `Pointer`

`Pointer` adds location without rewriting the inner issue:

```ts
new SchemaIssue.Pointer(
    ["user", "name"],
    issue
)
```

Nested pointer segments are accumulated by the built-in formatters.

## `Composite`

`Composite` groups a non-empty list of child issues under one schema AST:

```ts
new SchemaIssue.Composite(
    User.ast,
    [nameIssue, ageIssue]
)
```

This is the natural shape for collected sibling failures.

## `AnyOf`

`AnyOf` means:

```text
zero union members matched
```

It stores the union AST and per-member failures. An empty issue list is also
valid when no member was applicable.

## `OneOf`

`OneOf` means the opposite:

```text
more than one member matched
when exactly one was required
```

It stores the ASTs of the successful alternatives rather than failures.

## `Filter`

`Filter` records a refinement/check plus the inner issue explaining why the
check failed.

The formatter can use filter annotations such as `message` and `expected`
without discarding the inner issue tree.

## `Encoding`

`Encoding` wraps an issue produced during a schema transformation / encoding
link. It preserves the transformation AST and the underlying reason.

This matters when recovery or diagnostics need to distinguish:

```text
validation failure
vs
transformation failure
```

# 3. Report

## `reportInput`

Schema parse options can opt into retaining rejected inputs:

```ts
{
    reportInput: true
}
```

For value-bearing issues, the value is then stored as an enumerable own
`input` property.

## `hasInput`

Always use:

```ts
SchemaIssue.hasInput(issue)
```

to test whether input is present.

Do **not** use:

```ts
issue.input !== undefined
```

because `undefined` can itself be the rejected and reported input.

Example:

```ts
const issue =
    new SchemaIssue.InvalidValue(
        { expected: "a value" },
        undefined,
        { reportInput: true }
    )

SchemaIssue.hasInput(issue)
// true

issue.input
// undefined
```

## Security / retention boundary

`reportInput` is useful for diagnostics, but it has real retention and disclosure
costs.

The retained value:

```text
is stored by reference
is enumerable
may appear in built-in formatter messages
may retain a large object graph
may contain secrets or PII
```

`SchemaIssue` is not a sanitization or redaction boundary.

Paths, ASTs, union successes, custom annotations, and custom messages are also
supplied by application/schema code and remain the caller's responsibility.

# 4. Format

## `makeFormatterDefault`

```ts
const format =
    SchemaIssue.makeFormatterDefault()

format(issue)
```

produces a developer-facing multi-line string.

`Pointer` nodes are accumulated into paths such as:

```text
["user"]["name"]
```

Multiple leaves are emitted as multiple lines.

This is also the style used by normal `SchemaError.message` diagnostics.

## `makeFormatterStandardSchemaV1`

```ts
const format =
    SchemaIssue
        .makeFormatterStandardSchemaV1()

format(issue)
```

returns:

```text
{
    issues: [
        {
            path,
            message
        }
    ]
}
```

The returned Standard Schema issue entries do not get a separate `input` field.
However, reported input can still appear inside the generated `message` string.

## `LeafHook`

A custom leaf hook owns terminal issue wording:

```ts
const leafHook:
    SchemaIssue.LeafHook =
    issue =>
        `leaf:${issue._tag}`
```

The formatter still performs tree traversal and path accumulation.

## `CheckHook`

A custom check hook owns filter-specific wording:

```ts
const checkHook:
    SchemaIssue.CheckHook =
    issue =>
        `check:${issue.filter._tag}`
```

Returning `undefined` lets the built-in filter formatting run instead.

`defaultLeafHook` and `defaultCheckHook` are exported when only one of the two
hooks needs customization.

# Live public surface

The live `rc.115` API page reports 33 exports because concrete issue nodes are
listed once as constructor values and again as model interfaces.

## Constructors — 11

- `AnyOf`
- `Composite`
- `Encoding`
- `Filter`
- `Forbidden`
- `InvalidType`
- `InvalidValue`
- `MissingKey`
- `OneOf`
- `Pointer`
- `UnexpectedKey`

## Formatting — 7

- `CheckHook`
- `defaultCheckHook`
- `defaultLeafHook`
- `Formatter`
- `LeafHook`
- `makeFormatterDefault`
- `makeFormatterStandardSchemaV1`

## Guards — 2

- `hasInput`
- `isIssue`

## Models — 13

- `AnyOf`
- `Composite`
- `Encoding`
- `Filter`
- `Forbidden`
- `InvalidType`
- `InvalidValue`
- `Issue`
- `Leaf`
- `MissingKey`
- `OneOf`
- `Pointer`
- `UnexpectedKey`

Total:

```text
11 + 7 + 2 + 13 = 33
```

## Source-level internals intentionally not taught as public API

The source also exports several names marked `@internal`, including helpers such
as:

```text
makeCompositeAtKey
makeSingle
normalizeFilterOutput
defaultFormatter
```

They are not shown on the live public API page and this lesson does not treat
them as application-facing contracts.

# Foldkit integration

Issue objects are rich runtime diagnostic structures. The demo therefore does
not place them in the pure Foldkit Model.

Instead:

```text
schema / parser / runtime boundary
    creates SchemaIssue.Issue values

adapter / formatter
    derives UI-visible strings or structured summaries

Foldkit Model
    stores only stage / case selections
```

That keeps the serializable UI state explicit and avoids coupling the feature
Model to AST / parser runtime objects.

# Type discipline

The generated demo has no explicit `any` annotations.

All Foldkit callback parameters that could lose contextual typing in the
standalone check are explicitly typed.

Button attribute types are derived from `HtmlBuilder`.

The upstream SchemaIssue implementation contains internal generic casts; those
are separate from this artifact's type-discipline constraint.

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

In this environment the real workspace packages are intentionally unresolved,
so the check catches local syntax and implicit-`any` problems rather than
replacing a full monorepo typecheck.

# Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `SchemaIssueDemo.Message` to the parent Message union,
3. initialize `SchemaIssueDemo.init`,
4. delegate child messages to `SchemaIssueDemo.update`,
5. render `SchemaIssueDemo.view(...)` from the SchemaIssue route.

This artifact intentionally performs none of those edits.
