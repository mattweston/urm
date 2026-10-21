/**
 * # Pool Config
 *
 * Per-environment pool and logging numbers as plain data. Note the live layers
 * read their own copy in ./services/database-selector.ts.
 */
import type { Environment } from "./environment.ts"

export interface PoolConfig {
    readonly max_connections: number

    readonly idle_timeout_ms: number

    readonly connection_timeout_ms: number

    readonly query_timeout_ms: number | null
}

const POOL_CONFIGS: Record<Environment, PoolConfig> = {
    development: {
        max_connections: 10,
        idle_timeout_ms: 30_000, // 30 seconds
        connection_timeout_ms: 5_000, // 5 seconds
        query_timeout_ms: null, // No limit in dev
    },
    staging: {
        max_connections: 15,
        idle_timeout_ms: 60_000, // 60 seconds
        connection_timeout_ms: 10_000, // 10 seconds
        query_timeout_ms: 30_000, // 30 seconds
    },
    production: {
        max_connections: 25,
        idle_timeout_ms: 120_000, // 120 seconds
        connection_timeout_ms: 15_000, // 15 seconds
        query_timeout_ms: 60_000, // 60 seconds
    },
}

const DEMO_CONFIG: PoolConfig = {
    max_connections: 15,
    idle_timeout_ms: 60_000, // 60 seconds
    connection_timeout_ms: 10_000, // 10 seconds
    query_timeout_ms: 30_000, // 30 seconds
}

export const getPoolConfig = (
    env: Environment,
    is_demo: boolean
): PoolConfig => {
    if (is_demo) {
        return DEMO_CONFIG
    }
    return POOL_CONFIGS[env]
}

export const getPoolConfigSafe = (
    env: string,
    is_demo: boolean
): PoolConfig => {
    const valid_envs: Environment[] = ["development", "staging", "production"]

    if (!valid_envs.includes(env as Environment)) {
        throw new Error(
            `Invalid environment: "${env}". Must be one of: ${valid_envs.join(", ")}`
        )
    }

    return getPoolConfig(env as Environment, is_demo)
}

export interface LoggingConfig {
    readonly log_queries: boolean

    readonly log_connections: boolean

    readonly slow_query_threshold_ms: number | null
}

const LOGGING_CONFIGS: Record<Environment, LoggingConfig> = {
    development: {
        log_queries: true,
        log_connections: true,
        slow_query_threshold_ms: null, // Log all queries
    },
    staging: {
        log_queries: true,
        log_connections: true,
        slow_query_threshold_ms: 1000, // Only log queries > 1s
    },
    production: {
        log_queries: false,
        log_connections: false,
        slow_query_threshold_ms: null, // No query logging in prod
    },
}

const DEMO_LOGGING_CONFIG: LoggingConfig = {
    log_queries: true,
    log_connections: true,
    slow_query_threshold_ms: 1000, // Only log queries > 1s
}

export const getLoggingConfig = (
    env: Environment,
    is_demo: boolean
): LoggingConfig => {
    if (is_demo) {
        return DEMO_LOGGING_CONFIG
    }
    return LOGGING_CONFIGS[env]
}

export interface DatabaseConfig {
    readonly pool: PoolConfig
    readonly logging: LoggingConfig
}

export const getDatabaseConfig = (
    env: Environment,
    is_demo: boolean
): DatabaseConfig => ({
    pool: getPoolConfig(env, is_demo),
    logging: getLoggingConfig(env, is_demo),
})
