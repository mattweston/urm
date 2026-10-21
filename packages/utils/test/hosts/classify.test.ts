import { describe, expect, it } from "vitest"
import {
    classifyHost,
    generatedDomainSlug,
    localPublicationHost,
} from "../../src/hosts/index.ts"

const DEV_ROOT = "urm.test"

describe("host classification", () => {
    it("puts the platform above the tenant suffix, not below it", () => {
        expect(classifyHost("app.urm.dev")).toBe("central")
        expect(classifyHost("localhost")).toBe("central")
        expect(classifyHost("app.localhost")).toBe("central")
        expect(classifyHost("app.urm.test", DEV_ROOT)).toBe("central")
    })

    it("treats a domain's generated host as generated", () => {
        expect(classifyHost("acme.urm.dev")).toBe("generated")
        expect(classifyHost("acme.localhost")).toBe("generated")
        expect(classifyHost("test.urm.test", DEV_ROOT)).toBe("generated")
    })

    it("treats the urm domain's own hosts like any other domain's", () => {
        // `urm.urm.dev` is the `urm` domain's generated publication host, and
        // `urm.dev` is that same domain's custom marketing domain.
        expect(classifyHost("urm.urm.dev")).toBe("generated")
        expect(classifyHost("urm.dev")).toBe("custom")
    })

    it("treats the suffix root as a custom domain, as production does", () => {
        // `urm.test` in development stands where `urm.dev` stands in
        // production: a name a domain can claim, not a platform host.
        expect(classifyHost("urm.test", DEV_ROOT)).toBe("custom")
    })

    it("treats anything else as a custom domain", () => {
        expect(classifyHost("shop.example.com")).toBe("custom")
        expect(classifyHost("example.com", DEV_ROOT)).toBe("custom")
    })

    it("ignores scheme, port and case", () => {
        expect(classifyHost("HTTP://App.Urm.Test:4321", DEV_ROOT)).toBe(
            "central"
        )
        expect(classifyHost("test.urm.test:4321", `http://${DEV_ROOT}`)).toBe(
            "generated"
        )
    })

    it("has no third suffix without a dev root", () => {
        expect(classifyHost("test.urm.test")).toBe("custom")
        expect(classifyHost("test.urm.test", "localhost")).toBe("custom")
    })

    it("extracts only a single-label generated host's tenant slug", () => {
        expect(generatedDomainSlug("test.urm.test:1420", DEV_ROOT)).toBe("test")
        expect(generatedDomainSlug("urm.urm.dev")).toBe("urm")
        expect(generatedDomainSlug("app.urm.test", DEV_ROOT)).toBeUndefined()
        expect(generatedDomainSlug("app.localhost")).toBeUndefined()
        expect(
            generatedDomainSlug("nested.test.urm.test", DEV_ROOT)
        ).toBeUndefined()
        expect(generatedDomainSlug("urm.test", DEV_ROOT)).toBeUndefined()
    })

    it("resolves nested local publication hosts without overloading administration", () => {
        expect(localPublicationHost("test1.localhost")).toEqual({
            kind: "channel",
            domain_slug: "test1",
            channel: "production",
        })
        expect(localPublicationHost("dev.test1.localhost")).toEqual({
            kind: "channel",
            domain_slug: "test1",
            channel: "development",
        })
        expect(
            localPublicationHost("staging.test1.urm.test", DEV_ROOT)
        ).toEqual({
            kind: "channel",
            domain_slug: "test1",
            channel: "staging",
        })
        expect(localPublicationHost("prod.test1.localhost")).toEqual({
            kind: "channel",
            domain_slug: "test1",
            channel: "production",
        })
        expect(localPublicationHost("prototype-a.test1.localhost")).toEqual({
            kind: "subdomain",
            domain_slug: "test1",
            subdomain_slug: "prototype-a",
            channel: "live",
        })
    })

    it("does not turn reserved or non-local labels into publications", () => {
        expect(localPublicationHost("app.localhost")).toBeUndefined()
        expect(localPublicationHost("mail.test1.localhost")).toBeUndefined()
        expect(localPublicationHost("www.test1.localhost")).toBeUndefined()
        expect(localPublicationHost("dev.test1.urm.dev")).toBeUndefined()
    })
})
