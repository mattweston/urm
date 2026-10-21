# Console

## Mental model

Effect's `Console` module wraps console operations in `Effect` and exposes the
active console as the `Console.Console` default service.

That means application code can describe console work without importing or
calling a particular global console implementation directly. The normal runtime
uses the host console automatically, while tests or alternate environments can
replace it with `Effect.provideService`.

This visual demo makes that service boundary visible:

1. the Foldkit view dispatches `ClickedRunConsoleDemo`
2. `update` returns the `RunConsoleDemo` Command
3. the Command creates a capture implementation of `Console.Console`
4. the selected Effect program runs with that implementation provided
5. the captured calls return in `CompletedRunConsoleDemo`
6. the Model stores the entries and the view renders them as a terminal

The view does not perform console side effects and `update` stays pure.

## The four sections

### 1. Levels

The familiar logging methods are Effects:

```ts
const program = Effect.gen(function* () {
    yield* Console.log("request started", { id: 42 })
    yield* Console.info("cache", "hit")
    yield* Console.debug("flags", { beta: true })
    yield* Console.warn("slow response", 640)
    yield* Console.error("retry exhausted")
    yield* Console.assert(false, "user must be active")
})
```

`Console.assert` only forwards to the console when the condition is false.
Filtering or styling of `debug`, `info`, `warn`, and `error` belongs to the
active console implementation.

### 2. Inspect

Structured inspection helpers use the same service:

```ts
const program = Effect.gen(function* () {
    yield* Console.dir({
        user: "Ada",
        permissions: ["read", "write"]
    })

    yield* Console.table(users, ["name", "role"])
    yield* Console.dirxml('<user id="42">Ada</user>')
})
```

`Console.table` accepts an optional list of properties. The concrete console is
responsible for how the data is formatted.

### 3. Counters

Counters are intentionally state owned by the console implementation rather
than by your application Model:

```ts
const program = Effect.gen(function* () {
    yield* Console.count("cache-hit")
    yield* Console.count("cache-hit")
    yield* Console.count("cache-miss")
    yield* Console.countReset("cache-hit")
    yield* Console.count("cache-hit")
})
```

That keeps diagnostic state out of domain state while still making the behavior
replaceable in tests.

### 4. Scope

`Console.group` and `Console.time` are scoped resources. They register cleanup
so the matching `groupEnd` and `timeEnd` happen when the scope closes:

```ts
const program = Effect.scoped(
    Effect.gen(function* () {
        yield* Console.group({ label: "load profile" })
        yield* Console.time("profile")
        yield* Console.log("fetch user")
        yield* Console.timeLog("profile", "cache miss")

        yield* Console.withGroup(
            Console.log("check permissions"),
            { label: "permissions", collapsed: true }
        )

        yield* Console.info("profile ready")
    })
)
```

The cleanup is tied to Effect scope finalization rather than to manually paired
imperative calls. `Console.withGroup` and `Console.withTime` are convenience
wrappers for running an Effect inside those lifecycles.

## Overriding the default service

`Console` is one of Effect's default services, so normal programs do not need to
provide anything explicitly:

```ts
const program = Console.log("hello")
```

For tests, demos, or alternate hosts, replace the active implementation for one
Effect:

```ts
const capture: Console.Console = makeCaptureConsole()

const captured = program.pipe(
    Effect.provideService(Console.Console, capture)
)
```

The demo uses that pattern so every console call becomes visible data instead of
writing into the browser developer console.

## API families covered by the visual demo

### Direct accessors

```ts
Console.assert
Console.clear
Console.count
Console.countReset
Console.debug
Console.dir
Console.dirxml
Console.error
Console.info
Console.log
Console.table
Console.timeLog
Console.trace
Console.warn
```

### Scoped helpers

```ts
Console.group
Console.time
Console.withGroup
Console.withTime
```

### Service access

```ts
Console.Console
Console.consoleWith
```

`Console.clear`, `Console.trace`, and `Console.consoleWith` are implemented or
discussed by the demo but are not given their own stage because the four visual
sections focus on the concepts that change how the API is understood: Effects,
service replacement, console-owned state, and scoped cleanup.

## Files

Place these three files together in the learn feature directory, for example:

```text
packages/features/src/learn/_console/
├── console.ts
├── console.view.ts
└── README.md
```

`console.ts` contains the Schema-defined Model, Message union, pure update,
Command, capture console, and real Effect programs.

`console.view.ts` is the pure Foldkit view. It accepts a `to_parent_message`
function so a parent feature can lift the demo's Messages without coupling the
demo to a particular parent Message type.

## Reference versions

The implementation follows the vendored Foldkit conventions in
`.context/foldkit` and uses the Effect 4 `Console` APIs documented at:

```text
https://effect.website/docs/v4/api/effect/Console
```

The vendored Foldkit snapshot currently pins Effect `4.0.0-rc.111`; the Console
operations used here are also present in the current Effect v4 API reference.
