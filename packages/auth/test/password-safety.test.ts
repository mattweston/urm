import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { validatePasswordSafety } from "../src/password-safety.ts"

const TEST_OPTS = {
    pwned_passwords_timeout_ms: 5000,
    pwned_passwords_cache_ttl_ms: 0,
}

describe("@urm/auth - password safety", () => {
    it.effect("enforces local policy when HIBP is disabled", () =>
        Effect.gen(function* () {
            const result = yield* validatePasswordSafety("password", {
                ...TEST_OPTS,
                pwned_passwords_enabled: false,
                pwned_passwords_fail_closed: false,
                fetch_range: () => Promise.resolve(new Response("")),
            })

            assert.deepStrictEqual(result, {
                valid: false,
                reason: "too_short",
            })
        })
    )

    it.effect("skips HIBP when disabled", () =>
        Effect.gen(function* () {
            let called = false
            const result = yield* validatePasswordSafety(
                "correct horse battery staple",
                {
                    ...TEST_OPTS,
                    pwned_passwords_enabled: false,
                    pwned_passwords_fail_closed: true,
                    fetch_range: () => {
                        called = true
                        return Promise.resolve(new Response(""))
                    },
                }
            )

            assert.deepStrictEqual(result, { valid: true })
            assert.strictEqual(called, false)
        })
    )

    it.effect("rejects pwned passwords when enabled", () =>
        Effect.gen(function* () {
            const result = yield* validatePasswordSafety(
                "correct horse battery staple",
                {
                    ...TEST_OPTS,
                    pwned_passwords_enabled: true,
                    pwned_passwords_fail_closed: false,
                    fetch_range: () =>
                        Promise.resolve(
                            new Response(
                                "AD6438836DBE526AA231ABDE2D0EEF74D42:42\n"
                            )
                        ),
                }
            )

            assert.deepStrictEqual(result, {
                valid: false,
                reason: "pwned",
            })
        })
    )

    it.effect("fails open on HIBP outage by default", () =>
        Effect.gen(function* () {
            const result = yield* validatePasswordSafety(
                "correct horse battery staple",
                {
                    ...TEST_OPTS,
                    pwned_passwords_enabled: true,
                    pwned_passwords_fail_closed: false,
                    fetch_range: () =>
                        Promise.resolve(new Response("", { status: 500 })),
                }
            )

            assert.deepStrictEqual(result, { valid: true })
        })
    )

    it.effect("can fail closed on HIBP outage", () =>
        Effect.gen(function* () {
            const result = yield* validatePasswordSafety(
                "correct horse battery staple",
                {
                    ...TEST_OPTS,
                    pwned_passwords_enabled: true,
                    pwned_passwords_fail_closed: true,
                    fetch_range: () =>
                        Promise.resolve(new Response("", { status: 500 })),
                }
            )

            assert.deepStrictEqual(result, {
                valid: false,
                reason: "check_unavailable",
            })
        })
    )
})
