import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { vi } from "vitest"
import {
    consumeEmailChangeToken,
    consumeEmailVerificationToken,
    createEmailChangeToken,
    createEmailVerificationToken,
    hashEmailVerificationToken,
    newEmailVerificationToken,
} from "../src/email-verification.ts"
import { AuthPersistenceTestLive } from "./auth-persistence-test-layer.ts"

describe("@urm/auth - email verification", () => {
    it("generates high-entropy url-safe tokens", () => {
        const first = newEmailVerificationToken()
        const second = newEmailVerificationToken()

        expect(first).not.toBe(second)
        expect(first.length).toBeGreaterThan(40)
        expect(first).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it("hashes tokens before storage", () => {
        const token = "email-verification-token"
        const hash = hashEmailVerificationToken(token)

        expect(hash).toHaveLength(64)
        expect(hash).not.toContain(token)
        expect(hashEmailVerificationToken(token)).toBe(hash)
    })

    it("consumes verification tokens once and separates email-change tokens", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        try {
            const result = await Effect.runPromise(
                Effect.gen(function* () {
                    const verification = yield* createEmailVerificationToken(
                        "contact-1",
                        "person@example.com"
                    )
                    const change = yield* createEmailChangeToken(
                        "contact-1",
                        "new@example.com"
                    )
                    const first = yield* consumeEmailVerificationToken(
                        verification.token
                    )
                    const replay = yield* consumeEmailVerificationToken(
                        verification.token
                    )
                    const wrongPurpose = yield* consumeEmailVerificationToken(
                        change.token
                    )
                    const changeResult = yield* consumeEmailChangeToken(
                        change.token
                    )
                    return { first, replay, wrongPurpose, changeResult }
                }).pipe(Effect.provide(AuthPersistenceTestLive))
            )

            expect(result.first?.email).toBe("person@example.com")
            expect(result.replay).toBeUndefined()
            expect(result.wrongPurpose).toBeUndefined()
            expect(result.changeResult?.email).toBe("new@example.com")
        } finally {
            vi.useRealTimers()
        }
    })
})
