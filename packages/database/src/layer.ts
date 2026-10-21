/**
 * # Layer (legacy)
 *
 * Older DB tag and layers, re-exported from the package as DBLegacy /
 * DatabaseLiveLegacy. New code should use ./services/database-service.ts.
 */
import * as PgDrizzle from "drizzle-orm/effect-postgres"
import { PgClient } from "@effect/sql-pg"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { types } from "pg"
import * as schema from "./legacy-schema/index.ts"
import { relations } from "./legacy-schema/relations.ts"

export { schema, relations }

// Reads DATABASE_URL at module scope — a variable URM never sets, since it uses
// DATABASE_URL_DEV/_STAGE/_PROD. The package re-exports this, so importing
// @urm/db evaluates it; nothing crashes only because the layer is lazy and the
// non-null assertion silences the type.
export const PgClientLive = PgClient.layer({
    url: Redacted.make(process.env.DATABASE_URL!),
    ssl: true,
    idleTimeout: "1 second",
    connectTimeout: "5 seconds",
    types: {
        getTypeParser: (typeId: number, format?: string) => {
            // Return raw values for date/time types to let Drizzle handle parsing
            // PostgreSQL type IDs:
            // 1184 = timestamp with time zone
            // 1114 = timestamp without time zone
            // 1082 = date
            // 1186 = interval
            // 1231 = ARRAY
            // 1115 = timestamp[] with tz
            // 1185 = timestamp[]
            // 1187 = interval[]
            // 1182 = date[]
            if (
                [1184, 1114, 1082, 1186, 1231, 1115, 1185, 1187, 1182].includes(
                    typeId
                )
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

export type DBShape = PgDrizzle.EffectPgDatabase<typeof relations> & {
    $client: PgClient.PgClient
}

// Same tag key as services/database-service.ts, so the two resolve to one
// context entry and either provider satisfies either consumer. Nothing links
// them — changing the key or the shape in one file breaks the pairing as a
// missing service at layer-build time, not a type error.
export class DB extends Context.Service<DB, DBShape>()("DB") {}

export const DatabaseLive = Layer.effect(
    DB,
    Effect.gen(function* () {
        return yield* PgDrizzle.make({
            relations,
        }).pipe(Effect.provide(PgDrizzle.DefaultServices))
    })
).pipe(Layer.provide(PgClientLive))

export const DatabaseMock = Layer.effect(
    DB,
    PgDrizzle.makeWithDefaults({ relations })
).pipe(Layer.provide(PgClientLive))
