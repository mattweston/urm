# PlatformError

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/PlatformError

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/PlatformError.ts` source exposes **6 public
exports**:

- `BadArgument`
- `SystemErrorTag`
- `SystemError`
- `PlatformError`
- `systemError`
- `badArgument`

This v4 shape is different from the older platform error API: the current
`PlatformError` is a tagged wrapper whose `reason` field contains either
`BadArgument` or `SystemError`.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `platform-error.ts` — concrete BadArgument / SystemError reasons, wrapper
  constructors, formatted messages, normalized tags, and Effect error-channel
  examples.
- `platform-error.view.ts` — interactive visual demo.
- `platform-error-preview.png` — static preview of the default Reason stage.

## Intended location

```text
packages/features/src/learn/platform-error/
├── platform-error.ts
└── platform-error.view.ts
```

No parent router/model/message/update files are modified.

## Core model

The current v4 model has two levels:

```text
reason
    ↓
BadArgument
or
SystemError

wrapped by
    ↓
PlatformError
```

The outer wrapper gives platform APIs one shared error type.

The inner reason keeps the distinction between:

```text
caller input rejected
vs
host / operating-system operation failed
```

Conceptually:

```ts
class PlatformError {
    readonly _tag:
        "PlatformError"

    readonly reason:
        BadArgument |
        SystemError
}
```

## 1. Reason

### `BadArgument`

`BadArgument` is for input rejected before a platform operation can proceed.

Example:

```ts
const error =
    new PlatformError.BadArgument({
        module:
            "Path",
        method:
            "fromFileUrl",
        description:
            "URL must use the file scheme"
    })
```

Its fixed tag is:

```text
BadArgument
```

and the reason keeps:

```text
module
method
description?
cause?
```

Typical examples include:

```text
invalid file URL
negative / invalid byte count
unsupported platform option
invalid API argument
```

Current Effect source uses `PlatformError.badArgument` in modules such as
Crypto, FileSystem, HTTP body code, CLI code, and platform adapters.

## `BadArgument.message`

The message format is:

```text
module.method
```

plus:

```text
: description
```

when a description exists.

For example:

```text
Path.fromFileUrl: URL must use the file scheme
```

## `SystemError`

`SystemError` represents a normalized host / operating-system failure.

It stores:

```text
_tag
module
method
description?
syscall?
pathOrDescriptor?
cause?
```

The `_tag` itself is the normalized system reason.

Example:

```ts
const error =
    new PlatformError.SystemError({
        _tag:
            "NotFound",
        module:
            "FileSystem",
        method:
            "readFileString",
        pathOrDescriptor:
            "/tmp/missing.txt",
        syscall:
            "open"
    })
```

## `SystemErrorTag`

The current normalized tag union contains **11 values**:

```text
AlreadyExists
BadResource
Busy
InvalidData
NotFound
PermissionDenied
TimedOut
UnexpectedEof
Unknown
WouldBlock
WriteZero
```

These tags give application code a stable set of platform-level categories
rather than requiring every consumer to understand raw Node / Deno / browser /
operating-system error representations.

## Why normalize host errors?

Different platforms can expose different native error shapes.

For example, a missing file might originate as:

```text
Node system error
Deno error class
browser API exception
native adapter error
```

The platform adapter can translate that into:

```text
SystemError {
    _tag:
        "NotFound"
}
```

so the Effect program can handle the normalized meaning.

## `SystemError.message`

The current message format is:

```text
<tag>: module.method
```

optionally followed by:

```text
 (pathOrDescriptor)
```

and:

```text
: description
```

Example:

```text
NotFound: FileSystem.readFileString (/tmp/missing.txt): No such file or directory
```

The structured fields remain available separately even though the message is
human-readable.

## 2. Wrap

### `PlatformError`

The shared wrapper is:

```text
_tag:
    "PlatformError"

reason:
    BadArgument |
    SystemError
```

This means platform service signatures can expose:

```text
Effect<A, PlatformError>
```

without losing the specific reason data.

Application code can first identify the outer platform failure and then inspect:

```ts
error.reason
```

for the normalized inner category.

## Why wrap instead of a top-level union?

The current v4 model provides one stable outer tag:

```text
PlatformError
```

while preserving the detailed reason inside.

That is useful for Effect error-channel operations that should recover from
platform errors as one family.

Then, inside the recovery handler, application code can distinguish:

```text
BadArgument
NotFound
PermissionDenied
TimedOut
...
```

through the reason.

## `badArgument`

The normal constructor for rejected input is:

```ts
PlatformError.badArgument({
    module:
        "Crypto",
    method:
        "randomBytes",
    description:
        "size must be a non-negative safe integer"
})
```

The returned value is:

```text
PlatformError
```

whose:

```text
reason
```

is a `BadArgument`.

## `systemError`

The corresponding host-error constructor is:

```ts
PlatformError.systemError({
    _tag:
        "PermissionDenied",
    module:
        "FileSystem",
    method:
        "writeFile",
    pathOrDescriptor:
        "/etc/app.conf",
    syscall:
        "open",
    cause:
        nativeError
})
```

The result is again:

```text
PlatformError
```

but its reason is `SystemError`.

## Wrapper message

`PlatformError.message` simply delegates to:

```ts
this.reason.message
```

so callers receive the same useful formatted message regardless of whether they
are holding the reason or the wrapper.

## Preserved cause

When the reason carries a cause, the current wrapper constructor propagates that
cause onto the outer tagged error as well.

The structured reason still remains available as:

```ts
error.reason
```

so callers do not need to reverse-engineer the original cause to understand the
normalized platform category.

## 3. Message and details

The module intentionally preserves both:

```text
machine-friendly structured fields
and
human-friendly message
```

### BadArgument structure

```text
module:
    "Path"

