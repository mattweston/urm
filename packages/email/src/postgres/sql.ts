import { Context, Effect, Layer, Schema } from "effect"
import type { SQL } from "drizzle-orm"
import { DB, type DBShape } from "@urm/database/services/database-service"

export class EmailPersistenceError extends Schema.TaggedError<EmailPersistenceError>()(
    "EmailPersistenceError",
    {
        operation: Schema.String,
    }
) {}

export interface EmailSqlService {
    readonly query: (
        statement: SQL
    ) => Effect.Effect<
        ReadonlyArray<Record<string, unknown>>,
        EmailPersistenceError
    >
    readonly transaction: <A, E, R>(
        effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, E | EmailPersistenceError, R>
}

export class EmailSql extends Context.Service<EmailSql, EmailSqlService>()(
    "@urm/email/EmailSql"
) {}

const service = (db: DBShape): EmailSqlService => ({
    query: (statement) =>
        db
            .execute<Record<string, unknown>>(statement)
            .pipe(
                Effect.map((result) => result.rows),
                Effect.mapError(
                    () => new EmailPersistenceError({ operation: "query" })
                )
            ),
    transaction: (effect) =>
        db
            .transaction((tx) =>
                effect.pipe(
                    Effect.provideService(EmailSql, {
                        query: (statement) =>
                            tx
                                .execute<Record<string, unknown>>(statement)
                                .pipe(
                                    Effect.map((result) => result.rows),
                                    Effect.mapError(
                                        () =>
                                            new EmailPersistenceError({
                                                operation: "transaction_query",
                                            })
                                    )
                                ),
                        transaction: (nested) => nested,
                    })
                )
            )
            .pipe(
                Effect.catchTag("SqlError", () =>
                    Effect.fail(
                        new EmailPersistenceError({ operation: "transaction" })
                    )
                )
            ),
})

export const EmailSqlLive = Layer.effect(EmailSql, Effect.map(DB, service))

export const rows = <A, I>(schema: Schema.Codec<A, I>, statement: SQL) =>
    Effect.gen(function* () {
        const db = yield* EmailSql
        const result = yield* db.query(statement)
        return yield* Schema.decodeUnknownEffect(Schema.Array(schema))(
            result
        ).pipe(
            Effect.mapError(
                () => new EmailPersistenceError({ operation: "decode" })
            )
        )
    })
