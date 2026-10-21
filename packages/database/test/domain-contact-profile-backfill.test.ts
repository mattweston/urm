import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { runDomainContactProfileBackfill } from "../src/jobs/domain-contact-profile-backfill.ts"

describe("domain-contact profile backfill", () => {
    it.effect("stops once a partial batch shows there is no more work", () =>
        Effect.gen(function* () {
            const batches = [250, 41]
            let index = 0

            const result = yield* runDomainContactProfileBackfill(
                { batch_size: 250, max_batches: 20 },
                () =>
                    Effect.sync(() => {
                        const result = batches[index]
                        index += 1
                        return result === undefined ? 0 : result
                    })
            )

            expect(result).toEqual({
                batches: 2,
                rows_updated: 291,
                stopped: "exhausted",
            })
        })
    )

    it.effect("caps one invocation at its configured batch limit", () =>
        Effect.gen(function* () {
            let calls = 0

            const result = yield* runDomainContactProfileBackfill(
                { batch_size: 2, max_batches: 3 },
                () =>
                    Effect.sync(() => {
                        calls += 1
                        return 2
                    })
            )

            expect(calls).toBe(3)
            expect(result).toEqual({
                batches: 3,
                rows_updated: 6,
                stopped: "batch_limit",
            })
        })
    )
})
