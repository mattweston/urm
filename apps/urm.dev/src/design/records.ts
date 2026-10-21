import { Schema } from "effect"
import { SiteSocialLinks } from "@urm/domain/schemas/domains"
import { ContentTemplateSource } from "@urm/domain/schemas/content-templates"
import { SiteAppearanceSettings } from "@urm/domain/schemas/site-appearance"
import {
    NavigationLabel,
    PageContent,
    PageContentType,
    PageSlug,
    PageTitle,
    PublicationRouteModuleId,
    PublicationState,
    PublicNavigationModuleId,
    SeoDescription,
    SeoTitle,
    SiteTitle,
} from "@urm/domain/schemas/publications"

export const DomainId = Schema.String
export type DomainId = typeof DomainId.Type
export const SubdomainId = Schema.String
export type SubdomainId = typeof SubdomainId.Type
export const PageId = Schema.String
export type PageId = typeof PageId.Type
export const ImageId = Schema.String
export type ImageId = typeof ImageId.Type
export const PublicationNavigationItemId = Schema.String
export type PublicationNavigationItemId =
    typeof PublicationNavigationItemId.Type
export { PublicationRouteModuleId }

export const Page = Schema.Struct({
    _id: PageId,
    _creationTime: Schema.Number,
    domain_id: DomainId,
    subdomain_id: Schema.optional(SubdomainId),
    title: PageTitle,
    content: PageContent,
    content_type: PageContentType,
    slug: Schema.optional(PageSlug),
    navigation_label: NavigationLabel,
    show_in_navigation: Schema.Boolean,
    order_position: Schema.Number,
    is_homepage: Schema.Boolean,
    publication_state: PublicationState,
    seo_title: Schema.optional(SeoTitle),
    seo_description: Schema.optional(SeoDescription),
    noindex: Schema.Boolean,
    template_source: Schema.optional(ContentTemplateSource),
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export type Page = typeof Page.Type

export const Image = Schema.Struct({
    _id: ImageId,
    _creationTime: Schema.Number,
    domain_id: DomainId,
    url: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(4_000)),
    alt: Schema.String.check(Schema.isMaxLength(2_000)),
    text: Schema.String.check(Schema.isMaxLength(20_000)),
    width: Schema.optional(Schema.Number),
    height: Schema.optional(Schema.Number),
    category: Schema.optional(Schema.String.check(Schema.isMaxLength(255))),
    order_position: Schema.Number,
    updated_at: Schema.Number,
})
export type Image = typeof Image.Type

export const PublicationLayout = Schema.Struct({
    _id: Schema.String,
    _creationTime: Schema.Number,
    domain_id: DomainId,
    subdomain_id: Schema.optional(SubdomainId),
    theme_id: Schema.optional(SiteAppearanceSettings.fields.theme_id),
    appearance: Schema.optional(SiteAppearanceSettings.fields.appearance),
    site_title: Schema.optional(SiteTitle),
    show_site_title: Schema.optional(Schema.Boolean),
    social_links: SiteSocialLinks,
    social_links_configured: Schema.Boolean,
    logo_light_image_id: Schema.optional(ImageId),
    logo_dark_image_id: Schema.optional(ImageId),
    favicon_light_image_id: Schema.optional(ImageId),
    favicon_dark_image_id: Schema.optional(ImageId),
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export type PublicationLayout = typeof PublicationLayout.Type

export const PublicationNavigationItem = Schema.Struct({
    _id: PublicationNavigationItemId,
    _creationTime: Schema.Number,
    domain_id: DomainId,
    subdomain_id: Schema.optional(SubdomainId),
    target: Schema.Union([
        Schema.Struct({ _tag: Schema.Literal("page"), page_id: PageId }),
        Schema.Struct({
            _tag: Schema.Literal("module"),
            module_id: PublicNavigationModuleId,
        }),
    ]),
    label: NavigationLabel,
    visible: Schema.Boolean,
    order_position: Schema.Number,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export type PublicationNavigationItem = typeof PublicationNavigationItem.Type

export const PublicationRouteModule = Schema.Struct({
    _id: Schema.String,
    _creationTime: Schema.Number,
    domain_id: DomainId,
    subdomain_id: Schema.optional(SubdomainId),
    module_id: PublicationRouteModuleId,
    included: Schema.Boolean,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export type PublicationRouteModule = typeof PublicationRouteModule.Type
