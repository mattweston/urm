import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { vi } from "vitest"
import {
    authRateLimitKey,
    authRateLimitWindowStart,
    checkAuthRateLimit,
} from "../src/rate-limiter.ts"
import { AuthPersistenceTestLive } from "./auth-persistence-test-layer.ts"

describe("@urm/auth - rate limiter", () => {
    it("builds stable hashed keys", () => {
        const first = authRateLimitKey(["login", "ip-hash", "email-hash"])
        const second = authRateLimitKey(["login", "ip-hash", "email-hash"])

        expect(first).toBe(second)
        expect(first).toHaveLength(64)
        expect(first).not.toContain("email-hash")
    })

    it("calculates fixed window starts", () => {
        expect(authRateLimitWindowStart(10_999, 10)).toBe(10_000)
        expect(authRateLimitWindowStart(20_000, 10)).toBe(20_000)
    })

    it("allows the first request, blocks over the limit, reports retry-after, and starts a new window", async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
        const input = {
            route: "login",
            key: "key",
            limit: 2,
            window_seconds: 10,
            block_seconds: 30,
        }
        try {
            const result = await Effect.runPromise(
                Effect.gen(function* () {
                    const first = yield* checkAuthRateLimit(input)
                    const second = yield* checkAuthRateLimit(input)
                    const blocked = yield* checkAuthRateLimit(input)
                    const blockedAgain = yield* checkAuthRateLimit(input)
                    vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"))
                    const newWindow = yield* checkAuthRateLimit(input)
                    return { first, second, blocked, blockedAgain, newWindow }
                }).pipe(Effect.provide(AuthPersistenceTestLive))
            )

            expect(result.first).toEqual({ allowed: true })
            expect(result.second).toEqual({ allowed: true })
            expect(result.blocked).toEqual({
                allowed: false,
                retry_after_seconds: 30,
            })
            expect(result.blockedAgain).toEqual({
                allowed: false,
                retry_after_seconds: 30,
            })
            expect(result.newWindow).toEqual({ allowed: true })
        } finally {
            vi.useRealTimers()
        }
    })
})
