# PrimaryKey

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/PrimaryKey

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/PrimaryKey.ts` source exposes **4 public exports**:

- `symbol`
- `PrimaryKey`
- `isPrimaryKey`
- `value`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `primary-key.ts` — class and object-literal implementations, runtime guard,
  extraction, cache example, and current Effect integration notes.
- `primary-key.view.ts` — interactive visual demo.
- `primary-key-preview.png` — static preview of the default Protocol stage.

## Intended location

```text
packages/features/src/learn/primary-key/
├── primary-key.ts
└── primary-key.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`PrimaryKey` is a deliberately tiny protocol.

A value participates by implementing one method:

```ts
[PrimaryKey.symbol](): string
```

That method returns the stable string identity for the value.

Consumers do not need to know how the value stores its fields or how the string
was built.

The module therefore separates:

```text
domain representation
    ↓
PrimaryKey protocol
    ↓
stable string
    ↓
cache / ring / persistence / idempotency / lookup
```

## 1. Protocol

### `symbol`

The protocol key is:

```text
~effect/PrimaryKey
```

and is exported as:

```ts
PrimaryKey.symbol
```

Unlike APIs that use a JavaScript `Symbol`, the current value is a string
property key.

A class can therefore implement:

```ts
class ProductId
    implements PrimaryKey.PrimaryKey
{
    constructor(
        readonly category: string,
        readonly id: number
    ) {}

    [PrimaryKey.symbol](): string {
        return `${this.category}-${this.id}`
    }
}
```

For:

```ts
new ProductId(
    "electronics",
    42
)
```

the key is:

```text
electronics-42
```

## `PrimaryKey`

The interface itself is only:

```ts
interface PrimaryKey {
    [symbol]():
        string
}
```

There is no base class, wrapper object, registry, or allocation required by the
protocol.

This makes it structural.

Any object with the expected member is assignable.

## Object literal implementation

Classes are not required.

```ts
const key:
    PrimaryKey.PrimaryKey = {
        [PrimaryKey.symbol]:
            () =>
                "simple-key-123"
    }
```

works the same way as a class implementation.

This is useful for lightweight domain values or adapters.

## Stability is the producer's responsibility

The protocol says only:

```text
return string
```

It does not enforce:

```text
global uniqueness
immutability
namespacing
escaping
hashing
persistence safety
```

If a key is meant to represent logical identity, the implementation should
return the same string for the same logical value over time.

For example, using mutable display text as a primary key would usually be a bad
fit because the identity could change when the display text changes.

## Key format

The library does not prescribe one string format.

Possible domain formats include:

```text
electronics-42
order_1640995200000_1
tenant/acme/user/42
node-us-east-1-a
```

The application controls the format.

When multiple entity families share one storage namespace, include enough
domain information to prevent accidental collisions.

## 2. Guard

### `isPrimaryKey`

```ts
PrimaryKey.isPrimaryKey(
    value
)
```

is a runtime type guard from:

```text
unknown
```

to:

```text
PrimaryKey.PrimaryKey
```

Example:

```ts
const input:
    unknown =
    new ProductId(
        "electronics",
        42
    )

if (
    PrimaryKey.isPrimaryKey(
        input
    )
) {
    PrimaryKey.value(
        input
    )
}
```

Inside the branch, TypeScript treats `input` as implementing the protocol.

## Current implementation

The guard delegates to:

```ts
Predicate.hasProperty(
    input,
    PrimaryKey.symbol
)
```

So the runtime check means:

```text
does this object-like value have this property?
```

It does **not** inspect the property value more deeply.

## Important guard limitation

The current docs explicitly note that `isPrimaryKey`:

```text
does not call the method
does not verify that it returns a string
```

Because `Predicate.hasProperty` only checks property presence, a malformed
JavaScript value could theoretically satisfy the runtime guard while containing
a non-callable property.

For example, conceptually:

```ts
{
    "~effect/PrimaryKey":
        "not a function"
}
```

has the required property key.

Calling:

```ts
PrimaryKey.value(...)
```

would then fail at runtime.

That does not normally matter for properly typed TypeScript values, but it is
important at untrusted JavaScript / deserialization boundaries.

## Stronger validation

If values come from untrusted input and you need to validate both:

```text
property exists
property is callable
result is a string
```

then `isPrimaryKey` alone is not a full validation layer.

Use an explicit validation/schema boundary before accepting the value as a
trusted domain object.

## Inherited property semantics

`Predicate.hasProperty` uses JavaScript's:

```text
property in object
```

which includes inherited members.

That is desirable for class instances because protocol methods commonly live on
the prototype.

It also explains why the guard works on:

```ts
class ProductId {
    [PrimaryKey.symbol]() {
        ...
    }
}
```

even though the method is not an own property on each instance.

## 3. Value

### `value`

```ts
PrimaryKey.value(
    self
)
```

is simply:

```ts
self[
    PrimaryKey.symbol
]()
```

The module does not add additional processing.

## Class examples

```ts
PrimaryKey.value(
    new ProductId(
        "electronics",
        42
    )
)
// "electronics-42"
```

and:

```ts
PrimaryKey.value(
    new OrderId(
        1640995200000,
        1
    )
)
// "order_1640995200000_1"
```

## Object example

```ts
PrimaryKey.value({
    [PrimaryKey.symbol]:
        () =>
            "simple-key-123"
})
// "simple-key-123"
```

All three cases use the same consumer API.

