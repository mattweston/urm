/**
 * # `runMigrations`
 *
 * Execute pending migrations against the database.
 *
 * Expects migration data already loaded (e.g. via `fromFileSystem` or `fromGlob`).
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

        const db_migrations = yield* db.execute<AppliedMigration>(sql`
            SELECT id, hash, created_at, name
            FROM ${migrationsTable()}
            ORDER BY id ASC
        `)

        const migrations_to_run = getMigrationsToRun(migrations, db_migrations)

        yield* db.transaction((tx) =>
            Effect.gen(function* () {
                for (const migration of migrations_to_run) {
                    for (const statement of migration.sql_statements) {
                        if (statement.trim().length === 0) {
                            continue
                        }

                        yield* tx.execute(sql.raw(statement))
                    }

                    yield* tx.execute(sql`
                        INSERT INTO ${migrationsTable()} (hash, created_at, name)
                        VALUES (${migration.hash}, ${migration.folder_millis}, ${migration.name})
                    `)
                }
            })
        )
    })
