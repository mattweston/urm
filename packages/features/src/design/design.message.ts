import { Message as LandingMessage } from "../marketing/landing/message.ts"
import { Schema as S } from "effect"
import { MarkdownDocument } from "@foldkit/markdown"
import { taggedStruct } from "foldkit/schema"
import { Url } from "foldkit/url"
import * as Ui from "@foldkit/ui"
import * as SocialLinks from "../media/social-links/index.ts"
import { EventWeather } from "../events/platform/event-weather.model.ts"
import { SiteAppearanceSettings } from "@urm/domain/schemas/site-appearance"

import {
    DesignDocument,
    DesignNavigationItem,
    DesignPage,
    DesignPreviewDocument,
    DesignSite,
    LogoVariant,
} from "./design.model.ts"

export const ChangedUrl = taggedStruct("ChangedUrl", { url: Url })
export const LoadedSites = taggedStruct("LoadedSites", {
    sites: S.Array(DesignSite),
})
export const SelectedOwner = taggedStruct("SelectedOwner", {
    owner_id: S.String,
})
export const AssignedMainLayoutOwner = taggedStruct("AssignedMainLayoutOwner", {
    owner_id: S.String,
})
export const LoadedWorkspace = taggedStruct("LoadedWorkspace", {
    theme_id: S.optional(SiteAppearanceSettings.fields.theme_id),
    appearance: S.optional(SiteAppearanceSettings.fields.appearance),
    site_title: S.optional(S.String),
    show_site_title: S.optional(S.Boolean),
    owner_id: S.String,
    documents: S.Array(DesignDocument),
    pages: S.Array(DesignPage),
    has_layout: S.Boolean,
    social_links: S.Array(SocialLinks.SocialLink),
    logo_light_url: S.NullOr(S.String),
    logo_dark_url: S.NullOr(S.String),
    favicon_light_url: S.optional(S.NullOr(S.String)),
    favicon_dark_url: S.optional(S.NullOr(S.String)),
})
export const LoadedPreviewNavigation = taggedStruct("LoadedPreviewNavigation", {
    items: S.Array(DesignNavigationItem),
})
export const GotLightLogoDropMessage = taggedStruct("GotLightLogoDropMessage", {
    message: Ui.FileDrop.Message,
})
export const GotDarkLogoDropMessage = taggedStruct("GotDarkLogoDropMessage", {
    message: Ui.FileDrop.Message,
})
export const UploadedLayoutLogo = taggedStruct("UploadedLayoutLogo", {
    variant: LogoVariant,
    url: S.String,
})
export const RequestedRemoveLayoutLogo = taggedStruct(
    "RequestedRemoveLayoutLogo",
    {
        variant: LogoVariant,
    }
)
export const RemovedLayoutLogo = taggedStruct("RemovedLayoutLogo", {
    variant: LogoVariant,
})
export const GotLightFaviconDropMessage = taggedStruct(
    "GotLightFaviconDropMessage",
    {
        message: Ui.FileDrop.Message,
    }
)
export const GotDarkFaviconDropMessage = taggedStruct(
    "GotDarkFaviconDropMessage",
    {
        message: Ui.FileDrop.Message,
    }
)
export const UploadedLayoutFavicon = taggedStruct("UploadedLayoutFavicon", {
    variant: LogoVariant,
    url: S.String,
})
export const RequestedRemoveLayoutFavicon = taggedStruct(
    "RequestedRemoveLayoutFavicon",
    {
        variant: LogoVariant,
    }
)
export const RemovedLayoutFavicon = taggedStruct("RemovedLayoutFavicon", {
    variant: LogoVariant,
})
export const GotSocialLinksMessage = taggedStruct("GotSocialLinksMessage", {
    message: SocialLinks.Message,
})
export const LoadedPreviewDocument = taggedStruct("LoadedPreviewDocument", {
    page_id: S.String,
    document: DesignPreviewDocument,
})
export const LoadedPreviewMarkdown = taggedStruct("LoadedPreviewMarkdown", {
    page_id: S.String,
    document: MarkdownDocument,
})
export const FailedPreviewMarkdown = taggedStruct("FailedPreviewMarkdown", {
    page_id: S.String,
    error: S.String,
})
export const RequestedAddPage = taggedStruct("RequestedAddPage", {
    document_id: S.String,
})
export const RequestedRemovePage = taggedStruct("RequestedRemovePage", {
    page_id: S.String,
})
export const RequestedMovePage = taggedStruct("RequestedMovePage", {
    page_id: S.String,
    direction: S.Literals(["up", "down"]),
})
export const RequestedSetHomepage = taggedStruct("RequestedSetHomepage", {
    page_id: S.String,
})
export const RequestedToggleNavigation = taggedStruct(
    "RequestedToggleNavigation",
    {
        page_id: S.String,
    }
)
export const StartedEditingNavigationLabel = taggedStruct(
    "StartedEditingNavigationLabel",
    {
        page_id: S.String,
    }
)
export const ChangedNavigationLabel = taggedStruct("ChangedNavigationLabel", {
    value: S.String,
})
export const ChangedSiteTheme = taggedStruct("ChangedSiteTheme", {
    value: S.String,
})
export const ChangedSiteAppearance = taggedStruct("ChangedSiteAppearance", {
    value: S.String,
})
export const ChangedShowSiteTitle = taggedStruct("ChangedShowSiteTitle", {
    value: S.Boolean,
})
export const ChangedSiteTitle = taggedStruct("ChangedSiteTitle", {
    value: S.String,
})
export const RequestedSaveSiteAppearance = taggedStruct(
    "RequestedSaveSiteAppearance"
)
export const SavedSiteAppearance = taggedStruct("SavedSiteAppearance", {
    owner_id: S.String,
    ...SiteAppearanceSettings.fields,
    site_title: S.String,
    show_site_title: S.Boolean,
})
export const FailedSiteAppearance = taggedStruct("FailedSiteAppearance", {
    owner_id: S.String,
    error: S.String,
})
export const SubmittedNavigationLabel = taggedStruct("SubmittedNavigationLabel")
export const CancelledNavigationLabel = taggedStruct("CancelledNavigationLabel")
export const ToggledPreview = taggedStruct("ToggledPreview")
export const SelectedPreviewPage = taggedStruct("SelectedPreviewPage", {
    page_id: S.String,
})
export const SelectedPreviewModule = taggedStruct("SelectedPreviewModule", {
    module_id: S.Literals(["blog", "events"]),
})
export const SelectedPreviewEvent = taggedStruct("SelectedPreviewEvent", {
    event_id: S.String,
})
export const SelectedPreviewEventsIndex = taggedStruct(
    "SelectedPreviewEventsIndex"
)
export const RequestedPreviewEventWeather = taggedStruct(
    "RequestedPreviewEventWeather",
    {
        event_id: S.String,
    }
)
export const LoadedPreviewEventWeather = taggedStruct(
    "LoadedPreviewEventWeather",
    {
        event_id: S.String,
        weather: EventWeather,
    }
)
export const FailedPreviewEventWeather = taggedStruct(
    "FailedPreviewEventWeather",
    {
        event_id: S.String,
        error: S.String,
    }
)
export const MountedPreviewEventMap = taggedStruct("MountedPreviewEventMap", {
    event_id: S.String,
})
export const FailedPreviewEventMap = taggedStruct("FailedPreviewEventMap", {
    event_id: S.String,
    error: S.String,
})
export const SucceededDesignAction = taggedStruct("SucceededDesignAction")
export const FailedDesignAction = taggedStruct("FailedDesignAction", {
    error: S.String,
})

