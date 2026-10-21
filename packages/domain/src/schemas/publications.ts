import { Schema } from "effect"
import { LogoScene } from "./logos.ts"
import { LandingPageContentType } from "./landing-pages.ts"

import {
    DocumentContent,
    DocumentContentType,
    DocumentSlug,
    DocumentTitle,
} from "./documents.ts"
import { SiteSocialLinks } from "./domains.ts"
import { DomainName } from "./domains.ts"
import { PublishedSiteTheme } from "./site-appearance.ts"

export const PublicationStatus = Schema.Literals(["draft", "live", "disabled"])
export type PublicationStatus = typeof PublicationStatus.Type

export const PublicationAccess = Schema.Literals(["public", "link", "password"])
export type PublicationAccess = typeof PublicationAccess.Type

export const SubdomainKind = Schema.Literals([
    "prototype",
    "survey",
    "documentation",
])
export type SubdomainKind = typeof SubdomainKind.Type

export const SubdomainName = DomainName
export type SubdomainName = DomainName

export const SiteTitle = DomainName
export type SiteTitle = DomainName

export const SubdomainSlug = Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(63),
    Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
)
export type SubdomainSlug = typeof SubdomainSlug.Type

export const PublicationChannel = Schema.Literals([
    "development",
    "staging",
    "production",
    "live",
])
export type PublicationChannel = typeof PublicationChannel.Type

export const PublicationState = Schema.Literals([
    "draft",
    "published",
    "archived",
])
export type PublicationState = typeof PublicationState.Type

export const InternalDocumentStatus = Schema.Literals([
    "draft",
    "active",
    "archived",
])
export type InternalDocumentStatus = typeof InternalDocumentStatus.Type

export const PageTitle = DocumentTitle
export type PageTitle = DocumentTitle

export const PageContent = DocumentContent
export type PageContent = DocumentContent

export const PageContentType = Schema.Union([
    DocumentContentType,
    LandingPageContentType,
])
export type PageContentType = typeof PageContentType.Type

export const PageSlug = DocumentSlug
export type PageSlug = DocumentSlug

export const NavigationLabel = Schema.String.check(Schema.isMaxLength(100))
export type NavigationLabel = typeof NavigationLabel.Type

export const PublicNavigationModuleId = Schema.Literals([
    "blog",
    "events",
    "gallery",
    "contact",
    "music",
])
export type PublicNavigationModuleId = typeof PublicNavigationModuleId.Type

export const PublicationRouteModuleId = Schema.Literals(["blog", "events"])
export type PublicationRouteModuleId = typeof PublicationRouteModuleId.Type

export const SeoTitle = Schema.String.check(Schema.isMaxLength(70))
export type SeoTitle = typeof SeoTitle.Type

export const SeoDescription = Schema.String.check(Schema.isMaxLength(200))
export type SeoDescription = typeof SeoDescription.Type

export const BlogPostTitle = DocumentTitle
export type BlogPostTitle = DocumentTitle

export const BlogPostContent = DocumentContent
export type BlogPostContent = DocumentContent

export const BlogPostContentType = DocumentContentType
export type BlogPostContentType = DocumentContentType

export const BlogPostSlug = DocumentSlug
export type BlogPostSlug = DocumentSlug

export const BlogPostExcerpt = Schema.String.check(Schema.isMaxLength(1_000))
export type BlogPostExcerpt = typeof BlogPostExcerpt.Type

export const ArtifactChecksum = Schema.String.check(
    Schema.isPattern(/^[a-f0-9]{64}$/)
)
export type ArtifactChecksum = typeof ArtifactChecksum.Type

export const PublishedPublicationLayout = Schema.Struct({
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
        Schema.Struct({
            label: Schema.String,
            path: Schema.String,
        })
    ).check(Schema.isMaxLength(100)),
})
export type PublishedPublicationLayout = typeof PublishedPublicationLayout.Type

export const PublishedPage = Schema.Struct({
    path: Schema.String,
    title: Schema.String,
    body: Schema.String,
    content_type: PageContentType,
    seo_title: Schema.optional(SeoTitle),
    seo_description: Schema.optional(SeoDescription),
    noindex: Schema.optional(Schema.Boolean),
})
export type PublishedPage = typeof PublishedPage.Type

