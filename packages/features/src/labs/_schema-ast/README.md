# SchemaAST

Standalone Foldkit teaching demo for:

https://effect.website/docs/v4/api/effect/SchemaAST

The live Effect v4 API reference currently displays `4.0.0-rc.115` and contains
106 API entries. This lesson also follows the vendored Effect source under
`.context/effect` and the Foldkit Model / Message / update / view conventions in
`.context/foldkit`.

## Files

- `schema-ast.ts` — real Schema / SchemaAST examples, Schema-defined Foldkit
  model, messages, update, and visual teaching snapshots.
- `schema-ast.view.ts` — interactive Foldkit view.

## Intended location

```text
packages/features/src/labs/_schema-ast/
├── README.md
├── schema-ast.ts
└── schema-ast.view.ts
```

This artifact intentionally does not edit that scaffold, any parent router,
Model, Message, update function, export map, or Git state.

## What SchemaAST is for

Every Effect `Schema` has a runtime AST.

The AST describes things such as:

```text
primitive nodes
literal nodes
arrays / tuples
objects / records
unions
lazy recursive nodes
annotations
validation checks
encoded ↔ decoded transformations
per-property context
```

Most application code should stay in `Schema`.

Use `SchemaAST` when the tree itself is what you need to inspect, generate, or
transform — for example schema tooling, codecs, documentation generation,
introspection, or low-level parser work.

## Teaching flow

The demo is organized as:

```text
Inspect
    ↓
Construct
    ↓
Transform
    ↓
Parse
```

That is more useful than treating all 106 exports as unrelated helpers.

## 1. Inspect

`SchemaAST.AST` is the discriminated union of AST node variants.

A normal schema exposes its AST through `.ast`:

```ts
const ast = S.Struct({
    name: S.String,
    age: S.Number,
}).ast
```

Use variant guards before reading variant-specific fields:

```ts
if (SchemaAST.isObjects(ast)) {
    ast.propertySignatures.map(
        (property) => [
            property.name,
            property.type._tag,
        ]
    )
}
```

All AST variants share the common structural metadata:

```text
annotations
checks
encoding
context
```

and discriminate on `_tag`.

### Unknown boundaries

When the input is not already typed as `SchemaAST.AST`, use:

```ts
SchemaAST.isAST(value)
```

Then use the more specific guard you actually need:

```text
isObjects
isUnion
isArrays
isString
isLiteral
...
```

### Annotations

The convenience resolvers are:

```text
resolve
resolveAt
resolveIdentifier
resolveTitle
resolveDescription
```

An important detail is that the effective user annotations may live on the last
check attached to the node. The `resolve*` helpers account for that, so tooling
should prefer them over assuming `ast.annotations` is always the effective
annotation source.

### Property context

`SchemaAST.Context` tracks metadata such as:

```text
isOptional
isMutable
constructorDefault
key annotations
```

`PropertySignature` itself only pairs a property key with an AST. Optionality and
mutability belong to the property type AST context.

The dedicated predicate:

```ts
SchemaAST.isOptional(ast)
```

reads `ast.context?.isOptional`.

## 2. Construct

SchemaAST exposes both canonical singleton nodes and constructors.

### Primitive singletons

Examples:

```text
SchemaAST.any
SchemaAST.bigInt
SchemaAST.boolean
SchemaAST.never
SchemaAST.number
SchemaAST.objectKeyword
SchemaAST.string
SchemaAST.symbol
SchemaAST.unknown
```

There are also singleton exports for `null`, `undefined`, and `void`.

Reuse these when no per-node annotations, checks, encoding, or context are
needed.

### Literal

```ts
const ast =
    new SchemaAST.Literal(
        "active"
    )
```

`Literal` accepts exact primitive values:

```text
string
number
boolean
bigint
```

Numeric literals must be finite.

### Objects

A low-level object node can be assembled directly:

