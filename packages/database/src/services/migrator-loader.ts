/**
 * # Migrator Loader
 *
 * Turns migration directories — from disk or a bundler glob — into
 * MigrationData.
 */
import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import * as Path from "node:path"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

export class MigrationLoaderError extends Schema.TaggedError<MigrationLoaderError>()(
    "MigrationLoaderError",
    {
        operation: Schema.String,
        reason: Schema.String,
        cause: Schema.optionalKey(Schema.Defect()),
    }
) {
    override get message(): string {
        return `${this.operation}: ${this.reason}`
    }
}

const loaderError = (
    operation: string,
    reason: string,
    cause?: unknown
): MigrationLoaderError =>
    cause === undefined
        ? new MigrationLoaderError({ operation, reason })
        : new MigrationLoaderError({ operation, reason, cause })

const isMigrationLoader = (value: unknown): value is () => Promise<unknown> =>
    typeof value === "function"

export interface MigrationData {
    readonly sql_statements: ReadonlyArray<string>
    readonly folder_millis: number
    readonly hash: string
    readonly name: string
}

const formatToMillis = (date_str: string): number => {
    const year = Number.parseInt(date_str.slice(0, 4), 10)
    const month = Number.parseInt(date_str.slice(4, 6), 10) - 1
    const day = Number.parseInt(date_str.slice(6, 8), 10)
    const hour = Number.parseInt(date_str.slice(8, 10), 10)
    const minute = Number.parseInt(date_str.slice(10, 12), 10)
    const second = Number.parseInt(date_str.slice(12, 14), 10)
    return Date.UTC(year, month, day, hour, minute, second)
}

export const fromFileSystem = (
    migrations_folder: string
): Effect.Effect<ReadonlyArray<MigrationData>, MigrationLoaderError> =>
    Effect.try({
        try: () => {
            if (
                existsSync(
                    Path.join(migrations_folder, "meta", "_journal.json")
                )
            ) {
                throw new Error(
                    "Detected old drizzle-kit migration folders. Upgrade drizzle-kit and run 'drizzle-kit up'."
                )
            }

            const migrations = readdirSync(migrations_folder)
                .map((subdir) => ({
                    name: subdir,
                    path: Path.join(migrations_folder, subdir, "migration.sql"),
                }))
                .filter((migration) => existsSync(migration.path))
                .sort((left, right) => left.name.localeCompare(right.name))

            return migrations.map((migration) => {
                const query = readFileSync(migration.path, "utf8")
                return {
                    sql_statements: query.split("--> statement-breakpoint"),
                    folder_millis: formatToMillis(migration.name.slice(0, 14)),
                    hash: createHash("sha256").update(query).digest("hex"),
                    name: migration.name,
                }
            })
        },
        catch: (cause) =>
            loaderError(
                "MigrationLoader.fromFileSystem",
                "Failed to load migrations from the filesystem",
                cause
            ),
    })

export const fromGlob = (
    modules: Record<string, unknown>
): Effect.Effect<ReadonlyArray<MigrationData>, MigrationLoaderError> =>
    Effect.gen(function* () {
        const entries = Object.entries(modules)
            .filter(([path]) => path.endsWith("/migration.sql"))
            .sort(([a], [b]) => a.localeCompare(b))

        const loaded: Array<MigrationData> = []

        for (const [path, mod] of entries) {
            const match = path.match(/\/(\d{14}_[^/]+)\/migration\.sql$/)
            if (!match || !match[1]) {
                return yield* Effect.fail(
                    loaderError(
                        "MigrationLoader.fromGlob",
                        `Invalid migration path: ${path}`
                    )
                )
            }
            const name = match[1]

            let query: string
            if (typeof mod === "string") {
                query = mod
            } else if (
                typeof mod === "object" &&
                mod !== null &&
                "default" in mod &&
                typeof mod.default === "string"
            ) {
                query = mod.default
            } else if (isMigrationLoader(mod)) {
                const loaded_module = yield* Effect.tryPromise({
                    try: () => mod(),
                    catch: (cause) =>
                        loaderError(
                            "MigrationLoader.fromGlob",
                            `Failed to load migration module at ${path}`,
                            cause
                        ),
                })
                query = yield* Schema.decodeUnknownEffect(Schema.String)(
                    loaded_module
                ).pipe(
                    Effect.mapError((cause) =>
                        loaderError(
                            "MigrationLoader.fromGlob",
                            `Migration module at ${path} did not return SQL text`,
                            cause
                        )
                    )
                )
            } else {
                return yield* Effect.fail(
                    loaderError(
                        "MigrationLoader.fromGlob",
                        `Unexpected migration module type at ${path}: ${typeof mod}`
                    )
                )
            }

            loaded.push({
                sql_statements: query.split("--> statement-breakpoint"),
                folder_millis: formatToMillis(name.slice(0, 14)),
                hash: createHash("sha256").update(query).digest("hex"),
                name,
            })
        }

        return loaded
    })
