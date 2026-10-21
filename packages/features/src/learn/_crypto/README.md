# Crypto

## Mental model

Effect's `Crypto` module is a platform-independent service boundary for
cryptographic operations. Application code depends on `Crypto.Crypto`; runtime
packages provide the concrete implementation using host cryptography APIs.

The core constructor is deliberately small:

```ts
const crypto = Crypto.make({
    randomBytes: (size) => secureRandomBytes(size),
    digest: (algorithm, data) => platformDigest(algorithm, data),
})
```

From those two primitives, Effect derives secure random numbers, booleans,
ranges, shuffling, UUIDv4, UUIDv7, and ULID. Digest calls are delegated to the
supplied primitive.

This teaching demo uses a deterministic `Crypto.make` implementation so every
render and screenshot is repeatable. **It is not a cryptographic implementation
and must not be copied into production.** Production `randomBytes` must return
cryptographically secure fresh bytes and production `digest` should be backed by
the platform's real crypto API.

The Foldkit model contains only visual choices. Snapshot functions construct a
fresh deterministic service each time and run the real Effect Crypto helpers, so
rendering is stable and there is no Foldkit `Command` or external I/O.

## The four sections

### 1. Service

The first stage makes the service architecture visible.

`Crypto.make` accepts two primitive operations:

```ts
randomBytes(size)
digest(algorithm, data)
```

`randomBytes` is then used to derive:

```text
random
randomBoolean
randomInt
randomBetween
randomIntBetween
randomShuffle
randomUUIDv4
randomUUIDv7
randomULID
```

The `Crypto.Crypto` service tag lets an Effect program ask for cryptographic
capabilities without depending on a browser, Node, Bun, or Deno implementation:

```ts
const program = Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto
    return yield* crypto.randomBytes(16)
})
```

A runtime or test can provide a different service at the boundary.

An important implementation detail from the Effect source is that UUID
formatting mutates the temporary byte array it receives. A custom
`randomBytes` implementation should therefore return a **fresh** `Uint8Array`
for every call.

## 2. Random

The Random stage demonstrates the helpers derived from the byte primitive:

```ts
const bytes = yield* crypto.randomBytes(16)
const unit = yield* crypto.random
const coin = yield* crypto.randomBoolean
const integer = yield* crypto.randomInt
const float = yield* crypto.randomBetween(10, 20)
const die = yield* crypto.randomIntBetween(1, 6)
const order = yield* crypto.randomShuffle(["A", "B", "C", "D"])
```

The demo cycles `randomBytes` through 8, 16, and 32-byte outputs.

It also makes the range distinction visible:

```ts
crypto.randomBetween(10, 20)
// [10, 20)

crypto.randomIntBetween(1, 6)
// [1, 6] by default

crypto.randomIntBetween(1, 6, {
    halfOpen: true,
})
// [1, 6)
```

The source validates `randomBytes(size)` before calling the primitive. `size`
must be a non-negative safe integer.

The interface also exposes synchronous escape hatches:

```ts
crypto.nextDoubleUnsafe()
crypto.nextIntUnsafe()
```

The UI puts those in an amber treatment to distinguish them from the ordinary
Effect-returning helpers.

## 3. IDs

The identifier stage uses:

```ts
crypto.randomUUIDv4
crypto.randomUUIDv7
crypto.randomULID
```

UUIDv4 is generated from random bytes alone.

UUIDv7 and ULID also read the active Effect `Clock`. That is important because
timestamp-aware identifiers remain testable instead of reaching directly for
`Date.now()`:

```ts
const deterministic = crypto.randomUUIDv7.pipe(
    Effect.provideService(
        Clock.Clock,
        fixedClock
    )
)
```

The demo switches between two fixed clock values:

```text
1970-01-01T00:00:00.000Z
2026-09-19T09:30:00.000Z
```

Changing the clock changes UUIDv7 and ULID predictably, while UUIDv4 stays
independent of time.

ULIDs are 26 uppercase Crockford-base32 characters. In Effect's implementation,
the first 10 encode the millisecond timestamp and the remaining 16 encode 80
random bits.

## 4. Digest

The final stage demonstrates the `DigestAlgorithm` union:

```ts
type DigestAlgorithm =
    | "SHA-1"
    | "SHA-256"
    | "SHA-384"
    | "SHA-512"
```

and the service call:

```ts
const data = new TextEncoder().encode("Effect")
const hash = yield* crypto.digest("SHA-256", data)
```

The demo lets the viewer switch algorithm and UTF-8 input. It displays input
bytes, output bytes, bit length, and the deterministic teaching output.

The displayed digest bytes are **not real SHA hashes**. `Crypto.make` delegates
`digest` to the primitive supplied by the platform or test implementation, so
this demo intentionally uses a fake deterministic primitive to make that
boundary obvious.

Expected digest sizes shown by the demo are:

```text
SHA-1   -> 20 bytes / 160 bits
SHA-256 -> 32 bytes / 256 bits
SHA-384 -> 48 bytes / 384 bits
SHA-512 -> 64 bytes / 512 bits
```

Effect includes SHA-1 for interoperability with existing protocols. The API
reference explicitly advises against using SHA-1 for new security-sensitive
designs.

## Files

Place these three files together under the learn feature, for example:

```text
packages/features/src/learn/crypto/
├── crypto.ts
├── crypto.view.ts
└── README.md
```

`crypto.ts` contains the deterministic teaching service, fixed Clock, real
Effect Crypto calls, Schema-defined Foldkit Model and Message union, pure
update, and derived snapshots.

`crypto.view.ts` is the pure Foldkit view. It accepts a `to_parent_message`
function so the parent feature can lift Messages without this demo depending on
a specific parent union.

No integration patch, route edit, parent Model edit, archive, repository
mutation, or production cryptographic implementation is included.

## Effect APIs covered

### Service and construction

```ts
Crypto.Crypto
Crypto.make
Crypto.DigestAlgorithm
```

### Secure random values

```ts
crypto.randomBytes
crypto.random
crypto.randomBoolean
crypto.randomInt
crypto.randomBetween
crypto.randomIntBetween
crypto.randomShuffle
crypto.nextDoubleUnsafe
crypto.nextIntUnsafe
```

### Identifiers

```ts
crypto.randomUUIDv4
crypto.randomUUIDv7
crypto.randomULID
Clock.Clock
Effect.provideService
```

### Digests

```ts
crypto.digest
```

## Reference

The implementation follows the Effect v4 Crypto API reference and the current
`packages/effect/src/Crypto.ts` source.

Reference checked against Effect `4.0.0-rc.116` on 2026-09-19:

```text
https://effect.website/docs/v4/api/effect/Crypto
https://github.com/Effect-TS/effect/blob/main/packages/effect/src/Crypto.ts
```
