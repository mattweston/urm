# JsonPointer

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/JsonPointer

The current Effect source package is `4.0.0-rc.116`. The documented public
surface of `JsonPointer.ts` contains four helpers:

- `escapeToken`
- `unescapeToken`
- `formatUriFragment`
- `parseUriFragment`

The implementation and current test suite were checked against:

```text
packages/effect/src/JsonPointer.ts
packages/effect/test/JsonPointer.test.ts
```

The source also contains two internal helpers (`formatUriFragmentToken` and
`decodeUriFragment`) that are intentionally not treated as public demo APIs.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `json-pointer.ts` — token escaping, URI-fragment formatting/parsing, validation,
  and round-trip examples.
- `json-pointer.view.ts` — interactive visual demo.
- `json-pointer-preview.png` — static preview of the default Tokens stage.

## Intended location

```text
packages/features/src/learn/json-pointer/
├── json-pointer.ts
└── json-pointer.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

JSON Pointer has two distinct encoding layers in this module.

First, each path **token** follows RFC 6901 escaping:

```text
~  -> ~0
/  -> ~1
```

Second, a URI fragment applies URI percent-encoding around the escaped pointer:

```text
decoded path tokens
    ↓
JSON Pointer token escaping
    ↓
slash-separated pointer
    ↓
URI percent-encoding
    ↓
# fragment
```

Keeping those layers separate is the main idea of the demo.

## 1. Tokens

### `escapeToken`

Use:

```ts
JsonPointer.escapeToken(
    token
)
```

for **one JSON Pointer path segment**.

Examples:

```text
a/b           -> a~1b
c~d           -> c~0d
path/to~key   -> path~1to~0key
```

The order matters.

The implementation replaces:

```text
~
```

before:

```text
/
```

so the newly-generated `~` in `~1` is not escaped again.

### What is not escaped

`escapeToken` is not URI encoding.

Characters such as:

```text
space
#
%
?
Unicode
```

pass through unchanged at this stage.

For example:

```ts
JsonPointer.escapeToken(
    "a b#c%d?e"
)
```

returns the same string.

### `unescapeToken`

The inverse operation replaces:

```text
~1 -> /
~0 -> ~
```

in that order.

The order is important for sequences such as:

```text
~01
```

which decodes to:

```text
~1
```

rather than `/`.

The test suite covers several potentially confusing cases:

```text
~01
~10
~00
~11
```

### Token round trip

For valid strings:

```ts
JsonPointer.unescapeToken(
    JsonPointer.escapeToken(
        token
    )
)
```

returns the original token.

The demo includes:

```text
slashes
tildes
mixed sequences
Unicode
```

to make this visible.

## 2. Format

### `formatUriFragment`

```ts
JsonPointer.formatUriFragment(
    tokens
)
```

accepts already-decoded path tokens.

For example:

```ts
[
    "$defs",
    "a b",
    "a%b",
    "a/b",
    "café",
    "a#b"
]
```

formats as:

```text
#/$defs/a%20b/a%25b/a~1b/caf%C3%A9/a%23b
```

This demonstrates both encoding layers:

```text
"a/b"
```

is first pointer-escaped to:

```text
a~1b
```

while:

```text
"a b"
"a%b"
"café"
"a#b"
```

require URI percent-encoding.

### Root path

An empty path:

```ts
[]
```

formats as:

```text
#
```

### Reserved characters

The current tests also cover URI characters such as:

```text
!$&'()*+,;=:@?
```

that can remain present in a URI fragment without percent-encoding under the
implementation's `encodeURI`-based strategy.

### Error behavior

`formatUriFragment` may throw:

```text
URIError
```

when a token contains an unpaired UTF-16 surrogate.

The demo catches that only so the failure mode can be shown visually.

## 3. Parse

### `parseUriFragment`

```ts
JsonPointer.parseUriFragment(
    fragment
)
```

returns:

```text
ReadonlyArray<string> | undefined
```

Valid input returns decoded path tokens.

Invalid input returns:

```text
undefined
```

rather than throwing.

### Root forms

Both:

```text
""
"#"
```

represent the document root and parse to:

```ts
[]
```

### Percent-decode before splitting

This is the most important parsing detail.

The implementation decodes the URI fragment **before** splitting the pointer on
slashes.

Therefore:

```text
#/$defs/Box%2Fproperties%2Fvalue
```

contains encoded separators.

After percent-decoding it becomes:

```text
#/$defs/Box/properties/value
```

and parses to four tokens:

```text
"$defs"
"Box"
"properties"
"value"
```

By contrast:

```text
#/$defs/Box~1properties~1value
```

uses JSON Pointer escaping for literal slashes inside one token.

It parses to:

```text
"$defs"
"Box/properties/value"
```

This distinction is a central visual comparison in the Parse stage.

### Unicode and percent encoding

Examples supported by the tests include:

```text
#/definitions/a%20b
#/definitions/a%25b
#/definitions/caf%C3%A9
```

which decode to:

```text
a b
a%b
café
```

respectively.

## 4. Edge cases

### Invalid fragments

The current parser rejects examples such as:

```text
/a
#/%
#/%FF
#/a b
#/a#b
#/a\b
#/café
#/a~2b
#/a~
```

Reasons include:

```text
missing leading #
malformed percent encoding
raw characters that require URI encoding
invalid JSON Pointer ~ escape sequences
```

The result is:

```text
undefined
```

for all of these parsing failures.

### Fragment round trip

For valid token arrays:

```ts
JsonPointer.parseUriFragment(
    JsonPointer.formatUriFragment(
        path
    )
)
```

returns the original path.

The current tests cover:

```text
empty root path
empty token
percent signs
slash / tilde tokens
URI reserved characters
accented Unicode
CJK text
emoji
```

### Empty token versus empty path

These are different:

```ts
[]
```

is the document root and formats as:

```text
#
```

while:

```ts
[""]
```

contains one empty reference token and therefore formats with a slash after the
fragment marker.

The round-trip tests include this distinction.

## Public API surface

### Decoding

- `parseUriFragment`
- `unescapeToken`

### Encoding

- `escapeToken`
- `formatUriFragment`

That is the complete public module surface.

## Relationship to JsonPatch

The preceding JsonPatch demo uses this module internally.

When JsonPatch creates an object-property path, a property such as:

```text
a/b
```

must become one JSON Pointer token:

```text
a~1b
```

rather than two path segments.

JsonPatch therefore uses the token escaping helpers to make generated paths
safe and applies the inverse operation while resolving patches.

JsonPointer itself does **not** resolve paths against JSON documents. Its job is
encoding, decoding, formatting, and validating pointer syntax.

## JSON Pointer token versus URI fragment

It is useful to keep three values mentally separate.

### Raw token

```text
a/b
```

### Escaped JSON Pointer token

```text
a~1b
```

### URI-fragment path

```text
#/a~1b
```

If the token also contains URI-sensitive content:

```text
café
```

the final fragment becomes:

```text
#/caf%C3%A9
```

The Tokens and Format stages deliberately show these levels separately.

## Type discipline

The generated demo has no explicit `any` annotations.

All Array mapping callbacks, exception handlers, Message payloads, and UI
callbacks that could lose contextual typing have explicit types.

Button attributes are derived from `HtmlBuilder`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `JsonPointerDemo.Message` to the parent Message union,
3. initialize `JsonPointerDemo.init`,
4. delegate child messages to `JsonPointerDemo.update`,
5. render `JsonPointerDemo.view(...)` from the JsonPointer route.

This artifact intentionally performs none of those edits.
