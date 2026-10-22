# Encoding

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Encoding

The current Effect API page is `4.0.0-rc.116` and documents 14 items when the
`EncodingErrorTypeId` value and its type alias are counted separately.

The implementation was also checked against the current
`packages/effect/src/Encoding.ts` source.

## Files

- `encoding.ts` — real Encoding operations, deterministic snapshots, Foldkit
  Model / Message / update.
- `encoding.view.ts` — interactive Foldkit teaching UI.
- `encoding-preview.png` — static preview of the default Base64 stage.

## Intended location

```text
packages/features/src/labs/encoding/
├── encoding.ts
└── encoding.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. Base64

Switch between:

- ASCII text
- Unicode text
- raw bytes

String input is converted to UTF-8 before encoding.

The stage uses the real APIs:

```ts
Encoding.encodeBase64(input)
Encoding.decodeBase64(encoded)
Encoding.decodeBase64String(encoded)
```

and exposes:

```text
input
↓ UTF-8 / raw bytes
bytes
↓ encodeBase64
padded RFC4648 text
↓ decode
bytes / UTF-8 text
```

Standard Base64 uses `=` padding.

The decoder strips carriage-return / line-feed characters before validating the
input.

### 2. Base64Url

Shows standard and URL-safe output side by side.

For example:

```text
Base64    aGVsbG8/
Base64Url aGVsbG8_
```

Base64Url encoding:

- changes `+` to `-`
- changes `/` to `_`
- removes `=` padding

The decoder accepts valid padded and unpadded Base64Url forms.

APIs:

```ts
Encoding.encodeBase64Url
Encoding.decodeBase64Url
Encoding.decodeBase64UrlString
```

### 3. Hex

Shows string and raw-byte round trips through lowercase hex:

```ts
Encoding.encodeHex("hello")
// "68656c6c6f"

Encoding.decodeHex(...)
Encoding.decodeHexString(...)
```

It also has a `randomHex rules` view.

`randomHex(length)` is unusual enough to call out explicitly:

- it uses `Math.random()`
- it is not cryptographically secure
- generation happens in 8-character words
- lengths are coerced with `length >>> 3`, effectively rounding ordinary
  non-negative values down to a multiple of 8

The demo checks only the generated output length, not random content, so the
teaching UI remains stable.

For security-sensitive random hex:

```text
Crypto.Crypto.randomBytes
        ↓
Encoding.encodeHex
```

is the appropriate model.

### 4. Errors

Malformed examples cover:

- standard Base64 with invalid length
- misplaced Base64 `=`
- standard `+` in Base64Url input
- odd-length hex
- invalid hex characters

All six public decoders are safe:

```ts
Result.Result<A, Encoding.EncodingError>
```

so malformed input becomes `Result.Failure` rather than being thrown.

`EncodingError` contains:

```ts
_tag: "EncodingError"
kind: "Decode" | "Encode"
module: string
input: unknown
message: string
```

and also carries:

```ts
Encoding.EncodingErrorTypeId
// "~effect/Encoding/EncodingError"
```

The public guard:

```ts
Encoding.isEncodingError(value)
```

checks that marker.

## Current public surface

### Decode

- `decodeBase64`
- `decodeBase64String`
- `decodeBase64Url`
- `decodeBase64UrlString`
- `decodeHex`
- `decodeHexString`

### Encode

- `encodeBase64`
- `encodeBase64Url`
- `encodeHex`
- `randomHex`

### Error support

- `EncodingError`
- `isEncodingError`
- `EncodingErrorTypeId` value
- `EncodingErrorTypeId` type

The current encoding helpers return strings directly. Structured failures are
observable on the decode side.

## Integration expectation

Follow the same child-feature integration pattern as the neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `EncodingDemo.Message` to the parent Message union,
3. initialize `EncodingDemo.init`,
4. delegate child messages to `EncodingDemo.update`,
5. render `EncodingDemo.view(...)` from the Encoding route.

This artifact intentionally performs none of those edits.
