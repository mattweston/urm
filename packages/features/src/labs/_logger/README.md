# Logger

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Logger

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/Logger.ts` source exposes **25 public exports**.

## Public surface

### Models / options

- `Logger`
- `Options`

### Guards

- `isLogger`

### Services / references

- `CurrentLoggers`
- `LogToStderr`

### Mapping

- `map`

### Logging / routing

- `withConsoleLog`
- `withConsoleError`
- `withLeveledConsole`
- `toFile`

### Constructors / built-ins

- `make`
- `defaultLogger`
- `formatSimple`
- `formatLogFmt`
- `formatStructured`
- `formatJson`
- `batched`
- `consolePretty`
- `consolePrettyBrowser`
- `consolePrettyTty`
- `consoleLogFmt`
- `consoleStructured`
- `consoleJson`
- `tracerLogger`

### Layers

- `layer`

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `logger.ts` — custom loggers, output mapping, built-in formatters, batching,
  routing semantics, logger installation, and real capture programs.
- `logger.view.ts` — interactive visual demo.
- `logger-preview.png` — static preview of the default Build stage.

## Intended location

```text
packages/features/src/labs/logger/
├── logger.ts
└── logger.view.ts
```

No parent router/model/message/update files are modified.

## Core model

A Logger has two generic parameters:

```ts
Logger.Logger<
    Message,
    Output
>
```

and one central operation:

```ts
log(
    options:
        Logger.Options<
            Message
        >
): Output
```

That separation is important.

A Logger can be:

```text
pure formatter
    log event → string

structured formatter
    log event → object

side-effecting sink
    log event → void
```

The module intentionally makes these composable.

A useful mental model is:

```text
runtime log event
      ↓
Logger<Message, Output>
      ↓
formatter output
      ↓
routing / batching / file / console
      ↓
installed logger set
```

## 1. Build

### `Logger.Options`

Each runtime log event supplies:

```text
message
logLevel
cause
fiber
date
```

through `Logger.Options<Message>`.

This gives custom loggers access to both the user message and runtime metadata.

The demo defines:

```ts
const text_logger =
    Logger.make<
        unknown,
        string
    >(
        (
            options:
                Logger.Options<
                    unknown
                >
        ): string =>
            `[${options.logLevel.toUpperCase()}] ${
                JSON.stringify(
                    options.message
                )
            }`
    )
