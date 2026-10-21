# SchemaRepresentation

Standalone Foldkit teaching demo for:

https://effect.website/docs/v4/api/effect/SchemaRepresentation

The live API page currently reports Effect `4.0.0-rc.116` and **144 exports**.

URM is pinned to Effect `4.0.0-rc.112`. The generated TypeScript therefore
uses the rc.112 names and signatures so it can be dropped into this workspace.
The README also documents the live rc.116 additions and renames.

The checked-in `.context/effect` snapshot is useful for implementation detail
and Foldkit style reference, but the workspace package pin is the compatibility
target for the generated code.

## Files

```text
packages/features/src/learn/_schema-representation/
├── README.md
├── schema-representation.ts
└── schema-representation.view.ts
```

This artifact intentionally does **not** edit that scaffold, parent routing,
exports, Model, Message, update, or any git-tracked file.

## What SchemaRepresentation is for

`SchemaRepresentation` turns Effect's executable `SchemaAST` into an open,
structural document that other tools can inspect, persist, revive, or compile.

The conceptual pipeline is:

```text
Schema / SchemaAST
        │
        ▼
toRepresentation
        │
        ▼
live Document / MultiDocument
   ┌────┼──────────────┬─────────────────┐
   │    │              │                 │
   ▼    ▼              ▼                 ▼
toJson  fromRepresentation  toJsonSchemaDocument  toCodeDocument
   │          │              │                 │
   ▼          ▼              ▼                 ▼
storage    Schema.Top     JSON Schema       source code
```

A representation is **not** merely a prettier AST dump. It has explicit
persistence identities, named references, check/declaration revivers, JSON
codecs, and compiler extension points.

## Teaching stages

The visual demo uses four stages:

### 1. Represent

Learn:

- `toRepresentation`
- `toRepresentations`
- `Document`
- `MultiDocument`
- `ReferencePolicy`
- `ReferencePolicyInput`
- `ToRepresentationOptions`

The most important direction rule is:

```text
toRepresentation(schema.ast)
    → encoded / wire-side representation

toRepresentation(SchemaAST.toType(schema.ast))
    → decoded / Type-side representation
```

For a transforming schema such as `Schema.NumberFromString`, the first root is
a `String` representation and the second is a `Number` representation.

The demo also gives one repeated AST a custom `referencePolicy`, showing how a
candidate can be extracted into the document's shared reference table.

### 2. Persist

Learn:

- `toJson`
- `toJsonMultiDocument`
- `fromJson`
- `fromJsonMultiDocument`
- `RepresentationAnnotation`
- `CheckRepresentationAnnotation`

A live representation may contain JavaScript values that need an explicit
persistent form. `toJson` projects the document into `Schema.Json`; `fromJson`
validates and restores the live structural document.

Important boundary:

```text
fromJson(...)
    reconstructs structure

fromRepresentation(...)
    reconstructs executable Schema behavior
```

`fromJson` alone does not recreate callbacks.

Generic annotations that are not JSON-compatible are omitted. Persistence
identity for opaque declarations/checks belongs in the explicit representation
annotation (`id` + JSON `payload`) instead.

Local symbol identity also cannot be reconstructed across a storage/process
boundary, even though a live representation can contain a local symbol.

### 3. Revive

Learn:

- `fromRepresentation`
- `fromRepresentations`
- `DeclarationReviver`
- `FilterReviver`
- `FilterGroupReviver`
- `CheckReviver`
- `Reviver`
- `AnyReviver`

Plain built-in structural schemas can be reconstructed with:

```ts
SchemaRepresentation.fromRepresentation(
    document,
    { revivers: [] }
)
```

Opaque declaration/check behavior needs a matching reviver.

A reviver is resolved **locally by `id`**. No application callback registry is
installed implicitly.

That means a representation ID is a real persistence contract: if a stored
document names an opaque behavior and the caller does not provide that reviver,
the runtime cannot safely invent the behavior.

### rc.112 → rc.116 reviver constructor rename

Workspace rc.112:

```text
makeDeclarationReviver
makeFilterReviver
makeFilterGroupReviver
```

Live rc.116:

```text
makeReviverDeclaration
makeReviverFilter
makeReviverFilterGroup
```

The generated `schema-representation.ts` intentionally uses the **rc.112**
names.

rc.116 additionally exports a large set of ready-made revivers for built-in
Schema declarations and validation checks.

