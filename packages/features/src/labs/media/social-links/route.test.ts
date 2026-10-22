import { describe, expect, it } from "vitest"

import { isSocialLinksPath, socialLinksHref } from "./route.ts"

describe("social links route", () => {
    it("builds and recognizes the canonical route", () => {
        expect(socialLinksHref()).toBe("/media/social-links/")
        expect(isSocialLinksPath("/media/social-links")).toBe(true)
        expect(isSocialLinksPath(socialLinksHref())).toBe(true)
        expect(isSocialLinksPath("/media/social-links/example")).toBe(
            false
        )
    })
})
