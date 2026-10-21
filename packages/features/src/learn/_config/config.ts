import {
    ByteSize,
    Config,
    ConfigProvider,
    Duration,
    Effect,
    Option,
    Schema as S,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Config examples
// -----------------------------------------------------------------------------

// Primitive / specialized descriptors are Schema-backed.
export const Host = Config.NonEmptyString("HOST")

export const Port = Config.Port("PORT")

export const Debug = Config.Boolean("DEBUG")

export const Timeout = Config.Duration("TIMEOUT")

export const UploadLimit = Config.ByteSize("UPLOAD_LIMIT")

export const Environment = Config.Literals(
    ["development", "production"],
    "ENVIRONMENT"
)

// Group descriptors with Config.all.
export const AppConfig = Config.all({
    host: Config.NonEmptyString("host"),

    port: Config.Port("port"),

    debug: Config.Boolean("debug").pipe(Config.withDefault(false)),

    timeout: Config.Duration("timeout"),

    uploadLimit: Config.ByteSize("uploadLimit"),

    environment: Config.Literals(["development", "production"], "environment"),
}).pipe(Config.nested("app"))

export type AppSettings = Config.Success<typeof AppConfig>

// Deterministic provider used by the lesson.
export const objectProvider = ConfigProvider.fromUnknown({
    app: {
        host: "localhost",
        port: "8080",
        debug: "yes",
        timeout: "2 seconds",
        uploadLimit: "1.5 MiB",
        environment: "development",
    },
})

// Explicit provider parsing.
export const parsedFromObject = AppConfig.parse(objectProvider)

// Config itself is an Effect, so it can be yielded when a provider is present
// in the Effect environment.
export const parsedFromContext = Effect.gen(function* () {
    const settings = yield* AppConfig

    return settings
}).pipe(Effect.provideService(ConfigProvider.ConfigProvider, objectProvider))

// Custom structured schema.
export const DatabaseConfig = Config.schema(
    S.Struct({
        host: S.NonEmptyString,
        port: S.Int,
        replicas: S.Array(S.NonEmptyString),
    }),
    "database"
)

export const databaseProvider = ConfigProvider.fromUnknown({
    database: {
        host: "db.internal",
        port: 5432,
        replicas: ["db-1", "db-2"],
    },
})

// -----------------------------------------------------------------------------
// Absence / fallback semantics
// -----------------------------------------------------------------------------

export const PortWithDefault = Config.Port("PORT").pipe(
    Config.withDefault(3000)
)

export const OptionalPort = Config.option(Config.Port("PORT"))

export const PrimaryOrSecondaryHost = Config.String("PRIMARY_HOST").pipe(
    Config.orElse(() => Config.String("SECONDARY_HOST"))
)

// map is pure transformation after parsing.
export const NormalizedHost = Config.String("HOST").pipe(
    Config.map((value) => value.trim().toLowerCase())
)

// -----------------------------------------------------------------------------
// Collections
// -----------------------------------------------------------------------------

// Structural array OR comma-separated flat value.
export const Exporters = Config.Array(S.String, "EXPORTERS")

// Custom separator.
export const SearchPaths = Config.Array(S.String, "SEARCH_PATHS", {
    separator: ":",
})

// Structural record OR key=value,key=value flat value.
export const ResourceAttributes = Config.Record(
    S.String,
    S.String,
    "OTEL_RESOURCE_ATTRIBUTES"
)

export const collectionEnvProvider = ConfigProvider.fromEnv({
    env: {
        EXPORTERS: "otlp,console",
        SEARCH_PATHS: "/srv:/opt:/tmp",
        OTEL_RESOURCE_ATTRIBUTES: "service.name=demo,service.version=1.0.0",
    },
})

// -----------------------------------------------------------------------------
// Provider sketches
// -----------------------------------------------------------------------------

export const providerSketch = `
const config =
  Config.all({
    host:
      Config.String("HOST"),
    port:
      Config.Port("PORT")
  })

const provider =
  ConfigProvider.fromEnv({
    env: {
      HOST: "localhost",
      PORT: "8080"
    }
  })

// explicit provider
const parsed =
  config.parse(provider)

// provider from Effect context
const program =
  Effect.gen(function* () {
    return yield* config
  }).pipe(
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      provider
    )
  )
`

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals([
    "Describe",
    "Compose",
    "Collections",
    "Provider",
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Describe",
    "Compose",
    "Collections",
    "Provider",
]

export const DescribeMode = S.Literals(["Primitive", "Specialized", "Schema"])
export type DescribeMode = typeof DescribeMode.Type

export const ComposeMode = S.Literals([
    "All",
    "Nested",
    "Default",
    "Option",
    "OrElse",
])
export type ComposeMode = typeof ComposeMode.Type

export const CollectionMode = S.Literals(["Array", "Separator", "Record"])
export type CollectionMode = typeof CollectionMode.Type

export const ProviderMode = S.Literals([
    "FromUnknown",
    "FromEnv",
    "Yield",
    "Error",
])
export type ProviderMode = typeof ProviderMode.Type

export const Model = S.Struct({
    stage: Stage,
    describeMode: DescribeMode,
    composeMode: ComposeMode,
    collectionMode: CollectionMode,
    providerMode: ProviderMode,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedConfigStage: {
        stage: Stage,
    },
    SelectedConfigDescribeMode: {
        describeMode: DescribeMode,
    },
    SelectedConfigComposeMode: {
        composeMode: ComposeMode,
    },
    SelectedConfigCollectionMode: {
        collectionMode: CollectionMode,
    },
    SelectedConfigProviderMode: {
        providerMode: ProviderMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Describe",
    describeMode: "Primitive",
    composeMode: "Default",
    collectionMode: "Array",
    providerMode: "FromUnknown",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedConfigStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedConfigDescribeMode: ({ describeMode }) => ({
            model: evo(model, {
                describeMode: () => describeMode,
            }),
        }),

        SelectedConfigComposeMode: ({ composeMode }) => ({
            model: evo(model, {
                composeMode: () => composeMode,
            }),
        }),

        SelectedConfigCollectionMode: ({ collectionMode }) => ({
            model: evo(model, {
                collectionMode: () => collectionMode,
            }),
        }),

        SelectedConfigProviderMode: ({ providerMode }) => ({
            model: evo(model, {
                providerMode: () => providerMode,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const describeResult = (
    mode: DescribeMode
): Readonly<{
    expression: string
    input: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Primitive":
            return {
                expression:
                    'Config.NonEmptyString("HOST") / Config.Int("WORKERS") / Config.Boolean("DEBUG")',
                input: 'HOST="api.internal" · WORKERS="4" · DEBUG="yes"',
                output: '{ host: "api.internal", workers: 4, debug: true }',
                detail: "Convenience constructors are Schema-backed recipes. Boolean accepts common string forms such as true/false, yes/no, on/off, 1/0, y/n.",
            }

        case "Specialized":
            return {
                expression:
                    "Port / Duration / ByteSize / URL / Date / LogLevel / Redacted",
                input: 'PORT="8080" · TIMEOUT="2 seconds" · UPLOAD_LIMIT="1.5 MiB"',
                output: `8080 · ${Duration.toMillis(Duration.seconds(2))}ms · ${ByteSize.format(ByteSize.mebibytes(1.5), { system: "binary" })}`,
                detail: "Specialized constructors validate domain-specific values at the config boundary instead of leaving raw strings in application code.",
            }

        case "Schema":
            return {
                expression:
                    'Config.schema(Schema.Struct({ host, port, replicas }), "database")',
                input: '{ database: { host: "db.internal", port: 5432, replicas: ["db-1","db-2"] } }',
                output: "{ host: string, port: number, replicas: ReadonlyArray<string> }",
                detail: "schema is the general constructor. Config converts provider data through the supplied Schema codec and reports SchemaError through ConfigError.",
            }
    }
}

export const composeResult = (
    mode: ComposeMode
): Readonly<{
    expression: string
    present: string
    absent: string
    invalid: string
    detail: string
}> => {
    switch (mode) {
        case "All":
            return {
                expression:
                    "Config.all({ host: Config.String(...), port: Config.Port(...) })",
                present: '{ host: "localhost", port: 8080 }',
                absent: "whole group absent when no child has provider input",
                invalid:
                    "partial input + missing/invalid sibling → ConfigError",
                detail: "all preserves tuple/iterable/record shape. A group only counts as wholly absent when none of its children read provider input.",
            }

        case "Nested":
            return {
                expression:
                    'Config.String("host").pipe(Config.nested("database"))',
                present: '{ database: { host: "localhost" } }',
                absent: "database.host missing → absence",
                invalid: "provider shape/type mismatch → ConfigError",
                detail: "nested prepends a path segment. With fromEnv, nested paths become underscore-separated environment keys.",
            }

        case "Default":
            return {
                expression:
                    'Config.Port("PORT").pipe(Config.withDefault(3000))',
                present: 'PORT="8080" → 8080',
                absent: "PORT missing → 3000",
                invalid: 'PORT="not-a-port" → ConfigError',
                detail: "withDefault is absence-only. It deliberately does not replace malformed supplied configuration.",
            }

        case "Option":
            return {
                expression: 'Config.option(Config.Port("PORT"))',
                present: 'PORT="8080" → Option.some(8080)',
                absent: "PORT missing → Option.none()",
                invalid: 'PORT="nope" → ConfigError',
                detail: "option also handles only semantic absence. Validation errors and partially supplied groups still fail.",
            }

        case "OrElse":
            return {
                expression:
                    'Config.String("PRIMARY").pipe(Config.orElse(() => Config.String("SECONDARY")))',
                present: "PRIMARY valid → use PRIMARY",
                absent: "PRIMARY missing → try SECONDARY",
                invalid: "PRIMARY invalid → also try SECONDARY",
                detail: "orElse handles every ConfigError, not just absence. Use it only when falling back from malformed primary input is intentional.",
            }
    }
}

export const collectionResult = (
    mode: CollectionMode
): Readonly<{
    expression: string
    flat: string
    structural: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Array":
            return {
                expression: 'Config.Array(Schema.String, "EXPORTERS")',
                flat: 'EXPORTERS="otlp,console"',
                structural: '{ EXPORTERS: ["otlp", "console"] }',
                output: '["otlp", "console"]',
                detail: "Array accepts either structural array provider data or a separated flat string. The default separator is comma.",
            }

        case "Separator":
            return {
                expression:
                    'Config.Array(Schema.String, "SEARCH_PATHS", { separator: ":" })',
                flat: 'SEARCH_PATHS="/srv:/opt:/tmp"',
                structural: '{ SEARCH_PATHS: ["/srv", "/opt", "/tmp"] }',
                output: '["/srv", "/opt", "/tmp"]',
                detail: "Custom separators make flat environment-style values decode into the same typed array shape as structural providers.",
            }

        case "Record":
            return {
                expression:
                    'Config.Record(Schema.String, Schema.String, "ATTRS")',
                flat: 'ATTRS="service.name=demo,service.version=1.0.0"',
                structural:
                    '{ ATTRS: { "service.name": "demo", "service.version": "1.0.0" } }',
                output: '{ "service.name": "demo", "service.version": "1.0.0" }',
                detail: "Record accepts structural records or separated key=value strings. separator and keyValueSeparator are configurable.",
            }
    }
}

export const providerResult = (
    mode: ProviderMode
): Readonly<{
    title: string
    lines: ReadonlyArray<string>
    detail: string
}> => {
    switch (mode) {
        case "FromUnknown":
            return {
                title: "ConfigProvider.fromUnknown",
                lines: [
                    "provider = fromUnknown({ app: { host, port, ... } })",
                    "config.parse(provider)",
                    "good for tests / already-structured runtime config",
                    "nested path = object nesting",
                ],
                detail: "parse(provider) makes the provider explicit and is useful for deterministic tests and host-provided configuration.",
            }

        case "FromEnv":
            return {
                title: "ConfigProvider.fromEnv",
                lines: [
                    "provider = fromEnv({ env: process-like record })",
                    "flat strings are decoded through Config schemas",
                    "nested paths use underscore separators",
                    "Array/Record can split flat values",
                ],
                detail: "fromEnv adapts string environment data to the same Config recipes used with structural providers.",
            }

        case "Yield":
            return {
                title: "Config is an Effect",
                lines: [
                    "const settings = yield* AppConfig",
                    "active provider comes from ConfigProvider.ConfigProvider",
                    "Effect.provideService installs a provider",
                    "Config<T> extends Effect<T, ConfigError>",
                ],
                detail: "A Config recipe can be yielded directly inside Effect.gen. The current provider is resolved from Effect context.",
            }

        case "Error":
            return {
                title: "ConfigError",
                lines: [
                    "ConfigError wraps SourceError | SchemaError",
                    "SourceError = provider could not read data",
                    "SchemaError = supplied data failed decoding/validation",
                    "withDefault/option distinguish absence from hard invalid input",
                ],
                detail: "Keeping source failures and schema failures typed lets startup report configuration defects instead of silently coercing bad values.",
            }
    }
}
