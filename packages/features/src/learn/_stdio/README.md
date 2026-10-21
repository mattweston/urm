# Stdio

Standalone Foldkit teaching demo for `effect/Stdio`.

- Intended repository location: `packages/features/src/learn/_stdio/`
- Repository scaffold remains untouched (`README.md`, `x.ts`, `x.view.ts` are still empty in git).
- Generated artifacts live only in `/mnt/data/stdio/`.
- Workspace Effect version: `4.0.0-rc.112`.
- Live Effect API page checked during generation: `4.0.0-rc.117`.
- The rc.112 and rc.117 `Stdio.ts` sources are byte-identical.

## Teaching shape

The lesson uses four stages:

1. **Service** — understand `Stdio` as one Effect environment service rather than direct process globals.
2. **Write** — send strings or bytes through stdout/stderr `Sink`s.
3. **Read** — consume stdin as a byte `Stream`, and obtain argv / terminal metadata through `Effect`.
4. **Test** — replace real process I/O with deterministic `Layer` wiring via `layerTest`.

The Foldkit `Model` stores only selected stage/case values. Live `Effect`, `Stream`, `Sink`, `Layer`, and `Stdio` values remain in runtime code rather than serializable UI state.

## Public API inventory — 6 documented entries

The live API page reports six entries because `Stdio` and `TypeId` each have both type-level and runtime declarations.

### Constructor

- `make`

### Layer

- `layerTest`

### Services

- `Stdio` service value
- `Stdio` interface

### Type IDs

- `TypeId` runtime constant
- `TypeId` type alias

At source level these correspond to four top-level names: `TypeId`, `Stdio`, `make`, and `layerTest`.

## Core mental model

`Stdio` is a contract around four kinds of process-facing data:

```text
args                 Effect<ReadonlyArray<string>>
stdinIsTerminal      Effect<boolean>
stdoutIsTerminal     Effect<boolean>
stdin                Stream<Uint8Array, PlatformError>
stdout(options?)     Sink<void, string | Uint8Array, never, PlatformError>
stderr(options?)     Sink<void, string | Uint8Array, never, PlatformError>
```

The important design choice is the direction of each abstraction:

- **input** is a `Stream` because data arrives over time;
- **output** is a `Sink` because the program feeds chunks into a consumer;
- **argv / TTY metadata** are `Effect`s because they are runtime observations supplied by the environment.

That gives application code a portable Effect dependency instead of direct reads/writes against ambient process handles.

## Service access

Normal application code asks for the service:

```ts
const program = Effect.gen(function* () {
  const stdio = yield* Stdio.Stdio
  const args = yield* stdio.args
  const stdoutIsTerminal = yield* stdio.stdoutIsTerminal

  return { args, stdoutIsTerminal }
})
```

The `Stdio` module itself defines the contract, tag, construction helper, and test layer. A concrete runtime integration supplies the actual process-bound implementation at the application edge.

## `make`

`Stdio.make` assembles a service value from existing primitives:

```ts
const service = Stdio.make({
  args: Effect.succeed(["--mode", "demo"]),
  stdout: () => Sink.drain,
  stderr: () => Sink.drain,
  stdin: Stream.empty
})
```

It also attaches the `~effect/Stdio` type identifier.

`stdinIsTerminal` and `stdoutIsTerminal` are optional when calling `make`; omitted values default to `Effect.succeed(false)`.

The supplied stream, sinks, and args effect are otherwise reused unchanged.

## Writing to stdout and stderr

`stdout()` and `stderr()` do not imperatively write a value. They return sinks:

```ts
const stdio = yield* Stdio.Stdio

yield* Stream.run(
  Stream.make("hello\n"),
  stdio.stdout()
)
```

The same sink accepts bytes:

```ts
const bytes = new TextEncoder().encode("hello\n")

yield* Stream.run(
  Stream.make(bytes),
  stdio.stdout()
)
```

Both output sinks may fail with `PlatformError`, so output failures stay visible in Effect's typed failure model.

### `endOnDone`

Both output methods accept:

```ts
{ endOnDone?: boolean }
```

This lets the caller separate _this Sink has finished_ from _the concrete underlying output should be ended_.

For example:

```ts
stdio.stdout({ endOnDone: false })
```

is useful when several independent stream runs share one longer-lived output target. The precise mechanics belong to the concrete Stdio implementation; the core module carries the option through the service contract.

## Reading stdin

`stdin` is deliberately byte-oriented:

