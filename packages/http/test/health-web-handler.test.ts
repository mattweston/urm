import { Effect } from "effect"
import { expect, test } from "vitest"
import { Sql, SqlError } from "@urm/db/sql"
import { handle_health_request } from "../src/health-web-handler.ts"

test("health responds ready when PostgreSQL answers", async () => {
    const response = await Effect.runPromise(
        handle_health_request.pipe(
            Effect.provideService(
                Sql,
                Sql.of({
                    query: () => Effect.succeed([]),
                    transaction: (effect) => effect,
                })
            )
        )
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(await response.json()).toEqual({ status: "ready" })
})

test("health responds unavailable when PostgreSQL fails", async () => {
    const response = await Effect.runPromise(
        handle_health_request.pipe(
            Effect.provideService(
                Sql,
                Sql.of({
                    query: () =>
                        Effect.fail(new SqlError({ operation: "query" })),
                    transaction: (effect) => effect,
                })
            )
        )
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ status: "unavailable" })
})
