# JsonSchema

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/JsonSchema

The current Effect source package is `4.0.0-rc.116`.

`packages/effect/src/JsonSchema.ts` exposes 16 documented public API entries
after excluding the source exports marked `@internal`.

## Public surface

### Models

- `JsonSchema`
- `Dialect`
- `Type`
- `Definitions`
- `Document`
- `MultiDocument`

### Constants

- `META_SCHEMA_URI_DRAFT_04`
- `META_SCHEMA_URI_DRAFT_07`
- `META_SCHEMA_URI_DRAFT_2020_12`

### Decoding / normalization

- `fromSchemaDraft07`
- `fromSchemaDraft2020_12`
- `fromSchemaOpenApi3_0`
- `fromSchemaOpenApi3_1`

### Encoding

- `toDocumentDraft07`
- `toDocumentDraft04`
- `toMultiDocumentOpenApi3_1`

The source also exports a few utilities marked `@internal`; this demo does not
present those as public API.

The implementation was checked against the current:

```text
packages/effect/src/JsonSchema.ts
packages/effect/src/JsonPointer.ts
```

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `json-schema.ts` — normalization, legacy dialect emission, OpenAPI 3.1
  multi-document output, definitions, and reference relocation.
- `json-schema.view.ts` — interactive visual demo.
- `json-schema-preview.png` — static preview of the default Normalize stage.

## Intended location

```text
packages/features/src/learn/json-schema/
├── json-schema.ts
└── json-schema.view.ts
```

No parent router/model/message/update files are modified.

## Important distinction: `JsonSchema` versus `Schema.toJsonSchemaDocument`

This module is primarily about **normalizing and translating already-existing
JSON Schema / OpenAPI schema objects**.

It is not the main API that derives JSON Schema from an Effect `Schema`.

That separate workflow is:

```ts
Schema.toJsonSchemaDocument(
    effectSchema
)
```

and produces a Draft 2020-12 description of the Effect schema's canonical JSON
representation.

The `JsonSchema` module demonstrated here starts with JSON-Schema-like objects
and moves them between supported dialects.

## Canonical document model

All input normalizers produce:

```ts
JsonSchema.Document<
    "draft-2020-12"
>
```

with three pieces:

```ts
{
    dialect:
        "draft-2020-12",
    schema:
        JsonSchema.JsonSchema,
    definitions:
        JsonSchema.Definitions
}
```

The root `schema` intentionally does **not** contain the shared definitions map.

Shared definitions are detached into:

```ts
document.definitions
```

This gives converters one canonical in-memory form regardless of the input
dialect.

## Supported dialect model

The public `Dialect` union is:

```text
draft-04
draft-07
draft-2020-12
openapi-3.1
openapi-3.0
```

The public primitive `Type` union is:

```text
string
number
boolean
array
object
null
integer
```

`JsonSchema` itself is deliberately open:

```ts
interface JsonSchema {
    [x: string]: unknown
}
```

so custom keywords can be represented.

## 1. Normalize

The Normalize stage shows the four input adapters.

### Draft-07

```ts
JsonSchema.fromSchemaDraft07(
    raw
)
```

translates Draft-07 structures to the canonical Draft 2020-12 model.

A tuple such as:

```ts
{
    type: "array",
    items: [
        { type: "string" },
        { type: "number" }
    ],
    additionalItems: {
        type: "boolean"
    }
}
```

becomes the Draft 2020-12 shape:

```ts
{
    type: "array",
    prefixItems: [
        { type: "string" },
        { type: "number" }
    ],
    items: {
        type: "boolean"
    }
}
```

Root:

```text
definitions
```

are detached into the `Document.definitions` map.

Draft-07 dependency syntax and identifier/reference locations are also adapted
where necessary.

### Draft 2020-12

```ts
JsonSchema.fromSchemaDraft2020_12(
    raw
)
```

is the lightest normalization path.

It separates root:

```text
$defs
```

from the schema into:

```text
document.definitions
```

without performing the broader dialect keyword translation required by the
other inputs.

### OpenAPI 3.0

```ts
JsonSchema.fromSchemaOpenApi3_0(
    raw
)
```

normalizes OpenAPI 3.0 Schema Objects directly to Draft 2020-12.

Important examples include:

```text
nullable
example
boolean exclusiveMinimum / exclusiveMaximum
#/components/schemas/... refs
```

For a schema with:

```ts
{
    type: "string",
    nullable: true
}
```

the canonical type becomes:

```ts
{
    type: [
        "string",
        "null"
    ]
}
```

when the OpenAPI Schema Object has an explicit string `type`.

OpenAPI's singular:

```text
example
```

is converted to:

```text
examples
```

and component references are normalized toward the canonical `$defs` form.

### OpenAPI 3.1

```ts
JsonSchema.fromSchemaOpenApi3_1(
    raw
)
```

is closer to Draft 2020-12 because OpenAPI 3.1 uses JSON Schema semantics.

The current converter notably:

