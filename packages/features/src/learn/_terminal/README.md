# Terminal

A standalone Foldkit lesson for Effect's `Terminal` module.

- Lesson stages: **Service → Read → Display → Quit**
- Workspace target: `effect@4.0.0-rc.112`
- Live reference checked: `4.0.0-rc.117`
- Live docs: **7 exports**
- Source: **6 unique top-level names** because `Terminal` is documented once as the service value and once as the interface
- Foldkit messages use direct field maps, e.g. `SelectedTerminalStage: { stage: Stage }`
- No repository or git files are modified by this artifact

## Mental model

`Terminal` is a Context service for **interactive terminal capabilities**. It deliberately sits above raw process handles:

- `columns` / `rows` report terminal dimensions as `Effect<number>` values.
- `readLine` returns one completed line and can fail with `QuitError`.
- `readInput` acquires a scoped `Dequeue<UserInput, Cause.Done>` for lower-level key events.
- `display(text)` writes terminal-oriented text and can fail with `PlatformError`.
- `Terminal.make` builds a custom service implementation.

This is not the same boundary as `Stdio`. `Stdio` exposes argv, byte-oriented stdin, and stdout/stderr sinks; `Terminal` exposes interactive terminal concepts such as rows, columns, parsed keys, lines, and user cancellation.

## Public surface

The live API reference reports seven entries because the `Terminal` interface and the `Terminal` service value are listed separately.

### Constructor

- `make`

### Error

- `QuitError`

### Guard

- `isQuitError`

### Models

- `Key`
- `UserInput`

### Services

- `Terminal` — service value / Context key
- `Terminal` — interface

The unique exported source names are therefore:

```text
Terminal
Key
UserInput
QuitError
isQuitError
make
```

## 1. Service

### Contract

The service interface is approximately:

```ts
interface Terminal {
  readonly columns: Effect.Effect<number>
  readonly rows: Effect.Effect<number>
  readonly readInput: Effect.Effect<
    Queue.Dequeue<UserInput, Cause.Done>,
    never,
    Scope.Scope
  >
  readonly readLine: Effect.Effect<string, QuitError>
  readonly display: (text: string) => Effect.Effect<void, PlatformError>
}
```

The exported `Terminal.Terminal` value is the Context service used to resolve or provide that interface.

### `make`

`Terminal.make` accepts the concrete capabilities and attaches the module's private service marker:

```ts
const terminal = Terminal.make({
  columns: Effect.succeed(120),
  rows: Effect.succeed(40),
  readInput,
  readLine,
  display
})
```

Use this for platform adapters, custom runtimes, or deterministic tests.

### Dimensions

`columns` and `rows` are Effects rather than plain constructor-time numbers. Application code can therefore ask the platform implementation for the current dimensions when it needs them.

```ts
const dimensions = Effect.gen(function*() {
  const terminal = yield* Effect.service(Terminal.Terminal)
  return {
    columns: yield* terminal.columns,
    rows: yield* terminal.rows
  }
})
```

## 2. Read

### `readLine`

`readLine` is the high-level input operation:

```ts
Effect.Effect<string, Terminal.QuitError>
```

It returns one completed line. User cancellation is represented in the typed error channel rather than hidden as a defect or mixed with platform write failures.

### `readInput`

`readInput` exposes lower-level events:

```ts
Effect.Effect<
  Queue.Dequeue<Terminal.UserInput, Cause.Done>,
  never,
  Scope.Scope
>
```

The `Scope` requirement is important. The returned dequeue is a live input resource and should stay inside the scope that acquired it.

### `UserInput`

A low-level event has two views of the same key press:

```ts
interface UserInput {
  readonly input: Option.Option<string>
  readonly key: Key
}
```

`input` is optional because not every terminal key maps to a printable character.

### `Key`

```ts
interface Key {
  readonly name: string
  readonly ctrl: boolean
  readonly meta: boolean
  readonly shift: boolean
}
```

Use the parsed metadata for navigation keys, control shortcuts, and modifier-aware input instead of assuming every event is text.

## 3. Display

`display` is deliberately small:

```ts
(text: string) => Effect.Effect<void, PlatformError>
```

This keeps platform I/O failure typed. A terminal adapter can implement the write however its runtime requires while application logic remains platform-independent.

Choose `Stdio.stdout` / `Stdio.stderr` instead when the application actually needs raw stream/sink semantics or byte-oriented output.

## 4. Quit

### `QuitError`

`QuitError` is a typed user-cancellation value, conventionally used when an interactive read is abandoned via Ctrl+C.

```ts
const error = new Terminal.QuitError()
```

It is distinct from `PlatformError`: one means the user chose to cancel; the other describes an I/O/platform failure.

### `isQuitError`

Use the public guard for unknown values:

```ts
if (Terminal.isQuitError(error)) {
  // error is Terminal.QuitError
}
```

That is particularly important across the rc.112 → rc.117 transition because the module's private runtime identifiers changed.

## rc.112 → rc.117 compatibility note

The public six source declarations remain the same. The meaningful source delta is the hidden identity strings:

| Concern                 | rc.112                               | rc.117                       |
| ----------------------- | ------------------------------------ | ---------------------------- |
| Terminal service marker | `~effect/platform/Terminal`          | `~effect/Terminal`           |
| Context service key     | `effect/platform/Terminal`           | `effect/Terminal`            |
| QuitError marker        | `effect/platform/Terminal/QuitError` | `~effect/Terminal/QuitError` |

Do not depend on those strings directly. Use:

- `Terminal.Terminal` to access/provide the service
- `Terminal.make` to construct implementations
- `Terminal.isQuitError` to recognize quit errors

That keeps application code compatible across this change.

## Example artifacts in `terminal.ts`

- `demo_terminal` — custom implementation built with `Terminal.make`
- `read_dimensions` — resolves the service and reads columns / rows
- `read_line` — high-level line input
- `read_input_queue` — low-level scoped input dequeue
- `display_hello` — typed terminal output
- `ctrl_c_key` / `ctrl_c_input` — low-level key metadata example
- `quit_error` / `quit_is_recognized` — public error/guard pair
- `recover_quit` — recover cancellation while preserving unrelated errors

## Foldkit architecture

The Foldkit `Model` contains only serializable lesson selections:

```ts
{
  stage,
  serviceCase,
  readCase,
  displayCase,
  quitCase
}
```

Live `Terminal`, `Effect`, queue, and error values stay at module scope. The UI never stores runtime terminal resources in application state.

Messages are declared using Foldkit's field-map form:

```ts
const Message = defineMessageUnion({
  SelectedTerminalStage: { stage: Stage },
  SelectedTerminalServiceCase: { serviceCase: ServiceCase },
  SelectedTerminalReadCase: { readCase: ReadCase },
  SelectedTerminalDisplayCase: { displayCase: DisplayCase },
  SelectedTerminalQuitCase: { quitCase: QuitCase }
})
```

## Validation

The standalone no-resolve check is:

```sh
tsc --noEmit --noResolve \
  --allowImportingTsExtensions \
  --target ES2022 \
  --module ESNext \
  --moduleResolution bundler \
  --skipLibCheck \
  --noImplicitAny \
  terminal.ts terminal.view.ts
```

Expected diagnostics are only unresolved imports for:

- `effect`
- `foldkit`
- `foldkit/message`
- `foldkit/struct`
- `@foldkit/ui`
- `foldkit/html`

The generated TypeScript contains no explicit `any` annotations.
