/**
 * # Database Prod
 *
 * Production PgClient and DB layers. Predates ./database-selector.ts and
 * duplicates its pool settings — prefer makeDatabaseLiveFromUrl.
 */
import * as PgDrizzle from "drizzle-orm/effect-postgres"
import { PgClient } from "@effect/sql-pg"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { types } from "pg"
import { relations } from "../legacy-schema/relations.ts"
import { DB, type DBShape } from "./database-service.ts"

export const makePgClientProd = (database_url: string) =>
    PgClient.layer({
        url: Redacted.make(database_url),
        maxConnections: 25,
        idleTimeout: Duration.millis(120_000), // 120 seconds
        connectTimeout: Duration.millis(15_000), // 15 seconds
        types: {
            getTypeParser: (typeId: number, format?: string) => {
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

export const makeDatabaseProdLive = (database_url: string) =>
    Layer.effect(
        DB,
        PgDrizzle.make({
            relations,
        }).pipe(Effect.map((db) => db as DBShape))
    ).pipe(
        Layer.provide(
            Layer.provideMerge(
                PgDrizzle.DefaultServices,
                makePgClientProd(database_url)
            )
        )
    )

export type DatabaseProdLive = ReturnType<typeof makeDatabaseProdLive>
