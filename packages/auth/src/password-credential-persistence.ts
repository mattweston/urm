/**
 * # Password Credential Persistence
 *
 * Disable-then-insert credential replacement, behind a service so tests can
 * substitute it.
 */
import { and, eq, isNull } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import {
    DB,
    DatabaseOperationError,
    databaseOperationError,
    schema,
} from "@urm/db"

export type PasswordCredentialReplacement = Readonly<{
    contact_id: string
    password_hash: string
    algorithm: "scrypt"
    parameters: Readonly<{
        key_length: number
        salt: string
    }>
    now: number
}>

export type PasswordCredentialPersistenceShape = {
    readonly replace: (
        input: PasswordCredentialReplacement
    ) => Effect.Effect<void, DatabaseOperationError>
}

export class PasswordCredentialPersistence extends Context.Service<
    PasswordCredentialPersistence,
    PasswordCredentialPersistenceShape
>()("@urm/auth/PasswordCredentialPersistence") {}

export const PasswordCredentialPersistenceLive = Layer.effect(
    PasswordCredentialPersistence,
    Effect.gen(function* () {
        const db = yield* DB

        return PasswordCredentialPersistence.of({
            // Disable then insert, in that order: the partial unique index on
            // (contact_id) where disabled_at is null rejects an insert while an
            // active row remains. The two statements are not in a transaction,
            // so a failure between them leaves the contact with no active
            // credential — recoverable via password reset, but note that state
            // also makes them eligible for the demo-password fallback.
            replace: (input) =>
                Effect.gen(function* () {
                    yield* db
                        .update(schema.auth_password_credentials)
                        .set({
                            disabled_at: input.now,
                            updated_at: input.now,
                        })
                        .where(
                            and(
                                eq(
                                    schema.auth_password_credentials.contact_id,
                                    input.contact_id
                                ),
                                isNull(
                                    schema.auth_password_credentials.disabled_at
                                )
                            )
                        )

                    yield* db.insert(schema.auth_password_credentials).values({
                        contact_id: input.contact_id,
                        password_hash: input.password_hash,
                        algorithm: input.algorithm,
                        parameters: input.parameters,
                        created_at: input.now,
                        updated_at: input.now,
                    })
                }).pipe(
                    Effect.mapError((cause) =>
                        databaseOperationError(
                            "PasswordCredentialPersistence.replace",
                            "Failed to replace password credential",
                            cause
                        )
                    )
                ),
        })
    })
)
