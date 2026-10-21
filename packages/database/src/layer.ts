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
