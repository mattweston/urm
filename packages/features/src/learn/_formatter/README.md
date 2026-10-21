# Formatter

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Formatter

The current API page is Effect `4.0.0-rc.116` and documents 3 public exports:

- `Formatter`
- `format`
- `formatJson`

The implementation was also checked against the current
`packages/effect/src/Formatter.ts`.

The source file contains a few internal formatting helpers for property keys,
paths, and dates, but they are marked internal and are not part of the
documented public API.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `formatter.ts` — real Formatter examples and deterministic snapshots.
- `formatter.view.ts` — interactive visual demo.
- `formatter-preview.png` — static preview of the default Values stage.

## Intended location

```text
packages/features/src/learn/formatter/
├── formatter.ts
└── formatter.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. Values

The default stage demonstrates `Formatter.format` across ordinary JavaScript
value families.

Primitive examples include:

```text
string
number
BigInt
Symbol
```

Collections include:

```text
Array
Set
Map
```

and object-oriented values include:

```text
Date
RegExp
class instances
```

`format` is intended for logs, diagnostics, and error messages. It is not
guaranteed to produce JSON.

Notable representations include:

```text
"hello"        strings stay quoted
42n            BigInt keeps the n suffix
Symbol(demo)   Symbols remain diagnostic values
Set([...])     iterables keep their runtime constructor
Map([...])     Map entries are shown through iteration
```

The stage also demonstrates the public callable type:

```ts
const upper:
    Formatter.Formatter<string> =
    (value: string) =>
        value.toUpperCase()
```

`Formatter<Value, Format>` is only a type-level interface; it has no runtime
constructor.

### 2. Special

Shows defensive inspection behavior.

#### Circular references

```ts
type CircularRecord = {
    name: string
    self?: CircularRecord
}

const loop: CircularRecord = {
    name: "loop"
}
loop.self = loop
```

`Formatter.format(loop)` renders the cycle as:

```text
[Circular]
```

instead of throwing.

#### Error causes

Errors with a `cause` are rendered with both the outer Error's string
representation and the formatted cause.

Conceptually:

```text
Error: outer failure
  (cause: Error: inner failure)
```

#### Classes

A class with a custom `toString()` uses that string by default.

A class without such an override is structurally inspected and wrapped with the
constructor name.

The formatter also guards its inspection machinery: failures from custom
`toString`, own-key discovery, and property access are turned into diagnostic
placeholder strings rather than escaping as formatter exceptions.

### 3. Options

`format` accepts:

```ts
{
    space?: number | string
    ignoreToString?: boolean
}
```

#### `space`

The default is compact output:

```text
0
```

A number such as:

```ts
{ space: 2 }
```

uses that many spaces per indentation level.

A string such as:

```ts
{ space: "\t" }
```

can also be used as the indentation unit.

#### `ignoreToString`

By default, a custom `toString` wins.

For the demo `UserCard`:

```text
UserCard#7:Ada
```

When:

```ts
{
    ignoreToString: true,
    space: 2
}
```

the object is inspected structurally instead, producing a constructor-wrapped
field representation.

This is useful when a domain object has a concise `toString()` but diagnostics
need to expose its underlying state.

### 4. JSON

`Formatter.formatJson` uses JSON serialization semantics while adding safe
handling for circular references, redactable values, BigInt, and unsupported
root values.

#### Circular references

For an object such as:

```text
name -> "test"
self -> same object
```

`format` renders:

```text
{"name":"test","self":[Circular]}
```

whereas `formatJson` omits the circular object property:

```json
{"name":"test"}
```

#### BigInt

`JSON.stringify` normally cannot serialize BigInt directly.

`formatJson` turns it into a JSON string containing the diagnostic BigInt form:

```json
{"count":"12n"}
```

#### Unsupported root values

When the root is:

```text
undefined
Symbol
function
```

ordinary `JSON.stringify` returns `undefined`.

`Formatter.formatJson` normalizes that root result to the string:

```text
null
```

so the function itself always returns a string.

#### Pretty JSON

Like `format`, `formatJson` accepts a numeric or string `space` option.

The result remains valid JSON suitable for `JSON.parse`.

## Current public surface

### Formatting

- `format`

### Models

- `Formatter`

### Serialization

- `formatJson`

## `format` versus `formatJson`

Use `format` when the goal is:

```text
diagnostics
logging
human-readable errors
runtime value fidelity
```

It understands richer JavaScript values and can emit forms such as:

```text
42n
Symbol(...)
Set(...)
Map(...)
[Circular]
```

These are useful to a person but are not JSON syntax.

Use `formatJson` when the goal is:

```text
valid JSON text
machine parsing
safe circular handling
```

Circular object references are omitted, BigInt becomes a string, and otherwise
normal JSON serialization behavior applies.

## Type discipline

The generated demo has no explicit `any` annotations.

Circular data uses a recursive named type rather than loosening the value to
`any`.

Every `Message.match` destructured payload is explicitly typed, and Button
attributes are derived from `HtmlBuilder` so the demo remains clean under
`noImplicitAny`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `FormatterDemo.Message` to the parent Message union,
3. initialize `FormatterDemo.init`,
4. delegate child messages to `FormatterDemo.update`,
5. render `FormatterDemo.view(...)` from the Formatter route.

This artifact intentionally performs none of those edits.
