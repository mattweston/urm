import { Context, Effect, Layer, Schema } from "effect"
import type { SQL } from "drizzle-orm"
import { DB } from "./services/database-service.ts"
import { database_error_code } from "./sql-error.ts"

// 'TaggedErrorClass' is deprecated.
export class SqlError extends Schema.TaggedError<SqlError>()("SqlError", {
    operation: Schema.String,
    code: Schema.optional(Schema.String),
}) {}

export interface SqlService {
    readonly query: (
        statement: SQL
    ) => Effect.Effect<ReadonlyArray<Record<string, unknown>>, SqlError>
    readonly transaction: <A, E, R>(
        effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, E | SqlError, R>
}

export class Sql extends Context.Service<Sql, SqlService>()("@urm/db/Sql") {}

export const SqlLive = Layer.effect(
    Sql,
    Effect.gen(function* () {
        const db = yield* DB
        return Sql.of({
            query: (statement) =>
                db.execute<Record<string, unknown>>(statement).pipe(
                    Effect.map((result) => result.rows),
                    Effect.mapError(
                        (error) =>
                            new SqlError({
                                operation: "query",
                                code: database_error_code(error),
                            })
                    )
                ),
            transaction: (effect) =>
                db
                    .transaction((tx) =>
                        effect.pipe(
                            Effect.provideService(Sql, {
                                query: (statement) =>
                                    tx
                                        .execute<Record<string, unknown>>(
                                            statement
                                        )
                                        .pipe(
                                            Effect.map(
                                                (result) => result.rows
                                            ),
                                            Effect.mapError(
                                                (error) =>
                                                    new SqlError({
                                                        operation:
                                                            "transaction_query",
                                                        code: database_error_code(
                                                            error
                                                        ),
                                                    })
                                            )
                                        ),
                                transaction: (nested) => nested,
                            })
                        )
                    )
                    .pipe(
                        Effect.catchTag("SqlError", (error) =>
                            Effect.fail(
                                error instanceof SqlError
                                    ? error
                                    : new SqlError({
                                          operation: "transaction",
                                          code: database_error_code(error),
                                      })
                            )
                        )
                    ),
        })
    })
)

export const query_rows = <A, I>(schema: Schema.Codec<A, I>, statement: SQL) =>
    Effect.gen(function* () {
        const db = yield* Sql
        const result = yield* db.query(statement)
        return yield* Schema.decodeUnknownEffect(Schema.Array(schema))(
            result
        ).pipe(Effect.mapError(() => new SqlError({ operation: "decode" })))
    })
