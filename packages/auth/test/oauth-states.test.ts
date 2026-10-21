import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { vi } from "vitest"
import {
    consumeOAuthState,
    createOAuthState,
    hashOAuthStateValue,
    OAUTH_STATE_TTL_MS,
} from "../src/oauth-states.ts"
import { AuthPersistenceTestLive } from "./auth-persistence-test-layer.ts"

describe("@urm/auth - oauth states", () => {
    it("hashes OAuth state values before storage", () => {
        const hash = hashOAuthStateValue("oauth-state-token")

        expect(hash).toHaveLength(64)
        expect(hash).not.toContain("oauth-state-token")
        expect(hashOAuthStateValue("oauth-state-token")).toBe(hash)
    })

    it("uses short-lived OAuth state rows", () => {
        expect(OAUTH_STATE_TTL_MS).toBe(1000 * 60 * 10)
    })

    it("requires matching provider and verifier and rejects replays", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        try {
            const result = await Effect.runPromise(
                Effect.gen(function* () {
                    yield* createOAuthState("google", "state", "verifier", {
                        redirect_to: "/account",
                    })
                    const wrongProvider = yield* consumeOAuthState(
                        "github",
                        "state",
                        "verifier"
                    )
                    const wrongVerifier = yield* consumeOAuthState(
                        "google",
                        "state",
                        "other-verifier"
                    )
                    const consumed = yield* consumeOAuthState(
                        "google",
                        "state",
                        "verifier"
                    )
                    const replay = yield* consumeOAuthState(
                        "google",
                        "state",
                        "verifier"
                    )
                    return { wrongProvider, wrongVerifier, consumed, replay }
                }).pipe(Effect.provide(AuthPersistenceTestLive))
            )

            expect(result.wrongProvider).toBeUndefined()
            expect(result.wrongVerifier).toBeUndefined()
            expect(result.consumed?.redirect_to).toBe("/account")
            expect(result.replay).toBeUndefined()
        } finally {
            vi.useRealTimers()
        }
    })

    it("rejects an expired state before it can be consumed", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        try {
            const result = await Effect.runPromise(
                Effect.gen(function* () {
                    yield* createOAuthState("google", "state", "verifier", {
                        redirect_to: "/account",
                    })
                    vi.setSystemTime(new Date(Date.now() + OAUTH_STATE_TTL_MS))
                    return yield* consumeOAuthState(
                        "google",
                        "state",
                        "verifier"
                    )
                }).pipe(Effect.provide(AuthPersistenceTestLive))
            )

            expect(result).toBeUndefined()
        } finally {
            vi.useRealTimers()
        }
    })
})