### 4. Compile

Learn:

- `toJsonSchemaDocument`
- `toJsonSchemaMultiDocument`
- `toCodeDocument`
- `toMultiDocument`
- `makeCode`
- `fromJsonSchemaDocument`
- `fromJsonSchemaMultiDocument`

`toJsonSchemaDocument` emits JSON Schema Draft 2020-12 from the live
representation.

`toCodeDocument` requires a `MultiDocument`. Use:

```ts
SchemaRepresentation.toCodeDocument(
    SchemaRepresentation.toMultiDocument(document)
)
```

The returned `CodeDocument` separates:

```text
root codes
non-recursive reference codes
recursive reference codes
artifacts
```

`fromJsonSchemaDocument` imports a supported Draft 2020-12 subset back into
Effect Schema. It is intentionally best-effort, not a promise that every JSON
Schema feature can be reproduced exactly.

## Runtime examples in `schema-representation.ts`

The generated module contains real examples for:

```text
Person / Address schemas
NumberFromString encoded-side representation
NumberFromString decoded/type-side representation
multiple roots
custom reference allocation
live Document → JSON → Document
Document → runtime Schema.Top
Document → JSON Schema
Document → CodeDocument
JSON Schema → Schema.Top
custom declaration reviver
custom filter reviver
```

The `Person` schema uses the same `Address` schema twice so the reference-policy
example has a repeated candidate to observe.

## Full live rc.116 public surface

The live page currently lists **144 exports**.

### Annotations

```text
RepresentationAnnotation
CheckRepresentationAnnotation
```

### Configuration

```text
ToRepresentationOptions
```

### Namespace/compiler contracts

```text
Generation
ToJsonSchema
```

### Core representation models

```text
Declaration
Suspend
Reference
Null
Undefined
Void
Never
Unknown
Any
String
Number
Boolean
BigInt
Symbol
Literal
UniqueSymbol
ObjectKeyword
Enum
TemplateLiteral
Element
Arrays
PropertySignature
IndexSignature
Objects
Union
Representation
Check
Filter
FilterGroup
References
Document
MultiDocument
DeclarationReviver
FilterReviver
FilterGroupReviver
CheckReviver
Reviver
AnyReviver
FromJsonSchemaOptions
Code
Artifact
CodeDocument
ReferencePolicyInput
ReferencePolicy
```

### Constructors / lowering / import

```text
makeReviverDeclaration
makeReviverFilter
makeReviverFilterGroup
makeCode
toRepresentation
toRepresentations
fromJsonSchemaDocument
fromJsonSchemaMultiDocument
```

### Live document persistence

```text
toJson
toJsonMultiDocument
fromJson
fromJsonMultiDocument
```

### Transforming / compilation

```text
toMultiDocument
toJsonSchemaDocument
toJsonSchemaMultiDocument
toCodeDocument
fromRepresentation
fromRepresentations
```

### Built-in declaration revivers added to the live rc.116 surface

```text
OptionReviver
ResultReviver
RedactedReviver
CauseReasonReviver
CauseReviver
ErrorInstanceReviver
ExitReviver
ReadonlyMapReviver
GraphReviver
HashMapReviver
ReadonlySetReviver
HashSetReviver
ChunkReviver
RegExpReviver
URLReviver
DateReviver
DurationReviver
ByteSizeReviver
BigDecimalReviver
FileReviver
FormDataReviver
URLSearchParamsReviver
Uint8ArrayReviver
DateTimeUtcReviver
TimeZoneOffsetReviver
TimeZoneNamedReviver
TimeZoneReviver
DateTimeZonedReviver
JsonReviver
MutableJsonReviver
```

### Built-in validation/check revivers on the live rc.116 surface

