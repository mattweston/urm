import { describe, expect, it } from "vitest"
import { Effect, Schema } from "effect"
import { execFileSync } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { THEME_FAMILIES } from "@urm/domain/schemas/settings"
import {
    PublishedSiteTheme,
    resolveSiteTheme,
    SiteAppearance,
} from "@urm/domain/schemas/site-appearance"
import { SiteReleaseSnapshot } from "@urm/domain/schemas/document-site-builds"
import { renderSiteThemeCss } from "../src/site-theme.ts"
import { writeSiteBuild } from "../src/write-site-build.ts"

describe("published site themes", () => {
    it("keeps generated tokens in sync with UI styles and validates every family", () => {
        execFileSync(process.execPath, [
            new URL(
                "../../../scripts/generate-site-theme-tokens.mjs",
                import.meta.url
            ).pathname,
            "--check",
        ])
        execFileSync(process.execPath, [
            new URL(
                "../../../scripts/check-theme-contrast.mjs",
                import.meta.url
            ).pathname,
        ])
        for (const family of THEME_FAMILIES) {
            expect(
                Schema.is(PublishedSiteTheme)(
                    resolveSiteTheme({
                        theme_id: family.id,
                        appearance: "system",
                    })
                )
            ).toBe(true)
        }
    })
    it("rejects CSS injection and uses captured values instead of re-resolving the catalogue", () => {
        const theme = resolveSiteTheme({
            theme_id: "github",
            appearance: "light",
        })
        expect(
            renderSiteThemeCss({
                ...theme,
                light: { ...theme.light, background: "#123456" },
            })
        ).toContain("--site-background: #123456;")
        expect(() =>
            renderSiteThemeCss({
                ...theme,
                light: {
                    ...theme.light,
                    background: "red; } body { display:none",
                },
            })
        ).toThrow(Error)
        expect(renderSiteThemeCss(undefined)).toBe("")
    })
    it.each(SiteAppearance.literals)(
        "builds %s with matching logos and no runtime",
        async (appearance) => {
            const directory = await mkdtemp(join(tmpdir(), "urm-site-theme-"))
            try {
                const theme = resolveSiteTheme({
                    theme_id: "cartlane",
                    appearance,
                })
                const snapshot = Schema.decodeUnknownSync(SiteReleaseSnapshot)({
                    release_id: `theme-${appearance}`,
                    site_origin: "https://test1.urm.dev",
                    layout: {
                        name: "Test",
                        theme,
                        logo_light_url: "https://example.com/light.svg",
                        logo_dark_url: "https://example.com/dark.svg",
                        social_links: [],
                        navigation: [],
                    },
                    pages: [
                        {
                            path: "/",
                            title: "Test",
                            heading: "Test",
                            body: "Content",
                            content_type: "text",
                        },
                    ],
                })
                const build = await Effect.runPromise(
                    writeSiteBuild({ snapshot, output_directory: directory })
                )
                const asset = build.manifest.assets?.[0]
                if (!asset) throw new Error("Missing CSS")
                const html = await readFile(
                    join(directory, "index.html"),
                    "utf8"
                )
                const css = await readFile(
                    join(directory, asset.output_path),
                    "utf8"
                )
                expect(css).toContain(renderSiteThemeCss(theme))
                expect(html).toContain(
                    `name="color-scheme" content="${appearance === "system" ? "light dark" : appearance}"`
                )
                expect(html).toContain(
                    `src="https://example.com/${appearance === "dark" ? "dark" : "light"}.svg"`
                )
                expect(html.includes("prefers-color-scheme: dark")).toBe(
                    appearance === "system"
                )
                expect(html).not.toMatch(/<script|data-foldkit/)
            } finally {
                await rm(directory, { recursive: true, force: true })
            }
        }
    )
})
