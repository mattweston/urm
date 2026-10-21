/**
 * # Environment Config
 *
 * Resolves NODE_ENV to an environment and its connection string. One variable
 * per environment, so all three can be present without ambiguity.
 */
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

export type Environment = "development" | "staging" | "production"

export interface EnvironmentConfig {
    readonly env: Environment
    readonly database_url: string
    readonly is_demo: boolean
}

const VALID_ENVIRONMENTS: readonly string[] = [
    "development",
    "staging",
    "production",
]

export interface ConfigError {
    readonly _tag: "ConfigError"
    readonly message: string
    readonly cause?: unknown
}

const makeConfigError = (message: string, cause?: unknown): ConfigError => ({
    _tag: "ConfigError",
    message,
    cause,
})

export const validateEnvironment = (
    value: string
): Effect.Effect<Environment, ConfigError> => {
    if (VALID_ENVIRONMENTS.includes(value)) {
        return Effect.succeed(value as Environment)
    }
    return Effect.fail(
        makeConfigError(
            `Invalid NODE_ENV: "${value}". Must be one of: ${VALID_ENVIRONMENTS.join(", ")}`
        )
    )
}

export const getDatabaseUrlEnvVar = (env: Environment): string => {
    switch (env) {
        case "development":
            return "DATABASE_URL_DEV"
        case "staging":
            return "DATABASE_URL_STAGE"
        case "production":
            return "DATABASE_URL_PROD"
    }
}

const nodeEnvConfig = Config.String("NODE_ENV").pipe(
    Config.withDefault("development")
)

const isDemoConfig = Config.Boolean("IS_DEMO").pipe(Config.withDefault(false))

export const loadEnvironmentConfig = Effect.gen(function* () {
    const node_env = yield* nodeEnvConfig
    const env = yield* validateEnvironment(node_env)
    const db_url_var = getDatabaseUrlEnvVar(env)
    const database_url = yield* Config.String(db_url_var)
    const is_demo = yield* isDemoConfig
    if (is_demo) {
        const demo_url = yield* Config.String("DATABASE_URL_DEMO")
        if (demo_url === database_url) {
            return yield* Effect.fail(
                makeConfigError(
                    "DATABASE_URL_DEMO must be different from the primary database URL"
                )
            )
        }
    }

    return {
        env,
        database_url,
        is_demo,
    } as EnvironmentConfig
})

export const getDemoDatabaseUrl = Effect.gen(function* () {
    const demo_config = Config.option(Config.String("DATABASE_URL_DEMO"))
    return yield* demo_config
})

export const validateAllEnvVars = Effect.gen(function* () {
    const missing_vars: string[] = []
    const required_vars = [
        "DATABASE_URL_DEV",
        "DATABASE_URL_STAGE",
        "DATABASE_URL_PROD",
        "DATABASE_URL_DEMO",
    ]

    for (const var_name of required_vars) {
        const config = Config.option(Config.String(var_name))
        const value = yield* config

        if (Option.isNone(value)) {
            missing_vars.push(var_name)
        }
    }

    if (missing_vars.length > 0) {
        return yield* Effect.fail(
            makeConfigError(
                `Environment validation failed. Missing variables:\n${missing_vars.join("\n")}`
            )
        )
    }
    return true
})