export const PublishedBlogPost = Schema.Struct({
    path: Schema.String,
    title: Schema.String,
    excerpt: Schema.optional(Schema.String),
    body: Schema.String,
    content_type: BlogPostContentType,
    published_at: Schema.optional(Schema.Number),
    seo_title: Schema.optional(SeoTitle),
    seo_description: Schema.optional(SeoDescription),
})
export type PublishedBlogPost = typeof PublishedBlogPost.Type

export const PublishedEventMenuItem = Schema.Struct({
    title: Schema.String,
    description: Schema.String,
    content: Schema.String,
    price: Schema.Int,
    category: Schema.String,
    served_at: Schema.Array(Schema.Literals(["breakfast", "lunch", "dinner"])),
    dietary_labels: Schema.String,
    allergens: Schema.String,
    image_url: Schema.optional(Schema.String),
})

export const PublishedEvent = Schema.Struct({
    menu_items: Schema.optional(
        Schema.Array(PublishedEventMenuItem).check(Schema.isMaxLength(100))
    ),
    path: Schema.String,
    title: Schema.String,
    description: Schema.optional(Schema.String),
    date: Schema.Number,
    start_time: Schema.String,
    end_time: Schema.optional(Schema.String),
    venue_name: Schema.String,
    latitude: Schema.optional(Schema.String),
    longitude: Schema.optional(Schema.String),
    venue_url: Schema.optional(Schema.String),
    tickets_url: Schema.optional(Schema.String),
    image_url: Schema.optional(Schema.String),
})
export type PublishedEvent = typeof PublishedEvent.Type

export const PublicationReleaseSnapshot = Schema.Struct({
    schema_version: Schema.Literal(1),
    release_id: Schema.String,
    publication_origin: Schema.String,
    pages: Schema.Array(PublishedPage).check(Schema.isMaxLength(100)),
    blog_posts: Schema.Array(PublishedBlogPost).check(
        Schema.isMaxLength(1_000)
    ),
    events: Schema.optional(
        Schema.Array(PublishedEvent).check(Schema.isMaxLength(50))
    ),
    layout: Schema.optional(PublishedPublicationLayout),
})
export type PublicationReleaseSnapshot = typeof PublicationReleaseSnapshot.Type

export const PublicationReleaseStatus = Schema.Literals([
    "building",
    "ready",
    "failed",
])
export type PublicationReleaseStatus = typeof PublicationReleaseStatus.Type

export const PublicationDeploymentStatus = Schema.Literals([
    "pending",
    "deploying",
    "succeeded",
    "failed",
    "cancelled",
])
export type PublicationDeploymentStatus =
    typeof PublicationDeploymentStatus.Type

export const PublishingOperation = Schema.Literals([
    "build",
    "preview",
    "deploy",
    "promote",
])
export type PublishingOperation = typeof PublishingOperation.Type

export const PublishingJobStatus = Schema.Literals([
    "pending",
    "running",
    "succeeded",
    "failed",
    "cancelled",
])
export type PublishingJobStatus = typeof PublishingJobStatus.Type

export const PublishingIdempotencyKey = Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(128),
    Schema.isPattern(/^[A-Za-z0-9._:-]+$/)
)
export type PublishingIdempotencyKey = typeof PublishingIdempotencyKey.Type

export const EmailStreamKind = Schema.Literals(["transactional", "bulk"])
export type EmailStreamKind = typeof EmailStreamKind.Type

export const EmailStreamProvider = Schema.Literals(["cloudflare", "bento"])
export type EmailStreamProvider = typeof EmailStreamProvider.Type

export const EmailStreamSendingLabel = Schema.Literals(["mail", "newsletter"])
export type EmailStreamSendingLabel = typeof EmailStreamSendingLabel.Type

export const EmailStreamStatus = Schema.Literals([
    "pending",
    "verifying",
    "verified",
    "failed",
    "disabled",
])
export type EmailStreamStatus = typeof EmailStreamStatus.Type

export const ProviderReference = Schema.String.check(Schema.isMaxLength(500))
export type ProviderReference = typeof ProviderReference.Type
