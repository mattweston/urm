/**
 * # Database Stage
 *
 * Staging PgClient and DB layers. Predates ./database-selector.ts and
 * duplicates its pool settings — prefer makeDatabaseLiveFromUrl.
 */
import * as PgDrizzle from "drizzle-orm/effect-postgres"
import { EffectLogger } from "drizzle-orm/effect-postgres"
import { PgClient } from "@effect/sql-pg"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { relations } from "../legacy-schema/relations.ts"
import { DB, type DBShape } from "./database-service.ts"

export const makePgClientStage = (database_url: string) =>
    PgClient.layer({
        url: Redacted.make(database_url),
        maxConnections: 15,
        idleTimeout: Duration.millis(60_000), // 60 seconds
        connectTimeout: Duration.millis(10_000), // 10 seconds
    })

export const makeDatabaseStageLive = (database_url: string) =>
    Layer.effect(
        DB,
        PgDrizzle.make({
            relations,
        }).pipe(Effect.map((db) => db as DBShape))
    ).pipe(
        Layer.provide(
            Layer.provideMerge(
                Layer.provideMerge(
                    PgDrizzle.DefaultServices,
                    makePgClientStage(database_url)
                ),
                EffectLogger.layer
            )
        )
    )

export type DatabaseStageLive = ReturnType<typeof makeDatabaseStageLive>
