# Config

Based on:

- <https://effect.website/docs/v4/api/effect/Config>

## Mental model

`Config<T>` is a typed **recipe** for obtaining configuration from a
`ConfigProvider`.

In Effect 4:

```ts
interface Config<T>
  extends Effect.Effect<
    T,
    Config.ConfigError
  > {
  readonly parse:
    (
      provider:
        ConfigProvider.ConfigProvider
    ) =>
      Effect.Effect<
        T,
        Config.ConfigError
      >
}
```

So a config can be used in two ways:

```ts
config.parse(provider)
```

with an explicit provider, or:

```ts
const value =
  yield* config
```

when the current `ConfigProvider` is installed in Effect context.

The core architecture is:

```text
provider input
  ↓
Config recipe
  ↓
Schema decode / validation
  ↓
typed application value
```

## 1. Schema-backed descriptors

The general constructor is:

```ts
Config.schema(
  schema,
  path?
)
```

Example:

```ts
const DatabaseConfig =
  Config.schema(
    Schema.Struct({
      host:
        Schema.NonEmptyString,

      port:
        Schema.Int,

      replicas:
        Schema.Array(
          Schema.NonEmptyString
        )
    }),
    "database"
  )
```

Given:

```ts
ConfigProvider.fromUnknown({
  database: {
    host:
      "db.internal",
    port:
      5432,
    replicas: [
      "db-1",
      "db-2"
    ]
  }
})
```

the parsed result has the Schema Type:

```ts
{
  host: string
  port: number
  replicas:
    ReadonlyArray<string>
}
```

Config converts provider representation to the schema's configuration string
tree and then decodes it.

## Convenience constructors

The module exposes shortcuts for common schemas:

```ts
Config.String
Config.NonEmptyString

Config.Number
Config.Finite
Config.Int

Config.Boolean

Config.Literal
Config.Literals

Config.Duration
Config.ByteSize
Config.Port
Config.LogLevel

Config.Redacted
Config.URL
Config.Date
```

These are config **descriptors**, not already-loaded values.

### Boolean strings

`Config.Boolean` accepts common config spellings:

```text
true / false
yes / no
on / off
1 / 0
y / n
```

### Port

```ts
Config.Port("PORT")
```

accepts integers:

```text
1 through 65535
```

### Duration

```ts
Config.Duration(
  "TIMEOUT"
)
```

uses Effect's human-readable duration parser:

```text
"10 seconds"
"500 millis"
"Infinity"
```

### ByteSize

```ts
Config.ByteSize(
  "UPLOAD_LIMIT"
)
```

accepts exact human-readable byte sizes such as:

```text
"10 MB"
"1.5 MiB"
```

### Redacted

```ts
Config.Redacted(
  "API_KEY"
)
```

keeps secrets inside Effect's `Redacted` wrapper so ordinary string/log output
does not reveal them.

# 2. `Config.all`

Combine configs while preserving shape:

```ts
const AppConfig =
  Config.all({
    host:
      Config.String("host"),

    port:
      Config.Port("port"),

    debug:
      Config.Boolean(
        "debug"
      )
  })
```

Result type:

```ts
Config<{
  host: string
  port: number
  debug: boolean
}>
```

`all` also accepts tuples and general iterables.

## Group absence semantics

This is more nuanced than a simple `Promise.all`.

A combined group is considered wholly absent only when:

```text
at least one child cannot resolve
AND
none of the other children read provider input
```

Once one child sees provider input, a missing sibling makes the group
**partially supplied**, and parsing fails.

This prevents:

```text
one field explicitly supplied
+
another required field missing
```

from being mistaken for:

```text
the entire optional group was absent
```

Child defaults do not count as provider input.

# 3. `nested`

Scope a config under a path:

```ts
const host =
  Config.String(
    "host"
  ).pipe(
    Config.nested(
      "database"
    )
  )
```

With `fromUnknown`:

```ts
{
  database: {
    host: "localhost"
  }
}
```

With `fromEnv` the same nested path becomes an underscore-separated key:

```text
database_host
```

Multiple `nested` calls compose.

# 4. Default vs Option vs fallback

This is the most important practical distinction in the current v4 API.

## `withDefault`

```ts
Config.Port(
  "PORT"
).pipe(
  Config.withDefault(
    3000
  )
)
```

Behavior:

```text
PORT missing
  → 3000

PORT="8080"
  → 8080

PORT="not-a-port"
  → ConfigError
```

`withDefault` only handles **semantic absence**.

It does not silently mask malformed supplied input.

## `option`

```ts
Config.option(
  Config.Port(
    "PORT"
  )
)
```

Behavior:

```text
PORT missing
  → Option.none()

PORT="8080"
  → Option.some(8080)

PORT="invalid"
  → ConfigError
```

Again: absence only.

Validation failures and partially supplied groups propagate.

## `orElse`

```ts
Config.String(
  "PRIMARY_HOST"
).pipe(
  Config.orElse(
    () =>
      Config.String(
        "SECONDARY_HOST"
      )
  )
)
```

`orElse` is broader.

It handles:

```text
semantic absence
+
all ConfigError failures
```

including invalid primary input.

Use it when malformed primary config really should trigger an alternate recipe.

Do not use it as a defaulting shortcut when invalid input should stop startup.

# 5. Mapping

Pure transformation:

```ts
Config.String(
  "HOST"
).pipe(
  Config.map(
    value =>
      value
        .trim()
        .toLowerCase()
  )
)
```

Effectful transformation:

```ts
Config.mapEffect(...)
```

is available when your transformation itself returns:

```ts
Effect<
  B,
  ConfigError
>
```

