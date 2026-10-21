import { describe, expect, it } from "@effect/vitest"
import { THEME_FAMILIES } from "@urm/domain/schemas/settings"
import { resolveSiteTheme } from "@urm/domain/schemas/site-appearance"
import {
    email_color,
    publication_email_theme,
} from "../src/publication-theme.ts"
import {
    productionEmailTemplatePreviewsForTheme,
    transactionalTemplateTestEmail,
} from "../src/templates.ts"

describe("publication email themes", () => {
    it("converts neutral colors and composites transparent borders", () => {
        expect(email_color("oklch(1 0 0)")).toBe("#ffffff")
        expect(email_color("oklch(0 0 0)")).toBe("#000000")
        expect(email_color("oklch(1 0 0 / 10%)", "#000000")).toBe("#1a1a1a")
        expect(email_color("oklch(0.627955 0.257683 29.233885)")).toBe(
            "#ff0000"
        )
    })

    it("renders every publication palette using email-compatible colors", () => {
        for (const family of THEME_FAMILIES) {
            for (const appearance of ["light", "dark", "system"]) {
                const site_theme = resolveSiteTheme({
                    theme_id: family.id,
                    appearance:
                        appearance === "dark"
                            ? "dark"
                            : appearance === "light"
                              ? "light"
                              : "system",
                })
                const theme = publication_email_theme({
                    brand_name: "Example publication",
                    site_theme,
                })
                expect(theme.background_color).toMatch(/^#[\da-f]{6}$/i)
                for (const preview of productionEmailTemplatePreviewsForTheme(
                    theme
                )) {
                    expect(preview.sample.html).toContain("Example publication")
                    expect(preview.sample.html).toContain(
                        `background: ${theme.background_color}`
                    )
                    expect(preview.sample.html).not.toContain("oklch(")
                }
            }
        }
    })

    it("uses Frappé dark and shares the theme with transactional test sends", () => {
        const theme = publication_email_theme({
            brand_name: "My website",
            site_theme: resolveSiteTheme({
                theme_id: "catppuccin-frappe",
                appearance: "dark",
            }),
        })
        expect(theme.background_color).not.toBe("#fff7e9")
        expect(theme.content_border_radius).toBe(10)
        const email = transactionalTemplateTestEmail(
            "auth_password_reset",
            "recipient@example.com",
            theme
        )
        expect(email.html).toContain(`background: ${theme.background_color}`)
        expect(email.html).toContain("My website")
        expect(email.text).toContain("30 minutes")
    })
})
