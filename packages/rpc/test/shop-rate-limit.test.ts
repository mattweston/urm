import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import {
    AuthPersistence,
    type AuthRateLimitBucket,
} from "@urm/auth/auth-persistence"
import {
    allowCartMutation,
    allowCheckoutCreate,
} from "../src/handlers/shop-rate-limit.ts"

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

describe("public shop mutation rate limits", () => {
    it("limits repeated cart mutations for one domain and cart session", async () => {
        const results = await Effect.runPromise(
            Effect.all(
                Array.from({ length: 31 }, () =>
                    allowCartMutation(
                        "shop/cart/add",
                        "domain-1",
                        "cart-session-1"
                    )
                )
            ).pipe(Effect.provide(makeAuthPersistenceTestLive()))
        )

        expect(results.slice(0, 30).every((allowed) => allowed)).toBe(true)
        expect(results[30]).toBe(false)
    })

    it("keeps cart and checkout budgets scoped to their domain and cart session", async () => {
        const results = await Effect.runPromise(
            Effect.all([
                allowCartMutation(
                    "shop/cart/add",
                    "domain-1",
                    "cart-session-1"
                ),
                allowCartMutation(
                    "shop/cart/add",
                    "domain-2",
                    "cart-session-1"
                ),
                allowCartMutation(
                    "shop/cart/remove",
                    "domain-1",
                    "cart-session-1"
                ),
                allowCheckoutCreate("domain-1", "cart-session-1"),
                allowCheckoutCreate("domain-1", "cart-session-1"),
                allowCheckoutCreate("domain-1", "cart-session-1"),
                allowCheckoutCreate("domain-1", "cart-session-1"),
            ]).pipe(Effect.provide(makeAuthPersistenceTestLive()))
        )

        expect(results).toEqual([true, true, true, true, true, true, false])
    })
})
