import { describe, expect, it } from "@effect/vitest"
import {
    buildCookieOptions,
    buildDomainSessionCookieOptions,
    cookieHeader,
} from "../src/cookies/cookie-opts.ts"

describe("@urm/auth - cookie options", () => {
    it("omits Secure and Domain for local development cookies", () => {
        expect(
            buildCookieOptions({
                cookie_domain: "",
                secure: false,
            })
        ).toEqual({
            pkce_cookie_opts: "HttpOnly; Path=/; SameSite=Lax; Max-Age=600",
            pkce_cookie_clear: "Path=/; SameSite=Lax; Max-Age=0",
            auth_cookie_opts:
                "HttpOnly; Path=/; SameSite=Lax; Max-Age=34560000",
            auth_cookie_clear: "Path=/; SameSite=Lax; Max-Age=0",
        })
    })

    it("keeps central production cookies host-only, HttpOnly, Secure, and Lax", () => {
        const options = buildCookieOptions({
            cookie_domain: "",
            secure: true,
        })

        expect(options.auth_cookie_opts).toBe(
            "HttpOnly; Path=/; SameSite=Lax; Max-Age=34560000; Secure"
        )
        expect(options.auth_cookie_clear).toBe(
            "Path=/; SameSite=Lax; Max-Age=0; Secure"
        )
    })

    it("rejects the shared platform domain", () => {
        expect(() =>
            buildCookieOptions({
                cookie_domain: ".urm.dev",
                secure: true,
            })
        ).toThrow("Central cookies must be host-only")
    })

    it("scopes a domain session only to its paired hosts", () => {
        expect(
            buildDomainSessionCookieOptions("some-domain.urm.dev")
                .auth_cookie_opts
        ).toContain("Domain=some-domain.urm.dev")
        expect(
            buildDomainSessionCookieOptions("custom.domain").auth_cookie_opts
        ).toContain("Domain=custom.domain")
        expect(
            buildDomainSessionCookieOptions("some-domain.localhost")
                .auth_cookie_opts
        ).toContain("Domain=some-domain.localhost")
    })

    it("encodes cookie values without modifying options", () => {
        expect(
            cookieHeader("auth", "token with space", "HttpOnly; Path=/")
        ).toBe("auth=token%20with%20space; HttpOnly; Path=/")
    })
})
