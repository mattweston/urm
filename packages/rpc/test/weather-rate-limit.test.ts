import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import {
    AuthPersistence,
    type AuthRateLimitBucket,
} from "@urm/auth/auth-persistence"
import { allowWeatherRequest } from "../src/handlers/weather-rate-limit.ts"

type StoredBucket = AuthRateLimitBucket & {
    readonly key: string
    readonly route: string
    readonly window_start: number
}

const bucket_key = (key: string, route: string, window_start: number): string =>
    `${key}:${route}:${window_start}`

const makeAuthPersistenceTestLive = () => {
    const buckets = new Map<string, StoredBucket>()

    return Layer.mock(AuthPersistence, {
        findRateLimitBucket: (key, route, window_start) =>
            Effect.sync(() =>
                buckets.get(bucket_key(key, route, window_start))
            ),
        createRateLimitBucket: (input) =>
            Effect.sync(() => {
                const id = bucket_key(
                    input.key,
                    input.route,
                    input.window_start
                )
                buckets.set(id, {
                    id,
                    key: input.key,
                    route: input.route,
                    window_start: input.window_start,
                    count: 1,
                })
            }),
        updateRateLimitBucket: (id, count, blocked_until) =>
            Effect.sync(() => {
                const current = buckets.get(id)

                if (current !== undefined) {
                    buckets.set(id, {
                        ...current,
                        count,
                        ...(blocked_until === undefined
                            ? {}
                            : { blocked_until }),
                    })
                }
            }),
        recordRateLimitDenied: () => Effect.void,
    })
}

describe("weather rate limits", () => {
    it("limits one public hostname without consuming another hostname's budget", async () => {
        const results = await Effect.runPromise(
            Effect.all([
                ...Array.from({ length: 61 }, () =>
                    allowWeatherRequest(
                        "weather/public/get_current",
                        "test.localhost"
                    )
                ),
                allowWeatherRequest(
                    "weather/public/get_current",
                    "other.localhost"
                ),
            ]).pipe(Effect.provide(makeAuthPersistenceTestLive()))
        )

        expect(results.slice(0, 60).every((allowed) => allowed)).toBe(true)
        expect(results[60]).toBe(false)
        expect(results[61]).toBe(true)
    })

    it("keeps authenticated and public weather budgets separate", async () => {
        const results = await Effect.runPromise(
            Effect.all([
                allowWeatherRequest(
                    "weather/authenticated/get_current",
                    "contact-1"
                ),
                allowWeatherRequest("weather/public/get_current", "contact-1"),
            ]).pipe(Effect.provide(makeAuthPersistenceTestLive()))
        )

        expect(results).toEqual([true, true])
    })
})
