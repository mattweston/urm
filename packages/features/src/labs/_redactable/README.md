# Redactable

Standalone FoldKit teaching demo for:

https://effect.website/docs/v4/api/effect/Redactable

The linked API reference currently displays Effect `4.0.0-rc.116`. URM is
pinned to Effect `4.0.0-rc.112`. The public `Redactable` source is identical in
those two releases, so this demo targets the installed URM version without a
compatibility shim.

## Files

- `redactable.ts` — real Effect examples, Schema model, messages, update, and
  visual teaching snapshots.
- `redactable.view.ts` — interactive FoldKit view.

## Intended location

```text
packages/features/src/labs/_redactable/
├── README.md
├── redactable.ts
└── redactable.view.ts
```

No parent router, model, message, update, export map, or GitHub file is changed
by this artifact.

## What the module is for

`Redactable` is a synchronous protocol for giving a sensitive value an
alternative representation.

Typical boundaries include:

```text
logs
diagnostics
error details
traces
redaction-aware formatted JSON
```

The source object still owns the raw value. Redaction changes how a compatible
consumer represents that value; it does not remove, encrypt, or access-control
the source data.

## Public surface

The API reference contains five exports:

- `Redactable` — the protocol interface.
- `symbolRedactable` — the symbol-keyed protocol method.
- `isRedactable` — the type guard.
- `redact` — safe general dispatch for `unknown` input.
- `getRedacted` — direct dispatch for a value already known to implement the
  protocol.

## 1. Implement the protocol

```ts
import {
    Context,
    Redactable,
} from "effect"

class ApiToken
    implements Redactable.Redactable
{
    constructor(
        readonly raw: string
    ) {}

    [Redactable.symbolRedactable](
        context:
            Context.Context<never>
    ): unknown {
        return "[REDACTED]"
    }
}
```

The interface is structural. A plain object may implement the same symbol
method; no base class is required.

### Global symbol identity

`symbolRedactable` is created with:

```text
Symbol.for("~effect/Redactable")
```

That gives the protocol one symbol identity across multiple compatible Effect
copies in the same JavaScript realm.

Import `Redactable.symbolRedactable` rather than spelling that registry key in
application code.

### Replacement type

The method returns `unknown`, so a safe replacement may be:

```text
"[REDACTED]"
"token_••••_9K2F"
{ _tag: "ApiToken", lastFour: "9K2F" }
```

Structured output is useful when log processing needs stable safe fields.

## 2. Dispatch

### `isRedactable`

```ts
if (
    Redactable.isRedactable(
        value
    )
) {
    // value is Redactable.Redactable here
}
```

The guard checks whether the value has the protocol symbol property.

### `redact`

```ts
Redactable.redact(value)
```

Use this for `unknown` or mixed input.

Its behavior is:

```text
redactable value
    → getRedacted(value)

ordinary value
    → return the same value unchanged
```

It does not clone, stringify, or wrap a non-redactable value.

### `getRedacted`

```ts
Redactable.getRedacted(
    knownRedactable
)
```

Use this after the type has already been narrowed. It directly calls the
symbol method with the active redaction Context.

For unknown input, prefer `redact` or guard with `isRedactable` first.

## 3. Context-aware representations

The protocol method receives the current fiber's `Context`.

That allows the same value to produce several safe representations without
passing presentation policy through every caller.

This demo defines a safe-default reference:

```ts
const RedactionPolicy =
    Context.Reference<RedactionMode>(
        "urm/learn/Redactable/RedactionPolicy",
        {
            defaultValue:
                () =>
                    "Mask",
        }
    )
```

and overrides it around a synchronous redaction call:

```ts
const auditPreview =
    Effect.sync(
        () =>
            Redactable.redact(
                token
            )
    ).pipe(
        Effect.provideService(
            RedactionPolicy,
            "Audit"
        )
    )
```

The call to `redact` is synchronous, but it must occur while the provided
Effect is running for `getRedacted` to observe that fiber Context.

### No active fiber

If `redact` / `getRedacted` runs outside an active Effect fiber, an empty
`Context` is supplied.

Using a `Context.Reference` with a safe default makes that case deterministic:

```text
empty Context
    → policy default
    → "[REDACTED]"
```

Do not make the fallback reveal raw data.

### Safe policies only

The demo deliberately offers:

```text
Mask
Fingerprint
Audit metadata
```

It does not include a `Reveal` policy. A logging context should choose between
sanitized representations rather than act as a hidden disclosure switch.

## 4. Redaction is not recursive

Direct `Redactable.redact` only dispatches the value passed to it.

```ts
const request = {
    token:
        new ApiToken(
            "sk_live_demo_9K2F"
        ),
}

Redactable.redact(request)
```

Because the outer `request` object is not Redactable, it is returned unchanged.
The nested token's protocol method is not invoked.

This is an important boundary:

```text
redact(redactable)
    → replacement

redact({ nested: redactable })
    → same outer object
```

## 5. Formatter traversal

Effect's `Formatter` is redaction-aware.

```ts
Formatter.format(request)
Formatter.formatJson(request)
```

Both traverse the structure and invoke the Redactable protocol for nested
values. `formatJson` performs this inside its JSON replacer.

That makes the distinction:

```text
Redactable.redact
    one-value protocol dispatch

Formatter.format / formatJson
    recursive formatting boundary that notices nested redactables
```

Plain `JSON.stringify` does not automatically understand
`symbolRedactable`. Use an explicitly redaction-aware boundary when producing
logs or serialized diagnostics.

## 6. Failure behavior

`redact` and `getRedacted` do not catch defects thrown by the protocol method.

A redaction implementation should therefore be:

```text
total
synchronous
small
side-effect free
safe under an empty Context
```

Avoid network calls, mutable coordination, and complicated parsing in the
symbol method.

## 7. Security boundary

Redactable is presentation safety, not secret storage.

It does not provide:

```text
encryption
hashing
access control
memory erasure
database sanitization
network payload filtering
automatic JSON.stringify behavior
```

The raw field remains reachable by application code holding the source object.

For URM, keep secret-bearing objects out of:

```text
the Schema-defined FoldKit Model
DevTools snapshots
time-travel state
persisted client state
analytics payloads
unreviewed JSON boundaries
```

Use the runtime/service boundary to hold the secret and return safe domain data
to FoldKit messages.

## FoldKit integration

The demo keeps the FoldKit Model serializable:

```text
Model
    selected teaching stage
    selected scenario per stage

runtime examples
    ApiToken
    Context.Reference policy
    actual redact / getRedacted calls

view
    safe explanatory snapshots only
```

No raw token is stored in `Model`.

To integrate it with the parent labs feature, follow the neighboring child
feature pattern:

1. add `Demo.Model` to the parent learn Model,
2. add `Demo.Message` to the parent Message union,
3. initialize with `Demo.init`,
4. delegate child messages to `Demo.update`,
5. render `Demo.view(...)` for the Redactable route.

This download intentionally performs none of those edits.

## Redactable versus Redacted

The two Effect modules solve related but different problems:

```text
Redactable
    protocol for context-aware alternative representation

Redacted
    dedicated wrapper for carrying a value while hiding its representation
```

This lesson covers only `Redactable`. The adjacent `_redacted` placeholder can
remain a separate lesson rather than merging both concepts.

## Validation

The files are designed for URM's current versions:

```text
effect 4.0.0-rc.112
foldkit 0.158.2
@foldkit/ui 0.158.2
```

The generated TypeScript contains no explicit `any` annotations. FoldKit
message payloads and Button callback attributes are explicitly typed so the
files remain useful under strict TypeScript settings.
