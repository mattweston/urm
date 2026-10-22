# Inspectable

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Inspectable

The current API page is Effect `4.0.0-rc.116` and documents 7 entries when the
`NodeInspectSymbol` runtime value and its type alias are counted separately.

The implementation was also checked against the current
`packages/effect/src/Inspectable.ts`.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `inspectable.ts` — real `toJson`, `toStringUnknown`, `Class`, manual
  `Inspectable`, `NodeInspectSymbol`, and `BaseProto` examples.
- `inspectable.view.ts` — interactive visual demo.
- `inspectable-preview.png` — static preview of the default Convert stage.

## Intended location

```text
packages/features/src/learn/inspectable/
├── inspectable.ts
└── inspectable.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. Convert

This stage separates the two conversion helpers.

#### `toJson`

```ts
Inspectable.toJson(
    value
)
```

produces a **structured inspection representation**.

The current implementation:

1. applies `Redactable` redaction first,
2. calls a zero-argument `toJSON()` method when present,
3. recursively applies `toJson` to arrays,
4. returns an ordinary object unchanged when no custom conversion applies,
5. catches failures and returns:

```text
[toJSON threw]
```

This is intentionally not the same as strict JSON encoding.

For example, a plain object may still contain:

```text
BigInt
functions
circular references
```

after `toJson`.

The demo explicitly verifies that an ordinary plain object is returned by the
same reference.

#### Arrays

For:

```ts
[
    inspectableValue,
    42,
    "hello"
]
```

the array is recreated with `toJson` recursively applied to each element.

#### `toStringUnknown`

```ts
Inspectable.toStringUnknown(
    unknownValue
)
```

is for diagnostics when the input type is unknown.

Strings are returned directly.

Objects are passed through `Formatter.formatJson` using the requested
whitespace.

Other values are formatted through `Formatter.format`.

If those paths fail, the helper falls back to JavaScript `String(value)`.

The whitespace argument defaults to:

```text
2
```

### 2. Class

The demo defines:

```ts
class User
    extends Inspectable.Class
{
    constructor(
        readonly id: number,
        readonly name: string,
        readonly email: string
    ) {
        super()
    }

    toJSON() {
        return {
            _tag: "User",
            id: this.id,
            name: this.name,
            email: this.email
        }
    }
}
```

A subclass only needs to define:

```ts
toJSON()
```

`Inspectable.Class` supplies:

```ts
toString()
[Inspectable.NodeInspectSymbol]()
```

The inherited `toString()` formats the `toJSON()` result with
`Formatter.format`.

The inherited Node inspection method returns the structured `toJSON()` value.

Because ordinary JavaScript `JSON.stringify` also recognizes `toJSON()`, the
same class gets a useful serialization representation without extra work.

### 3. Custom

`Inspectable.Inspectable` is the direct interface:

```ts
interface Inspectable {
    toString(): string
    toJSON(): unknown

    [NodeInspectSymbol]():
        unknown
}
```

The demo implements all three methods manually on an `OperationResult`.

This path is useful when:

```text
string output
JSON-like output
Node REPL output
```

need independent control.

The demo keeps the structured and Node representation aligned, and uses
`Formatter.format` for the string output.

## `NodeInspectSymbol`

The runtime value is:

```ts
Symbol.for(
    "nodejs.util.inspect.custom"
)
```

Node.js `util.inspect()` and the REPL recognize this symbol as the custom
inspection hook.

The module also exports a type alias with the same API name representing:

```ts
typeof NodeInspectSymbol
```

That value/type split is why the API reference shows two entries under the same
name.

### 4. Prototype

`Inspectable.BaseProto` is a reusable object implementing the standard
inspection methods.

The demo creates:

```ts
const value =
    Object.create(
        Inspectable.BaseProto
    )
```

and supplies an own:

```ts
value.toJSON = () => ({
    _tag: "Counter",
    label: value.label,
    count: value.count
})
```

The inherited methods then work like the `Class` helpers:

```text
toString
NodeInspectSymbol
```

without requiring class inheritance.

## Bare `BaseProto` behavior

There is a subtle implementation detail worth making explicit.

The default `BaseProto.toJSON()` delegates to:

```ts
Inspectable.toJson(this)
```

but `toJson` itself recognizes the inherited zero-argument `toJSON` method.

So an object that inherits `BaseProto` **without overriding `toJSON`** enters
that recursive path until the helper catches it and produces the safe fallback:

```text
[toJSON threw]
```

The inherited `toString()` then formats that fallback string.

The docs demonstrate this exact behavior for a bare prototype-based object.

## Current public surface

### Converting

- `toJson`
- `toStringUnknown`

### Models

- `Class`
- `Inspectable`

### Prototypes

- `BaseProto`

### Symbols

- `NodeInspectSymbol` value
- `NodeInspectSymbol` type

## `Inspectable` versus `Formatter`

These modules complement each other.

`Inspectable` answers:

```text
what structured representation should this value expose?
```

and:

```text
which representations should debugging tools see?
```

`Formatter` answers:

```text
how should an arbitrary JavaScript value be rendered as text?
```

`Inspectable.Class.toString()` and `BaseProto.toString()` use
`Formatter.format` internally.

`toStringUnknown` uses `Formatter.formatJson` for objects and
`Formatter.format` for other runtime values.

## Safety model

`Inspectable.toJson` is deliberately defensive.

A user-defined `toJSON()` method is arbitrary JavaScript and could throw.

Rather than leaking that failure from an inspection/logging path, `toJson`
returns a diagnostic fallback.

This makes Inspectable suitable for:

```text
logs
test failures
Node REPL output
error diagnostics
debugging tools
```

where the inspection mechanism itself should not become the primary failure.

## Type discipline

The generated demo has no explicit `any` annotations.

Every class method, custom inspect method, prototype override, Message payload,
and UI callback that could lose contextual typing has an explicit type.

The `BaseProto` example uses a concrete intersection type rather than weakening
the prototype-created value.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `InspectableDemo.Message` to the parent Message union,
3. initialize `InspectableDemo.init`,
4. delegate child messages to `InspectableDemo.update`,
5. render `InspectableDemo.view(...)` from the Inspectable route.

This artifact intentionally performs none of those edits.
