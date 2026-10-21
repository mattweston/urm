import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import {
    AuthPersistence,
    type AuthRateLimitBucket,
} from "@urm/auth/auth-persistence"
import { allowNewsletterSend } from "../src/handlers/newsletter-rate-limit.ts"

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

describe("newsletter send rate limit", () => {
    it("limits repeated sends by the same sender in the same scope", async () => {
        const result = await Effect.runPromise(
            Effect.all([
                allowNewsletterSend(
                    "mail/newsletter/send",
                    "domain-1",
                    "contact-1"
                ),
                allowNewsletterSend(
                    "mail/newsletter/send",
                    "domain-1",
                    "contact-1"
                ),
                allowNewsletterSend(
                    "mail/newsletter/send",
                    "domain-1",
                    "contact-1"
                ),
                allowNewsletterSend(
                    "mail/newsletter/send",
                    "domain-1",
                    "contact-1"
                ),
            ]).pipe(Effect.provide(makeAuthPersistenceTestLive()))
        )

        expect(result).toEqual([true, true, true, false])
    })

    it("does not let one sender consume another scope's limit", async () => {
        const result = await Effect.runPromise(
            Effect.all([
                allowNewsletterSend(
                    "mail/newsletter/send",
                    "domain-1",
                    "contact-1"
                ),
                allowNewsletterSend(
                    "mail/newsletter/send",
                    "domain-2",
                    "contact-1"
                ),
                allowNewsletterSend(
                    "platform/newsletter/send",
                    "platform",
                    "contact-1"
                ),
            ]).pipe(Effect.provide(makeAuthPersistenceTestLive()))
        )

        expect(result).toEqual([true, true, true])
    })
})
