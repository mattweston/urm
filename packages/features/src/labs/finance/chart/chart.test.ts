import { Effect } from "effect"
import { Server } from "foldkit/experimental"
import type { HtmlBuilder } from "foldkit/html"
import { describe, expect, it } from "vitest"
import { format_money, monthly_data, totals } from "./data.ts"
import { view } from "./view.ts"

describe("Finance chart demo", () => {
    it("derives consistent totals and retains the loss month", () => {
        expect(totals).toEqual({
            income: 8770000,
            expenses: 6420000,
            net: 2350000,
        })
        expect(
            monthly_data.some((month) => month.expenses > month.income)
        ).toBe(true)
        expect(format_money(-70000)).toBe("-£700")
    })

    it("renders charts and an accessible data table without negative SVG heights", async () => {
        const rendered = await Effect.runPromise(
            Server.renderToString(
                {
                    init: () => ({ model: 0, commands: [] }),
                    view: (_model: number, h: HtmlBuilder<never>) => ({
                        title: "Finance chart demo",
                        body: view(h),
                    }),
                },
                { buildId: "finance-chart-demo" }
            )
        )
        expect(rendered.html).toContain("Fictional demo data")
        expect(rendered.html.match(/<svg\b/g)).toHaveLength(3)
        expect(rendered.html).toContain("<caption")
        expect(rendered.html).toContain('scope="col"')
        expect(rendered.html).toContain("-£700")
        expect(rendered.html).not.toMatch(/height="-/)
        expect(rendered.html).not.toContain("NaN")
    })
})
