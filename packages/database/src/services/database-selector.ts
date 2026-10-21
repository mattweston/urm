/**
 * # Database Selector
 *
 * Picks the connection string and pool settings for the running environment
 * and provides `DB`. The layer almost everything should use.
 */
import * as PgDrizzle from "drizzle-orm/effect-postgres"
import { PgClient } from "@effect/sql-pg"
import type { SqlError } from "effect/unstable/sql/SqlError"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { types } from "pg"
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

    return PgClient.layer({
        url: Redacted.make(database_url),
        maxConnections: pool_config.maxConnections,
        idleTimeout: pool_config.idleTimeout,
        connectTimeout: pool_config.connectTimeout,
        types: {
            getTypeParser: (typeId: number, format?: string) => {
                // timestamptz, timestamp, date, interval and their array forms
                // are returned raw. node-postgres parses timestamptz through
                // the local timezone, so the same row read on two machines
                // yields two different instants. Passing the string through
                // keeps the value stable and leaves decoding to a schema —
                // but it means these columns are strings at runtime even
                // where Drizzle's inferred type says Date.
                if (
                    [
                        1184, 1114, 1082, 1186, 1231, 1115, 1185, 1187, 1182,
                    ].includes(typeId)
                ) {
                    return (val: unknown) => val
                }
                return types.getTypeParser(
                    typeId,
                    format as "text" | "binary" | undefined
                )
            },
        },
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
