# Hash

## Mental model

Effect hashes are small numeric fingerprints used to bucket values efficiently
inside hash-based data structures.

They are **not**:

- cryptographic hashes
- unique IDs
- stable serialization identifiers
- proof that two values are equal

The important relationship is:

```text
equal values ⇒ same hash
```

but not:

```text
same hash ⇒ equal values
```

Collisions are normal and must be handled by equality.

## The four sections

### 1. Fingerprint

The general entry point is:

```ts
Hash.hash(value)
```

It handles many JavaScript / Effect values, including:

- numbers
- strings
- booleans
- bigint
- symbols
- arrays / typed arrays
- plain objects
- maps
- sets
- dates
- regular expressions
- objects implementing `Hash.Hash`

Examples:

```ts
Hash.hash(42)
Hash.hash("hello")
Hash.hash([1, 2, 3])
Hash.hash({ name: "Ada", age: 36 })
```

The module also exposes specialized helpers:

```ts
Hash.number(...)
Hash.string(...)
Hash.array(...)
Hash.structure(...)
```

and:

```ts
Hash.combine(...)
Hash.optimize(...)
```

for building custom hash functions.

## 2. Structure

Plain objects are structurally hashed:

```ts
Hash.hash({
  name: "Ada",
  age: 36
})
```

Two fresh plain objects with the same structure therefore get the same Effect
hash.

You can intentionally hash only selected fields:

```ts
Hash.structureKeys(
  user,
  ["name", "age"]
)
```

This is useful when only part of an object's data defines its logical identity.

### Reference identity

For identity-based hashing:

```ts
Hash.random(object)
```

returns a cached hash for that object reference.

The same reference receives the same value for its lifetime.

`Hash.random` is not structural equality.

## 3. Custom Hash

A custom value can implement:

```ts
Hash.Hash
```

with:

```ts
[Hash.symbol](): number
```

When the domain type also has custom equality, implement `Equal.Equal`, which
extends `Hash.Hash`:

```ts
class UserId implements Equal.Equal {
  constructor(readonly value: string) {}

  [Equal.symbol](that: Equal.Equal) {
    return that instanceof UserId &&
      this.value === that.value
  }

  [Hash.symbol]() {
    return Hash.string(this.value)
  }
}
```

Effect can detect custom Hash implementations with:

```ts
Hash.isHash(value)
```

### The contract

If:

```ts
Equal.equals(a, b) === true
```

then:

```ts
Hash.hash(a) === Hash.hash(b)
```

must also be true.

Equal values returning different hashes break hash-based collections such as
`HashMap` and `HashSet`.

## 4. Collisions and mutation

### Same hash does not mean equal

A useful concrete example from the current implementation:

```ts
Hash.array([1, 2, 3]) ===
Hash.array([3, 2, 1])
```

can be:

```ts
true
```

because the iterable hash folds its element hashes with XOR.

But:

```ts
Equal.equals(
  [1, 2, 3],
  [3, 2, 1]
)
// false
```

This is why hashes are a fast bucket / rejection mechanism rather than
equality itself.

### Treat structurally hashed objects as immutable

`Hash.hash` caches object hashes.

Do not mutate an object after its first structural hash computation. Otherwise
the cached hash can describe the old structure.

For mutable identity-based objects, use an appropriate custom / reference
hashing strategy instead.

## Real Effect 4 APIs used

The source includes:

- `Hash.hash`
- `Hash.number`
- `Hash.string`
- `Hash.array`
- `Hash.structureKeys`
- `Hash.random`
- `Hash.isHash`
- `Hash.symbol`
- `Hash.Hash`
- `Equal.Equal`
- `Equal.symbol`
- `Equal.equals`
