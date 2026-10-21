import { describe, expect, test } from "vitest"

import { isTourDatesPath, tourDatesHref } from "./route.ts"

describe("tour dates route", () => {
    test("prints and recognizes the route", () => {
        expect(tourDatesHref()).toBe("/labs/calendar/tour-dates/")
        expect(isTourDatesPath("/labs/calendar/tour-dates")).toBe(true)
        expect(isTourDatesPath(tourDatesHref())).toBe(true)
        expect(isTourDatesPath("/labs/calendar/tour-dates/archive")).toBe(false)
    })
})
