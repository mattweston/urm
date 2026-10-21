import { Effect, Schema } from "effect"
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { SiteReleaseSnapshot } from "@urm/domain/schemas/document-site-builds"
import { default_logo_scene } from "@urm/domain/schemas/logos"
import { resolveSiteTheme } from "@urm/domain/schemas/site-appearance"
import { writeSiteBuild } from "../src/index.ts"

describe("static site layout", () => {
    // Includes a real Vite/Mapbox production bundle under workspace test load.
    it(
        "writes static pages and scoped event behavior assets",
        { timeout: 30000 },
        async () => {
            const directory = await mkdtemp(join(tmpdir(), "urm-site-layout-"))
            try {
                const snapshot = Schema.decodeUnknownSync(SiteReleaseSnapshot)({
                    release_id: "layout-test",
                    site_origin: "https://test1.urm.dev",
                    layout: {
                        name: "Test <site>",
                        logo_light_url: "https://example.com/light.svg",
                        logo_dark_url: "https://example.com/dark.svg",
                        favicon_light_url:
                            "https://example.com/favicon-light.svg",
                        favicon_dark_url:
                            "https://example.com/favicon-dark.svg",
                        social_links: [
                            {
                                platform: "Facebook",
                                url: "https://facebook.com/",
                            },
                            {
                                platform: "Instagram",
                                url: "https://instagram.com/",
                            },
                            {
                                platform: "YouTube",
                                url: "https://youtube.com/",
                            },
                            { platform: "X", url: "https://x.com/" },
                        ],
                        navigation: [
                            { label: "Home", path: "/" },
                            { label: "About", path: "/about/" },
                            { label: "Blog", path: "/blog/" },
                            { label: "Events", path: "/events/" },
                        ],
                    },
                    pages: ["/", "/about/", "/blog/"].map((path) => ({
                        path,
                        title: "Testing",
                        heading: "Testing",
                        body: "Content",
                        content_type: "text",
                    })),
                    events: [
                        {
                            path: "/events/event-1/",
                            title: "Open studio",
                            date: Date.UTC(2026, 8, 12),
                            start_time: "18:00",
                            venue_name: "Main hall",
                            latitude: "51.5",
                            longitude: "-0.1",
                        },
                    ],
                })
                const build = await Effect.runPromise(
                    writeSiteBuild({
                        snapshot,
                        output_directory: directory,
                        public_config: {
                            mapbox_access_token: "public-test-token",
                        },
                    })
                )
                const stylesheet = build.manifest.assets?.find((asset) =>
                    asset.output_path.startsWith("assets/site-")
                )
                const behavior = build.manifest.assets?.find((asset) =>
                    asset.output_path.startsWith("assets/event-details-")
                )
                const map_stylesheet = build.manifest.assets?.find(
                    (asset) =>
                        asset.media_type === "text/css; charset=utf-8" &&
                        asset.output_path.startsWith("assets/event-event-map-")
                )
                expect(stylesheet?.output_path).toMatch(
                    /^assets\/site-[a-f0-9]{16}\.css$/
                )
                if (!stylesheet) throw new Error("Expected stylesheet asset")
                if (!behavior) throw new Error("Expected event behavior asset")
                if (!map_stylesheet)
                    throw new Error("Expected event map stylesheet asset")
                const css = await readFile(
                    join(directory, stylesheet.output_path),
                    "utf8"
                )
                const headers = await readFile(
                    join(directory, "_headers"),
                    "utf8"
                )
                const assets_ignore = await readFile(
                    join(directory, ".assetsignore"),
                    "utf8"
                )
                expect(css).toContain(".site-header")
                expect(css).toMatch(
                    /\.site-header\s*\{\s*justify-content: space-between;\s*padding-inline: 1\.25rem;/
                )
                expect(css).toMatch(
                    /\.site-footer\s*\{\s*flex-direction: column;\s*text-align: center;/
                )
                expect(css).toMatch(
                    /\.site-layout \.site-social-links\s*\{\s*inline-size: 100%;\s*justify-content: center;/
                )
                expect(css).toContain(".site-social-link svg")
                expect(css).toContain(".site-social-link:focus-visible")
                expect(css).toContain("prefers-reduced-motion: no-preference")
                expect(css).toContain("animation-timeline: view(block)")
                expect(css).toContain("animation-range: entry")
                expect(css).toContain('data-landing-motion="stagger"')
                expect(css).toContain("@view-transition")
                expect(css).toContain("navigation: auto")
                expect(css).toContain("navigation: none")
                expect(css).toContain("view-transition-name: site-header")
                expect(css).toContain("view-transition-name: site-footer")
                expect(css).toContain("prefers-color-scheme: dark")
                expect(css).toContain(".site-event-panel")
                expect(css).toContain(".site-event-weather-reading")
                expect(headers).toContain(
                    "Content-Security-Policy: default-src 'none'"
                )
                expect(headers).toContain("/events/*")
                expect(headers).toContain("! Content-Security-Policy")
                expect(headers).toContain("script-src 'self'")
                expect(headers).toContain("https://api.open-meteo.com")
                expect(headers).toContain("X-Content-Type-Options: nosniff")
                expect(headers).toContain("X-Frame-Options: DENY")
                expect(headers).toContain(
                    "https://dev.test1.urm.dev/*\n    X-Robots-Tag: noindex, nofollow"
                )
                expect(headers).toContain(
                    "https://staging.test1.urm.dev/*\n    X-Robots-Tag: noindex, nofollow"
                )
                expect(headers).toContain(
                    "https://:worker.:account.workers.dev/*\n    X-Robots-Tag: noindex, nofollow"
                )
                expect(assets_ignore).toBe("manifest.json\n")
                const behavior_sources = await Promise.all(
                    (build.manifest.assets ?? [])
                        .filter(
                            (asset) =>
                                asset.media_type ===
                                "text/javascript; charset=utf-8"
                        )
                        .map((asset) =>
                            readFile(join(directory, asset.output_path), "utf8")
                        )
                )
                const behavior_source = behavior_sources.join("\n")
                expect(behavior_source).toContain(
                    map_stylesheet.output_path.slice("assets/".length)
                )
                expect(behavior_source).toMatch(/return["']\/assets\/["']\s*\+/)
                for (const path of [
                    "index.html",
                    "about/index.html",
                    "blog/index.html",
                    "events/index.html",
                    "events/event-1/index.html",
                ]) {
                    const html = await readFile(join(directory, path), "utf8")
                    expect(html).toMatch(/<header\b[^>]*id="site-header"/)
                    expect(html).toMatch(/<footer\b[^>]*id="site-footer"/)
                    expect(html).toContain(
                        '<link rel="expect" href="#site-header" blocking="render" />'
                    )
                    expect(html).toContain(
                        '<link rel="expect" href="#site-footer" blocking="render" />'
                    )
                    expect(html).toContain("Main navigation")
                    expect(html).toMatch(
                        /<a\b[^>]*href="\/blog\/"[^>]*>Blog<\/a>/
                    )
                    expect(html).toMatch(
                        /<a\b[^>]*href="\/events\/"[^>]*>Events<\/a>/
                    )
                    for (const platform of [
                        "Facebook",
                        "Instagram",
                        "YouTube",
                        "X",
                    ]) {
                        expect(html).toContain(`data-platform="${platform}"`)
                        expect(html).toContain(`aria-label="${platform}"`)
                        expect(css).toContain(`[data-platform="${platform}"]`)
                    }
                    expect(html.match(/<svg\b/g)).toHaveLength(4)
                    expect(html.match(/aria-hidden="true"/g)).toHaveLength(4)
                    expect(html).toContain("Test &lt;site&gt;")
                    expect(html).toContain("https://example.com/light.svg")
                    expect(html).toContain("https://example.com/dark.svg")
                    expect(html).toContain(
                        '<link rel="icon" href="https://example.com/favicon-light.svg" media="(prefers-color-scheme: light)" />'
                    )
                    expect(html).toContain(
                        '<link rel="icon" href="https://example.com/favicon-dark.svg" media="(prefers-color-scheme: dark)" />'
                    )
                    expect(html).toContain(
                        path.startsWith("events/") ? "Open studio" : "Content"
                    )
                    expect(html).toContain(`href="/${stylesheet.output_path}"`)
                    expect(html).toContain('aria-current="page"')
                    const is_enhanced_event =
                        path === "events/event-1/index.html"
                    expect(
                        html.includes(
                            `<script type="module" src="/${behavior.output_path}"></script>`
                        )
                    ).toBe(is_enhanced_event)
                    expect(html).toContain(
                        '<meta name="urm-mapbox-access-token" content="public-test-token" />'
                    )
                    expect(html).toContain('<meta name="description" content="')
                    expect(html.includes('data-event-latitude="51.5"')).toBe(
                        is_enhanced_event
                    )
                    expect(html).not.toMatch(/data-foldkit|node_modules/)
                }
                const assets = await readdir(join(directory, "assets"))
                expect(assets).toContain(
                    stylesheet.output_path.slice("assets/".length)
                )
                expect(assets).toContain(
                    behavior.output_path.slice("assets/".length)
                )
                expect(
                    build.manifest.assets?.some(
                        (asset) =>
                            asset.media_type ===
                                "text/javascript; charset=utf-8" &&
                            asset.output_path !== behavior.output_path
                    )
                ).toBe(true)
            } finally {
                await rm(directory, { recursive: true, force: true })
            }
        }
    )

    it("rejects coordinate-bearing event builds without a Mapbox token", async () => {
        const directory = await mkdtemp(join(tmpdir(), "urm-site-map-config-"))
        try {
            const snapshot = Schema.decodeUnknownSync(SiteReleaseSnapshot)({
                release_id: "missing-mapbox-token",
                site_origin: "https://test1.urm.dev",
                pages: [],
                events: [
                    {
                        path: "/events/event-1/",
                        title: "Open studio",
                        date: Date.UTC(2026, 8, 12),
                        start_time: "18:00",
                        venue_name: "Main hall",
                        latitude: "51.5",
                        longitude: "-0.1",
                    },
                ],
            })

            await expect(
                Effect.runPromise(
                    writeSiteBuild({ snapshot, output_directory: directory })
                )
            ).rejects.toMatchObject({
                operation:
                    "configure public event maps: VITE_MAPBOX_ACCESS_TOKEN is required",
            })
        } finally {
            await rm(directory, { recursive: true, force: true })
        }
    })

    it("renders a saved logo scene inline with published theme tokens", async () => {
        const directory = await mkdtemp(join(tmpdir(), "urm-site-logo-"))
        try {
            const snapshot = Schema.decodeUnknownSync(SiteReleaseSnapshot)({
                release_id: "logo-test",
                site_origin: "https://test1.urm.dev",
                layout: {
                    name: "Test 1",
                    show_site_title: true,
                    theme: resolveSiteTheme({
                        theme_id: "default",
                        appearance: "system",
                    }),
                    logo_scene: default_logo_scene,
                    logo_light_url: null,
                    logo_dark_url: null,
                    social_links: [],
                    navigation: [],
                },
                pages: [
                    {
                        path: "/",
                        title: "Testing",
                        heading: "Testing",
                        body: "Content",
                        content_type: "text",
                    },
                ],
            })
            const build = await Effect.runPromise(
                writeSiteBuild({ snapshot, output_directory: directory })
            )
            const stylesheet = build.manifest.assets?.[0]
            if (!stylesheet) throw new Error("Expected stylesheet asset")
            const html = await readFile(join(directory, "index.html"), "utf8")
            const css = await readFile(
                join(directory, stylesheet.output_path),
                "utf8"
            )

            expect(html).toContain('<svg aria-hidden="true"')
            expect(html).toContain('fill="var(--card)"')
            expect(html).toContain('stroke="var(--foreground)"')
            expect(html).toContain('<span class="site-title">Test 1</span>')
            expect(html).not.toContain("<picture")
            expect(css).toContain("--card:")
            expect(css).toContain("--chart-4:")
            expect(css).toContain("--chart-5:")
        } finally {
            await rm(directory, { recursive: true, force: true })
        }
    })
})
