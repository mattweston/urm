/**
 * # Auth Session Persistence
 *
 * Bulk session revocation, behind a service so tests can substitute it.
 */
import { and, eq, isNull } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import {
    DB,
    DatabaseOperationError,
    databaseOperationError,
    schema,
} from "@urm/db"

export type ContactAuthSessionRevocation = Readonly<{
    contact_id: string
    reason: string
    now: number
}>

export type AuthSessionPersistenceShape = {
    readonly revokeContactSessions: (
        input: ContactAuthSessionRevocation
    ) => Effect.Effect<
        { readonly revoked_count: number },
        DatabaseOperationError
    >
}

export class AuthSessionPersistence extends Context.Service<
    AuthSessionPersistence,
    AuthSessionPersistenceShape
>()("@urm/auth/AuthSessionPersistence") {}

export const AuthSessionPersistenceLive = Layer.effect(
    AuthSessionPersistence,
    Effect.gen(function* () {
        const db = yield* DB

        return AuthSessionPersistence.of({
            revokeContactSessions: (input) =>
                Effect.gen(function* () {
                    const revoked = yield* db
                        .update(schema.auth_sessions)
                        .set({
                            revoked_at: input.now,
                            revoked_reason: input.reason,
                            updated_at: input.now,
                        })
                        .where(
                            and(
                                eq(
                                    schema.auth_sessions.contact_id,
                                    input.contact_id
                                ),
                                isNull(schema.auth_sessions.revoked_at)
                            )
                        )
                        .returning({ id: schema.auth_sessions.id })

                    return { revoked_count: revoked.length }
                }).pipe(
                    Effect.mapError((cause) =>
                        databaseOperationError(
                            "AuthSessionPersistence.revokeContactSessions",
                            "Failed to revoke contact sessions",
                            cause
                        )
                    )
                ),
        })
    })
)
