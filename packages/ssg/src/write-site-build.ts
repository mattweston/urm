import { NodeServices } from "@effect/platform-node"
import { Context, Effect, FileSystem, Layer } from "effect"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createHash } from "node:crypto"

import { renderDocumentPage } from "./basic-renderer.ts"
import { DeploymentBuildError } from "./errors.ts"
import { renderEventIndex, renderEventPage } from "./event-renderer.ts"
import { buildSite, type SiteBuild } from "./site-generator.ts"
import type { PublishedPage, ReleaseSnapshot } from "./snapshot.ts"
import { renderSiteThemeCss } from "./site-theme.ts"
import { build_event_behaviors } from "./site-behaviors.ts"

export type PublicSiteConfig = Readonly<{
    mapbox_access_token?: string
}>

const template = `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <title>Site</title>
        <link rel="stylesheet" href="/assets/site.css" />
        <link rel="expect" href="#site-header" blocking="render" />
        <link rel="expect" href="#site-footer" blocking="render" />
    </head>
    <body>
        <div id="root"></div>
    </body>
</html>`

const repository_root = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../.."
)

const urm_bundled_assets = [
    {
        source: "apps/client/public/branding/logos/bento-brand-wordmark.svg",
        output: "assets/urm-integrations/bento.svg",
    },
    {
        source: "apps/client/public/branding/logos/instagram/03 Black Glyph/Instagram_Glyph_Black.svg",
        output: "assets/urm-integrations/instagram.svg",
    },
    {
        source: "apps/client/public/branding/logos/polar/Logomark/logomark_black.svg",
        output: "assets/urm-integrations/polar.svg",
    },
    {
        source: "apps/client/public/branding/logos/stripe/Stripe wordmark - Blurple.svg",
        output: "assets/urm-integrations/stripe.svg",
    },
]

const public_asset_url = (
    value: string | null | undefined
): string | undefined => {
    if (value === null || value === undefined) return undefined
    try {
        const url = new URL(value)
        return url.protocol === "https:" && !url.username && !url.password
            ? url.href
            : undefined
    } catch {
        return undefined
    }
}

const escaped_attribute = (value: string): string =>
    value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")

const summarized_description = (value: string): string => {
    const normalized = value.replaceAll(/\s+/g, " ").trim()
    return normalized.length <= 200
        ? normalized
        : `${normalized.slice(0, 199).trimEnd()}…`
}

const favicon_links = (layout: ReleaseSnapshot["layout"]): string => {
    if (layout === undefined) return ""
    const light =
        public_asset_url(layout.favicon_light_url) ??
        public_asset_url(layout.favicon_dark_url)
    const dark = public_asset_url(layout.favicon_dark_url) ?? light
    if (light === undefined) return ""
    if (
        dark === undefined ||
        dark === light ||
        layout.theme?.appearance === "light"
    ) {
        return `<link rel="icon" href="${escaped_attribute(light)}" />`
    }
    if (layout.theme?.appearance === "dark") {
        return `<link rel="icon" href="${escaped_attribute(dark)}" />`
    }
    return `<link rel="icon" href="${escaped_attribute(light)}" media="(prefers-color-scheme: light)" />\n        <link rel="icon" href="${escaped_attribute(dark)}" media="(prefers-color-scheme: dark)" />`
}

