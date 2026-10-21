import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import {
    AuthSessionPersistence,
    revokeContactAuthSessions,
    type ContactAuthSessionRevocation,
} from "@urm/auth/legacy"

type Session = {
    id: string
    contact_id: string
    revoked?: ContactAuthSessionRevocation
}

const authSessionPersistenceTestLayer = (sessions: Array<Session>) =>
    Layer.succeed(
        AuthSessionPersistence,
        AuthSessionPersistence.of({
            revokeContactSessions: (revocation) =>
                Effect.sync(() => {
                    const active_sessions = sessions.filter(
                        (session) =>
                            session.contact_id === revocation.contact_id &&
                            session.revoked === undefined
                    )

                    for (const session of active_sessions) {
                        session.revoked = revocation
                    }

                    return { revoked_count: active_sessions.length }
                }),
        })
    )

describe("contact session revocation", () => {
    it.effect("revokes only the contact's active sessions", () => {
        const sessions: Array<Session> = [
            { id: "active-1", contact_id: "contact-1" },
            {
                id: "already-revoked",
                contact_id: "contact-1",
                revoked: { contact_id: "contact-1", reason: "logout", now: 1 },
            },
            { id: "other-contact", contact_id: "contact-2" },
        ]

        return Effect.gen(function* () {
            const result = yield* revokeContactAuthSessions(
                "contact-1",
                "password_reset"
            )

            assert.strictEqual(result.revoked_count, 1)
            assert.strictEqual(sessions[0]?.revoked?.reason, "password_reset")
            assert.strictEqual(sessions[1]?.revoked?.reason, "logout")
            assert.strictEqual(sessions[2]?.revoked, undefined)
        }).pipe(Effect.provide(authSessionPersistenceTestLayer(sessions)))
    })
})
