/**
 * # Database Logger
 *
 * Per-environment query and connection logging policy.
 */
import { EffectLogger } from "drizzle-orm/effect-postgres"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Environment } from "../config/environment.ts"

export interface LoggingConfig {
    readonly logQueries: boolean

    readonly slowQueryThreshold: number | null

    readonly logConnections: boolean

    readonly minLevel: "debug" | "info" | "warn" | "error"
}

const LOGGING_CONFIGS: Record<Environment, LoggingConfig> = {
    development: {
        logQueries: true,
        slowQueryThreshold: null, // Log all queries
        logConnections: true,
        minLevel: "debug",
    },
    staging: {
        logQueries: true,
        slowQueryThreshold: 1000, // Only log queries > 1s
        logConnections: true,
        minLevel: "info",
    },
    production: {
        logQueries: false,
        slowQueryThreshold: null,
        logConnections: false,
        minLevel: "error",
    },
}

export const getLoggingConfig = (env: Environment): LoggingConfig =>
    LOGGING_CONFIGS[env]

export const createLoggerLayer = (
    env: Environment
): Layer.Layer<never, never, never> | undefined => {
    const config = LOGGING_CONFIGS[env]

    if (!config.logQueries) {
        // Production: No logging layer (use DefaultServices)
        return undefined
    }

    // Development/Staging: Use EffectLogger
    return EffectLogger.layer
}

export const logQuery = (
    sql: string,
    params: unknown[],
    durationMs: number,
    env: Environment
): Effect.Effect<void> => {
    const config = LOGGING_CONFIGS[env]

    // Skip if logging disabled
    if (!config.logQueries) {
        return Effect.void
    }

    // Check slow query threshold
    if (
        config.slowQueryThreshold !== null &&
        durationMs < config.slowQueryThreshold
    ) {
        return Effect.void
    }

    // Format message based on environment
    if (env === "development") {
        // Full detail in dev
        return Effect.log("Query executed").pipe(
            Effect.annotateLogs({
                sql: sql.substring(0, 500), // Truncate long queries
                params: JSON.stringify(params).substring(0, 200),
                duration: `${durationMs}ms`,
            })
        )
    } else {
        // Minimal detail in staging (slow queries only)
        return Effect.logWarning("Slow query detected").pipe(
            Effect.annotateLogs({
                duration: `${durationMs}ms`,
                sql: sql.substring(0, 200),
            })
        )
    }
}

export const logConnectionEvent = (
    event: "connect" | "disconnect" | "error",
    details?: string,
    env?: Environment
): Effect.Effect<void> => {
    // Omitting env logs unconditionally, including in production where the
    // config says connection logging is off. Callers should always pass it.
    const shouldLog = env ? LOGGING_CONFIGS[env].logConnections : true

    if (!shouldLog) {
        return Effect.void
    }

    switch (event) {
        case "connect":
            return Effect.log("Database connected").pipe(
                Effect.annotateLogs(details ? { details } : {})
            )
        case "disconnect":
            return Effect.log("Database disconnected").pipe(
                Effect.annotateLogs(details ? { details } : {})
            )
        case "error":
            return Effect.logError("Database connection error").pipe(
                Effect.annotateLogs(details ? { error: details } : {})
            )
    }
}

export const withLogging = <A, E, R>(
    operation: Effect.Effect<A, E, R>,
    operationName: string,
    env: Environment
): Effect.Effect<A, E, R> => {
    const config = LOGGING_CONFIGS[env]

    if (config.minLevel === "error") {
        // Production: Only log errors
        return operation.pipe(
            Effect.tapError((error) =>
                Effect.logError(
                    `Database operation failed: ${operationName}`
                ).pipe(Effect.annotateLogs({ error: String(error) }))
            )
        )
    }

    // Dev/Staging: Log start and success/failure
    return Effect.gen(function* () {
        yield* Effect.log(`Starting: ${operationName}`)
        const startTime = Date.now()

        const result = yield* operation.pipe(
            Effect.tap(() => {
                const duration = Date.now() - startTime
                return Effect.log(`Completed: ${operationName} (${duration}ms)`)
            }),
            Effect.tapError((error) => {
                const duration = Date.now() - startTime
                return Effect.logError(
                    `Failed: ${operationName} (${duration}ms)`
                ).pipe(Effect.annotateLogs({ error: String(error) }))
            })
        )

        return result
    })
}