export const render_security_headers = (
    site_origin: string,
    has_event_behaviors = false
): string => {
    const hostname = new URL(site_origin).hostname
    return `/*
    Content-Security-Policy: default-src 'none'; style-src 'self'; img-src 'self' https: data:; font-src 'self' https: data:; script-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
    X-Content-Type-Options: nosniff
    X-Frame-Options: DENY
    Referrer-Policy: strict-origin-when-cross-origin
    Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=(), usb=()
    Cross-Origin-Opener-Policy: same-origin-allow-popups

https://dev.${hostname}/*
    X-Robots-Tag: noindex, nofollow

https://staging.${hostname}/*
    X-Robots-Tag: noindex, nofollow

https://:worker.:account.workers.dev/*
    X-Robots-Tag: noindex, nofollow
${
    has_event_behaviors
        ? `
/events/*
    ! Content-Security-Policy
    Content-Security-Policy: default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' https: data:; script-src 'self'; connect-src https://api.mapbox.com https://events.mapbox.com https://api.open-meteo.com; worker-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
`
        : ""
}
`
}

export const writeSiteBuild = Effect.fn("SiteBuild.write")(function* (options: {
    snapshot: ReleaseSnapshot
    output_directory: string
    public_config?: PublicSiteConfig
}) {
    const fs = yield* FileSystem.FileSystem
    const base_css = yield* fs.readFileString(
        fileURLToPath(new URL("./site.css", import.meta.url))
    )
    const theme = options.snapshot.layout?.theme
    const css = base_css + renderSiteThemeCss(theme)
    const css_hash = createHash("sha256").update(css).digest("hex")
    const css_path = `assets/site-${css_hash.slice(0, 16)}.css`
    const events = options.snapshot.events ?? []
    const has_coordinates = (event: (typeof events)[number]): boolean =>
        event.latitude !== undefined && event.longitude !== undefined
    const has_event_behaviors = events.some(has_coordinates)
    const mapbox_access_token =
        options.public_config?.mapbox_access_token?.trim() ?? ""
    const has_urm_bundled_assets = options.snapshot.pages.some(
        (page) =>
            page.content_type === "landing_json" &&
            page.body.includes('"BundledAsset"')
    )
    if (
        has_urm_bundled_assets &&
        new URL(options.snapshot.site_origin).hostname !== "urm.urm.dev"
    ) {
        return yield* Effect.fail(
            new DeploymentBuildError({
                operation:
                    "copy URM bundled assets: bundled assets are restricted to urm.urm.dev",
            })
        )
    }
    if (has_event_behaviors && mapbox_access_token === "") {
        return yield* Effect.fail(
            new DeploymentBuildError({
                operation:
                    "configure public event maps: VITE_MAPBOX_ACCESS_TOKEN is required",
            })
        )
    }
    const event_behaviors = has_event_behaviors
        ? yield* build_event_behaviors()
        : undefined
    const event_route = (
        path: string,
        title: string,
        seo_description: string,
        behaviors: ReadonlyArray<string> = []
    ): PublishedPage => ({
        path,
        title,
        heading: title,
        body: "",
        content_type: "text",
        seo_description: summarized_description(seo_description),
        ...(behaviors.length === 0 ? {} : { behaviors }),
    })
    const event_routes =
        events.length === 0
            ? []
            : [
                  event_route(
                      "/events/",
                      "Events",
                      `Upcoming events${options.snapshot.layout?.name === undefined ? "" : ` from ${options.snapshot.layout.name}`} with dates, venues, and ticket information.`
                  ),
                  ...events.map((event) =>
                      event_route(
                          event.path,
                          event.title,
                          event.description?.trim() ||
                              `${event.title} at ${event.venue_name}.`,
                          has_coordinates(event) &&
                              event_behaviors !== undefined
                              ? [event_behaviors.entry_path]
                              : []
                      )
                  ),
              ]
    const mapbox_meta =
        mapbox_access_token === ""
            ? ""
            : `<meta name="urm-mapbox-access-token" content="${escaped_attribute(mapbox_access_token)}" />`
    const build = yield* buildSite({
        snapshot: {
            ...options.snapshot,
            pages: [...options.snapshot.pages, ...event_routes],
        },
        template: template
            .replace("/assets/site.css", `/${css_path}`)
            .replace(
                '<link rel="stylesheet"',
                `${favicon_links(options.snapshot.layout)}\n        <link rel="stylesheet"`
            )
            .replace(
                'content="light dark"',
                `content="${theme === undefined || theme.appearance === "system" ? "light dark" : theme.appearance}"`
            )
            .replace("</head>", `${mapbox_meta}\n    </head>`),
        render: (page) => {
            if (page.path === "/events/" && events.length > 0) {
                return renderEventIndex(events, options.snapshot.layout)
            }
            const event = events.find(
                (candidate) => candidate.path === page.path
            )
            return event === undefined
                ? renderDocumentPage(page, options.snapshot.layout)
                : renderEventPage(event, options.snapshot.layout)
        },
    })
    const output_directory = resolve(repository_root, options.output_directory)
    yield* fs.makeDirectory(resolve(output_directory, "assets"), {
        recursive: true,
    })
    yield* fs.writeFileString(resolve(output_directory, css_path), css)
    yield* fs.writeFileString(
        resolve(output_directory, "_headers"),
        render_security_headers(
            options.snapshot.site_origin,
            has_event_behaviors
        )
    )
    yield* fs.writeFileString(
        resolve(output_directory, ".assetsignore"),
        "manifest.json\n"
    )

    for (const asset of event_behaviors?.assets ?? []) {
        yield* fs.writeFileString(
            resolve(output_directory, asset.output_path),
            asset.content
        )
    }

    if (has_urm_bundled_assets) {
        for (const asset of urm_bundled_assets) {
            const content = yield* fs.readFileString(
                resolve(repository_root, asset.source)
            )
            const output_path = resolve(output_directory, asset.output)
            yield* fs.makeDirectory(dirname(output_path), { recursive: true })
            yield* fs.writeFileString(output_path, content)
        }
    }

    for (const artifact of build.artifacts) {
        const output_path = resolve(output_directory, artifact.output_path)
        yield* fs.makeDirectory(dirname(output_path), { recursive: true })
        yield* fs.writeFileString(output_path, artifact.content)
    }

    const manifest = {
        ...build.manifest,
        assets: [
            {
                output_path: css_path,
                media_type: "text/css; charset=utf-8",
                sha256: css_hash,
            },
            ...(event_behaviors?.assets.map(
                ({ output_path, media_type, sha256 }) => ({
                    output_path,
                    media_type,
                    sha256,
                })
            ) ?? []),
        ],
    } satisfies SiteBuild["manifest"]
    yield* fs.writeFileString(
        resolve(output_directory, "manifest.json"),
        `${JSON.stringify(manifest, undefined, 4)}\n`
    )

    return { ...build, manifest } satisfies SiteBuild
}, Effect.provide(NodeServices.layer))

export interface SiteBuildWriterType {
    readonly write: typeof writeSiteBuild
}

export class SiteBuildWriter extends Context.Service<
    SiteBuildWriter,
    SiteBuildWriterType
>()("@urm/ssg/SiteBuildWriter") {}

export const SiteBuildWriterLive = Layer.succeed(
    SiteBuildWriter,
    SiteBuildWriter.of({ write: writeSiteBuild })
)