- rewrites root `#/components/schemas/...` references to `#/$defs/...`,
- normalizes the OpenAPI base dialect URI when applicable,
- converts singular `example` to `examples`,
- then delegates to the Draft 2020-12 document normalizer.

## 2. Emit

The canonical form can be lowered to older JSON Schema dialects.

### Draft-07

```ts
JsonSchema.toDocumentDraft07(
    canonical
)
```

converts:

```text
$defs                 -> definitions
prefixItems           -> items array
trailing items schema -> additionalItems
dependent*            -> dependencies
```

and rewrites local references to their target locations.

### Draft-04

```ts
JsonSchema.toDocumentDraft04(
    canonical
)
```

performs a deeper lowering.

Examples include:

```text
const                -> enum
modern exclusive bound -> minimum/maximum + boolean exclusive flag
some conditionals      -> boolean-applicator form
basic contains         -> older applicator representation
```

where the conversion can preserve semantics.

### Explicit failure for unsupported semantics

The converters do not silently erase known unsupported behavior.

For example, newer concepts such as:

```text
dynamic references
unevaluatedProperties
unevaluatedItems
non-default contains cardinality
```

can cause conversion to throw when the target dialect has no faithful
equivalent.

The demo deliberately runs one unsupported Draft-07 output example and displays
the resulting error text.

## Meta-schema constants

Stable constants are provided for:

```ts
JsonSchema.META_SCHEMA_URI_DRAFT_04
JsonSchema.META_SCHEMA_URI_DRAFT_07
JsonSchema.META_SCHEMA_URI_DRAFT_2020_12
```

These are useful when constructing or inspecting `$schema` declarations.

## 3. OpenAPI

`toMultiDocumentOpenApi3_1` works with:

```ts
JsonSchema.MultiDocument<
    "draft-2020-12"
>
```

A `MultiDocument` contains:

```text
one shared definitions map
+
one or more root schemas
```

This is useful when several API shapes—such as request and response schemas—
share the same definitions pool.

### Reference conversion

Canonical references such as:

```text
#/$defs/User
```

become:

```text
#/components/schemas/User
```

in the OpenAPI output.

### Component key restrictions

OpenAPI component schema names must match:

```text
^[a-zA-Z0-9.\-_]+$
```

The converter sanitizes invalid shared-definition keys.

For example, conceptually:

```text
User Model
```

becomes:

```text
User_Model
```

unless that key is already occupied.

### Deterministic collision handling

The demo intentionally supplies both:

```text
"User Model"
"User_Model"
```

The already-valid:

```text
User_Model
```

keeps its name.

The invalid name is allocated a deterministic suffixed key such as:

```text
User_Model_1
```

and references are rewritten to the allocated component key.

The allocation logic is designed to be independent of definitions insertion
order.

## 4. References

This stage makes the same logical reference visible across target formats.

The canonical Draft 2020-12 reference is:

```text
#/$defs/User
```

Draft-07 emits:

```text
#/definitions/User
```

OpenAPI 3.1 emits:

```text
#/components/schemas/User
```

The referenced definition itself remains in the document's separate
`definitions` pool.

## Reference relocation beyond prefix replacement

Some dialect translations move schema structures.

Examples include:

```text
Draft-07 tuple items[] -> Draft 2020-12 prefixItems
dependencies           -> dependentRequired / dependentSchemas
```

The converter tracks source and target structural locations so local `$ref`
values can be relocated when their target moves.

This is more than a text replacement of:

```text
definitions
```

with:

```text
$defs
```

because the structural path to a referenced subschema may itself change.

## Resource boundaries

The implementation treats nested schemas with `$id` as schema resources.

References inside such resources are not blindly rewritten as though they still
belonged to the outer document.

This matters particularly for OpenAPI component conversion because a reference
inside an identified schema resource is relative to that resource's own URI
scope.

## Unknown keywords

Unknown / custom keywords are generally copied as opaque values.

Their contents are not automatically interpreted as nested schemas unless the
converter recognizes that keyword as containing schema values.

A conversion may reject a custom keyword if carrying it unchanged into the
target dialect would cause that name to become a standardized active keyword
with different semantics.

## Public models

### `JsonSchema`

Open schema-object record.

### `Definitions`

```text
Record<string, JsonSchema>
```

for shared definitions.

### `Document<Dialect>`

One root schema plus definitions.

### `MultiDocument<Dialect>`

A non-empty tuple of root schemas plus one shared definitions pool.

### `Dialect`

Supported dialect marker.

### `Type`

JSON Schema primitive type-name union.

## Type discipline

The generated demo has no explicit `any` annotations.

Every transformation callback, error handler, Message payload, and UI callback
that could lose contextual typing has an explicit type.

Button attributes are derived from `HtmlBuilder`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `JsonSchemaDemo.Message` to the parent Message union,
3. initialize `JsonSchemaDemo.init`,
4. delegate child messages to `JsonSchemaDemo.update`,
5. render `JsonSchemaDemo.view(...)` from the JsonSchema route.

This artifact intentionally performs none of those edits.
