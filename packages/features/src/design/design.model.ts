import { Image } from "@urm/domain/schemas/media"
import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import { MarkdownDocument } from "@foldkit/markdown"
import * as SocialLinks from "../media/social-links/index.ts"
import { EventWeatherAsyncData } from "../events/platform/event-weather.model.ts"
import { PublicNavigationModuleId } from "@urm/domain/schemas/publications"
import { SiteAppearanceSettings } from "@urm/domain/schemas/site-appearance"

export const DEFAULT_LOGO_LIGHT_URL = "/logo-light.svg"
export const DEFAULT_LOGO_DARK_URL = "/logo-dark.svg"
export const DEFAULT_FAVICON_URL = "/favicon.svg"

export const LogoVariant = S.Literals(["light", "dark"])
export type LogoVariant = typeof LogoVariant.Type

export const DesignSite = S.Struct({
    id: S.String,
    domain_id: S.String,
    name: S.String,
    slug: S.String,
    purpose: S.Literals([
        "production",
        "staging",
        "prototype",
        "survey",
        "document",
    ]),
    status: S.Literals(["draft", "live", "disabled"]),
    access: S.Literals(["public", "link", "password"]),
    updated_at: S.Number,
})
export type DesignSite = typeof DesignSite.Type

export const DesignDocument = S.Struct({
    id: S.String,
    title: S.String,
    kind: S.Literals(["basic", "blog"]),
    slug: S.NullOr(S.String),
    published: S.Boolean,
})
export type DesignDocument = typeof DesignDocument.Type

export const DesignPreviewDocument = S.Struct({
    ...DesignDocument.fields,
    content: S.String,
    content_type: S.Literals([
        "markdown",
        "html",
        "text",
        "rtf",
        "rich_text_json",
        "landing_json",
    ]),
})
export type DesignPreviewDocument = typeof DesignPreviewDocument.Type

export const DesignPreviewEvent = S.Struct({
    id: S.String,
    title: S.String,
    description: S.String,
    date: S.Number,
    start_time: S.String,
    end_time: S.String,
    venue_name: S.String,
    venue_url: S.String,
    latitude: S.String,
    longitude: S.String,
    tickets_url: S.String,
    image_url: S.String,
    published: S.Boolean,
})
export type DesignPreviewEvent = typeof DesignPreviewEvent.Type

export const DesignPreviewBlogPost = S.Struct({
    id: S.String,
    title: S.String,
    slug: S.NullOr(S.String),
    published: S.Boolean,
})
export type DesignPreviewBlogPost = typeof DesignPreviewBlogPost.Type

export const DesignPage = S.Struct({
    id: S.String,
    domain_id: S.String,
    owner_id: S.String,
    document_id: S.String,
    navigation_label: S.String,
    is_homepage: S.Boolean,
    show_in_navigation: S.Boolean,
    order_position: S.Number,
    updated_at: S.Number,
})
export type DesignPage = typeof DesignPage.Type

export const DesignNavigationItem = S.Struct({
    id: S.String,
    label: S.String,
    visible: S.Boolean,
    target: S.Union([
        S.Struct({ _tag: S.Literal("page"), page_id: S.String }),
        S.Struct({
            _tag: S.Literal("module"),
            module_id: PublicNavigationModuleId,
        }),
    ]),
})
export type DesignNavigationItem = typeof DesignNavigationItem.Type

export const Model = S.Struct({
    can_write: S.optionalKey(S.Boolean),
    ...SiteAppearanceSettings.fields,
    site_title: S.String,
    show_site_title: S.Boolean,
    appearance_dirty: S.Boolean,
    appearance_saving: S.Boolean,
    appearance_saved: S.Boolean,
    sites: S.Array(DesignSite),
    is_main_layout_route: S.Boolean,
    preserve_layout_draft: S.Boolean,
    selected_owner_id: S.Option(S.String),
    documents: S.Array(DesignDocument),
    pages: S.Array(DesignPage),
    preview_navigation: S.Option(S.Array(DesignNavigationItem)),
    preview_blog_posts: S.Array(DesignPreviewBlogPost),
    preview_blog_unavailable: S.Boolean,
    preview_events: S.Array(DesignPreviewEvent),
    preview_events_state: S.optional(
        S.Literals(["included", "excluded", "unavailable"])
    ),
    preview_landing_images: S.Array(Image),
    preview_landing_faqs: S.Record(S.String, S.Boolean),
    preview_module_id: S.Option(PublicNavigationModuleId),
    preview_event_id: S.Option(S.String),
    preview_event_weather: EventWeatherAsyncData.schema,
    preview_event_map_error: S.Option(S.String),
    is_loading: S.Boolean,
    busy: S.Boolean,
    error: S.Option(S.String),
    is_preview_open: S.Boolean,
    preview_page_id: S.Option(S.String),
    preview_document: S.Option(DesignPreviewDocument),
    preview_markdown: S.Option(MarkdownDocument),
    preview_markdown_error: S.Option(S.String),
    editing_page_id: S.Option(S.String),
    editing_navigation_label: S.String,
    logo_light_url: S.String,
    logo_dark_url: S.String,
    has_custom_logo_light: S.Boolean,
    has_custom_logo_dark: S.Boolean,
    logo_uploading: S.Option(LogoVariant),
    logo_light_drop: Ui.FileDrop.Model,
    logo_dark_drop: Ui.FileDrop.Model,
    favicon_light_url: S.String,
    favicon_dark_url: S.String,
    has_custom_favicon_light: S.Boolean,
    has_custom_favicon_dark: S.Boolean,
    favicon_uploading: S.Option(LogoVariant),
    favicon_light_drop: Ui.FileDrop.Model,
    favicon_dark_drop: Ui.FileDrop.Model,
    social_links: SocialLinks.Model,
})

export type Model = typeof Model.Type