export const GotLandingPreviewMessage = taggedStruct(
    "GotLandingPreviewMessage",
    { message: LandingMessage }
)

export const Message = S.Union([
    GotLandingPreviewMessage,
    ChangedSiteTheme,
    ChangedSiteAppearance,
    ChangedShowSiteTitle,
    ChangedSiteTitle,
    RequestedSaveSiteAppearance,
    SavedSiteAppearance,
    FailedSiteAppearance,
    ChangedUrl,
    LoadedSites,
    SelectedOwner,
    AssignedMainLayoutOwner,
    LoadedWorkspace,
    LoadedPreviewNavigation,
    GotSocialLinksMessage,
    GotLightLogoDropMessage,
    GotDarkLogoDropMessage,
    UploadedLayoutLogo,
    RequestedRemoveLayoutLogo,
    RemovedLayoutLogo,
    GotLightFaviconDropMessage,
    GotDarkFaviconDropMessage,
    UploadedLayoutFavicon,
    RequestedRemoveLayoutFavicon,
    RemovedLayoutFavicon,
    LoadedPreviewDocument,
    LoadedPreviewMarkdown,
    FailedPreviewMarkdown,
    RequestedAddPage,
    RequestedRemovePage,
    RequestedMovePage,
    RequestedSetHomepage,
    RequestedToggleNavigation,
    StartedEditingNavigationLabel,
    ChangedNavigationLabel,
    SubmittedNavigationLabel,
    CancelledNavigationLabel,
    ToggledPreview,
    SelectedPreviewPage,
    SelectedPreviewModule,
    SelectedPreviewEvent,
    SelectedPreviewEventsIndex,
    RequestedPreviewEventWeather,
    LoadedPreviewEventWeather,
    FailedPreviewEventWeather,
    MountedPreviewEventMap,
    FailedPreviewEventMap,
    SucceededDesignAction,
    FailedDesignAction,
])
export type Message = typeof Message.Type