That is the benefit of the protocol: concrete representation does not leak into
the consumer.

## No memoization

`value` calls the method each time.

It does not cache the returned string.

If computing the primary key is expensive, the implementation can choose to
store or memoize its own key.

For most domain IDs, computing the string is cheap.

## No normalization

The module does not:

```text
trim whitespace
lowercase
URI encode
hash
prefix
validate characters
```

The string is returned exactly as the protocol method produces it.

This is useful because different downstream systems can impose different
requirements.

## Primary key versus object equality

PrimaryKey does not redefine JavaScript equality.

Two different objects may return the same primary key:

```text
object A !== object B
but
PrimaryKey.value(A)
===
PrimaryKey.value(B)
```

That can be intentional when both objects represent the same logical entity.

If you need Effect structural equality / hashing, use the relevant Equal / Hash
protocols or data types.

PrimaryKey is an identity-string protocol, not an equality protocol.

## 4. Integrate

### Map / cache

A direct use is a string-keyed cache:

```ts
const cache =
    new Map<
        string,
        Product
    >()

cache.set(
    PrimaryKey.value(
        productId
    ),
    product
)
```

Lookup remains independent of the concrete primary-key class:

```ts
cache.get(
    PrimaryKey.value(
        productId
    )
)
```

## HashRing

Current Effect `HashRing` is a concrete use of this protocol.

HashRing node APIs constrain node values with:

```text
A extends PrimaryKey.PrimaryKey
```

and obtain each node's key with:

```ts
PrimaryKey.value(
    node
)
```

The current implementation stores nodes in its map by that string and uses the
same string when generating ring positions.

This means HashRing can work with arbitrary node classes as long as each node
supplies a stable PrimaryKey.

## HashRing update identity

Current HashRing documentation states that nodes are matched by
`PrimaryKey.value`.

If a new node object returns an already-present primary key, it represents the
same ring identity for update purposes.

This makes stable keys especially important.

## Persistence

Current unstable persistence code also calls:

```ts
PrimaryKey.value(
    key
)
```

before storage lookup.

Conceptually:

```text
typed domain key
    ↓
PrimaryKey.value
string storage key
    ↓
persistent backend
```

This lets persistence work with domain-specific key objects while keeping the
underlying storage interface string-oriented.

## Cluster envelope

Current unstable cluster envelope logic uses:

```ts
PrimaryKey.isPrimaryKey(
    envelope.payload
)
```

to decide whether a request payload exposes a primary key.

When it does, the envelope identity includes:

```ts
PrimaryKey.value(
    envelope.payload
)
```

alongside address/tag information.

This shows both module operations working together in real Effect code:

```text
guard unknown-ish protocol participation
then extract stable string
```

## Workflow / idempotency

Current migration metadata also points older workflow idempotency-key behavior
toward:

```ts
PrimaryKey.value
```

This is the same core idea:

```text
domain request value
    ↓
stable primary key string
    ↓
idempotency / persistence identity
```

## Choosing a good primary key

A useful primary key should usually be:

```text
stable
deterministic
domain-appropriate
collision-resistant within its namespace
cheap enough to compute repeatedly
```

It should not depend on incidental presentation state.

For example:

```text
good:
    user_42

risky:
    current display name

good:
    order_20260920_000123

risky:
    current order status
```

The exact policy belongs to the application.

## PrimaryKey and Newtype

A Newtype can represent strongly typed scalar identity:

```text
UserId
OrderId
TenantId
```

PrimaryKey instead gives an object/value a way to expose a **string
representation of identity**.

These can be combined.

For example, a class may contain a `UserId` newtype but expose:

```text
user:<carrier>
```

through PrimaryKey.

They solve different concerns:

```text
Newtype
    compile-time distinction

PrimaryKey
    runtime string identity protocol
```

## PrimaryKey and Predicate

The implementation of:

```ts
isPrimaryKey
```

depends directly on:

```ts
Predicate.hasProperty
```

So the preceding Predicate module provides the structural guard used here.

This is a useful example of how small Effect modules compose:

```text
Predicate
    structural runtime guard

PrimaryKey
    protocol

HashRing / persistence / cluster
    consumers
```

## Foldkit integration

PrimaryKey can be useful where Foldkit Model values need a stable identity for
runtime-side systems.

Examples:

```text
dedupe commands
cache fetched entities
address request results
index optimistic operations
associate resource handles
```

A clean architecture is:

```text
pure Model
    contains typed domain identity

Effect/runtime integration
    converts identity with PrimaryKey.value

cache / persistence / network coordination
    uses stable string key
```

Avoid making the view depend on incidental object identity when the domain has a
stable logical key.

## Current public surface

### Protocol property key

- `symbol`

### Model

- `PrimaryKey`

### Guard

- `isPrimaryKey`

### Getter

- `value`

That is the complete **4-export** current public surface.

## Type discipline

The generated demo has no explicit `any` annotations.

Every Foldkit Message payload and UI callback that could lose contextual typing
is explicitly typed where appropriate.

Button attributes are derived from `HtmlBuilder`.

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
resolved, so this check catches local syntax and implicit-any problems rather
than replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `PrimaryKeyDemo.Message` to the parent Message union,
3. initialize `PrimaryKeyDemo.init`,
4. delegate child messages to `PrimaryKeyDemo.update`,
5. render `PrimaryKeyDemo.view(...)` from the PrimaryKey route.

This artifact intentionally performs none of those edits.
