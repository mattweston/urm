# Redacted

Standalone FoldKit teaching demo for:

https://effect.website/docs/v4/api/effect/Redacted

The URM workspace pins Effect `4.0.0-rc.112`. The vendored `.context/effect`
snapshot identifies itself as `4.0.0-rc.108`; the Redacted operations used by
this lesson are present in that vendored source and in the current Effect v4 API
reference.

## Files

- `redacted.ts` — real Effect examples, Schema model, messages, update, and
  visual teaching snapshots.
- `redacted.view.ts` — interactive FoldKit view.

## Intended location

```text
packages/features/src/labs/_redacted/
├── README.md
├── redacted.ts
└── redacted.view.ts
```

The existing `_redacted` git scaffold is intentionally left untouched. No parent
router, model, message, update, export map, or repository file is changed by
this artifact.

## What Redacted is for

`Redacted<A>` wraps a sensitive value so ordinary string, JSON, and inspection
output shows a placeholder instead of the stored value.

```ts
import { Redacted } from "effect"

const apiKey = Redacted.make(
    "sk_demo_42ZX",
    { label: "api-key" }
)

String(apiKey)
// "<redacted:api-key>"

JSON.stringify(apiKey)
// "\"<redacted:api-key>\""
```

The original value still exists and remains recoverable with `Redacted.value`
until this wrapper is wiped or becomes unreachable. Redacted reduces accidental
disclosure in logs and diagnostics; it is not encryption or access control.

## Public surface used by the lesson

The current API page exposes the `Redacted` model/namespace plus these runtime
operations:

- `make`
- `value`
- `isRedacted`
- `makeEquivalence`
- `wipeUnsafe`

The lesson also demonstrates the type helper:

```ts
type Raw = Redacted.Redacted.Value<typeof apiKey>
```

and the wrapper's Effect `Equal` / hash behavior.

## 1. Wrap

### `make`

```ts
const plain = Redacted.make("secret")
const labelled = Redacted.make("secret", {
    label: "api-key",
})
```

Normal presentation becomes:

```text
String(plain)      → <redacted>
String(labelled)   → <redacted:api-key>
```

### Labels are public metadata

A label is visible in the placeholder. It is also used in the error message when
`value` is called after a wipe.

Good labels describe the kind of secret:

```text
api-key
session-token
database-password
```

Do not put account identifiers, credentials, or secret fragments in the label.

### `isRedacted`

```ts
const value: unknown = labelled

if (Redacted.isRedacted(value)) {
    // value is Redacted<unknown> here
}
```

The guard checks wrapper identity. It does not reveal the stored value.

## 2. Reveal

### `value`

```ts
const raw = Redacted.value(labelled)
// raw: string
```

Recovery should happen only at the narrow trusted boundary that needs the raw
credential: for example an HTTP authorization header builder, a cryptographic
operation, or a database client configuration boundary.

For FoldKit, do not treat a Redacted wrapper as permission to place credentials
in the serializable UI Model. Prefer safe UI state, opaque identifiers, and
runtime/service-owned secret material.

### Type extraction

```ts
type LabelledSecretValue =
    Redacted.Redacted.Value<typeof labelled>
```

This is a type-level operation; it does not read the runtime value.

## 3. Compare

### `makeEquivalence`

```ts
const sameToken = Redacted.makeEquivalence(
    (left: string, right: string) =>
        left.toLowerCase() === right.toLowerCase()
)

sameToken(
    Redacted.make("TOKEN-42"),
    Redacted.make("token-42")
)
// true
```

This centralizes the unwrap-and-compare step instead of exposing the value at
every comparison call site.

Redacted wrappers also implement Effect equality and hashing from the stored
value. Labels are presentation metadata rather than part of that equality.

`makeEquivalence` is an equality convenience, not a constant-time cryptographic
comparison primitive. Use a security-specific primitive when timing behavior is
part of the threat model.

## 4. Wipe

### `wipeUnsafe`

```ts
const source = {
    token: "sk_demo_42ZX",
}

const secret = Redacted.make(source, {
    label: "ephemeral-token",
})

Redacted.wipeUnsafe(secret)
// true
```

`wipeUnsafe` removes this wrapper's stored value from Effect's internal redacted
registry.

After the first wipe:

```text
Redacted.value(secret)
    → throws

Redacted.isRedacted(secret)
    → true

String(secret)
    → <redacted:ephemeral-token>

Redacted.wipeUnsafe(secret)
    → false on a second call
```

The wrapper still has Redacted identity because wiping removes the registry
entry, not the wrapper object.

### What wiping does not do

It does not zero memory and it does not alter other references to the original
value:

```ts
source.token
// still "sk_demo_42ZX"
```

Use `wipeUnsafe` as a narrow wrapper-lifetime operation, not as proof of secure
memory erasure.

## FoldKit boundary

The teaching `Model` contains only stage and case names:

```text
stage
wrapCase
revealCase
compareCase
wipeCase
```

No secret or Redacted wrapper is placed in the Model.

A practical architecture is:

```text
FoldKit Model / update
    safe serializable UI state

Effect service / runtime boundary
    owns Redacted values
    reveals only for required effects

external API / crypto / database boundary
    receives the raw value briefly
```

This keeps normal devtools, model snapshots, logging, and view inspection from
becoming secret-bearing surfaces.

## Type discipline

The generated demo contains no explicit `any` annotations.

Message payloads, equivalence callbacks, error handling, UI callbacks, and
button attributes are typed explicitly where contextual typing could otherwise
be lost.

## Validation note

The artifact is syntax-checked with TypeScript and scanned for explicit `any`
annotations. Full package-aware typechecking should still be run after copying
the files into the URM workspace, where the real `effect`, `foldkit`, and
`@foldkit/ui` packages resolve.

## Integration expectation

Follow the same child-feature pattern as neighboring Learn demos only when you
are ready to integrate it:

1. add the child Model to the parent Learn Model,
2. add `RedactedDemo.Message` to the parent Message union,
3. initialize `RedactedDemo.init`,
4. delegate child messages to `RedactedDemo.update`,
5. render `RedactedDemo.view(...)` from the Redacted route.

This artifact intentionally performs none of those edits.
