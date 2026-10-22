import { describe, expect, test } from "vitest"

import { isTourDatesPath, tourDatesHref } from "./route.ts"

describe("tour dates route", () => {
    test("prints and recognizes the route", () => {
        expect(tourDatesHref()).toBe("/calendar/tour-dates/")
        expect(isTourDatesPath("/calendar/tour-dates")).toBe(true)
        expect(isTourDatesPath(tourDatesHref())).toBe(true)
        expect(isTourDatesPath("/calendar/tour-dates/archive")).toBe(false)
    })
})
