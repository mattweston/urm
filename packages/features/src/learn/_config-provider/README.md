# ConfigProvider

Based on:

- <https://effect.website/docs/v4/api/effect/ConfigProvider>

## Mental model

`ConfigProvider` is the raw source layer underneath Effect `Config`.

It answers:

```text
which raw node exists at this path?
```

while `Config` answers:

```text
how should that raw data decode?
is it optional/defaulted?
what typed value should the app receive?
```

The core provider protocol is:

```ts
interface ConfigProvider {
  readonly load:
    (path: Path) =>
      Effect<Node | undefined, SourceError>

  readonly mapInput:
    (f: (path: Path) => Path) =>
      ConfigProvider
}
```

A provider returns one of three raw node shapes:

```text
Value
Record
Array
```

plus:

```text
undefined
```

for ordinary absence.

## 1. Sources

### `fromUnknown`

Use structured in-memory data:

```ts
const provider =
  ConfigProvider.fromUnknown({
    database: {
      host: "db.internal",
      port: 5432,
      replicas: ["db-a", "db-b"]
    }
  })
```

Traversal follows normal JS object / array rules.

Primitive values become `Value` nodes as strings. Objects become `Record`
nodes; arrays become `Array` nodes.

### Empty strings

By default an empty leaf string is treated as missing:

```ts
ConfigProvider.fromUnknown({ TOKEN: "" })
```

so:

```text
load(["TOKEN"]) → undefined
```

Preserve it explicitly:

```ts
ConfigProvider.fromUnknown(
  { TOKEN: "" },
  { preserveEmptyStrings: true }
)
```

Now the leaf is:

```text
Value("")
```

### `fromEnv`

```ts
ConfigProvider.fromEnv({
  env: {
    DATABASE_HOST: "localhost",
    DATABASE_PORT: "5432"
  }
})
```

Environment variable names are split on `_` for child discovery, so:

```text
DATABASE_HOST
```

can be addressed as either:

```ts
["DATABASE_HOST"]
```

or:

```ts
["DATABASE", "HOST"]
```

If all immediate children are numeric, the provider reports an `Array` node;
otherwise it reports a `Record`.

With no explicit `env`, current v4 reads the available runtime environment.

### `fromEnvRecord`

Use an explicitly supplied environment record when automatic environment
lookup is undesirable or unavailable.

The set of names used for record/array discovery is captured when the provider
is constructed, while values at known paths remain live.

### dotenv

In-memory contents:

```ts
ConfigProvider.fromDotEnvContents(
  `
  HOST=localhost
  PORT=3000
  `
)
```

Optional variable expansion:

```ts
ConfigProvider.fromDotEnvContents(
  contents,
  { expandVariables: true }
)
```

There is also `fromDotEnv` for filesystem-backed `.env` loading.

### `fromDir`

Directory-backed configuration:

```ts
const provider =
  yield* ConfigProvider.fromDir({
    rootPath: "/etc/myapp"
  })
```

A path such as:

```ts
["database", "host"]
```

maps to a filesystem path under the root.

Rules:

```text
file       → trimmed Value node
directory  → Record node
not found  → undefined
real FS failure → SourceError
```

`fromDir` requires Effect `FileSystem` and `Path` services.

## 2. Missing vs `SourceError`

This is the key provider distinction.

### Missing

```ts
provider.load(["MISSING"])
```

returns a successful Effect whose value is:

```ts
undefined
```

Meaning:

```text
the source worked
but that path is absent
```

### Source failure

```ts
Effect.fail(
  new ConfigProvider.SourceError({
    message: "connection refused"
  })
)
```

Meaning:

```text
the backing source itself failed
```

Do not use `SourceError` for a missing key.

`Config` later wraps source failures inside `ConfigError`.

## 3. Provider fallback with `orElse`

```ts
const combined =
  ConfigProvider.orElse(
    primary,
    defaults
  )
```

For each lookup:

```text
primary returns Node
  → use it

primary returns undefined
  → consult defaults

primary fails SourceError
  → fail; do not treat as absence
```

This is raw-source precedence.

It differs from:

```ts
Config.orElse
```

which composes decoded Config recipes after Config errors exist.

Provider order is precedence:

```ts
orElse(primary, defaults)
```

means primary wins.

Reverse the operands and defaults win wherever they contain a value.

## 4. `mapInput`

Rewrite lookup paths:

```ts
provider.pipe(
  ConfigProvider.mapInput(
    path =>
      path.map(segment =>
        typeof segment === "number"
          ? segment
          : segment.toUpperCase()
      )
  )
)
```

The transformation receives the whole path produced by earlier provider
transformations.

Custom providers created with `make` automatically support this transformation
mechanism.