```ts
const stdio = yield* Stdio.Stdio

const first = yield* Stream.run(
  stdio.stdin,
  Sink.head<Uint8Array>()
)
```

This avoids baking an encoding decision into `Stdio`. Text decoding, framing, line splitting, or binary protocol handling can happen as ordinary downstream Stream transformations.

A stdin failure appears as `PlatformError` in the stream error channel.

## Arguments and terminal detection

Arguments and TTY flags are runtime observations:

```ts
const args = yield* stdio.args
const stdinIsTerminal = yield* stdio.stdinIsTerminal
const stdoutIsTerminal = yield* stdio.stdoutIsTerminal
```

Keeping them as Effects means test or platform implementations can determine them independently of the pure application model.

TTY flags are useful when output behavior should differ for an interactive terminal vs redirected / piped I/O.

## `layerTest`

`Stdio.layerTest` creates a `Layer<Stdio>` from a `Partial<Stdio>`:

```ts
const layer = Stdio.layerTest({
  args: Effect.succeed(["--dry-run", "input.txt"]),
  stdinIsTerminal: Effect.succeed(true)
})
```

Omitted fields receive deterministic defaults:

```text
args               []
stdout             Sink.drain
stderr             Sink.drain
stdin              Stream.empty
stdinIsTerminal    false
stdoutIsTerminal   false
```

The supplied `impl` is spread after those defaults, so any explicitly provided field wins.

That makes tests small: override only the observation or stream/sink behavior that matters to the scenario rather than emulating a complete process runtime.

## `layerTest` vs `make`

Use `make` when you want a concrete `Stdio` **value**:

```text
fields -> Stdio
```

Use `layerTest` when you want test **environment wiring**:

```text
Partial<Stdio> -> Layer<Stdio>
```

The latter is designed to plug directly into an Effect program's dependency graph.

## Type identity

The module exposes both:

```ts
Stdio.TypeId // runtime value: "~effect/Stdio"
type Stdio.TypeId = "~effect/Stdio"
```

and the service implementation carries:

```ts
readonly [TypeId]: TypeId
```

This is Effect service/runtime identity machinery. Application/domain state should not depend on or serialize it.

## Real examples included in `stdio.ts`

### `inspect_stdio_program`

Reads args and both terminal flags through the service.

### `custom_stdio_service`

Builds a deterministic service value with `Stdio.make`.

### `write_stdout_program`

Runs a text stream into `stdout()`.

### `write_stderr_program`

Runs diagnostics into `stderr()`.

### `write_bytes_program`

Shows that output sinks accept `Uint8Array` as well as strings.

### `keep_stdout_open_program`

Uses `endOnDone: false` to separate sink completion from underlying output lifetime.

### `read_stdin_program`

Consumes the first byte chunk from stdin with `Sink.head`.

### `read_args_program`

Reads command-line arguments as an Effect.

### `terminal_flags_program`

Reads both TTY detection Effects.

### `stdio_test_layer` / `test_args_program`

Provides deterministic arguments and terminal flags through `layerTest`.

## Foldkit boundary

The Foldkit model stays intentionally small and serializable:

```ts
Model = {
  stage,
  serviceCase,
  writeCase,
  readCase,
  testCase
}
```

Do not put a live `Stdio`, `Stream`, `Sink`, `Effect`, or `Layer` into model state that may be serialized, replayed, or persisted. Let messages carry plain intent and perform actual I/O in Effect runtime code supplied with the appropriate service.

## Validation

Generated files were checked with:

```sh
tsc --noEmit \
  --noResolve \
  --allowImportingTsExtensions \
  --target ES2022 \
  --module ESNext \
  --moduleResolution bundler \
  --skipLibCheck \
  --noImplicitAny \
  stdio.ts stdio.view.ts
```

The only diagnostics are the expected unresolved workspace imports (`effect`, `foldkit`, `foldkit/message`, `foldkit/struct`, `@foldkit/ui`, `foldkit/html`) caused by validating these standalone artifacts outside the repository dependency graph.

An explicit `any` scan over the generated TypeScript returns no matches.

## References used

- Live Effect v4 `Stdio` API page (`4.0.0-rc.117`, 6 documented exports).
- Workspace vendored `.context/effect/packages/effect/src/Stdio.ts`.
- Upstream `effect@4.0.0-rc.112` and `effect@4.0.0-rc.117` source comparison (byte-identical).
- `.context/foldkit` message / struct conventions and neighboring generated lessons.
