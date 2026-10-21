import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { vi } from "vitest"
import {
    consumePasswordResetToken,
    createPasswordResetToken,
    hashPasswordResetToken,
    newPasswordResetToken,
} from "../src/password-reset.ts"
import { AuthPersistenceTestLive } from "./auth-persistence-test-layer.ts"

describe("@urm/auth - password reset", () => {
    it("generates high-entropy url-safe tokens", () => {
        const first = newPasswordResetToken()
        const second = newPasswordResetToken()

        expect(first).not.toBe(second)
        expect(first.length).toBeGreaterThan(40)
        expect(first).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it("hashes tokens before storage", () => {
        const token = "password-reset-token"
        const hash = hashPasswordResetToken(token)

        expect(hash).toHaveLength(64)
        expect(hash).not.toContain(token)
        expect(hashPasswordResetToken(token)).toBe(hash)
    })

    it("consumes a token once and rejects replays", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        try {
            const result = await Effect.runPromise(
                Effect.gen(function* () {
                    const created = yield* createPasswordResetToken(
                        "contact-1",
                        "person@example.com"
                    )
                    const first = yield* consumePasswordResetToken(
                        created.token
                    )
                    const replay = yield* consumePasswordResetToken(
                        created.token
                    )
                    return { first, replay }
                }).pipe(Effect.provide(AuthPersistenceTestLive))
            )

            expect(result.first?.contact_id).toBe("contact-1")
            expect(result.replay).toBeUndefined()
        } finally {
            vi.useRealTimers()
        }
    })
})
