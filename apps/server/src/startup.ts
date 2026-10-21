/**
 * # Startup
 *
 * Runs once before the server starts accepting requests.
 * Database migrations, health checks, seed data.
 */
import { Effect } from "effect"
import { MigratorService, loadEnvironmentConfig } from "@urm/db"
import { ensureUploadBucketCors } from "@urm/utils/upload"
import { runtimeCapabilities } from "./demo-runtime.ts"

export const startup = Effect.gen(function* () {
    yield* Effect.log("=== URM Server Startup ===")
    const environment = yield* loadEnvironmentConfig
    const capabilities = runtimeCapabilities(environment.is_demo)

    if (capabilities.upload_bucket_configuration_enabled) {
        yield* Effect.sync(() => {
            void ensureUploadBucketCors().catch(() => {
                console.warn("[startup] Upload bucket CORS setup skipped")
            })
        })
    }

    const migrator = yield* MigratorService
    yield* Effect.log("Running database migrations...")
    const migrationResult = yield* migrator.run()
    yield* Effect.log(
        migrationResult.applied === 0
            ? `Migrations complete: schema already up to date (${migrationResult.loaded} loaded)`
            : `Migrations complete: applied ${migrationResult.applied} of ${migrationResult.loaded} loaded`
    )

    // Future: seed data, health checks, cache warmup

    yield* Effect.log("=== Startup complete ===")
})
