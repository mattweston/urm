import { sql } from "drizzle-orm"
import { Effect } from "effect"
import { Sql } from "@urm/db/sql"

/** Reports readiness only when the PostgreSQL connection can answer a query. */
export const handle_health_request: Effect.Effect<Response, never, Sql> =
    Effect.gen(function* () {
        const database = yield* Sql
        yield* database.query(sql`SELECT 1`)
        return Response.json(
            { status: "ready" },
            { headers: { "Cache-Control": "no-store" } }
        )
    }).pipe(
        Effect.catch(() =>
            Effect.succeed(
                Response.json(
                    { status: "unavailable" },
                    { status: 503, headers: { "Cache-Control": "no-store" } }
                )
            )
        )
    )
