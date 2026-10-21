import { describe, expect, it } from "@effect/vitest"
import { signCookie } from "../src/cookies/sign-cookie.ts"
import { verifyCookie } from "../src/cookies/verify-cookie.ts"
import { signDomainCookie } from "../src/cookies/sign-domain-cookies.ts"
import { verifyDomainCookie } from "../src/cookies/verify-domain-cookie.ts"

describe("@urm/auth - signed cookies", () => {
    it("verifies signed values that contain dots", () => {
        const signed = signCookie("contact.with.dots", "secret")

        expect(verifyCookie(signed, "secret")).toBe("contact.with.dots")
    })

    it("rejects tampered signatures", () => {
        const signed = signCookie("contact-001", "secret")
        const tampered = `${signed.slice(0, -1)}0`

        expect(verifyCookie(tampered, "secret")).toBeUndefined()
    })

    it("rejects cookies signed with another secret", () => {
        const signed = signCookie("contact-001", "first-secret")

        expect(verifyCookie(signed, "second-secret")).toBeUndefined()
    })

    it("rejects legacy unversioned signed values", () => {
        expect(verifyCookie("contact-001.deadbeef", "secret")).toBeUndefined()
    })

    it("rejects malformed values with extra separators", () => {
        const signed = signCookie("contact-001", "secret")

        expect(verifyCookie(`${signed}.extra`, "secret")).toBeUndefined()
    })

    it("verifies domain-scoped cookies for the expected domain", () => {
        const signed = signDomainCookie(
            "contact.with.dots",
            "domain.with.dots",
            "secret"
        )

        expect(verifyDomainCookie(signed, "domain.with.dots", "secret")).toBe(
            "contact.with.dots"
        )
        expect(
            verifyDomainCookie(signed, "other-domain", "secret")
        ).toBeUndefined()
    })

    it("rejects malformed domain-scoped payloads and mismatched secrets", () => {
        const malformed = signDomainCookie(
            "contact-001::domain-001::extra",
            "domain-001",
            "secret"
        )
        const signed = signDomainCookie(
            "contact-001",
            "domain-001",
            "first-secret"
        )

        expect(
            verifyDomainCookie(malformed, "domain-001", "secret")
        ).toBeUndefined()
        expect(
            verifyDomainCookie(signed, "domain-001", "second-secret")
        ).toBeUndefined()
    })
})
