import { describe, expect, it } from "@effect/vitest"
import { inertHtml } from "foldkit/html"
import { defaultEmailTemplateTheme } from "@urm/email/templates"
import { renderHtmlToEmailString } from "../src/mail/templates/renderer.ts"

describe("mail template renderer", () => {
    it("uses the email brand contract for light and ink sections", () => {
        const h = inertHtml
        const view = h.div(
            [
                h.Class(
                    "bg-card border-(length:--surface-border-width) border-border rounded-lg"
                ),
            ],
            [
                h.div(
                    [h.Class("bg-foreground text-background")],
                    ["Ink section"]
                ),
                h.a(
                    [
                        h.Href("https://app.urm.so"),
                        h.Class(
                            "bg-primary text-primary-foreground rounded-full"
                        ),
                    ],
                    ["Continue"]
                ),
            ]
        )

        const rendered = renderHtmlToEmailString(
            view,
            defaultEmailTemplateTheme
        )

        expect(rendered).toContain("background-color: #ffffff")
        expect(rendered).toContain("border-width: 2px")
        expect(rendered).toContain("border-color: #241b2f")
        expect(rendered).toContain("border-radius: 28px")
        expect(rendered).toContain("background-color: #241b2f")
        expect(rendered).toContain("color: #fff7e9")
        expect(rendered).toContain("background-color: #ff694f")
        expect(rendered).toContain("border-radius: 999px")
        expect(rendered).not.toContain("box-shadow")
    })
})
