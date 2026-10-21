import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { resolveEmailDeliveryOutcome } from "../src/legacy-auth-web-handler.ts"

describe("auth email delivery outcome", () => {
    it.effect("records sent provider responses as sent", () =>
        Effect.gen(function* () {
            const outcome = yield* resolveEmailDeliveryOutcome(
                Effect.succeed({
                    status: "sent",
                    delivered: ["person@example.com"],
                    queued: [],
                    permanent_bounces: [],
                })
            )

            assert.deepStrictEqual(outcome, { status: "sent" })
        })
    )

    it.effect("records skipped provider responses with reason", () =>
        Effect.gen(function* () {
            const outcome = yield* resolveEmailDeliveryOutcome(
                Effect.succeed({
                    status: "skipped",
                    reason: "disabled",
                })
            )

            assert.deepStrictEqual(outcome, {
                status: "skipped",
                reason: "disabled",
            })
        })
    )

    it.effect("records provider failures as failed", () =>
        Effect.gen(function* () {
            const outcome = yield* resolveEmailDeliveryOutcome(
                Effect.fail(new Error("email failed"))
            )

            assert.deepStrictEqual(outcome, { status: "failed" })
        })
    )
})
