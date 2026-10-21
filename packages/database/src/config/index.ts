/**
 * # Database Config
 *
 * Environment-aware configuration for multi-environment database services.
 * Provides validation, pool configuration, and logging settings per environment.
 */

// Environment configuration
export type {
    Environment,
    EnvironmentConfig,
    ConfigError,
} from "./environment.ts"

export {
    validateEnvironment,
    getDatabaseUrlEnvVar,
    loadEnvironmentConfig,
    getDemoDatabaseUrl,
    validateAllEnvVars,
} from "./environment.ts"

// Pool and logging configuration
export type {
    PoolConfig,
    LoggingConfig,
    DatabaseConfig,
} from "./pool-config.ts"

export {
    getPoolConfig,
    getPoolConfigSafe,
    getLoggingConfig,
    getDatabaseConfig,
} from "./pool-config.ts"
