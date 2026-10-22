import { Config, ConfigProvider, Effect, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 ConfigProvider examples
// -----------------------------------------------------------------------------

export const structuredProvider = ConfigProvider.fromUnknown({
    database: {
        host: "db.internal",
        port: 5432,
        replicas: ["db-a", "db-b"],
    },
    featureFlag: true,
})

export const envProvider = ConfigProvider.fromEnv({
    env: {
        APP_HOST: "prod.example.com",
        APP_PORT: "8080",
        APP_REPLICAS_0: "prod-a",
        APP_REPLICAS_1: "prod-b",
    },
})

export const envRecordProvider = ConfigProvider.fromEnvRecord({
    HOST: "localhost",
    PORT: "3000",
})

export const dotenvProvider = ConfigProvider.fromDotEnvContents(
    `
HOST=dotenv.example.com
PORT=4040
API_URL=https://example.com
BASE_URL=https://base.example.com
EXPANDED=\${BASE_URL}/v1
`,
    { expandVariables: true }
)

export const emptyStringMissing = ConfigProvider.fromUnknown({ TOKEN: "" })

export const emptyStringPreserved = ConfigProvider.fromUnknown(
    { TOKEN: "" },
    { preserveEmptyStrings: true }
)

// -----------------------------------------------------------------------------
// Provider composition
// -----------------------------------------------------------------------------

export const primaryProvider = ConfigProvider.fromUnknown({
    HOST: "prod.example.com",
})

export const defaultsProvider = ConfigProvider.fromUnknown({
    HOST: "localhost",
    PORT: "3000",
    LOG_LEVEL: "Info",
})

export const primaryWithDefaults = ConfigProvider.orElse(
    primaryProvider,
    defaultsProvider
)

export const defaultsAsPrimary = ConfigProvider.orElse(
    defaultsProvider,
    primaryProvider
)

// -----------------------------------------------------------------------------
// Path transformations
// -----------------------------------------------------------------------------

export const constantCaseProvider = ConfigProvider.fromEnv({
    env: {
        DATABASE_HOST: "constant.example.com",
        DATABASE_PORT: "5432",
    },
}).pipe(ConfigProvider.constantCase)

export const nestedEnvProvider = ConfigProvider.fromEnv({
    env: {
        APP_HOST: "nested.example.com",
        APP_PORT: "9000",
    },
}).pipe(ConfigProvider.nested("APP"))

export const upperProvider = ConfigProvider.fromEnv({
    env: {
        SERVICE_HOST: "mapped.example.com",
    },
}).pipe(
    ConfigProvider.mapInput((path) =>
        path.map((segment) =>
            typeof segment === "number" ? segment : segment.toUpperCase()
        )
    )
)

export const orderedTransforms = ConfigProvider.fromEnv({
    env: {
        OUTER_INNER_HOST: "ordered.example.com",
    },
}).pipe(ConfigProvider.nested("INNER"), ConfigProvider.nested("OUTER"))

// -----------------------------------------------------------------------------
// Custom provider
// -----------------------------------------------------------------------------

export const customProvider = ConfigProvider.make((path) => {
    const key = path.join(".")

    if (key === "remote.host") {
        return Effect.succeed(ConfigProvider.makeValue("remote.example.com"))
    }

    if (key === "remote") {
        return Effect.succeed(
            ConfigProvider.makeRecord(new Set(["host", "port"]))
        )
    }

    if (key === "remote.port") {
        return Effect.succeed(ConfigProvider.makeValue("7000"))
    }

    return Effect.succeed(undefined)
})

export const failingProvider = ConfigProvider.make((_path) =>
    Effect.fail(
        new ConfigProvider.SourceError({
            message: "remote config service unavailable",
        })
    )
)

// -----------------------------------------------------------------------------
// Config consuming the provider
// -----------------------------------------------------------------------------

export const AppConfig = Config.all({
    host: Config.String("HOST"),
    port: Config.Port("PORT"),
})

export const parsedWithDefaults = AppConfig.parse(primaryWithDefaults)

export const parsedFromContext = Effect.gen(function* () {
    return yield* AppConfig
}).pipe(
    Effect.provideService(ConfigProvider.ConfigProvider, primaryWithDefaults)
)

// -----------------------------------------------------------------------------
// Layers
// -----------------------------------------------------------------------------

export const ProviderLayer = ConfigProvider.layer(primaryWithDefaults)

export const DefaultsLayer = ConfigProvider.layerAdd(defaultsProvider)

export const OverridesLayer = ConfigProvider.layerAdd(primaryProvider, {
    asPrimary: true,
})

export const layerSketch = `
const Base =
  ConfigProvider.layer(
    ConfigProvider.fromUnknown({
      HOST: "production"
    })
  )

const Defaults =
  ConfigProvider.layerAdd(
    ConfigProvider.fromUnknown({
      PORT: "3000"
    })
  )

// current provider first,
// Defaults only if current load returns undefined
`

export const directorySketch = `
const provider =
  yield* ConfigProvider.fromDir({
    rootPath: "/etc/myapp"
  })

// path ["database", "host"]
// → /etc/myapp/database/host
//
// file content  → Value node
// directory     → Record node
// not found     → undefined
// read failure  → SourceError
`

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Sources", "Compose", "Paths", "Layer"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Sources",
    "Compose",
    "Paths",
    "Layer",
]

