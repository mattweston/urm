import { Context, Effect, Option, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Effect Context services used by the teaching demo
// -----------------------------------------------------------------------------

export type DatabaseShape = Readonly<{
    name: string
    query: (sql: string) => string
}>

export const Database = Context.Service<DatabaseShape>("Learn/Context/Database")

export type AppConfigShape = Readonly<{
    region: string
    apiBaseUrl: string
}>

export const APP_CONFIG_KEY = "Learn/Context/AppConfig"

export class AppConfig extends Context.Service<AppConfig, AppConfigShape>()(
    APP_CONFIG_KEY
) {}

export type CacheShape = Readonly<{
    strategy: string
    read: (key: string) => string
}>

export const Cache = Context.Service<CacheShape>("Learn/Context/Cache")

export type TelemetryShape = Readonly<{
    exporter: string
}>

export const Telemetry = Context.Service<TelemetryShape>(
    "Learn/Context/Telemetry"
)

export const RequestLabel = Context.Reference<string>(
    "Learn/Context/RequestLabel",
    {
        defaultValue: () => "public",
    }
)

const primary_database: DatabaseShape = {
    name: "primary",
    query: (sql) => `primary → ${sql}`,
}

const replica_database: DatabaseShape = {
    name: "replica",
    query: (sql) => `replica → ${sql}`,
}

const memory_cache: CacheShape = {
    strategy: "memory",
    read: (key) => `cache:${key}`,
}

const live_config: AppConfigShape = {
    region: "eu-west",
    apiBaseUrl: "https://api.example.test",
}

const fallback_config: AppConfigShape = {
    region: "fallback",
    apiBaseUrl: "http://localhost:3000",
}

const telemetry_service: TelemetryShape = {
    exporter: "otlp",
}

// A Context key is also an Effect. Yielding it requests that service from the
// current fiber context.
export const database_program = Effect.gen(function* () {
    const database = yield* Database
    return database.query("select user 42")
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Keys"),
    S.Literal("Build"),
    S.Literal("Merge"),
    S.Literal("Reference"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Keys",
    "Build",
    "Merge",
    "Reference",
]

export const DatabaseSource = S.Union([
    S.Literal("Primary"),
    S.Literal("Replica"),
])
export type DatabaseSource = typeof DatabaseSource.Type

export const MergeMode = S.Union([
    S.Literal("Merged"),
    S.Literal("PickDatabase"),
    S.Literal("OmitTelemetry"),
])
export type MergeMode = typeof MergeMode.Type

export const Model = S.Struct({
    stage: Stage,
    databaseSource: DatabaseSource,
    includeCache: S.Boolean,
    includeConfig: S.Boolean,
    mergeMode: MergeMode,
    referenceOverride: S.Boolean,
})
export type Model = typeof Model.Type

export type StageDetails = Readonly<{
    eyebrow: string
    title: string
    description: string
    code: string
    apis: ReadonlyArray<string>
    notice: string
}>

export const stage_details: Record<Stage, StageDetails> = {
    Keys: {
        eyebrow: "typed identifiers",
        title: "A service key is both a handle and an Effect",
        description:
            "Context.Service creates the typed identity used to store, retrieve, and require a service. The key itself can be yielded inside Effect.gen.",
        code: `const Database = Context.Service<{
    query: (sql: string) => string
}>("Database")

class Config extends Context.Service<Config, {
    port: number
}>()("Config") {}

const program = Effect.gen(function* () {
    const database = yield* Database
    return database.query("select 1")
})`,
        apis: [
            "Context.Service",
            "Context.isKey",
            "Context.isReference",
            "Key.key",
        ],
        notice: "The key string is the runtime identity of the service. Reusing the same string means reusing the same Context slot.",
    },
    Build: {
        eyebrow: "immutable map",
        title: "Build a Context, then read it through typed keys",
        description:
            "make starts with one service, add returns a new Context, get reads a known service, and optional getters keep absence explicit.",
        code: `const context = Context.make(Database, primary).pipe(
    Context.add(Cache, memoryCache),
    Context.add(Config, liveConfig)
)

Context.get(context, Database)
Context.getOption(context, Cache)
Context.getOrElse(context, Config, () => fallbackConfig)`,
        apis: [
            "Context.empty",
            "Context.make",
            "Context.add",
            "Context.get",
            "Context.getOption",
            "Context.getOrElse",
        ],
        notice: "Contexts are immutable values. Adding a service creates a new Context; if the key already exists, the new value replaces the previous one.",
    },
    Merge: {
        eyebrow: "combine + filter",
        title: "Merge contexts and control which services survive",
        description:
            "merge combines two Context values. When both sides contain the same key, the right-hand Context wins. pick and omit filter the result.",
        code: `const left = Context.make(Database, primary).pipe(
    Context.add(Config, liveConfig)
)

const right = Context.make(Database, replica).pipe(
    Context.add(Telemetry, telemetry)
)

const merged = Context.merge(left, right)
const onlyDatabase = merged.pipe(Context.pick(Database))
const withoutTelemetry = merged.pipe(Context.omit(Telemetry))`,
        apis: [
            "Context.merge",
            "Context.mergeAll",
            "Context.pick",
            "Context.omit",
        ],
        notice: "Merge precedence is deterministic: the service from the right-hand Context replaces the same key from the left-hand Context.",
    },
    Reference: {
        eyebrow: "default service",
        title: "Reference resolves a lazy default until you override it",
        description:
            "Context.Reference is a service key whose identifier is never, so reading it does not add an Effect requirement when no override is provided.",
        code: `const RequestLabel = Context.Reference<string>(
    "RequestLabel",
    { defaultValue: () => "public" }
)

const empty = Context.empty()
Context.get(empty, RequestLabel) // "public"

const custom = Context.make(RequestLabel, "admin-preview")
Context.get(custom, RequestLabel) // "admin-preview"`,
        apis: [
            "Context.Reference",
            "Context.get",
            "Context.getOption",
            "Context.getOrElse",
            "Context.isReference",
        ],
        notice: "Reference-aware getters resolve the cached default before considering a fallback. An explicit service value simply overrides that default for the Context you built.",
    },
}

// -----------------------------------------------------------------------------
// Derived visual snapshots
// -----------------------------------------------------------------------------

export type KeyFact = Readonly<{
    label: string
    kind: "function service" | "class service"
    key: string
    isKey: boolean
    isReference: boolean
    requirement: string
}>

export const key_facts: ReadonlyArray<KeyFact> = [
    {
        label: "Database",
        kind: "function service",
        key: Database.key,
        isKey: Context.isKey(Database),
        isReference: Context.isReference(Database),
        requirement: "Database",
    },
    {
        label: "AppConfig",
        kind: "class service",
        key: APP_CONFIG_KEY,
        isKey: Context.isKey(AppConfig),
        isReference: Context.isReference(AppConfig),
        requirement: "AppConfig",
    },
]

export type ServiceSlot = Readonly<{
    key: string
    status: "present" | "missing"
    value: string
}>

export type BuildSnapshot = Readonly<{
    databaseResult: string
    cacheResult: string
    configResult: string
    slots: ReadonlyArray<ServiceSlot>
}>

const database_for = (source: DatabaseSource): DatabaseShape =>
    source === "Primary" ? primary_database : replica_database

const build_context = (model: Model) => {
    const database_context = Context.make(
        Database,
        database_for(model.databaseSource)
    )

    if (model.includeCache && model.includeConfig) {
        return database_context.pipe(
            Context.add(Cache, memory_cache),
            Context.add(AppConfig, live_config)
        )
    }

    if (model.includeCache) {
        return database_context.pipe(Context.add(Cache, memory_cache))
    }

    if (model.includeConfig) {
        return database_context.pipe(Context.add(AppConfig, live_config))
    }

    return database_context
}

export const build_snapshot = (model: Model): BuildSnapshot => {
    const context = build_context(model)
    const database = Context.get(context, Database)
    const cache = Context.getOption(context, Cache)
    const config = Context.getOrElse(context, AppConfig, () => fallback_config)

    return {
        databaseResult: database.query("select 42"),
        cacheResult: Option.isSome(cache)
            ? cache.value.read("user:42")
            : "Option.none",
        configResult: `${config.region} · ${config.apiBaseUrl}`,
        slots: [
            {
                key: Database.key,
                status: "present",
                value: database.name,
            },
            {
                key: Cache.key,
                status: Option.isSome(cache) ? "present" : "missing",
                value: Option.isSome(cache)
                    ? cache.value.strategy
                    : "not stored",
            },
            {
                key: APP_CONFIG_KEY,
                status: model.includeConfig ? "present" : "missing",
                value: model.includeConfig
                    ? live_config.region
                    : "fallback used by getOrElse",
            },
        ],
    }
}

export type MergeSnapshot = Readonly<{
    database: string
    config: string
    telemetry: string
    slots: ReadonlyArray<ServiceSlot>
}>

const merged_context = Context.merge(
    Context.make(Database, primary_database).pipe(
        Context.add(AppConfig, live_config)
    ),
    Context.make(Database, replica_database).pipe(
        Context.add(Telemetry, telemetry_service)
    )
)

const context_for_merge_mode = (mode: MergeMode) => {
    if (mode === "PickDatabase") {
        return merged_context.pipe(Context.pick(Database))
    }

    if (mode === "OmitTelemetry") {
        return merged_context.pipe(Context.omit(Telemetry))
    }

    return merged_context
}

export const merge_snapshot = (model: Model): MergeSnapshot => {
    const context = context_for_merge_mode(model.mergeMode)
    const database = Context.getOption(context, Database)
    const config = Context.getOption(context, AppConfig)
    const telemetry = Context.getOption(context, Telemetry)

    return {
        database: Option.isSome(database) ? database.value.name : "missing",
        config: Option.isSome(config) ? config.value.region : "missing",
        telemetry: Option.isSome(telemetry)
            ? telemetry.value.exporter
            : "missing",
        slots: [
            {
                key: Database.key,
                status: Option.isSome(database) ? "present" : "missing",
                value: Option.isSome(database)
                    ? `${database.value.name} · right side won`
                    : "filtered out",
            },
            {
                key: APP_CONFIG_KEY,
                status: Option.isSome(config) ? "present" : "missing",
                value: Option.isSome(config)
                    ? config.value.region
                    : "filtered out",
            },
            {
                key: Telemetry.key,
                status: Option.isSome(telemetry) ? "present" : "missing",
                value: Option.isSome(telemetry)
                    ? telemetry.value.exporter
                    : "filtered out",
            },
        ],
    }
}

export type ReferenceSnapshot = Readonly<{
    resolved: string
    optionResult: string
    fallbackResult: string
    isReference: boolean
    source: "default" | "override"
}>

export const reference_snapshot = (model: Model): ReferenceSnapshot => {
    const context = model.referenceOverride
        ? Context.make(RequestLabel, "admin-preview")
        : Context.empty()

    const option = Context.getOption(context, RequestLabel)

    return {
        resolved: Context.get(context, RequestLabel),
        optionResult: Option.isSome(option)
            ? `Option.some(${option.value})`
            : "Option.none",
        fallbackResult: Context.getOrElse(
            context,
            RequestLabel,
            () => "fallback"
        ),
        isReference: Context.isReference(RequestLabel),
        source: model.referenceOverride ? "override" : "default",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedContextStage: { stage: Stage },
    ClickedToggleDatabaseSource: {},
    ClickedToggleCache: {},
    ClickedToggleConfig: {},
    SelectedContextMergeMode: { mode: MergeMode },
    ClickedToggleReferenceOverride: {},
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Keys",
    databaseSource: "Primary",
    includeCache: true,
    includeConfig: true,
    mergeMode: "Merged",
    referenceOverride: false,
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedContextStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),
        ClickedToggleDatabaseSource: () => ({
            model: modifyFields(model, {
                databaseSource: (source) =>
                    source === "Primary" ? "Replica" : "Primary",
            }),
        }),
        ClickedToggleCache: () => ({
            model: modifyFields(model, {
                includeCache: (include) => !include,
            }),
        }),
        ClickedToggleConfig: () => ({
            model: modifyFields(model, {
                includeConfig: (include) => !include,
            }),
        }),
        SelectedContextMergeMode: ({ mode }) => ({
            model: modifyFields(model, {
                mergeMode: () => mode,
            }),
        }),
        ClickedToggleReferenceOverride: () => ({
            model: modifyFields(model, {
                referenceOverride: (enabled) => !enabled,
            }),
        }),
    })
