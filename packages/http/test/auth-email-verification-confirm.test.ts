import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import {
    AuditEventPersistence,
    createEmailVerificationToken,
    ObservabilityLogPersistence,
} from "@urm/auth/legacy"
import {
    AuthPersistenceTestLive,
    AuthPersistenceTestState,
} from "../../auth/test/auth-persistence-test-layer.ts"
import { handleFallbackAuthRequest } from "../src/legacy-auth-web-handler.ts"

const AuditEventPersistenceTestLive = Layer.succeed(
    AuditEventPersistence,
    AuditEventPersistence.of({ write: () => Effect.void })
)

const ObservabilityLogPersistenceTestLive = Layer.succeed(
    ObservabilityLogPersistence,
    ObservabilityLogPersistence.of({ write: () => Effect.void })
)

const confirmRequest = (token: string) =>
    new Request("https://api.urm.dev/auth/email-verification/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
    })

describe("POST /auth/email-verification/confirm", () => {
    it.effect("rejects malformed JSON without verifying a contact", () =>
        Effect.gen(function* () {
            const state = yield* AuthPersistenceTestState
            const initial_verifications = state.verified_contact_ids.length
            const response = yield* handleFallbackAuthRequest(
                new Request(
                    "https://api.urm.dev/auth/email-verification/confirm",
                    {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: "{",
                    }
                )
            )

            assert.strictEqual(response.status, 400)
            assert.strictEqual(
                state.verified_contact_ids.length,
                initial_verifications
            )
        }).pipe(
            Effect.provide(
                Layer.merge(
                    Layer.merge(
                        AuthPersistenceTestLive,
                        AuditEventPersistenceTestLive
                    ),
                    ObservabilityLogPersistenceTestLive
                )
            )
        )
    )

    it.effect(
        "verifies a contact once and rejects invalid or replayed tokens without another mutation",
        () =>
            Effect.gen(function* () {
                const state = yield* AuthPersistenceTestState
                const initial_verifications = state.verified_contact_ids.length
                const token = yield* createEmailVerificationToken(
                    "contact-1",
                    "contact@example.com"
                )

                const first = yield* handleFallbackAuthRequest(
                    confirmRequest(token.token)
                )
                const replayed = yield* handleFallbackAuthRequest(
                    confirmRequest(token.token)
                )
                const invalid = yield* handleFallbackAuthRequest(
                    confirmRequest("invalid-verification-token")
                )

                assert.strictEqual(first.status, 200)
                assert.strictEqual(replayed.status, 400)
                assert.strictEqual(invalid.status, 400)
                assert.deepStrictEqual(
                    state.verified_contact_ids.slice(initial_verifications),
                    ["contact-1"]
                )
            }).pipe(
                Effect.provide(
                    Layer.merge(
                        Layer.merge(
                            AuthPersistenceTestLive,
                            AuditEventPersistenceTestLive
                        ),
                        ObservabilityLogPersistenceTestLive
                    )
                )
            )
    )
})