```ts
const ast =
    new SchemaAST.Objects(
        [
            new SchemaAST.PropertySignature(
                "name",
                SchemaAST.string
            ),
            new SchemaAST.PropertySignature(
                "age",
                SchemaAST.number
            ),
        ],
        []
    )
```

The two collections are:

```text
propertySignatures
indexSignatures
```

Duplicate property names are rejected at construction.

For ordinary application code, `Schema.Struct` / `Schema.Record` are clearer.
Direct AST construction is mainly useful for generators and tooling.

### Suspend

`Suspend` creates a lazy AST edge:

```ts
const recursive =
    new SchemaAST.Suspend(
        () => someAst
    )
```

Its thunk is memoized, allowing recursive and mutually recursive schema graphs
without eager infinite construction.

### Version-sensitive constructors

The higher-level node model is stable, but some low-level constructor signatures
can move during Effect 4 release candidates. In particular, the `Union`
constructor shape differs between the vendored source snapshot and the current
live API reference.

For that reason the demo inspects a real union created with:

```ts
S.Union([
    S.String,
    S.Number,
]).ast
```

rather than teaching a brittle direct `SchemaAST.Union(...)` call.

## 3. Transform

An encoded schema can represent two different shapes:

```text
decoded / type shape
encoded / wire shape
```

`Schema.NumberFromString` is the simplest example.

### `toType`

```ts
SchemaAST.toType(
    S.NumberFromString.ast
)._tag
// "Number"
```

`toType` strips encoding transformations and recursively returns the decoded
type-level tree.

### `toEncoded`

```ts
SchemaAST.toEncoded(
    S.NumberFromString.ast
)._tag
// "String"
```

`toEncoded` returns the wire-format tree.

Conceptually:

```text
toEncoded(ast)
    =
toType(flip(ast))
```

### `flip`

`flip` reverses the decode / encode direction of an AST encoding chain.

This is low-level schema machinery. It changes transformation direction on the
tree; it does not encode a runtime value by itself.

### Memoization

`toType`, `toEncoded`, and `flip` are memoized / idempotent tree transforms.

The demo explicitly checks that repeated projections from the same AST reference
can reuse the transformed reference.

### `decodeTo`, `Link`, and `Encoding`

At the lowest level:

```text
decodeTo
    attaches a transformation

Link
    represents one transformation step

Encoding
    is a non-empty chain of Link values
```

These are the mechanics behind higher-level schema encoding combinators.

## 4. Parse / checks

SchemaAST also exposes the validation checks attached after a node's basic type
match.

### `Filter`

A `Filter<T>` contains:

```text
run
annotations
aborted
```

`run` returns:

```text
undefined
    check passed

SchemaIssue.Issue
    check failed
```

It can also be:

```text
annotate(...)
abort()
and(...)
```

### `isPattern`

`isPattern` creates a RegExp-backed string filter:

```ts
const email =
    SchemaAST.isPattern(
        /^[^@]+@[^@]+$/
    )

email.run(
    "alice@example.com",
    SchemaAST.string,
    {}
)
// undefined
```

The implementation clones the supplied regular expression and resets its
`lastIndex` before each test. Global and sticky expressions therefore remain
deterministic and the caller's RegExp object is not mutated.

### `FilterGroup`

Two or more checks can be composed:

```ts
const group =
    first.and(second)
```

which produces a `FilterGroup`.

An aborted filter can stop further issue collection after failure.

### `ParseOptions`

The public options model controls parser behavior including:

```text
errors
onExcessProperty
disableChecks
concurrency
reportInput
```

The demo uses:

```ts
const options: SchemaAST.ParseOptions = {
    errors: "all",
    onExcessProperty: "error",
    concurrency: 2,
    reportInput: false,
}
```

`reportInput` deserves special care: retaining rejected input can expose secrets,
PII, or large object graphs through later error formatting or serialization.

### Parsing boundary

Directly calling `Filter.run` is useful for understanding a check or writing
low-level tooling.