export const SourceMode = S.Literals(["Unknown", "Env", "DotEnv", "Empty"])
export type SourceMode = typeof SourceMode.Type

export const ComposeMode = S.Literals([
    "Fallback",
    "Reverse",
    "Missing",
    "SourceError",
])
export type ComposeMode = typeof ComposeMode.Type

export const PathMode = S.Literals([
    "ConstantCase",
    "Nested",
    "MapInput",
    "Order",
])
export type PathMode = typeof PathMode.Type

export const LayerMode = S.Literals([
    "Replace",
    "AddFallback",
    "AddPrimary",
    "Custom",
    "Directory",
])
export type LayerMode = typeof LayerMode.Type

export const Model = S.Struct({
    stage: Stage,
    sourceMode: SourceMode,
    composeMode: ComposeMode,
    pathMode: PathMode,
    layerMode: LayerMode,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedConfigProviderStage: {
        stage: Stage,
    },
    SelectedConfigProviderSourceMode: {
        sourceMode: SourceMode,
    },
    SelectedConfigProviderComposeMode: {
        composeMode: ComposeMode,
    },
    SelectedConfigProviderPathMode: {
        pathMode: PathMode,
    },
    SelectedConfigProviderLayerMode: {
        layerMode: LayerMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Sources",
    sourceMode: "Unknown",
    composeMode: "Fallback",
    pathMode: "ConstantCase",
    layerMode: "Replace",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedConfigProviderStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedConfigProviderSourceMode: ({ sourceMode }) => ({
            model: modifyFields(model, {
                sourceMode: () => sourceMode,
            }),
        }),

        SelectedConfigProviderComposeMode: ({ composeMode }) => ({
            model: modifyFields(model, {
                composeMode: () => composeMode,
            }),
        }),

        SelectedConfigProviderPathMode: ({ pathMode }) => ({
            model: modifyFields(model, {
                pathMode: () => pathMode,
            }),
        }),

        SelectedConfigProviderLayerMode: ({ layerMode }) => ({
            model: modifyFields(model, {
                layerMode: () => layerMode,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const sourceResult = (
    mode: SourceMode
): Readonly<{
    constructor: string
    raw: string
    path: string
    node: string
    detail: string
}> => {
    switch (mode) {
        case "Unknown":
            return {
                constructor: "ConfigProvider.fromUnknown",
                raw: '{ database: { host: "db.internal", port: 5432, replicas: ["db-a","db-b"] } }',
                path: '["database", "host"]',
                node: 'Value("db.internal")',
                detail: "fromUnknown follows normal object/array traversal. Numbers, booleans, and bigints become string Value nodes; objects become Record nodes and arrays become Array nodes.",
            }

        case "Env":
            return {
                constructor: "ConfigProvider.fromEnv",
                raw: 'APP_HOST="prod.example.com" · APP_REPLICAS_0="prod-a"',
                path: '["APP", "HOST"]',
                node: 'Value("prod.example.com")',
                detail: 'Environment variable names are split on underscores for child discovery, so APP_HOST is addressable as both ["APP_HOST"] and ["APP","HOST"].',
            }

        case "DotEnv":
            return {
                constructor: "ConfigProvider.fromDotEnvContents",
                raw: "BASE_URL=https://base.example.com\\nEXPANDED=${BASE_URL}/v1",
                path: '["EXPANDED"]',
                node: 'Value("https://base.example.com/v1")',
                detail: "dotenv contents can be parsed in-memory; expandVariables resolves ${NAME} references before building the provider.",
            }

        case "Empty":
            return {
                constructor: "fromUnknown(..., { preserveEmptyStrings })",
                raw: '{ TOKEN: "" }',
                path: '["TOKEN"]',
                node: 'default → undefined · preserveEmptyStrings → Value("")',
                detail: "Literal empty strings are treated as missing by default. The preservation option makes an empty string an explicit supplied value.",
            }
    }
}

export const composeResult = (
    mode: ComposeMode
): Readonly<{
    expression: string
    host: string
    port: string
    detail: string
}> => {
    switch (mode) {
        case "Fallback":
            return {
                expression: "ConfigProvider.orElse(primary, defaults)",
                host: 'HOST → primary "prod.example.com"',
                port: 'PORT → primary undefined → defaults "3000"',
                detail: "orElse consults the second provider only when the first provider returns undefined for that path.",
            }

        case "Reverse":
            return {
                expression: "ConfigProvider.orElse(defaults, primary)",
                host: 'HOST → defaults "localhost"',
                port: 'PORT → defaults "3000"',
                detail: "Provider order is precedence. Reverse the operands and the defaults now win for paths they contain.",
            }

        case "Missing":
            return {
                expression: 'provider.load(["MISSING"])',
                host: "result → undefined",
                port: "means semantic absence",
                detail: "A missing path is represented by a successful Effect whose value is undefined. Do not manufacture SourceError for ordinary absence.",
            }

        case "SourceError":
            return {
                expression: 'failingProvider.load(["HOST"])',
                host: 'Effect.fail(SourceError("remote config service unavailable"))',
                port: "means backing source failed",
                detail: "SourceError is reserved for source I/O / retrieval failure. Config later wraps it inside ConfigError; it is not the missing-key signal.",
            }
    }
}

export const pathResult = (
    mode: PathMode
): Readonly<{
    input: string
    transform: string
    backing: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "ConstantCase":
            return {
                input: 'load(["databaseHost"])',
                transform: "constantCase",
                backing: '["DATABASE_HOST"]',
                output: '"constant.example.com"',
                detail: "constantCase converts string path segments with Effect's config casing rules and leaves numeric array indices unchanged.",
            }

        case "Nested":
            return {
                input: 'load(["HOST"])',
                transform: 'nested("APP")',
                backing: '["APP", "HOST"] → APP_HOST',
                output: '"nested.example.com"',
                detail: "nested prepends a path prefix. It namespaces a provider itself, independently of Config.nested.",
            }

        case "MapInput":
            return {
                input: 'load(["service_host"])',
                transform: "mapInput(path => uppercase strings)",
                backing: '["SERVICE_HOST"]',
                output: '"mapped.example.com"',
                detail: "mapInput receives the whole path produced by earlier transforms and returns a new lookup path.",
            }

        case "Order":
            return {
                input: 'base.pipe(nested("INNER"), nested("OUTER")).load(["HOST"])',
                transform: "transforms compose in application order",
                backing: '["OUTER", "INNER", "HOST"]',
                output: '"ordered.example.com"',
                detail: "Later nested calls become the outer prefix. Later mapInput transforms see the full path created by earlier transformations.",
            }
    }
}

export const layerResult = (
    mode: LayerMode
): Readonly<{
    expression: string
    result: string
    detail: string
}> => {
    switch (mode) {
        case "Replace":
            return {
                expression: "ConfigProvider.layer(provider)",
                result: "install provider as ConfigProvider.ConfigProvider",
                detail: "layer replaces the active provider for downstream Effects. If passed an Effect that creates a provider, that Effect is evaluated once when the Layer is built.",
            }

        case "AddFallback":
            return {
                expression: "ConfigProvider.layerAdd(defaults)",
                result: "current provider first · defaults fallback",
                detail: "layerAdd composes with the current provider rather than replacing it. The default mode adds the new provider as fallback.",
            }

        case "AddPrimary":
            return {
                expression:
                    "ConfigProvider.layerAdd(overrides, { asPrimary: true })",
                result: "overrides first · existing provider fallback",
                detail: "asPrimary flips provider precedence while still retaining the existing provider for missing paths.",
            }

        case "Custom":
            return {
                expression:
                    "ConfigProvider.make(path => Effect<Node | undefined, SourceError>)",
                result: "custom Value / Record / Array nodes",
                detail: "Custom providers implement raw tree lookup. Use makeValue, makeRecord, and makeArray to describe found nodes; return undefined for missing paths.",
            }

        case "Directory":
            return {
                expression:
                    'yield* ConfigProvider.fromDir({ rootPath: "/etc/myapp" })',
                result: "file → Value · directory → Record · missing → undefined",
                detail: "fromDir is effectful because it requires FileSystem and Path services. Non-not-found filesystem failures become SourceError.",
            }
    }
}
