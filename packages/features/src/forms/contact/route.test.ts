import { describe, expect, it } from "vitest"
import { contactHref, isContactPath } from "./route.ts"

describe("contact route", () => {
    it("uses the forms contact path", () => {
        expect(contactHref()).toBe("/forms/contact/")
        expect(isContactPath("/forms/contact")).toBe(true)
        expect(isContactPath(contactHref())).toBe(true)
        expect(isContactPath("/forms/contact/other")).toBe(false)
    })
})