For ordinary application decoding and encoding, use the higher-level `Schema`
APIs. Those coordinate:

```text
AST matching
nested parsing
checks
defaults
transformations
issues
async parsing / concurrency
```

rather than only executing one filter.

## Public surface

The live page reports 106 entries. Some names intentionally appear in more than
one family because a constructor value and its corresponding model/interface
share a TypeScript name.

### Annotations — 5

- `resolve`
- `resolveAt`
- `resolveDescription`
- `resolveIdentifier`
- `resolveTitle`

### Constructors — 37

- `any`
- `Any`
- `Arrays`
- `bigInt`
- `BigInt`
- `boolean`
- `Boolean`
- `Context`
- `Declaration`
- `Enum`
- `Filter`
- `FilterGroup`
- `IndexSignature`
- `isPattern`
- `Link`
- `Literal`
- `never`
- `Never`
- `Null`
- `number`
- `Number`
- `objectKeyword`
- `ObjectKeyword`
- `Objects`
- `PropertySignature`
- `string`
- `String`
- `Suspend`
- `symbol`
- `Symbol`
- `TemplateLiteral`
- `Undefined`
- `Union`
- `UniqueSymbol`
- `unknown`
- `Unknown`
- `Void`

### Guards — 22

- `isAny`
- `isArrays`
- `isAST`
- `isBigInt`
- `isBoolean`
- `isDeclaration`
- `isEnum`
- `isLiteral`
- `isNever`
- `isNull`
- `isNumber`
- `isObjectKeyword`
- `isObjects`
- `isString`
- `isSuspend`
- `isSymbol`
- `isTemplateLiteral`
- `isUndefined`
- `isUnion`
- `isUniqueSymbol`
- `isUnknown`
- `isVoid`

### Models — 32

- `Any`
- `Arrays`
- `AST`
- `BigInt`
- `Boolean`
- `Check`
- `Checks`
- `Context`
- `Declaration`
- `Encoding`
- `Enum`
- `Filter`
- `FilterGroup`
- `IndexSignature`
- `Link`
- `Literal`
- `LiteralValue`
- `Never`
- `Null`
- `Number`
- `ObjectKeyword`
- `Objects`
- `PropertySignature`
- `String`
- `Suspend`
- `Symbol`
- `TemplateLiteral`
- `Undefined`
- `Union`
- `UniqueSymbol`
- `Unknown`
- `Void`

### Options — 2

- `ParseOptions`
- `UnionOptions`

### Other — 3

- `null`
- `undefined`
- `void`

### Predicates — 1

- `isOptional`

### Transforming — 4

- `decodeTo`
- `flip`
- `toEncoded`
- `toType`

Total:

```text
5 + 37 + 22 + 32 + 2 + 3 + 1 + 4
= 106
```

## Foldkit boundary

AST nodes are runtime / schema-definition objects, not feature UI state.

A useful boundary is:

```text
Schema / SchemaAST tooling
    inspect / construct / transform / validate
                ↓
runtime adapter
    derive serializable display data
                ↓
Foldkit Message / update
    pure Model transformation
```

The teaching demo therefore stores only stage and case names in its Foldkit
Model.

No live AST, Filter, Context, Encoding, or other SchemaAST object is placed in
the serializable feature Model.

## Type discipline

The generated demo contains no explicit `any` annotations.

Variant-specific callbacks are explicitly typed where standalone unresolved
imports would otherwise lose contextual typing.

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

In the standalone artifact directory the real workspace packages are not
resolved, so this check is intended to catch local syntax and implicit-any
problems rather than replace the monorepo's full typecheck.

## Integration expectation

If this demo is later integrated, follow the same child-feature pattern as the
neighboring `learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `SchemaASTDemo.Message` to the parent Message union,
3. initialize `SchemaASTDemo.init`,
4. delegate child messages to `SchemaASTDemo.update`,
5. render `SchemaASTDemo.view(...)` from the SchemaAST route.

This artifact performs none of those edits.
