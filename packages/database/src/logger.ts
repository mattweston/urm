/**
 * # Logger (stub)
 *
 * Descriptive constants only. `createLoggerLayer` here does nothing — the real
 * one is in ./services/database-logger.ts.
 */
import * as Effect from "effect/Effect"

export type LoggerStrategy = "none" | "effect" | "custom"

export const createLoggerLayer = (_strategy: LoggerStrategy = "none") => {
    // Logger layers are provided through Effect.provide()
    // Import the desired logger from 'drizzle-orm/effect-postgres' and provide it
    //
    // Example for "effect" strategy:
    // Effect.provide(EffectLogger.layer)
    //
    // This is implemented at the DB layer creation level, not here,
    // since each environment (dev/prod) needs different setup
    return Effect.void
}

export const DefaultLoggerConfig = {
    name: "DefaultLogger" as const,
    strategy: "none" as const,
    description: "No-op logger, suitable for production",
}

export const DevelopmentLoggerConfig = {
    name: "EffectLogger" as const,
    strategy: "effect" as const,
    description:
        "Effect-based logging with query annotations, suitable for development",
}

export const LoggerConfigs = {
    production: DefaultLoggerConfig,
    development: DevelopmentLoggerConfig,
} as const
