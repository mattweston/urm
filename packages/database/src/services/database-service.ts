/**
 * # Database Service
 *
 * The `DB` tag and its shape. Layers that provide it live in
 * ./database-selector.ts.
 */
import * as PgDrizzle from "drizzle-orm/effect-postgres"
import { PgClient } from "@effect/sql-pg"
import * as Context from "effect/Context"
import { relations } from "../legacy-schema/relations.ts"

export type DBShape = PgDrizzle.EffectPgDatabase<typeof relations> & {
    $client: PgClient.PgClient
}

export class DB extends Context.Service<DB, DBShape>()("DB") {}

export class DatabaseSelectorError {
    readonly _tag = "DatabaseSelectorError"
    readonly message: string
    readonly cause: unknown

    constructor(message: string, cause?: unknown) {
        this.message = message
        this.cause = cause
    }
}
