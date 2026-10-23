# Building Security Services with Effect-TS, Rust and Zig

A sketch of an architecture in which **Effect-TS** is the control plane and **Rust** and **Zig** add native capabilities behind typed service boundaries.

> **Version note:** Effect 4.0 merges the platform and RPC packages into `effect` itself, with HTTP, RPC and similar modules under `effect/unstable/*` import paths. The snippets below use v3-style names (`Context.Tag`, `Layer.scoped`, `@effect/platform`). The concepts carry over directly; check the official migration guide for renamed constructors and import paths.

---

## 1. Overall shape

```
                 ┌──────────────── Effect-TS (control plane) ────────────────┐
  HTTP / RPC ──▶ │ Schema-validated input → Policy → Services → Audit/Tracing │
                 └──────┬──────────────────┬───────────────────┬─────────────┘
                        │ in-process        │ network            │ in-process
                 Rust via napi-rs     Rust sidecar (axum/     Zig via C ABI
                 (argon2, cert        tonic): scanners,       (bun:ffi / koffi)
                 parsing, regex)      untrusted parsers       or WASM
                                                                │
                                                     nanoui desktop console
                                                     (typed Zig→TS IPC)
```

**Core rule:** every native piece sits behind an Effect service (a `Context.Tag`) with typed errors. The rest of the application never knows whether an implementation is Rust, Zig, a sidecar or a test double.

---

## 2. What Effect gives you for security work

- **Typed errors.** `InvalidToken`, `Forbidden` and `SignerUnavailable` live in the type signature. You can't accidentally turn an infrastructure failure into "access granted", and fail-closed behaviour can be checked by the type system.
- **`Redacted` and `Config.redacted`** for secrets. They don't leak into logs or `toString`.
- **`Schema`** at every boundary: HTTP input, sidecar responses and FFI results. Treat native output as untrusted too.
- **`Scope` / `acquireRelease`** for key material, native library handles and connections. Cleanup (zeroizing, closing) is guaranteed even on interruption.
- **Timeouts, retries and concurrency limits** as combinators, which matters when a scanner or HSM hangs.
- **Layers** to swap a real HSM for an in-memory key store in tests, or Rust for Zig, without touching business logic.
- **Built-in spans and structured logging** that double as an audit trail.

---

## 3. Define the services first

```ts
import { Context, Data, Effect, Redacted, Schema } from "effect"

// Errors
export class InvalidSignature extends Data.TaggedError("InvalidSignature")<{}> {}
export class NativeFailure extends Data.TaggedError("NativeFailure")<{ cause: unknown }> {}
export class ScannerUnavailable extends Data.TaggedError("ScannerUnavailable")<{ cause: unknown }> {}

// Shared schemas
export const ScanResult = Schema.Struct({
  clean: Schema.Boolean,
  hits: Schema.Array(Schema.String),
})
export type ScanResult = typeof ScanResult.Type

// Services
export class PasswordHasher extends Context.Tag("PasswordHasher")<PasswordHasher, {
  hash: (pw: Redacted.Redacted<Uint8Array>) => Effect.Effect<string, NativeFailure>
  verify: (pw: Redacted.Redacted<Uint8Array>, hash: string) => Effect.Effect<boolean, NativeFailure>
}>() {}

export class Ed25519 extends Context.Tag("Ed25519")<Ed25519, {
  verify: (msg: Uint8Array, sig: Uint8Array, pk: Uint8Array) => Effect.Effect<boolean>
}>() {}

export class Scanner extends Context.Tag("Scanner")<Scanner, {
  scan: (bytes: Uint8Array) => Effect.Effect<ScanResult, ScannerUnavailable>
}>() {}
```

Business logic depends only on these interfaces:

```ts
export const verifyUpload = (file: Uint8Array, sig: Uint8Array, pk: Uint8Array) =>
  Effect.gen(function* () {
    const ok = yield* (yield* Ed25519).verify(file, sig, pk)
    if (!ok) return yield* new InvalidSignature()

    const result = yield* (yield* Scanner).scan(file).pipe(Effect.timeout("10 seconds"))
    yield* Effect.annotateCurrentSpan("scan.hits", result.hits.length)
    return result
  }).pipe(Effect.withSpan("verifyUpload")) // audit and trace for free
```

---

## 4. Rust: three ways in, chosen by trust and isolation

### 4a. In-process via napi-rs

