/**
 * # Migrator Environment
 *
 * MigratorService that picks a strategy from the loaded environment config.
 */
import type { SqlError } from "effect/sql/SqlError"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { existsSync } from "node:fs"
import * as Path from "node:path"
import { fileURLToPath } from "node:url"
import type { Environment, EnvironmentConfig } from "../config/environment.ts"
import { loadEnvironmentConfig } from "../config/environment.ts"
import { MigratorService, MigrationError, type Migrator } from "../migrator.ts"
import { DB } from "./database-service.ts"
import { runMigrations } from "./migration-runner.ts"
import { fromFileSystem } from "./migrator-loader.ts"

export type MigrationStrategy = "migrations" | "skip"

// Every environment returns "migrations" — the "skip" branch is only reachable
// through the default case, which Environment makes unreachable. Kept for the
// point where an environment should stop self-migrating; today it decides
// nothing.
export const getMigrationStrategy = (env: Environment): MigrationStrategy => {
    switch (env) {
        case "development":
            return "migrations"
        case "staging":
        case "production":
            return "migrations"
        default:
            return "skip"
    }
}

const getMigrationsFolder = (): string => {
    const currentDir = Path.dirname(fileURLToPath(import.meta.url))
    const migrationsPath = Path.join(currentDir, "..", "migrations")
    return migrationsPath
}

const toErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

const checkMigrationsFolder = (): Effect.Effect<boolean, never, never> =>
    Effect.sync(() => {
        const migrationsFolder = getMigrationsFolder()
        return existsSync(migrationsFolder)
    })

const createSkipMigrator = (): Migrator => ({
    run: () =>
        Effect.gen(function* () {
            yield* Effect.log(
                "Skipping runtime migrations for this environment"
            )
            return { loaded: 0, pending: 0, applied: 0 }
        }),
    rollback: () =>
        Effect.fail(
            new MigrationError({
                operation: "rollback",
                cause: "Rollback not available in development mode",
            })
        ),
    status: () =>
        Effect.succeed({
            pending: 0,
            applied: 0,
        }),
})

export const MigratorEnvironmentLive = Layer.effect(
    MigratorService,
    Effect.gen(function* () {
        const config = yield* loadEnvironmentConfig
        const strategy = getMigrationStrategy(config.env)

        yield* Effect.log(`Migration strategy for ${config.env}: ${strategy}`)

        switch (strategy) {
            case "skip":
                return createSkipMigrator()

            case "migrations": {
                // Verify migrations folder exists before attempting to run
                const folder_exists = yield* checkMigrationsFolder()

                if (!folder_exists) {
                    yield* Effect.logError(
                        `Migrations folder not found: ${getMigrationsFolder()}`
                    )
                    return yield* Effect.fail(
                        new MigrationError({
                            operation: "check-migrations",
                            cause: "Migrations folder not found. Run 'drizzle-kit generate' first.",
                        })
                    )
                }

                const db = yield* DB
                const migrationsFolder = getMigrationsFolder()

                return {
                    run: () =>
                        Effect.gen(function* () {
                            const migrations = yield* fromFileSystem(
                                migrationsFolder
                            ).pipe(
                                Effect.mapError(
                                    (error) =>
                                        new MigrationError({
                                            operation:
                                                "resolve-migrations-folder",
                                            cause: toErrorMessage(error),
                                        })
                                )
                            )
                            const result = yield* runMigrations(
                                db,
                                migrations
                            ).pipe(
                                Effect.mapError(
                                    (error) =>
                                        new MigrationError({
                                            operation: "run",
                                            cause: toErrorMessage(error),
                                        })
                                )
                            )

                            if (result.applied === 0) {
                                yield* Effect.log(
                                    `Database schema already up to date from ${migrationsFolder}`
                                )
                            } else {
                                yield* Effect.log(
                                    `Applied ${result.applied} of ${result.loaded} loaded migrations from ${migrationsFolder}`
                                )
                            }

                            return result
                        }),

                    rollback: () =>
                        Effect.fail(
                            new MigrationError({
                                operation: "rollback",
                                cause: "Rollback not implemented",
                            })
                        ),

                    status: () =>
                        Effect.succeed({
                            pending: 0,
                            applied: 0,
                        }),
                } as Migrator
            }

            default:
                return createSkipMigrator()
        }
    })
)

export const makeMigratorLiveFromConfig = (
    config: EnvironmentConfig
): Layer.Layer<MigratorService, MigrationError | SqlError, DB> =>
    Layer.effect(
        MigratorService,
        Effect.gen(function* () {
            const strategy = getMigrationStrategy(config.env)
            const db = yield* DB

            if (strategy === "skip") {
                return createSkipMigrator()
            }

            const migrationsFolder = getMigrationsFolder()

            return {
                run: () =>
                    Effect.gen(function* () {
                        const migrations = yield* fromFileSystem(
                            migrationsFolder
                        ).pipe(
                            Effect.mapError(
                                (error) =>
                                    new MigrationError({
                                        operation: "resolve-migrations-folder",
                                        cause: toErrorMessage(error),
                                    })
                            )
                        )
                        return yield* runMigrations(db, migrations).pipe(
                            Effect.mapError(
                                (error) =>
                                    new MigrationError({
                                        operation: "run",
                                        cause: toErrorMessage(error),
                                    })
                            )
                        )
                    }),

                rollback: () =>
                    Effect.fail(
                        new MigrationError({
                            operation: "rollback",
                            cause: "Rollback not implemented",
                        })
                    ),

                status: () =>
                    Effect.succeed({
                        pending: 0,
                        applied: 0,
                    }),
            } as Migrator
        })
    )
