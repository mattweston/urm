import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import {
    hashPassword,
    PASSWORD_HASH_ALGORITHM,
    verifyPasswordHash,
} from "../src/password-credentials.ts"

describe("@urm/auth - password credentials", () => {
    it.effect("hashes passwords with per-password salts", () =>
        Effect.gen(function* () {
            const first = yield* hashPassword("correct horse battery staple")
            const second = yield* hashPassword("correct horse battery staple")

            expect(first.algorithm).toBe(PASSWORD_HASH_ALGORITHM)
            expect(first.parameters.salt).not.toBe(second.parameters.salt)
            expect(first.password_hash).not.toBe(second.password_hash)
            expect(first.password_hash).not.toContain(
                "correct horse battery staple"
            )
        })
    )

    it.effect("verifies matching password hashes", () =>
        Effect.gen(function* () {
            const hash = yield* hashPassword("correct horse battery staple")

            expect(
                yield* verifyPasswordHash("correct horse battery staple", hash)
            ).toBe(true)
            expect(yield* verifyPasswordHash("wrong password", hash)).toBe(
                false
            )
        })
    )
})
