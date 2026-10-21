import { describe, it, assert } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { withEmailSendRetry, EMAIL_SEND_MAX_RETRIES } from "../src/transport.ts"

class RetryTestError extends Schema.TaggedError<RetryTestError>()(
    "RetryTestError",
    { message: Schema.String }
) {}

describe("@urm/email - retry policy", () => {
    it.live("retries failed sends up to max retries", () =>
        Effect.gen(function* () {
            let attempts = 0
            const result = yield* withEmailSendRetry(
                Effect.gen(function* () {
                    attempts += 1
                    return yield* new RetryTestError({ message: "transient" })
                })
            ).pipe(Effect.orElseSucceed(() => "caught"))

            assert.strictEqual(result, "caught")
            assert.strictEqual(attempts, EMAIL_SEND_MAX_RETRIES + 1)
        })
    )

    it.effect("succeeds on first attempt without retry", () =>
        Effect.gen(function* () {
            let attempts = 0
            const result = yield* withEmailSendRetry(
                Effect.sync(() => {
                    attempts += 1
                    return "ok"
                })
            )

            assert.strictEqual(result, "ok")
            assert.strictEqual(attempts, 1)
        })
    )

    it.live("succeeds on retry after initial failures", () =>
        Effect.gen(function* () {
            let attempts = 0
            const result = yield* withEmailSendRetry(
                Effect.gen(function* () {
                    attempts += 1
                    if (attempts < 3) {
                        return yield* new RetryTestError({
                            message: "transient",
                        })
                    }
                    return "ok"
                })
            )

            assert.strictEqual(result, "ok")
            assert.strictEqual(attempts, 3)
        })
    )

    it("has the correct max retries constant", () => {
        assert.strictEqual(EMAIL_SEND_MAX_RETRIES, 2)
    })
})
