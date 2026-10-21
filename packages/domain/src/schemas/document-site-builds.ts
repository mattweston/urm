import { Schema } from "effect"

import { SiteSocialLinks } from "./domains.ts"
import { LogoScene } from "./logos.ts"
import { PublishedSiteTheme } from "./site-appearance.ts"
import { PageContentType, PublishedEvent } from "./publications.ts"

export const PublishedSiteLayout = Schema.Struct({
    theme: Schema.optional(PublishedSiteTheme),
    name: Schema.String,
    show_site_title: Schema.optional(Schema.Boolean),
    logo_scene: Schema.optional(LogoScene),
    logo_light_url: Schema.NullOr(Schema.String),
    logo_dark_url: Schema.NullOr(Schema.String),
    favicon_light_url: Schema.optional(Schema.NullOr(Schema.String)),
    favicon_dark_url: Schema.optional(Schema.NullOr(Schema.String)),
    social_links: SiteSocialLinks,
    navigation: Schema.Array(
        Schema.Struct({ label: Schema.String, path: Schema.String })
    ).check(Schema.isMaxLength(100)),
})
export type PublishedSiteLayout = typeof PublishedSiteLayout.Type

export const SiteBehaviorAssetPath = Schema.String.check(
    Schema.isPattern(/^assets\/[a-z0-9][a-z0-9._-]*\.js$/)
)
export type SiteBehaviorAssetPath = typeof SiteBehaviorAssetPath.Type

export const PublishedSitePage = Schema.Struct({
    path: Schema.String,
    title: Schema.String,
    heading: Schema.String,
    body: Schema.String,
    content_type: PageContentType,
    seo_description: Schema.optional(Schema.String),
    noindex: Schema.optional(Schema.Boolean),
    behaviors: Schema.optional(Schema.Array(SiteBehaviorAssetPath)),
})
export type PublishedSitePage = typeof PublishedSitePage.Type

export const SiteReleaseSnapshot = Schema.Struct({
    release_id: Schema.String,
    site_origin: Schema.String,
    pages: Schema.Array(PublishedSitePage),
    events: Schema.optional(Schema.Array(PublishedEvent)),
    layout: Schema.optional(PublishedSiteLayout),
})
export type SiteReleaseSnapshot = typeof SiteReleaseSnapshot.Type

export const SiteBuildManifestRoute = Schema.Struct({
    route: Schema.String,
    output_path: Schema.String,
    media_type: Schema.Literal("text/html; charset=utf-8"),
})
export type SiteBuildManifestRoute = typeof SiteBuildManifestRoute.Type

export const SiteBuildManifest = Schema.Struct({
    manifest_version: Schema.Literal(1),
    release_id: Schema.String,
    site_origin: Schema.String,
    is_complete: Schema.Literal(true),
    routes: Schema.Array(SiteBuildManifestRoute),
    assets: Schema.optional(
        Schema.Array(
            Schema.Struct({
                output_path: Schema.String,
                media_type: Schema.Literals([
                    "text/css; charset=utf-8",
                    "text/javascript; charset=utf-8",
                    "image/png",
                    "image/jpeg",
                    "image/gif",
                    "image/webp",
                ]),
                sha256: Schema.String,
            })
        )
    ),
})
export type SiteBuildManifest = typeof SiteBuildManifest.Type

export const DocumentSiteBuildStatus = Schema.Literals([
    "building",
    "succeeded",
    "failed",
])
export type DocumentSiteBuildStatus = typeof DocumentSiteBuildStatus.Type

export const DocumentSiteBuild = Schema.Struct({
    id: Schema.String,
    org_id: Schema.String,
    domain_id: Schema.String,
    release_id: Schema.String,
    correlation_id: Schema.String,
    status: DocumentSiteBuildStatus,
    manifest: Schema.NullOr(SiteBuildManifest),
    output_directory: Schema.NullOr(Schema.String),
    error_message: Schema.NullOr(Schema.String),
    created_at: Schema.Date,
    updated_at: Schema.Date,
})
export type DocumentSiteBuild = typeof DocumentSiteBuild.Type
