import { describe, expect, test } from "vitest"
import { inertHtml } from "foldkit/html"
import { view } from "./view.ts"

describe("Labs chart page", () => {
    test.each([
        "/labs/charts",
        "/labs/charts/",
        "/labs/stats/charts",
        "/labs/stats/charts/",
    ])("renders chart demos at %s", (path) => {
        const rendered = JSON.stringify(view(inertHtml, path))
        expect(rendered).toContain("Chart prototypes")
        expect(rendered).toContain("Placeholder data")
        for (const title of ["Area", "Bars", "Line", "Timeseries"]) {
            expect(rendered).toContain(
                `${title} chart with illustrative values`
            )
        }
        expect(rendered).not.toContain("Explore experimental features.")
    })

    test("links to chart demos from the Labs landing page", () => {
        const rendered = JSON.stringify(view(inertHtml, "/labs"))
        expect(rendered).toContain("/labs/stats/charts")
        expect(rendered).toContain("Stats / Charts")
    })

    test.each(["/labs/design/urmcss", "/labs/design/urmcss/"])(
        "renders the URMCSS migration index at %s",
        (path) => {
            const rendered = JSON.stringify(view(inertHtml, path))

            expect(rendered).toContain("URMCSS migration lab")
            expect(rendered).toContain("First experiment")
            expect(rendered).toContain("/labs/design/urmcss/button/")
            expect(rendered).toContain("Foldkit UI primitive")
            expect(rendered).not.toContain("Explore experimental features.")
        }
    )

    test("links to the URMCSS migration lab from the Labs landing page", () => {
        const rendered = JSON.stringify(view(inertHtml, "/labs"))

        expect(rendered).toContain("/labs/design/urmcss/")
        expect(rendered).toContain("Design / URMCSS")
    })
})
