/**
 * # Migrator Live
 *
 * Default MigratorService implementation, loading migrations from disk.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Path from "node:path"
import { fileURLToPath } from "node:url"
import { MigratorService, MigrationError, type Migrator } from "../migrator.ts"
import { DB } from "./database-service.ts"
import { runMigrations } from "./migration-runner.ts"
import {
    fromFileSystem,
    type MigrationLoaderError,
    type MigrationData,
} from "./migrator-loader.ts"

const toErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

// Resolved from this module's own location, which breaks under a bundler that
// flattens the layout; the cwd fallback only works when the process starts at
// the monorepo root. Bundled deployments should pass an explicit loader.
const getMigrationsFolder = (): string => {
    const metaUrl = import.meta.url

    if (metaUrl.startsWith("file://")) {
        const currentDir = Path.dirname(fileURLToPath(metaUrl))
        return Path.join(currentDir, "..", "migrations")
    }

    return Path.join(process.cwd(), "packages", "db", "src", "migrations")
}

export interface MigratorLiveOptions {
    loader?: Effect.Effect<ReadonlyArray<MigrationData>, MigrationLoaderError>
}

export const makeMigratorLive = (
    options?: MigratorLiveOptions
): Layer.Layer<MigratorService, MigrationError, DB> =>
    Layer.effect(
        MigratorService,
        Effect.gen(function* () {
            const db = yield* DB

            const loader =
                options?.loader ?? fromFileSystem(getMigrationsFolder())

            const migrator: Migrator = {
                run: () =>
                    Effect.gen(function* () {
                        console.log("[migrator] Loading migrations...")
                        const migrations = yield* loader.pipe(
                            Effect.mapError(
                                (error) =>
                                    new MigrationError({
                                        operation: "resolve-migrations-folder",
                                        cause: toErrorMessage(error),
                                    })
                            )
                        )
                        console.log(
                            "[migrator] Loaded",
                            migrations.length,
                            "migrations"
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
                            console.log(
                                "[migrator] Database schema already up to date."
                            )
                        } else {
                            console.log(
                                "[migrator] Applied",
                                result.applied,
                                "of",
                                result.loaded,
                                "loaded migrations."
                            )
                        }

                        return result
                    }),

                // Drizzle generates no down-migrations, so there is nothing to
                // run. Reverse a migration by writing a new forward one.
                rollback: () =>
                    Effect.fail(
                        new MigrationError({
                            operation: "rollback",
                            cause: "Rollback not implemented for Drizzle migrator",
                        })
                    ),

                // A stub, not a query: reports the same counts whether the
                // database is fully migrated or empty. Do not gate a deploy on
                // it.
                status: () =>
                    Effect.succeed({
                        pending: 0,
                        applied: 0,
                    }),
            }

            return migrator
        })
    )

export const MigratorLive = makeMigratorLive()

export const MigratorTest = Layer.succeed(MigratorService, {
    run: () => Effect.succeed({ loaded: 0, pending: 0, applied: 0 }),
    rollback: () => Effect.void,
    status: () => Effect.succeed({ pending: 0, applied: 1 }),
})
