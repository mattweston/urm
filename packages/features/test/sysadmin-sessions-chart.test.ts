import { describe, expect, test } from "vitest"
import type { SessionItem } from "../src/sysadmin/platform/app.model.ts"
import {
    sessions_chart_view,
    sessions_daily_data,
} from "../src/sysadmin/platform/sessions-chart.view.ts"

const session = (created_at: string): SessionItem => ({
    id: created_at,
    user_id: "user-1",
    status: "active",
    created_at: new Date(created_at),
})
const as_of = Date.parse("2026-09-06T12:00:00Z")

describe("session charts", () => {
    test("buckets seven UTC days, fills gaps, and excludes dates outside the window", () => {
        const data = sessions_daily_data(
            [
                session("2026-08-30T23:59:59Z"),
                session("2026-08-31T00:00:00Z"),
                session("2026-09-01T23:30:00-02:00"),
                session("2026-09-06T12:00:00Z"),
                session("2026-09-06T12:00:01Z"),
                session("2026-09-07T00:00:00Z"),
            ],
            as_of
        )
        expect(data.map(({ label, value }) => ({ label, value }))).toEqual([
            { label: "08-31", value: 1 },
            { label: "09-01", value: 0 },
            { label: "09-02", value: 1 },
            { label: "09-03", value: 0 },
            { label: "09-04", value: 0 },
            { label: "09-05", value: 0 },
            { label: "09-06", value: 1 },
        ])
    })

    test("shows the evaluation timestamp, date axis, and sample limitations", () => {
        const rendered = JSON.stringify(sessions_chart_view([], true, as_of))
        expect(rendered).toContain("Status as of 2026-09-06 12:00:00 UTC")
        expect(rendered).toContain("Sessions created per day")
        expect(rendered).toContain("final day is partial")
        expect(rendered).toContain("Recent sample only; totals are incomplete.")
        expect(rendered).toContain('"text":"08-31"')
        expect(rendered).toContain('"text":"09-06"')
        expect(
            sessions_daily_data([], as_of).every(({ value }) => value === 0)
        ).toBe(true)
    })

    test("does not invent a timestamp when no evaluation time is available", () => {
        const rendered = JSON.stringify(
            sessions_chart_view([], false, undefined)
        )
        expect(rendered).not.toContain("Status as of")
        expect(rendered).not.toContain("Sessions created per day")
    })
})
