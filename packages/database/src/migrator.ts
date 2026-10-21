/**
 * # Migrator
 *
 * The migrator interface and service tag. Implementations live in
 * ./services/migrator-live.ts and ./services/migrator-environment.ts.
 */
import * as Effect from "effect/Effect"
import * as Context from "effect/Context"
import * as Schema from "effect/Schema"

export interface MigrationRunResult {
    readonly loaded: number
    readonly pending: number
    readonly applied: number
}

export class MigrationError extends Schema.TaggedError<MigrationError>()(
    "MigrationError",
    {
        operation: Schema.String,
        cause: Schema.String,
    }
) {
    override get message(): string {
        return `Migration ${this.operation} failed: ${this.cause}`
    }
}

export interface Migrator {
    readonly run: () => Effect.Effect<MigrationRunResult, MigrationError>
    readonly rollback: () => Effect.Effect<void, MigrationError>
    readonly status: () => Effect.Effect<
        { pending: number; applied: number },
        MigrationError
    >
}

export class MigratorService extends Context.Service<
    MigratorService,
    Migrator
>()("MigratorService") {}

export const migrator = () =>
    Effect.gen(function* () {
        const service = yield* MigratorService
        yield* Effect.log("Running database migrations...")
        yield* service.run()
        yield* Effect.log("Database migrations completed successfully")
    })

export const getMigrationStatus = () =>
    Effect.gen(function* () {
        const service = yield* MigratorService
        return yield* service.status()
    })

export const rollbackMigration = () =>
    Effect.gen(function* () {
        const service = yield* MigratorService
        yield* Effect.log("Rolling back last migration...")
        yield* service.rollback()
        yield* Effect.log("Migration rolled back")
    })

/*

1. Defines a `Migrator` interface with `run`, `rollback`, and `status` methods
2. Creates a MigratorService tag for dependency injection
3. Provides helper functions (`migrator`, `getMigrationStatus`, `rollbackMigration`) that use the service
4. Includes documentation about using drizzle-orm's migration API.

The file is essentially an Effect-based abstraction layer around drizzle migrations. It doesn't actually implement the drizzle-specific migration logic - that would be done separately by providing a live implementation of the Migrator interface.

Let me explain how this helps with postgres drizzle migrations.

This file provides an Effect-based abstraction layer for Drizzle migrations, but it doesn't contain the actual Drizzle implementation. Here's how it helps:

What it provides

1. Service Interface (Migrator)
- Defines the contract: `run()`, `rollback()`, `status()`
- Abstracts away the actual migration library (Drizzle)
2. Dependency Injection via `MigratorService`
- Uses Effect's context system for testability
- You can provide a mock implementation for tests or a real Drizzle implementation for production
3. Error Handling with `MigrationError`
- Typed errors using Effect's `Schema.TaggedError`
- Structured error info (`operation name`, `cause`)
How it connects to Drizzle
The actual Drizzle integration would be implemented separately, for example:
// In a live implementation file (not shown)
```ts
import { migrate } from "drizzle-orm/node-postgres/migrator"
const DrizzleMigratorLive = Layer.effect(
  MigratorService,
  Effect.gen(function* () {
    const db = yield* DatabaseService

    return {
      run: () => Effect.tryPromise({
        try: () => migrate(db, { migrationsFolder: "./migrations" }),
        catch: (error) => new MigrationError({
          operation: "run",
          cause: String(error)
        })
      }),
      // ... rollback, status implementations
    }
  })
)
```

The benefit
Your application code uses `yield* migrator()` without knowing about Drizzle. You can:
- Swap migration libraries without changing app code
- Test with mock implementations
- Handle errors in a typed, composable way

 */