Use this for fast, **trusted**, CPU-bound primitives: argon2, cert chain validation with `rustls-webpki`, secret-scanning regexes. Slow work runs on libuv's thread pool, not the JS thread.

```rust
use argon2::{password_hash::{rand_core::OsRng, SaltString}, Argon2, PasswordHasher};
use napi::{bindgen_prelude::*, Env, Task};
use napi_derive::napi;
use zeroize::Zeroize;

pub struct HashTask { pw: Vec<u8> }

impl Task for HashTask {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> Result<String> {
        let salt = SaltString::generate(&mut OsRng);
        let out = Argon2::default()
            .hash_password(&self.pw, &salt)
            .map(|h| h.to_string())
            .map_err(|e| Error::from_reason(e.to_string()));
        self.pw.zeroize();
        out
    }

    fn resolve(&mut self, _: Env, out: String) -> Result<String> { Ok(out) }
}

#[napi]
pub fn hash_password(pw: Buffer) -> AsyncTask<HashTask> {
    AsyncTask::new(HashTask { pw: pw.to_vec() })
}
```

Wrap it as a Layer:

```ts
import { Effect, Layer, Redacted } from "effect"
import * as native from "@acme/sec-native" // the napi-rs package

export const PasswordHasherRust = Layer.succeed(PasswordHasher, {
  hash: (pw) => Effect.tryPromise({
    try: () => native.hashPassword(Buffer.from(Redacted.value(pw))),
    catch: (cause) => new NativeFailure({ cause }),
  }),
  verify: (pw, hash) => Effect.tryPromise({
    try: () => native.verifyPassword(Buffer.from(Redacted.value(pw)), hash),
    catch: (cause) => new NativeFailure({ cause }),
  }),
})
```

### 4b. Sidecar service (axum or tonic)

Use this for anything that parses **hostile input**: file scanning with YARA-X, archive or PDF inspection, binary analysis. A crash or memory bug takes down a sandboxed process (seccomp, no network, read-only filesystem), not your auth server.

On the Effect side it's an HTTP client with a schema:

```ts
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { Config, Effect, Layer } from "effect"

export const ScannerSidecar = Layer.effect(Scanner, Effect.gen(function* () {
  const baseUrl = yield* Config.string("SCANNER_URL")
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.filterStatusOk,
    HttpClient.retryTransient({ times: 2 }),
  )

  return {
    scan: (bytes) => HttpClientRequest.post(`${baseUrl}/scan`).pipe(
      HttpClientRequest.bodyUint8Array(bytes),
      client.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(ScanResult)), // validate the reply too
      Effect.timeout("8 seconds"),
      Effect.mapError((cause) => new ScannerUnavailable({ cause })),
    ),
  }
}))
```

On the Rust side, keep the handler thin: accept bytes, run the scan in `spawn_blocking`, return a small JSON result that matches `ScanResult`. Build with `panic = "abort"` and run it under a restrictive sandbox.

### 4c. WASM via wasm-bindgen

Use this when you want sandboxing without a separate process, such as third-party detection rules or user-supplied policies, or when the same code must also run in a browser or edge worker.

---

## 5. Zig: tiny primitives over a C ABI

Zig fits well here: `std.crypto` is solid (Ed25519, X25519, ChaCha20-Poly1305, BLAKE3, Argon2), and it produces very small, dependency-free libraries. Export a **narrow** C ABI:

```zig
const std = @import("std");
const Ed25519 = std.crypto.sign.Ed25519;

export fn sec_verify_ed25519(
    msg: [*]const u8,
    len: usize,
    sig: *const [64]u8,
    pk: *const [32]u8,
) c_int {
    const key = Ed25519.PublicKey.fromBytes(pk.*) catch return -1;
    const s = Ed25519.Signature.fromBytes(sig.*);
    s.verify(msg[0..len], key) catch return 0;
    return 1;
}

export fn sec_blake3(in: [*]const u8, len: usize, out: *[32]u8) void {
    std.crypto.hash.Blake3.hash(in[0..len], out, .{});
}
```

Build it as a shared library with `-dynamic -O ReleaseSafe` (keep the safety checks on), or as `wasm32-freestanding` for a portable build.

Load it as a **scoped** Layer, so the handle is closed when the runtime shuts down:

