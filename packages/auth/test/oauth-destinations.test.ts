import { describe, expect, it } from "@effect/vitest"
import {
    configuredOAuthDestination,
    oauthDestinationFromUnknown,
    oauthDestinationLoginUrl,
    oauthDestinationUrl,
} from "../src/oauth/destinations.ts"

const config = {
    adminAppUrl: "https://admin.urm.dev",
    marketingAppUrl: "https://urm.dev",
}

describe("@urm/auth - OAuth destinations", () => {
    it("accepts only named OAuth destinations", () => {
        expect(oauthDestinationFromUnknown("admin")).toBe("admin")
        expect(oauthDestinationFromUnknown("marketing")).toBe("marketing")
        expect(
            oauthDestinationFromUnknown("https://attacker.example")
        ).toBeUndefined()
        expect(oauthDestinationFromUnknown(null)).toBeUndefined()
    })

    it("resolves named destinations to configured URLs", () => {
        expect(oauthDestinationUrl(config, "admin")).toBe(config.adminAppUrl)
        expect(oauthDestinationUrl(config, "marketing")).toBe(
            config.marketingAppUrl
        )
        expect(oauthDestinationLoginUrl(config, "admin")).toBe(
            "https://admin.urm.dev/auth/login/"
        )
        expect(oauthDestinationLoginUrl(config, "marketing")).toBe(
            "https://urm.dev/auth/login/"
        )
    })

    it("recognizes only configured callback destinations", () => {
        expect(configuredOAuthDestination(config, config.adminAppUrl)).toBe(
            "admin"
        )
        expect(configuredOAuthDestination(config, config.marketingAppUrl)).toBe(
            "marketing"
        )
        expect(
            configuredOAuthDestination(config, "https://attacker.example")
        ).toBeUndefined()
    })
})
