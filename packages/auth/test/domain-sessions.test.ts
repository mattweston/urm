import { afterEach, describe, expect, it } from "@effect/vitest"
import {
    domainSessionOrigin,
    generatedDomainAdminOrigin,
    generatedDomainName,
} from "../src/domain-sessions.ts"

const DEV_BOX = "urmdev.example.ts.net"

const withDevBox = <A>(run: () => A): A => {
    process.env.TAILSCALE_URL = `http://${DEV_BOX}`
    return run()
}

afterEach(() => {
    delete process.env.TAILSCALE_URL
})

describe("generated domain hostnames", () => {
    it("maps local public and admin hosts to the same domain name", () => {
        expect(generatedDomainName("some-domain.localhost")).toBe("some-domain")
        expect(generatedDomainName("urm.some-domain.localhost")).toBe(
            "some-domain"
        )
    })

    it("preserves the production hostname model", () => {
        expect(generatedDomainName("some-domain.urm.dev")).toBe("some-domain")
        expect(generatedDomainName("urm.some-domain.urm.dev")).toBe(
            "some-domain"
        )
    })

    it("rejects bare hosts and nested generated names", () => {
        expect(generatedDomainName("localhost")).toBeUndefined()
        expect(generatedDomainName("a.b.localhost")).toBeUndefined()
        expect(generatedDomainName("urm.dev")).toBeUndefined()
    })

    it("builds admin origins only from configured central hosts", () => {
        // The tenant apex, which is where administration is served. Neither the
        // urm.<domain> host nor the /urm/ path below it is used any more.
        expect(
            generatedDomainAdminOrigin("demo-domain", "http://localhost:5173")
        ).toBe("http://demo-domain.localhost:5173")
        expect(
            generatedDomainAdminOrigin("demo-domain", "https://app.urm.dev")
        ).toBe("https://demo-domain.urm.dev")
        // `urm.urm.dev` is the `urm` domain's generated host now, not central.
        expect(
            generatedDomainAdminOrigin("demo-domain", "https://urm.urm.dev")
        ).toBeUndefined()
        expect(
            generatedDomainAdminOrigin(
                "demo-domain",
                "https://attacker.example"
            )
        ).toBeUndefined()
    })

    it("treats the dev box as a third generated suffix when TAILSCALE_URL is set", () => {
        withDevBox(() => {
            expect(generatedDomainName(`some-domain.${DEV_BOX}`)).toBe(
                "some-domain"
            )
            expect(generatedDomainName(`urm.some-domain.${DEV_BOX}`)).toBe(
                "some-domain"
            )
            expect(generatedDomainName(DEV_BOX)).toBeUndefined()
            expect(
                generatedDomainAdminOrigin(
                    "demo-domain",
                    `http://app.${DEV_BOX}:5173`
                )
            ).toBe(`http://demo-domain.${DEV_BOX}:5173`)
            expect(
                domainSessionOrigin(
                    `demo-domain.${DEV_BOX}`,
                    `http://app.${DEV_BOX}:5173`
                )
            ).toBe(`http://demo-domain.${DEV_BOX}:5173`)
        })
    })

    it("ignores the dev box suffix when TAILSCALE_URL is unset", () => {
        expect(generatedDomainName(`some-domain.${DEV_BOX}`)).toBeUndefined()
        expect(
            generatedDomainAdminOrigin(
                "demo-domain",
                `http://app.${DEV_BOX}:5173`
            )
        ).toBeUndefined()
    })

    it("preserves configured development ports for resolved generated hosts", () => {
        expect(
            domainSessionOrigin(
                "urm.demo-domain.localhost",
                "http://localhost:5173"
            )
        ).toBe("http://urm.demo-domain.localhost:5173")
        expect(
            domainSessionOrigin(
                "demo-domain.localhost",
                "http://localhost:4321"
            )
        ).toBe("http://demo-domain.localhost:4321")
        expect(
            domainSessionOrigin("custom.domain", "http://localhost:4321")
        ).toBe("https://custom.domain")
    })
})
