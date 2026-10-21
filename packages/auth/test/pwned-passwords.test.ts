import { assert, describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import {
    checkPwnedPassword,
    pwnedPasswordRange,
    sha1UpperHex,
} from "../src/pwned-passwords.ts"

const TEST_CONFIG = { timeout_ms: 5000, cache_ttl_ms: 0 }

describe("@urm/auth - pwned passwords", () => {
    it("computes SHA-1 uppercase ranges", () => {
        expect(sha1UpperHex("password")).toBe(
            "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8"
        )
        expect(pwnedPasswordRange("password")).toEqual({
            prefix: "5BAA6",
            suffix: "1E4C9B93F3F0682250B6CF8331B7EE68FD8",
        })
    })

    it.effect("detects pwned passwords from a range response", () =>
        Effect.gen(function* () {
            const result = yield* checkPwnedPassword(
                "password",
                TEST_CONFIG,
                (url, init) => {
                    assert.strictEqual(
                        url,
                        "https://api.pwnedpasswords.com/range/5BAA6"
                    )
                    assert.deepStrictEqual(init?.headers, {
                        "Add-Padding": "true",
                        "User-Agent": "URM Auth Password Safety",
                    })
                    return Promise.resolve(
                        new Response(
                            "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3303003\n"
                        )
                    )
                }
            )

            assert.deepStrictEqual(result, {
                pwned: true,
                count: 3303003,
            })
        })
    )

    it.effect("returns not pwned when suffix is absent", () =>
        Effect.gen(function* () {
            const result = yield* checkPwnedPassword(
                "password",
                TEST_CONFIG,
                () =>
                    Promise.resolve(
                        new Response("00000000000000000000000000000000000:1\n")
                    )
            )

            assert.deepStrictEqual(result, {
                pwned: false,
                count: 0,
            })
        })
    )

    it.effect("ignores padded zero-count matches", () =>
        Effect.gen(function* () {
            const result = yield* checkPwnedPassword(
                "password",
                TEST_CONFIG,
                () =>
                    Promise.resolve(
                        new Response("1E4C9B93F3F0682250B6CF8331B7EE68FD8:0\n")
                    )
            )

            assert.deepStrictEqual(result, {
                pwned: false,
                count: 0,
            })
        })
    )
})
