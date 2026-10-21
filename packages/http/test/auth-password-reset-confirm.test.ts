import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import {
    AuthSessionPersistence,
    PasswordCredentialPersistence,
    createPasswordResetToken,
    verifyPasswordHash,
    type ContactAuthSessionRevocation,
    type PasswordCredentialReplacement,
} from "@urm/auth/legacy"
import { AuthPersistenceTestLive } from "../../auth/test/auth-persistence-test-layer.ts"
import { AuthConfig, ServerConfig } from "@urm/env/server"
import { EmailTransport } from "@urm/email"
import {
    handleFallbackAuthRequest,
    PasswordResetConfirmationLive,
} from "../src/legacy-auth-web-handler.ts"

type ConfirmationState = {
    credentials: Array<PasswordCredentialReplacement>
    sessions: Array<{
        id: string
        contact_id: string
        revoked?: ContactAuthSessionRevocation
    }>
}

const passwordCredentialPersistenceTestLayer = (state: ConfirmationState) =>
    Layer.succeed(
        PasswordCredentialPersistence,
        PasswordCredentialPersistence.of({
            replace: (credential) =>
                Effect.sync(() => {
                    state.credentials.push(credential)
                }),
        })
    )

const authSessionPersistenceTestLayer = (state: ConfirmationState) =>
    Layer.succeed(
        AuthSessionPersistence,
        AuthSessionPersistence.of({
            revokeContactSessions: (revocation) =>
                Effect.sync(() => {
                    const sessions = state.sessions.filter(
                        (session) =>
                            session.contact_id === revocation.contact_id &&
                            session.revoked === undefined
                    )

                    for (const session of sessions) {
                        session.revoked = revocation
                    }

                    return { revoked_count: sessions.length }
                }),
        })
    )

const AuthConfigTestLive = Layer.succeed(
    AuthConfig,
    AuthConfig.of({
        authSecret: Redacted.make("test-secret"),
        demoCredentialsEnabled: true,
        googleClientId: "",
        googleClientSecret: Redacted.make(""),
        pwnedPasswordsEnabled: false,
        pwnedPasswordsFailClosed: false,
        pwnedPasswordsTimeoutMs: 1,
        pwnedPasswordsCacheTtlMs: 1,
        sessionInactivityTimeoutMs: 1,
        sessionAbsoluteMaxLifetimeMs: 1,
        recentAuthTimeoutMs: 1,
        domainWorkerToken: Redacted.make(""),
    })
)

const ServerConfigTestLive = Layer.succeed(
    ServerConfig,
    ServerConfig.of({
        port: 1234,
        hostname: "localhost",
        apiUrl: "https://api.urm.dev",
        appUrl: "https://urm.dev",
        adminAppUrl: "https://admin.urm.dev",
        marketingAppUrl: "https://urm.dev",
        cookieDomain: "",
    })
)

const EmailTransportTestLive = Layer.succeed(
    EmailTransport,
    EmailTransport.of({
        send: () => Effect.succeed({ status: "skipped", reason: "disabled" }),
    })
)

const confirmationLayer = (state: ConfirmationState) =>
    Layer.merge(
        Layer.merge(
            Layer.merge(
                AuthPersistenceTestLive,
                passwordCredentialPersistenceTestLayer(state)
            ),
            authSessionPersistenceTestLayer(state)
        ),
        Layer.merge(
            Layer.merge(AuthConfigTestLive, ServerConfigTestLive),
            Layer.merge(EmailTransportTestLive, PasswordResetConfirmationLive)
        )
    )

const confirmRequest = (token: string) =>
    new Request("https://api.urm.dev/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            token,
            password: "correct horse battery staple",
        }),
    })

describe("POST /auth/password-reset/confirm", () => {
    it.effect(
        "consumes a valid token, records a credential, and revokes sessions",
        () => {
            const state: ConfirmationState = {
                credentials: [],
                sessions: [
                    { id: "session-1", contact_id: "contact-1" },
                    { id: "session-2", contact_id: "contact-1" },
                ],
            }

            return Effect.gen(function* () {
                const token = yield* createPasswordResetToken(
                    "contact-1",
                    "contact@example.com"
                )
                const response = yield* handleFallbackAuthRequest(
                    confirmRequest(token.token)
                )

                assert.strictEqual(response.status, 200)
                assert.strictEqual(state.credentials.length, 1)
                const credential = state.credentials[0]
                if (credential === undefined) {
                    throw new Error("Expected a replacement credential")
                }
                assert.strictEqual(credential.contact_id, "contact-1")
                assert.strictEqual(
                    yield* verifyPasswordHash(
                        "correct horse battery staple",
                        credential
                    ),
                    true
                )
                assert.deepStrictEqual(
                    state.sessions.map((session) => session.revoked?.reason),
                    ["password_reset", "password_reset"]
                )
            }).pipe(Effect.provide(confirmationLayer(state)))
        }
    )

    it.effect(
        "rejects invalid and replayed tokens without additional mutations",
        () => {
            const state: ConfirmationState = {
                credentials: [],
                sessions: [
                    { id: "session-1", contact_id: "contact-1" },
                    { id: "session-2", contact_id: "contact-1" },
                ],
            }

            return Effect.gen(function* () {
                const token = yield* createPasswordResetToken(
                    "contact-1",
                    "contact@example.com"
                )
                const invalid = yield* handleFallbackAuthRequest(
                    confirmRequest("invalid-reset-token")
                )

                assert.strictEqual(invalid.status, 400)
                assert.deepStrictEqual(state.credentials, [])
                assert.deepStrictEqual(
                    state.sessions.map((session) => session.revoked),
                    [undefined, undefined]
                )

                const first = yield* handleFallbackAuthRequest(
                    confirmRequest(token.token)
                )
                const replayed = yield* handleFallbackAuthRequest(
                    confirmRequest(token.token)
                )

                assert.strictEqual(first.status, 200)
                assert.strictEqual(replayed.status, 400)
                assert.strictEqual(state.credentials.length, 1)
                assert.deepStrictEqual(
                    state.sessions.map((session) => session.revoked?.reason),
                    ["password_reset", "password_reset"]
                )
            }).pipe(Effect.provide(confirmationLayer(state)))
        }
    )
})
