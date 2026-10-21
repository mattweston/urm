import { describe, expect, it } from "@effect/vitest"
import { validatePasswordPolicy } from "../src/password-policy.ts"

describe("@urm/auth - password policy", () => {
    it("accepts long passphrases without composition rules", () => {
        expect(validatePasswordPolicy("correct horse battery staple")).toEqual({
            valid: true,
        })
    })

    it("rejects blank passwords", () => {
        expect(validatePasswordPolicy("    ")).toEqual({
            valid: false,
            reason: "blank",
        })
    })

    it("rejects short passwords", () => {
        expect(validatePasswordPolicy("password")).toEqual({
            valid: false,
            reason: "too_short",
        })
    })

    it("accepts passwords at the inclusive minimum and maximum lengths", () => {
        expect(validatePasswordPolicy("a".repeat(12))).toEqual({ valid: true })
        expect(validatePasswordPolicy("a".repeat(1024))).toEqual({
            valid: true,
        })
    })

    it("rejects passwords immediately outside the allowed length range", () => {
        expect(validatePasswordPolicy("a".repeat(11))).toEqual({
            valid: false,
            reason: "too_short",
        })
        expect(validatePasswordPolicy("a".repeat(1025))).toEqual({
            valid: false,
            reason: "too_long",
        })
    })

    it("rejects overly long passwords", () => {
        expect(validatePasswordPolicy("a".repeat(1025))).toEqual({
            valid: false,
            reason: "too_long",
        })
    })
})