```ts
import { dlopen, FFIType } from "bun:ffi" // Node: koffi, or load the WASM build
import { Effect, Layer } from "effect"

export const Ed25519Zig = Layer.scoped(Ed25519, Effect.gen(function* () {
  const lib = yield* Effect.acquireRelease(
    Effect.sync(() => dlopen("./libsec.so", {
      sec_verify_ed25519: {
        args: [FFIType.ptr, FFIType.u64, FFIType.ptr, FFIType.ptr],
        returns: FFIType.i32,
      },
    })),
    (lib) => Effect.sync(() => lib.close()),
  )

  return {
    verify: (msg, sig, pk) => Effect.sync(() => {
      // check lengths before crossing the ABI
      if (sig.length !== 64 || pk.length !== 32) return false
      return lib.symbols.sec_verify_ed25519(msg, msg.length, sig, pk) === 1
    }),
  }
}))
```

### Where nanoui fits

[nanoui](https://github.com/justrach/nanoui) builds small native desktop apps in Zig and, in webview mode, generates a typed TypeScript client from your Zig types. That suits an **operator or analyst console**: alert triage, approve or deny prompts, a local agent's tray UI. Wrap its generated client in an Effect service like any other boundary.

---

## 6. Rules at the native boundary

- **Keep the FFI surface tiny.** Bytes in, bytes or a status code out. No callbacks, and no native-owned memory that JS has to free.
- **Validate lengths and shapes on the TS side before calling in,** and decode results with `Schema` afterwards.
- **Secrets stay in `Uint8Array`, never JS strings,** wrapped in `Redacted` and zeroized natively. Strings are immutable and may be interned, so they can't be reliably wiped.
- **Map every native failure to a tagged error.** In Rust, catch panics (`catch_unwind`, or `panic = "abort"` for sidecars) so they never cross the ABI.
- **Fuzz each boundary.** `cargo fuzz` for Rust; Zig's built-in fuzzing for the C ABI.
- **Run differential tests.** If Ed25519 exists in both Rust and Zig, property-test that both Layers agree on random and malformed inputs.
- **Lock down the supply chain:** `cargo deny` and `cargo audit`, pinned Zig dependencies in `build.zig.zon`, reproducible builds for native artifacts.

---

## 7. Where each piece goes

| Concern | Put it in |
|---|---|
| AuthN/AuthZ policy, rate limiting, audit, orchestration | Effect-TS |
| Password hashing, cert validation, heavy regex | Rust (napi-rs) |
| Parsing hostile files, malware scanning | Rust sidecar, sandboxed |
| Plugin or rule sandboxing, edge portability | Rust → WASM |
| Small hash, sign and verify primitives, minimal binaries | Zig (C ABI / WASM) |
| Local operator or agent UI | Zig + nanoui |

---

## 8. Composition and testing

Production and test wiring differ only in which Layers you provide:

```ts
// Production
const Live = Layer.mergeAll(PasswordHasherRust, Ed25519Zig, ScannerSidecar)

// Tests: in-memory fakes, no native code needed
const Test = Layer.mergeAll(
  Layer.succeed(PasswordHasher, {
    hash: () => Effect.succeed("fake-hash"),
    verify: (_, h) => Effect.succeed(h === "fake-hash"),
  }),
  Layer.succeed(Ed25519, { verify: () => Effect.succeed(true) }),
  Layer.succeed(Scanner, { scan: () => Effect.succeed({ clean: true, hits: [] }) }),
)

verifyUpload(file, sig, pk).pipe(Effect.provide(Live))
```

---

## Suggested repo layout

```
security-services/
├── apps/
│   ├── api/              # Effect-TS service (HTTP/RPC, policy, audit)
│   └── console/          # Zig + nanoui operator UI (optional)
├── native/
│   ├── sec-native/       # Rust napi-rs crate (in-process primitives)
│   ├── scanner/          # Rust axum sidecar (sandboxed, hostile input)
│   └── zig-sec/          # Zig C-ABI / WASM primitives
├── packages/
│   └── domain/           # Service tags, errors, Schemas (shared)
└── fuzz/                 # cargo-fuzz targets, Zig fuzz tests, differential tests
```

---

## References

- [nanoui on GitHub](https://github.com/justrach/nanoui)
- [Effect v4 documentation](https://effect.website/docs/v4/)
- [Effect 4.0 RC overview](https://byteiota.com/effect-ts-4-rc-migrate-now/)
