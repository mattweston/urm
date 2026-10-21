/**
 * # Migration Runner
 *
 * Applies pending migrations, one transaction each, recording them in
 * public.__drizzle_migrations.
 */
import { sql } from "drizzle-orm"
import * as Effect from "effect/Effect"
import type { DBShape } from "./database-service.ts"
import type { MigrationData } from "./migrator-loader.ts"

export const MIGRATIONS_SCHEMA = "public"

export const MIGRATIONS_TABLE = "__drizzle_migrations"

interface AppliedMigration {
    readonly [key: string]: unknown
    readonly id: number
    readonly hash: string
    readonly created_at: string
    readonly name: string | null
}

export interface MigrationRunResult {
    readonly loaded: number
    readonly pending: number
    readonly applied: number
}

const migrationsTable = () =>
    sql`${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)}`

const getMigrationsToRun = (
    local_migrations: ReadonlyArray<MigrationData>,
    db_migrations: ReadonlyArray<AppliedMigration>
): ReadonlyArray<MigrationData> => {
    const db_names = new Set(
        db_migrations
            .map((migration) => migration.name)
            .filter((name): name is string => name !== null)
    )

    // Compared by name only — the stored hash is never checked. Editing an
    // applied migration therefore changes its hash but still counts as applied,
    // so the edit silently never runs and two databases can hold the same
    // migration names with different schemas. Add a new migration instead.
    return local_migrations.filter((migration) => !db_names.has(migration.name))
}

export const runMigrations = (
    db: DBShape,
    migrations: ReadonlyArray<MigrationData>
) =>
    Effect.gen(function* () {
        yield* db.execute(sql`
            CREATE TABLE IF NOT EXISTS ${migrationsTable()} (
                id SERIAL PRIMARY KEY,
                hash text NOT NULL,
                created_at bigint,
                name text,
                applied_at timestamp with time zone DEFAULT now()
            )
        `)

        const { rows: db_migrations } = yield* db.execute<AppliedMigration>(sql`
            SELECT id, hash, created_at, name
            FROM ${migrationsTable()}
            ORDER BY id ASC
        `)

        const migrations_to_run = getMigrationsToRun(migrations, db_migrations)

        for (const migration of migrations_to_run) {
            yield* db.transaction((tx) =>
                Effect.gen(function* () {
                    console.log(`[migrator] applying ${migration.name}`)

                    for (const [
                        index,
                        statement,
                    ] of migration.sql_statements.entries()) {
                        if (statement.trim().length === 0) {
                            continue
                        }

                        const preview = statement.trim().slice(0, 100)
                        console.log(`[migrator]   [${index}] ${preview}`)

                        yield* tx.execute(sql.raw(statement)).pipe(
                            Effect.tapError((error) =>
                                Effect.sync(() => {
                                    const msg =
                                        error instanceof Error
                                            ? error.message
                                            : String(error)
                                    console.error(
                                        `[migrator] ERROR: ${migration.name} statement ${index} failed: ${msg}`
                                    )
                                })
                            )
                        )
                    }

                    yield* tx.execute(sql`
                        INSERT INTO ${migrationsTable()} (hash, created_at, name)
                        VALUES (${migration.hash}, ${migration.folder_millis}, ${migration.name})
                    `)

                    console.log(`[migrator] applied ${migration.name}`)
                })
            )
        }

        return {
            loaded: migrations.length,
            pending: migrations_to_run.length,
            applied: migrations_to_run.length,
        } satisfies MigrationRunResult
    })
