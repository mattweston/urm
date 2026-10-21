import { describe, expect, it } from "vitest"
import { isCentralApplicationOrigin } from "@urm/auth/domain-sessions"

const config = {
    appUrl: "http://urmdev.test:4321",
    adminAppUrl: "http://urmdev.test:5173",
    marketingAppUrl: "http://urmdev.test:4321",
}

describe("central credential proxy origin", () => {
    it("recognises the merged Astro app as central", () => {
        expect(
            isCentralApplicationOrigin("http://urmdev.test:4321", config)
        ).toBe(true)
    })

    it("does not mistake a tenant origin for the central app", () => {
        expect(
            isCentralApplicationOrigin("http://test.urmdev.test:4321", config)
        ).toBe(false)
    })

    it("rejects malformed assertion values", () => {
        expect(isCentralApplicationOrigin("not a URL", config)).toBe(false)
    })
})