```

The Logger returns a string but performs no output itself.

### `make`

```ts
Logger.make(
    logFunction
)
```

creates a Logger directly from its event handler.

The handler may return any output type.

Examples include:

```text
string
structured record
number
void
```

depending on what later composition needs.

### `map`

```ts
Logger.map(
    logger,
    transform
)
```

changes only the Logger's output.

If:

```text
Logger<Message, A>
```

is mapped with:

```text
A → B
```

the result is:

```text
Logger<Message, B>
```

The input event shape remains unchanged.

The demo maps a text logger to uppercase output.

### `isLogger`

```ts
Logger.isLogger(
    value
)
```

checks the module's Logger type marker.

It is a runtime guard, not merely a structural `{ log() {} }` check.

## Real capture example

`capture_program` creates a custom Logger that stores:

```text
level + message
```

for three actual Effect log operations:

```text
Info
Warn
Error
```

and installs it with:

```ts
Logger.layer([
    collector
])
```

This mirrors the documented custom-logger workflow.

## 2. Format

Effect ships formatter loggers whose output can be composed before deciding
where it should go.

### `formatSimple`

```ts
Logger.formatSimple
```

returns a human-readable key/value string containing fields such as:

```text
timestamp
level
fiber
message
cause
spans
annotations
```

when present.

### `formatLogFmt`

```ts
Logger.formatLogFmt
```

returns a compact logfmt-style string.

It uses JSON-style quoting for values where needed and compact formatting for
non-string message values.

### `formatStructured`

```ts
Logger.formatStructured
```

returns a structured record with:

```text
level
fiberId
timestamp
message
cause
annotations
spans
```

This is useful when another sink or serializer needs machine-readable data.

### `formatJson`

```ts
Logger.formatJson
```

maps the structured formatter through Effect's JSON formatter.

The result is a single JSON string representation of the structured record.

### Pretty console loggers

The pretty family writes directly to a console:

```ts
Logger.consolePretty()
Logger.consolePrettyBrowser()
Logger.consolePrettyTty()
```

`consolePretty()` can choose a browser or TTY representation automatically.

The browser and TTY constructors are useful when the runtime environment is
already known.

### Console built-ins

The module also provides direct console sinks for the formatter families:

```ts
Logger.consoleLogFmt
Logger.consoleStructured
Logger.consoleJson
```

Each produces:

```text
void
```

after writing the corresponding formatter output.

### `defaultLogger`

```ts
Logger.defaultLogger
```

is the runtime's built-in default Logger.

Effect's logging guide shows the default output as a readable string containing
timestamp, level, fiber, and message details.

## 3. Route

Formatting and output destination are separate concerns.

### `withConsoleLog`

```ts
Logger.withConsoleLog(
    formatter
)
```

takes any Logger output and sends that output to:

```text
console.log
```

The returned Logger produces `void`.

### `withConsoleError`

The stderr-specific form routes output to:

```text
console.error
```

This is useful when a particular formatter should always write to stderr.

### `withLeveledConsole`

`withLeveledConsole` chooses the Console method from the current log level:

```text
Debug       → console.debug
Info        → console.info
Trace       → console.trace
Warn        → console.warn
Error/Fatal → console.error
other       → console.log
```

So one formatter can preserve level-aware console routing.

## `batched`

```ts
Logger.batched(
    logger,
    {
        window,
        flush
    }
)
```

creates a scoped batching Logger.

The wrapped Logger first produces values of type:

```text
Output
```

Those outputs are buffered.

At the configured window, `flush` receives:

```text
Array<Output>
```

The returned Logger itself produces `void`.

### Scope shutdown

`batched` owns a background process.

When its Scope closes:

1. the background fiber is interrupted,
2. remaining buffered entries are flushed.

The demo includes a real `batched_program` with a one-hour window so the scope
shutdown path flushes the two collected messages.

## `toFile`

```ts
Logger.toFile(
    stringLogger,
    path,
    options
)
```

creates a scoped file Logger.

Its input Logger must produce:

```text
string
```

because those strings are joined into line-oriented file output.

The returned Effect requires:

```text
Scope
FileSystem.FileSystem
```

and may fail with:

```text
PlatformError
```

if opening or writing the file fails.

Optional settings include:

```text
flag
mode
batchWindow
```

`batchWindow` controls how long file output is buffered before writing.

The official platform logging documentation demonstrates `Logger.toFile` with a
platform-specific `FileSystem` layer.

## `tracerLogger`

```ts
Logger.tracerLogger
```

converts Effect log messages into trace span events.

It is part of the default active logger set, so ordinary logging can become
visible inside distributed tracing spans unless the active logger set is
replaced.

## 4. Install

### `Logger.layer`

```ts
Logger.layer([
    loggerA,
    loggerB
])
```

constructs the `CurrentLoggers` service used by the Effect runtime.

The supplied array may contain:

```text
Logger values
Effect values that produce Loggers
```

which allows scoped / effectful loggers such as file loggers to participate in
the same installation API.

### Replace by default

Without options:

```ts
Logger.layer([
    custom
])
```

creates the active set from the supplied loggers.

It does **not** automatically retain the previous set.

This is why examples that replace the normal logger but still want trace events
often explicitly include:

```ts
Logger.tracerLogger
```

in the new array.

### Merge with existing

To extend rather than replace:

```ts
Logger.layer(
    [
        custom
    ],
    {
        mergeWithExisting:
            true
    }
)
```

The current loggers are copied into the new set first, then the supplied loggers
are added.

## `CurrentLoggers`

```ts
Logger.CurrentLoggers
```

is the Context reference that holds the active:

```text
ReadonlySet<Logger<unknown, ...>>
```

for the current fiber context.

The current default set includes:

```text
defaultLogger
tracerLogger
```

before application layers modify it.

## `LogToStderr`

```ts
Logger.LogToStderr
```

is a boolean Context reference.

It defaults to:

```text
false
```

and is used by affected built-in loggers to select stderr instead of their
ordinary output channel.

The source specifically documents it for:

```text
defaultLogger
TTY pretty console logger
```

When enabled, those affected paths call `console.error`.

## Combining several loggers

Logger fan-out is represented by the active logger set rather than a separate
top-level `combine` export.

For example:

```ts
Logger.layer([
    Logger.consolePretty(),
    fileLogger,
    Logger.tracerLogger
])
```

means one Effect log event is delivered to each installed Logger.

This keeps:

```text
formatting
sink selection
fan-out
```

as separate choices.

## Formatters versus console sinks

A useful distinction is:

```text
formatSimple
formatLogFmt
formatStructured
formatJson
```

are reusable Logger values that still return data.

By contrast:

```text
consoleLogFmt
consoleStructured
consoleJson
consolePretty*
```

perform output and return `void`.

That makes the formatter variants better when the same representation must also
be:

```text
batched
written to a file
captured in tests
mapped again
sent to another system
```

## Logger versus Effect.log

`Effect.log*` produces log events.

`Logger` decides what to do when those events are delivered.

Conceptually:

```text
Effect.logInfo(...)
       ↓ creates event
CurrentLoggers
       ↓ fan out
Logger.log(options)
       ↓
formatted / routed output
```

This is why application logging calls can stay the same while the runtime
logging backend changes.

## Type discipline

The generated demo has no explicit `any` annotations.

Every `Logger.make` callback explicitly types `Logger.Options<unknown>`, and
every output mapper, batch flush callback, Message payload, and UI callback that
could lose contextual typing has an explicit type.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect implementation itself uses internal generic `any` types in
some signatures; that is separate from the generated artifact constraint.

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
resolved, so this check catches local syntax and implicit-any problems rather
than replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `LoggerDemo.Message` to the parent Message union,
3. initialize `LoggerDemo.init`,
4. delegate child messages to `LoggerDemo.update`,
5. render `LoggerDemo.view(...)` from the Logger route.

This artifact intentionally performs none of those edits.