The mapping preserves provider-input evidence so outer absence/default
composition remains correct.

# 6. `Config.Array`

```ts
Config.Array(
  Schema.String,
  "EXPORTERS"
)
```

accepts both:

```ts
{
  EXPORTERS: [
    "otlp",
    "console"
  ]
}
```

and a flat value such as:

```text
EXPORTERS="otlp,console"
```

Default separator:

```text
,
```

Custom:

```ts
Config.Array(
  Schema.String,
  "SEARCH_PATHS",
  {
    separator: ":"
  }
)
```

This is useful for environment variables while keeping application code typed
as a normal array.

# 7. `Config.Record`

```ts
Config.Record(
  Schema.String,
  Schema.String,
  "OTEL_RESOURCE_ATTRIBUTES"
)
```

accepts structural input:

```ts
{
  OTEL_RESOURCE_ATTRIBUTES: {
    "service.name":
      "demo",

    "service.version":
      "1.0.0"
  }
}
```

or flat:

```text
service.name=demo,service.version=1.0.0
```

Defaults:

```text
entry separator     ,
key/value separator =
```

Both are configurable.

# 8. Providers

The recipe is separate from where configuration comes from.

Current `ConfigProvider` includes sources such as:

```ts
ConfigProvider.fromUnknown
ConfigProvider.fromEnv
ConfigProvider.fromEnvRecord
ConfigProvider.fromDotEnvContents
ConfigProvider.fromDotEnv
ConfigProvider.fromDir
```

and provider combinators / Layers.

## `fromUnknown`

Useful for:

- tests
- already-structured runtime config
- host-supplied objects
- deterministic examples

```ts
const provider =
  ConfigProvider.fromUnknown({
    host:
      "localhost",
    port:
      "8080"
  })
```

## `fromEnv`

Adapts a string environment record:

```ts
const provider =
  ConfigProvider.fromEnv({
    env: {
      HOST:
        "localhost",
      PORT:
        "8080"
    }
  })
```

The Config Schema layer is responsible for converting those strings to typed
values.

# 9. Explicit parse vs Effect context

Explicit:

```ts
const effect =
  AppConfig.parse(
    provider
  )
```

Context:

```ts
const program =
  Effect.gen(function* () {
    const config =
      yield* AppConfig

    return config
  }).pipe(
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      provider
    )
  )
```

This works because `Config<T>` extends:

```ts
Effect<
  T,
  ConfigError
>
```

The Effect error channel is typed.

# 10. `ConfigError`

In v4:

```ts
class ConfigError {
  readonly cause:
    SourceError
    |
    Schema.SchemaError
}
```

Two broad categories:

## SourceError

The provider itself could not read/load its source.

Examples could include failures in file/directory-backed providers.

## SchemaError

Input was found but did not satisfy the config Schema:

```text
bad port
invalid URL
wrong type
missing required sibling
invalid enum/literal
```

This distinction is why Config can report startup failures clearly rather than
turning all configuration problems into missing strings.

# 11. `succeed` / `fail`

A constant successful config:

```ts
Config.succeed(
  value
)
```

A config that always fails with a specific source/schema error:

```ts
Config.fail(
  error
)
```

These are particularly useful when building custom fallback recipes.

# 12. `unwrap`

`Config.unwrap` recursively converts a structure containing configs into one
combined Config.

Conceptually:

```ts
Config.unwrap({
  host:
    Config.String("HOST"),

  database: {
    port:
      Config.Port(
        "DB_PORT"
      )
  }
})
```

becomes one config with the same nested output structure.

Use `Config.Wrap<T>` when you want to type reusable inputs accepted by
`unwrap`.

# 13. `isConfig` / `Success`

Runtime guard:

```ts
Config.isConfig(value)
```

Extract parsed success type:

```ts
type Settings =
  Config.Success<
    typeof AppConfig
  >
```

This is useful when the Config recipe itself is the source of truth for the
configuration type.

# Config vs Schema

Schema describes:

```text
how a value is decoded / validated / encoded
```

Config adds:

```text
where to look
provider-path behavior
absence semantics
default/optional semantics
fallback recipes
provider integration
```

In v4, Config is deliberately built heavily on Schema.

A good rule:

```text
data boundary / codec
  → Schema

application startup/runtime configuration recipe
  → Config + ConfigProvider
```

# Config and Foldkit

For Foldkit, application configuration generally belongs at the startup /
Resource boundary rather than inside pure update/view code.

A common shape is:

```text
ConfigProvider
  ↓
Effect reads Config
  ↓
Flags / Resource / runtime startup
  ↓
typed value available to application services
```

Do not read process environment variables directly from Foldkit `update`.

Keep update pure and make configuration an explicit dependency/startup input.

# Real Effect 4 APIs used

The bundle uses:

- `Config.schema`
- `Config.String`
- `Config.NonEmptyString`
- `Config.Port`
- `Config.Boolean`
- `Config.Duration`
- `Config.ByteSize`
- `Config.Literals`
- `Config.all`
- `Config.nested`
- `Config.withDefault`
- `Config.option`
- `Config.orElse`
- `Config.map`
- `Config.Array`
- `Config.Record`
- `Config.Success`
- `ConfigProvider.fromUnknown`
- `ConfigProvider.fromEnv`
- `Config.parse`
- Config as an Effect via `yield*`
- `ConfigProvider.ConfigProvider`
- `ConfigError`

The README additionally covers:

- `Number`
- `Finite`
- `Int`
- `Literal`
- `LogLevel`
- `Redacted`
- `URL`
- `Date`
- `mapEffect`
- `succeed`
- `fail`
- `unwrap`
- `isConfig`
- dotenv/directory providers