## 5. `constantCase`

Common preset:

```ts
provider.pipe(
  ConfigProvider.constantCase
)
```

Example:

```text
databaseHost
→ DATABASE_HOST
```

Numeric array indices are left unchanged.

This is useful when Config / Schema keys are camelCase but deployment config is
SCREAMING_SNAKE_CASE.

## 6. `nested`

Prefix every lookup:

```ts
provider.pipe(
  ConfigProvider.nested("APP")
)
```

Now:

```ts
load(["HOST"])
```

looks up:

```ts
["APP", "HOST"]
```

For env providers this corresponds to:

```text
APP_HOST
```

`nested` also accepts a full `Path` array.

### Transform order

Transforms compose in application order:

```ts
provider.pipe(
  ConfigProvider.nested("INNER"),
  ConfigProvider.nested("OUTER")
)
```

A lookup for `HOST` becomes:

```text
OUTER / INNER / HOST
```

A later `mapInput` sees the full path created by earlier transforms.

## 7. Custom providers with `make`

```ts
const provider =
  ConfigProvider.make(path => {
    if (path.join(".") === "remote.host") {
      return Effect.succeed(
        ConfigProvider.makeValue(
          "remote.example.com"
        )
      )
    }

    return Effect.succeed(undefined)
  })
```

Use:

```ts
ConfigProvider.makeValue
ConfigProvider.makeRecord
ConfigProvider.makeArray
```

to describe found nodes.

Return:

```ts
undefined
```

for missing paths.

Fail with:

```ts
ConfigProvider.SourceError
```

only when the backing source itself fails.

Good custom-source use cases:

- remote config services
- secret stores
- database-backed config
- platform config APIs
- host application settings

Keep domain validation in the Config layer above the provider.

## 8. `ConfigProvider.ConfigProvider`

The active provider is a `Context.Reference`.

Its default value is the environment provider.

Override it explicitly:

```ts
program.pipe(
  Effect.provideService(
    ConfigProvider.ConfigProvider,
    provider
  )
)
```

Then ordinary `Config` recipes yielded inside the program resolve through that
provider.

## 9. `layer`

Install / replace the provider for a whole subtree:

```ts
const ProviderLayer =
  ConfigProvider.layer(provider)
```

If passed an Effect that produces a provider, that Effect is evaluated once
when the Layer is built.

Use this for:

- tests
- application startup
- replacing the default environment provider

## 10. `layerAdd`

Compose with the active provider instead of replacing it.

Fallback defaults:

```ts
ConfigProvider.layerAdd(
  defaults
)
```

means:

```text
current provider first
defaults second
```

Primary override:

```ts
ConfigProvider.layerAdd(
  overrides,
  { asPrimary: true }
)
```

means:

```text
overrides first
current provider second
```

This is useful for layered deployment/test configuration.

## 11. Node helpers

The public raw node helpers are:

```ts
ConfigProvider.makeValue(value)
ConfigProvider.makeRecord(keys, value?)
ConfigProvider.makeArray(length, value?)
```

A Record or Array may carry both container information and an optional leaf
value.

That supports sources where one path can have its own value plus children.

## ConfigProvider vs Config

A compact rule:

```text
ConfigProvider
  raw source + lookup + precedence + path mapping

Config
  Schema decode + required/default/Option/fallback semantics
```

Provider should not know your domain type.

Config should not know how the source is physically stored.

## Foldkit placement

For Foldkit, provider work belongs outside pure `update` / `view`:

```text
ConfigProvider
  ↓
Config recipes
  ↓
startup Effect / Resource
  ↓
typed config
  ↓
Flags / services / Commands
```

Useful patterns:

```text
fromUnknown
  tests / embedded host data

fromEnv / dotenv
  deployment startup

layerAdd
  defaults / overrides

custom make
  remote configuration service
```

## Real Effect 4 APIs used

The bundle uses:

- `ConfigProvider.fromUnknown`
- `ConfigProvider.fromEnv`
- `ConfigProvider.fromEnvRecord`
- `ConfigProvider.fromDotEnvContents`
- `ConfigProvider.orElse`
- `ConfigProvider.mapInput`
- `ConfigProvider.constantCase`
- `ConfigProvider.nested`
- `ConfigProvider.make`
- `ConfigProvider.makeValue`
- `ConfigProvider.makeRecord`
- `ConfigProvider.SourceError`
- `ConfigProvider.ConfigProvider`
- `ConfigProvider.layer`
- `ConfigProvider.layerAdd`
- `Config.parse`
- Config as Effect

The README also covers:

- `makeArray`
- `fromDotEnv`
- `fromDir`
- empty-string semantics
- env trie behavior
- transformation ordering
- custom provider responsibilities
