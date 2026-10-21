import { describe, expect, it } from "vitest"
import { highlight_json } from "./shiki.ts"

describe("Schema JSON highlighting", () => {
    it("renders JSON tokens using theme-aware colours", () => {
        const html = highlight_json({
            postcode: "LS6 1NS",
            age: 36,
            active: true,
        })
        expect(html).toContain('class="shiki')
        expect(html).toContain("var(--schema-shiki-token-")
        expect(html).toContain("LS6 1NS")
        expect(html).toContain("36")
        expect(html).toContain("true")
    })

    it("escapes user input before inserting highlighted HTML", () => {
        const html = highlight_json({ name: '<script>alert("test")</script>' })
        expect(html).not.toContain("<script>")
        expect(html).toContain("&#x3C;script>")
    })
})
