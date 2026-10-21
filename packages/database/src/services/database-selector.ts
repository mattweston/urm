/**
 * # Database Selector
 *
 * Picks the connection string and pool settings for the running environment
 * and provides `DB`. The layer almost everything should use.
 */
import * as PgDrizzle from "drizzle-orm/effect-postgres"
import { PgClient } from "@effect/sql-pg"
import type { SqlError } from "effect/sql/SqlError"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { relations } from "../legacy-schema/relations.ts"
import type { ConfigError } from "../config/environment.ts"
import {
    loadEnvironmentConfig,
    getDemoDatabaseUrl,
    type Environment,
} from "../config/environment.ts"
import { DB, DatabaseSelectorError, type DBShape } from "./database-service.ts"
import { createLoggerLayer } from "./database-logger.ts"
const POOL_CONFIGS: Record<
    Environment,
    {
        maxConnections: number
        idleTimeout: Duration.Duration
        connectTimeout: Duration.Duration
    }
> = {
    development: {
        maxConnections: 10,
        idleTimeout: Duration.millis(30_000),
        connectTimeout: Duration.millis(5_000),
    },
    staging: {
        maxConnections: 15,
        idleTimeout: Duration.millis(60_000),
        connectTimeout: Duration.millis(10_000),
    },
    production: {
        maxConnections: 25,
        idleTimeout: Duration.millis(120_000),
        connectTimeout: Duration.millis(15_000),
    },
}

const makePgClientLayer = (
    database_url: string,
    env: Environment
): Layer.Layer<PgClient.PgClient, SqlError, never> => {
    const pool_config = POOL_CONFIGS[env]

    // No `types` override. This used to pass timestamptz, timestamp, date,
    // interval and their array forms through raw, because node-postgres parsed
    // timestamptz via the local timezone and the same row read on two machines
    // gave two different instants. @effect/sql-pg 4.0.5 speaks the wire
    // protocol itself and documents that timestamptz round trips preserve the
    // instant regardless of session timezone, so the workaround went with the
    // driver — and these columns are now Date at runtime, matching Drizzle's
    // inferred type instead of contradicting it.
    return PgClient.layer({
        url: Redacted.make(database_url),
        maxConnections: pool_config.maxConnections,
        idleTimeout: pool_config.idleTimeout,
        connectTimeout: pool_config.connectTimeout,
    })
}

const makeDatabaseLayer = (
    pg_layer: Layer.Layer<PgClient.PgClient, SqlError, never>,
    logger_layer: Layer.Layer<never, never, never> | undefined
): Layer.Layer<DB, DatabaseSelectorError | SqlError, never> => {
    const base_layers = Layer.provideMerge(PgDrizzle.DefaultServices, pg_layer)

    const full_layer = logger_layer
        ? Layer.provideMerge(base_layers, logger_layer)
        : base_layers

    return Layer.effect(
        DB,
        PgDrizzle.make({
            relations,
        }).pipe(
            Effect.map((db) => db as DBShape),
            Effect.mapError(
                (error) =>
                    new DatabaseSelectorError(
                        "Failed to create database",
                        error
                    )
            )
        )
    ).pipe(Layer.provide(full_layer))
}

export const DatabaseLive: Layer.Layer<
    DB,
    DatabaseSelectorError | ConfigError | SqlError,
    never
> = Layer.unwrap(
    Effect.gen(function* () {
        const config = yield* loadEnvironmentConfig.pipe(
            Effect.mapError(
                (error) =>
                    new DatabaseSelectorError(
                        `Failed to load environment config: ${error.message}`,
                        error
                    )
            )
        )

        const database_url = config.is_demo
            ? yield* getDemoDatabaseUrl.pipe(
                  Effect.flatMap((option) =>
                      option._tag === "Some"
                          ? Effect.succeed(option.value)
                          : Effect.fail(
                                new DatabaseSelectorError(
                                    "DATABASE_URL_DEMO not set for demo deployment"
                                )
                            )
                  )
              )
            : config.database_url
        const database_environment = config.is_demo ? "staging" : config.env

        // Demo deployments always connect to their dedicated demo
        // database. Failing above rather than falling back to the primary
        // URL is deliberate: demo mode reseeds, so a silent fallback would
        // point a destructive workload at real data.
        const pg_layer = makePgClientLayer(database_url, database_environment)
        const logger_layer = createLoggerLayer(database_environment)

        return makeDatabaseLayer(pg_layer, logger_layer)
    })
)

export const DatabaseDemoLive: Layer.Layer<
    DB,
    DatabaseSelectorError | ConfigError | SqlError,
    never
> = Layer.unwrap(
    Effect.gen(function* () {
        const demo_url = yield* getDemoDatabaseUrl.pipe(
            Effect.flatMap((option) =>
                option._tag === "Some"
                    ? Effect.succeed(option.value)
                    : Effect.fail(
                          new DatabaseSelectorError("DATABASE_URL_DEMO not set")
                      )
            )
        )

        // Use staging config for demo (with staging logging)
        const pg_layer = makePgClientLayer(demo_url, "staging")
        const logger_layer = createLoggerLayer("staging")

        return makeDatabaseLayer(pg_layer, logger_layer)
    })
)

export const makeDatabaseLiveFromUrl = (
    database_url: string,
    env: Environment
): Layer.Layer<DB, DatabaseSelectorError | SqlError, never> =>
    makeDatabaseLayer(
        makePgClientLayer(database_url, env),
        createLoggerLayer(env)
    )

export { DB, DatabaseSelectorError, type DBShape } from "./database-service.ts"