```text
isTrimmedReviver
isPatternReviver
isStringFiniteReviver
isStringBigIntReviver
isStringSymbolReviver
isUUIDReviver
isGUIDReviver
isULIDReviver
isBase64Reviver
isBase64UrlReviver
isStartsWithReviver
isEndsWithReviver
isIncludesReviver
isUppercasedReviver
isLowercasedReviver
isCapitalizedReviver
isUncapitalizedReviver
isFiniteReviver
isGreaterThanReviver
isGreaterThanOrEqualToReviver
isLessThanReviver
isLessThanOrEqualToReviver
isBetweenReviver
isMultipleOfReviver
isIntReviver
isMinLengthReviver
isMaxLengthReviver
isLengthBetweenReviver
isMinSizeReviver
isMaxSizeReviver
isSizeBetweenReviver
isMinPropertiesReviver
isMaxPropertiesReviver
isPropertiesLengthBetweenReviver
isPropertyNamesReviver
isUniqueReviver
isUniqueKeyReviver
isGreaterThanDateReviver
isGreaterThanOrEqualToDateReviver
isLessThanDateReviver
isLessThanOrEqualToDateReviver
isBetweenDateReviver
isGreaterThanBigIntReviver
isGreaterThanOrEqualToBigIntReviver
isLessThanBigIntReviver
isLessThanOrEqualToBigIntReviver
isBetweenBigIntReviver
```

## Workspace rc.112 surface

The workspace pin has **67 top-level exports**. It already contains the core
representation, reference-policy, persistence, revival, JSON Schema, and code
generation APIs used by this lesson.

The major live-surface expansion is the built-in reviver catalogue above,
together with the reviver-constructor rename.

## Reference allocation

A reference policy receives:

```text
ast
occurrences
identifier
```

and returns either:

```text
string       → extract as a named reference
undefined    → keep inline
```

Recursive candidates always need a reference. If the policy returns
`undefined` for a recursive candidate, the generator allocates a synthetic
reference name.

Keep custom policies deterministic and do not mutate their AST input.

## JSON persistence boundaries

`toJson` is the persistence boundary for a live representation document.

It is not equivalent to blindly calling `JSON.stringify` on every runtime
object. The module owns the encoding rules for:

```text
literal primitive types
property keys
enum values
representation annotations
checks
references
```

Generic annotations are deliberately pruned to JSON-compatible values.

## Reviver trust boundary

A persisted representation may describe opaque executable behavior by stable
ID and JSON payload.

The caller chooses the revivers used to turn those records back into executable
Schema declarations/checks.

Treat that reviver list like code-loading configuration:

```text
document data
    +
explicit allowed revivers
    =
runtime Schema behavior
```

Do not automatically execute arbitrary behavior based only on a stored ID.

## JSON Schema limitations

The live docs document several important mismatches / limits.

Examples include:

- opaque declarations are unconstrained unless compiler annotations describe
  them;
- custom check compiler callbacks are trusted directly;
- Effect's default excess-property behavior and JSON Schema closed-object
  behavior should be aligned deliberately;
- string length, regular-expression flags, one-of behavior, and some
  decoded-object checks can differ;
- JSON Schema import rejects unsupported standard keywords rather than silently
  pretending they are implemented;
- importing regex patterns defaults to `"error"`; `"apply"` should be used only
  for trusted documents because native regex evaluation can block;
- `"ignore"` weakens the source document's validation semantics.

## Foldkit boundary

Keep representation/compiler objects outside the pure feature Model.

Good boundary:

```text
Schema / SchemaAST
    runtime / tooling layer

SchemaRepresentation
    runtime / tooling layer

derived teaching facts
    ↓

Foldkit Message / Model
    stage names
    selected cases
    plain strings / counts
```

The generated Foldkit Model therefore stores only:

```text
stage
representCase
persistCase
reviveCase
compileCase
```

No `Schema`, `AST`, `Document`, reviver, or compiler object is serialized into
the Model.

## Type discipline

The generated demo has no explicit `any` annotations.

The callback types that would lose contextual typing in a standalone
`--noResolve` check are written explicitly, including:

```text
ReferencePolicyInput
DeclarationReviver<string>["revive"]
FilterReviver<string>["revive"]
```

## Validation note

The standalone validation command is:

```text
tsc --noEmit --noResolve --allowImportingTsExtensions \
    --target ES2022 \
    --module ESNext \
    --moduleResolution bundler \
    --skipLibCheck \
    --noImplicitAny
```

Without the target monorepo's package resolver, this intentionally reports the
unresolved workspace imports. The useful check is that there are no additional
local syntax or implicit-`any` diagnostics.

## Integration expectation

Follow the same child-feature integration pattern as the neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model;
2. add `SchemaRepresentationDemo.Message` to the parent Message union;
3. initialize `SchemaRepresentationDemo.init`;
4. delegate child messages to `SchemaRepresentationDemo.update`;
5. render `SchemaRepresentationDemo.view(...)` from the route.

This artifact intentionally performs none of those edits.