method:
    "fromFileUrl"

description:
    "URL must use the file scheme"
```

Message:

```text
Path.fromFileUrl: URL must use the file scheme
```

### SystemError structure

```text
_tag:
    "NotFound"

module:
    "FileSystem"

method:
    "readFileString"

syscall:
    "open"

pathOrDescriptor:
    "/tmp/missing.txt"

description:
    "No such file or directory"
```

Message:

```text
NotFound: FileSystem.readFileString (/tmp/missing.txt): No such file or directory
```

Application logic can match structured fields while logs / diagnostics can use
the message.

## `pathOrDescriptor`

This field intentionally supports:

```text
string
or
number
```

because many platform APIs operate on either:

```text
filesystem path
file descriptor
socket / resource descriptor
```

The message prints the value in parentheses when present.

## `syscall`

`syscall` records lower-level operation context when available.

Examples might include:

```text
open
read
write
connect
```

It is not included in the current default message formatter, but it remains
available as structured data.

## `description`

`description` is optional for both reason models.

It provides additional platform-specific context without changing the
normalized tag.

## 4. Effect

PlatformError belongs in Effect's **expected error channel**.

For example:

```ts
const failing:
    Effect.Effect<
        never,
        PlatformError.PlatformError
    > =
    Effect.fail(
        PlatformError.systemError({
            _tag:
                "PermissionDenied",
            module:
                "FileSystem",
            method:
                "writeFile"
        })
    )
```

This tells callers directly that the operation can fail with a platform error.

## Recovering

A normal Effect error combinator can inspect the reason:

```ts
const recovered =
    failing.pipe(
        Effect.catch(
            (
                error:
                    PlatformError.PlatformError
            ) =>
                Effect.succeed(
                    error.reason._tag
                )
        )
    )
```

A real application might choose:

```text
NotFound
    → fallback / create resource

PermissionDenied
    → show permission error

TimedOut
    → retry

BadArgument
    → reject configuration / input

Unknown
    → report and escalate
```

The appropriate policy depends on the operation; the PlatformError model only
normalizes the failure information.

## Materializing the error

For inspection or teaching code:

```ts
Effect.result(
    failing
)
```

turns the Effect outcome into a Result value rather than short-circuiting the
current Effect.

This is useful when a UI or diagnostic program wants to render the failure as
data.

## Expected failure versus defect

Effect distinguishes expected failures from defects.

PlatformError is intended as an expected / typed platform failure.

That means platform operations should normally expose it in:

```text
Effect<Success, PlatformError>
```

and callers can recover through the normal error channel.

A defect represents a broken invariant or bug and is not the same thing as:

```text
file not found
permission denied
invalid platform argument
timeout
```

Those are exactly the kind of operational cases PlatformError exists to model.

## Current real usages

Current Effect source / platform packages use these constructors in places
including:

```text
Crypto
FileSystem
Path adapters
child process adapters
HTTP body logic
browser platform adapters
Node platform adapters
Deno platform adapters
```

This demonstrates that PlatformError is the cross-platform normalization
boundary, not only a FileSystem-specific error type.

## Relationship to Path

The preceding Path module is a direct example.

Its file-URL conversion methods can fail with platform argument errors when the
URL is invalid for the implementation.

That makes the conceptual flow:

```text
Path.fromFileUrl
    ↓ invalid URL
BadArgument
    ↓ wrapped
PlatformError
    ↓
Effect error channel
```

The Path service handles path semantics.

PlatformError standardizes the failure.

## Relationship to FileSystem

FileSystem operations commonly produce `SystemError` reasons.

Example conceptual flow:

```text
readFile("/missing")
    ↓ host error
platform adapter
    ↓ normalize
SystemError {
    _tag:
        "NotFound"
}
    ↓ wrap
PlatformError
```

Code using FileSystem can therefore handle the stable normalized reason rather
than platform-native error codes.

## v3 versus current v4 shape

Older Effect Platform documentation represented the platform error API
differently.

The current v4 source changed the model to:

```text
PlatformError wrapper
    reason:
        BadArgument
        |
        SystemError
```

and renamed the normalized system reason type to:

```text
SystemErrorTag
```

The migration metadata explicitly documents this wrapper-model change.

The demo follows the current v4 source rather than reproducing the older v3 API
shape.

## Public surface

### Reason models

- `BadArgument`
- `SystemError`
- `SystemErrorTag`

### Shared wrapper

- `PlatformError`

### Constructors

- `badArgument`
- `systemError`

That accounts for all **6** current public exports.

## Type discipline

The generated demo has no explicit `any` annotations.

Every Effect recovery callback, Foldkit Message payload, and UI callback that
could lose contextual typing has an explicit type where useful.

Button attributes are derived from `HtmlBuilder`.

The upstream current PlatformError wrapper constructor uses an internal
`as any` cast when forwarding the cause into its `Data.TaggedError` base. That
is separate from the generated artifact constraint.

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
resolved, so this check catches local syntax and implicit-any issues rather than
replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `Demo.Message` to the parent Message union,
3. initialize `Demo.init`,
4. delegate child messages to `Demo.update`,
5. render `Demo.view(...)` from the PlatformError route.

This artifact intentionally performs none of those edits.
