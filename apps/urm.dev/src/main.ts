/** # Shared administration shell and route-owned feature lifetimes */
import {
    events_session_view,
    issues_session_view,
    projects_session_view,
    shop_session_view,
    domains_session_view,
    media_session_view,
    tags_session_view,
    bookmarks_session_view,
    pages_session_view,
    design_session_view,
    publishing_session_view,
    account_session_view,
} from "./contacts/view.ts"
import * as Members from "./members/model.ts"
import { view as members_view, is_members_path } from "./members/view.ts"
import { members_session_view } from "./contacts/view.ts"
import * as Contacts from "./contacts/model.ts"
import { embedded_view as contacts_view } from "./contacts/view.ts"
import { ContactsApi } from "./contacts/api.ts"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import { defineMessageUnion } from "foldkit/message"
import {
    NewsletterTemplateCatalog,
    NewsletterTemplateSummary,
    PublicationEmailThemeRecord,
    SaveNewsletterDraft,
} from "@urm/contracts/mail"
import { load_publication_theme } from "./mail/publication-theme-api.ts"
import { load_logo_catalog, load_logo_detail } from "./design/logo/api.ts"
import { LogoDraftCatalog, LogoDraftSummary } from "@urm/domain/logo-drafts"
import {
    load_landing_templates,
    save_landing_template,
    remove_landing_template,
} from "./design/landing-templates-api.ts"
import {
    LandingTemplateCatalog,
    LandingTemplateRecord,
    SaveLandingTemplateInput,
} from "@urm/domain/landing-templates"
import {
    SocialAccount as RemoteSocialAccount,
    SocialPost as RemoteSocialPost,
    SocialTemplate as RemoteSocialTemplate,
    SocialAnalyticsSnapshot as RemoteSocialAnalyticsSnapshot,
} from "@urm/contracts/social"
import { Image as RemoteMediaImage } from "@urm/contracts/media"
import { SaveNewsletterDraftInput } from "@urm/domain/mail-newsletter"
import {
    AccountNavigation,
    AccountPreferences,
} from "@urm/contracts/account-preferences"
import {
    load_navigation,
    load_preferences,
    save_appearance,
    save_modules,
    save_sidebar,
    save_spotify,
} from "./settings/account-preferences-api.ts"
import {
    NewsletterTemplate,
    newsletter_template_catalog_id,
} from "@urm/domain/mail-templates"
import { is_contacts_path } from "./contacts/path.ts"
import * as DevBookmarks from "./dev/bookmarks/submodel.ts"
import * as Array from "effect/Array"
import { Effect, Match as M, Option, Schema as S, Stream } from "effect"
import {
    Command,
    ManagedResource,
    Runtime,
    Subscription as FoldkitSubscription,
} from "foldkit"
import { streamFromEvent } from "foldkit/dom"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"
import { toString as urlToString, type Url } from "foldkit/url"
import * as Ui from "@foldkit/ui"
import { AccountMenu } from "@urm/ui/foldkit/auth-control.view.ts"

import { Domain, DomainId } from "./domains/domain-record.ts"
import { Page } from "./design/records.ts"
import {
    DEFAULT_SPOTIFY_PLAYLIST_ID,
    SpotifyPlaylistId,
} from "@urm/domain/schemas/settings"
import { FormsCatalog, FormDetail, StoredFormTemplate } from "@urm/domain/forms"
import {
    load_catalog as load_forms_catalog,
    load_detail as load_form_detail,
} from "./forms/api.ts"
import * as AuthKit from "@urm/features/auth/authkit"
import * as Dev from "@urm/features/dev/submodel"
import { Preview } from "@urm/features/dev/grep"
import preview_data from "virtual:grep-preview"
import "@urm/features/dev/terminal/styles.css"
import "@urm/features/dev/grep/styles.css"
import * as Dashboard from "@urm/features/dashboard"
import * as Content from "@urm/features/content"
import * as DesignIdeas from "@urm/features/design/ideas"
import * as Finance from "@urm/features/finance"
import * as MarketingLanding from "@urm/features/marketing/landing"
import * as Forms from "./forms/submodel.ts"
import * as NavigationSettings from "@urm/features/settings/navigation"
import {
    ModuleId,
    SidebarItemId,
    module_ids,
    is_module_enabled,
    normalize_sidebar_order,
} from "@urm/domain/schemas/modules"
import * as Appearance from "@urm/features/settings/appearance"
import * as Stats from "@urm/features/stats/submodel"
import {
    domainSwitcherView,
    updateDomainSwitcher,
} from "@urm/ui/foldkit/domain-switcher.view.ts"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import { logoView } from "@urm/ui/foldkit/logo"
import { portalShellView } from "@urm/ui/foldkit/portal-shell.view.ts"
import {
    sidebarShellMobileView,
    sidebarShellView,
    type PortalSidebarNavItem,
} from "@urm/ui/foldkit/sidebar-shell.view.ts"
import {
    SIDEBAR_TOOLTIP_HOME_KEY,
    SIDEBAR_TOOLTIP_TOGGLE_KEY,
    SidebarTooltips,
    createSidebarTooltip,
} from "@urm/ui/foldkit/sidebar-shell.tooltips.ts"

import * as DesktopEvents from "./events/submodel.ts"
import * as DataTables from "@urm/features/data/submodel"
import * as DesktopData from "./data/submodel.ts"
import * as DesktopDomains from "./domains/submodel.ts"
import * as DesktopSocial from "./social/submodel.ts"
import { load_social_data, load_social_templates } from "./social/api.ts"
import * as DomainPublishing from "./domains/publishing-console.ts"
import * as DesktopPages from "./pages/submodel.ts"
import * as DesktopDesign from "./design/layout-submodel.ts"
import * as DesktopLogo from "./design/logo/submodel.ts"
import * as DesktopBlog from "./blog/submodel.ts"
import * as DesktopDocuments from "./documents/submodel.ts"
import * as DesktopBookmarks from "./content/bookmarks-submodel.ts"
import * as DesktopIssues from "./issues/submodel.ts"
import * as DesktopMail from "./mail/submodel.ts"
import * as DesktopMedia from "./media/submodel.ts"
import * as DesktopProjects from "./projects/submodel.ts"
import * as DesktopShop from "./shop/submodel-postgres.ts"
import * as DesktopSysadmin from "./sysadmin/submodel.ts"
import * as Tags from "./tags/submodel.ts"
import * as DesktopChat from "./chat/submodel.ts"
import {
    loadExternal,
    navigateInternal,
    navigateInternalHref,
    navigateSelectedDomain,
    ReplaceInternalHref,
} from "./routing/commands.ts"
import { grep_search_subscriptions } from "./grep-search.subscription.ts"
import { restore_grep_route } from "./grep-route.ts"
import {
    request_parameters as grep_request_parameters,
    request_key as grep_request_key,
} from "@urm/features/dev/grep"
import { grep_url_href } from "@urm/features/dev/grep/route"
import {
    ChangedUrl,
    ClickedLink,
    CompletedLoadExternal,
    CompletedNavigateInternal,
} from "./routing/message.ts"
import {
    DesktopRoute,
    chat_href,
    content_documents_href,
    content_href,
    content_bookmarks_href,
    content_new_href,
    content_templates_href,
    dashboardHref,
    dataCsvHref,
    dataFeaturePath,
    dataHref,
    dataSpreadsheetsHref,
    designHref,
    designFaviconsHref,
    designIdeasHref,
    designMainLayoutHref,
    domainsHref,
    social_href,
    documentsBlogHref,
    documentsBlogDraftsHref,
    documentsBlogNewHref,
    documentsBlogPublishedHref,
    documentsFeaturePath,
    web_href,
    web_pages_href,
    web_pages_new_href,
    web_publishing_href,
    eventsFeaturePath,
    eventsHref,
    eventsMenuHref,
    formHref,
    formsFeaturePath,
    formsHref,
    formSettingsHref,
    formSubmissionsHref,
    issuesFeaturePath,
    issuesHref,
    legacy_marketing_replacement_href,
    legacy_mail_templates_replacement_href,
    legacy_pages_replacement_href,
    legacy_content_replacement_href,
    devHref,
    devTerminalHref,
    dev_grep_href,
    devKbdShortcutsHref,
    mailFeaturePath,
    mailContactsHref,
    mailHref,
    mailGroupsHref,
    mailManageMembersHref,
    mailMembersHref,
    mailNewsletterHref,
    mailTransactionalHref,
    mailSendHref,
    mailSentHref,
    mailStatsHref,
    mailSubscriptionsHref,
    marketing_new_href,
    marketing_starter_href,
    marketing_templates_href,
    mediaFeaturePath,
    mediaGalleryHref,
    mediaHref,
    media_streaming_href,
    mediaVideoHref,
    projectHref,
    projectsHref,
    issueHref,
    routeForUrl,
    sidebarRouteTag,
    statsHref,
    statsReportsHref,
    sysadminAuditHref,
    sysadminErrorsHref,
    sysadminFeaturePath,
    sysadminHref,
    sysadminLoggingHref,
    sysadminMetricsHref,
    sysadminSessionsHref,
    sysadminSystemHref,
    sysadminTracingHref,
    shopCartHref,
    shopCheckoutHref,
    shopCollectionsHref,
    shopFeaturePath,
    shopHref,
    shopOrdersHref,
    shopProductCreateHref,
    shopProductsHref,
    settingsSidebarHref,
    settingsModulesHref,
    settingsFontsHref,
    settingsHref,
    settingsThemeHref,
    tagsHref,
    finance_href,
} from "./routing/route.ts"
import { auth_connection_id, has_verified_session } from "./auth/session.ts"
import { headerView } from "./shell/header.view.ts"
import {
    SpotifyPlayerState,
    SpotifyPlaylistStatus,
} from "./shell/spotify-player.ts"
import {
    HostContext,
    central_href_for_host,
    domain_href_for_host,
    host_context_for_url,
} from "./host-context.ts"

export const Model = S.Struct({
    route: DesktopRoute,
    host_context: HostContext,
    auth: AuthKit.Model,
    auth_connection_id: S.String,
    domains_status: S.Literals(["idle", "loading", "success", "error"]),
    domains: S.Array(Domain),
    domain_logos: S.Array(LogoDraftSummary),
    landing_templates: S.Array(LandingTemplateRecord),
    landing_templates_error: S.String,
    form_templates: S.Array(StoredFormTemplate),
    forms_refresh: S.Number,
    newsletter_templates: S.Array(NewsletterTemplate),
    social_templates: S.Array(RemoteSocialTemplate),
    social_refresh: S.Number,
    active_domain_id: S.Option(DomainId),
    domain_management: DesktopDomains.Model,
    social: DesktopSocial.Model,
    domain_publishing: DomainPublishing.Model,
    pages: DesktopPages.Model,
    design: DesktopDesign.Model,
    design_logo: DesktopLogo.Model,
    dev: Dev.Model,
    labs_marketing_landing: MarketingLanding.Model,
    dev_bookmarks: DevBookmarks.Model,
    data: DesktopData.Model,
    blog: DesktopBlog.Model,
    documents: DesktopDocuments.Model,
    bookmarks: DesktopBookmarks.Model,
    issues: DesktopIssues.Model,
    events: DesktopEvents.Model,
    media: DesktopMedia.Model,
    tags: Tags.Model,
    projects: DesktopProjects.Model,
    shop: DesktopShop.Model,
    mail: DesktopMail.Model,
    contacts: Contacts.Model,
    members: Members.Model,
    chat: DesktopChat.Model,
    forms: S.Option(Forms.Model),
    sysadmin: S.Option(DesktopSysadmin.Model),
    maybe_error: S.Option(S.String),
    appearance: Appearance.Model,
    navigation_settings: NavigationSettings.Model,
    domain_switcher: Ui.Listbox.Model,
    is_sidebar_collapsed: S.Boolean,
    is_sidebar_mobile_open: S.Boolean,
    spotify_player_state: SpotifyPlayerState,
    spotify_player_popover: Ui.Popover.Model,
    spotify_playlist_id: SpotifyPlaylistId,
    spotify_playlist_id_draft: S.String,
    spotify_playlist_status: SpotifyPlaylistStatus,
    spotify_playlist_error: S.String,
    sidebar_tooltips: SidebarTooltips,
})
export type Model = typeof Model.Type

export const ToggledSidebar = taggedStruct("ToggledSidebar")
export const ToggledMobileSidebar = taggedStruct("ToggledMobileSidebar")
export const ToggledSpotifyPlayer = taggedStruct("ToggledSpotifyPlayer")
export const GotSpotifyPlayerPopoverMessage = taggedStruct(
    "GotSpotifyPlayerPopoverMessage",
    {
        message: Ui.Popover.Message,
    }
)
export const ChangedSpotifyPlaylistId = taggedStruct(
    "ChangedSpotifyPlaylistId",
    {
        value: S.String,
    }
)
export const SubmittedSpotifyPlaylistId = taggedStruct(
    "SubmittedSpotifyPlaylistId"
)
export const ReceivedSpotifyPreference = taggedStruct(
    "ReceivedSpotifyPreference",
    {
        playlist_id: SpotifyPlaylistId,
        is_saved: S.Boolean,
    }
)
export const SavedSpotifyPreference = taggedStruct("SavedSpotifyPreference", {
    account_id: S.String,
    playlist_id: SpotifyPlaylistId,
})
export const FailedSpotifyPreference = taggedStruct("FailedSpotifyPreference", {
    account_id: S.String,
    details: S.String,
})
export const ReceivedAccountPreferences = taggedStruct(
    "ReceivedAccountPreferences",
    { snapshot: AccountPreferences }
)
export const FailedAccountPreferences = taggedStruct(
    "FailedAccountPreferences",
    { account_id: S.String, details: S.String }
)
export const ReceivedAccountNavigation = taggedStruct(
    "ReceivedAccountNavigation",
    {
        account_id: S.String,
        legacy_domain_id: S.String,
        snapshot: AccountNavigation,
    }
)
export const SavedAccountNavigation = taggedStruct("SavedAccountNavigation", {
    account_id: S.String,
    legacy_domain_id: S.String,
    kind: S.Literals(["sidebar", "modules"]),
    snapshot: AccountNavigation,
})
export const FailedAccountNavigation = taggedStruct("FailedAccountNavigation", {
    account_id: S.String,
    domain_id: S.String,
    legacy_domain_id: S.String,
    details: S.String,
})
export const ReceivedAccountPublicationTheme = taggedStruct(
    "ReceivedAccountPublicationTheme",
    { account_id: S.String, theme: PublicationEmailThemeRecord }
)
export const FailedAccountPublicationTheme = taggedStruct(
    "FailedAccountPublicationTheme",
    { account_id: S.String, domain_id: S.String, details: S.String }
)
export const SavedAccountAppearance = taggedStruct("SavedAccountAppearance", {
    account_id: S.String,
    theme: Appearance.Model.fields.theme,
    font: Appearance.Model.fields.font,
    code_font: Appearance.Model.fields.codeFont,
})
export const GotSidebarTooltipMessage = taggedStruct(
    "GotSidebarTooltipMessage",
    {
        id: S.String,
        message: Ui.Tooltip.Message,
    }
)
export const GotNavigationSettingsMessage = taggedStruct(
    "GotNavigationSettingsMessage",
    {
        message: NavigationSettings.Message,
    }
)
export const GotAppearanceMessage = taggedStruct("GotAppearanceMessage", {
    message: Appearance.Message,
})
export const ReceivedAuthSession = taggedStruct("ReceivedAuthSession", {
    profile: S.Option(AuthKit.Profile),
})
export const FailedAuthSession = taggedStruct("FailedAuthSession", {
    details: S.String,
})
export const GotAuthKitMessage = taggedStruct("GotAuthKitMessage", {
    message: AuthKit.Message,
})
export const ReceivedAppearancePreference = taggedStruct(
    "ReceivedAppearancePreference",
    {
        theme: Appearance.Model.fields.theme,
        font: Appearance.Model.fields.font,
        code_font: Appearance.Model.fields.codeFont,
        is_saved: S.Boolean,
    }
)
export const GotDomainSwitcherMessage = taggedStruct(
    "GotDomainSwitcherMessage",
    {
        message: Ui.Listbox.Message,
    }
)
export const GotDomainsMessage = taggedStruct("GotDomainsMessage", {
    message: DesktopDomains.Message,
})
export const GotSocialMessage = taggedStruct("GotSocialMessage", {
    message: DesktopSocial.Message,
})
export const GotChatMessage = taggedStruct("GotChatMessage", {
    message: DesktopChat.Message,
})
export const GotDomainPublishingMessage = taggedStruct(
    "GotDomainPublishingMessage",
    {
        message: DomainPublishing.Message,
    }
)
export const GotLabsMarketingLandingMessage = taggedStruct(
    "GotLabsMarketingLandingMessage",
    { message: MarketingLanding.Message }
)
export const GotDevBookmarksMessage = taggedStruct("GotDevBookmarksMessage", {
    message: DevBookmarks.Message,
})
export const GotDesignLogoMessage = taggedStruct("GotDesignLogoMessage", {
    message: DesktopLogo.Message,
})
export const GotDevMessage = taggedStruct("GotDevMessage", {
    message: Dev.Message,
})
export const GotPagesMessage = taggedStruct("GotPagesMessage", {
    message: DesktopPages.Message,
})
export const GotDesignMessage = taggedStruct("GotDesignMessage", {
    message: DesktopDesign.Message,
})
export const GotDataMessage = taggedStruct("GotDataMessage", {
    message: DesktopData.Message,
})
export const GotBlogMessage = taggedStruct("GotBlogMessage", {
    message: DesktopBlog.Message,
})
export const GotDocumentsMessage = taggedStruct("GotDocumentsMessage", {
    message: DesktopDocuments.Message,
})
export const GotBookmarksMessage = taggedStruct("GotBookmarksMessage", {
    message: DesktopBookmarks.Message,
})
export const ReceivedDomains = taggedStruct("ReceivedDomains", {
    domains: S.Array(Domain),
})
export const ReceivedDomainLogos = taggedStruct("ReceivedDomainLogos", {
    account_id: S.String,
    catalog: LogoDraftCatalog,
})
export const FailedDomainLogos = taggedStruct("FailedDomainLogos", {
    account_id: S.String,
    domain_id: S.String,
})
export const ReceivedLandingTemplates = taggedStruct(
    "ReceivedLandingTemplates",
    {
        account_id: S.String,
        catalog: LandingTemplateCatalog,
    }
)
export const FailedLandingTemplates = taggedStruct("FailedLandingTemplates", {
    account_id: S.String,
    domain_id: S.String,
    details: S.String,
})
export const ReceivedFormTemplates = taggedStruct("ReceivedFormTemplates", {
    templates: S.Array(StoredFormTemplate),
})
export const ReceivedFormsCatalog = taggedStruct("ReceivedFormsCatalog", {
    domain_id: S.String,
    catalog: FormsCatalog,
})
export const ReceivedFormsDetail = taggedStruct("ReceivedFormsDetail", {
    domain_id: S.String,
    slug: S.String,
    detail: FormDetail,
})
export const ReceivedNewsletterTemplates = taggedStruct(
    "ReceivedNewsletterTemplates",
    {
        templates: S.Array(NewsletterTemplate),
    }
)
export const FailedNewsletterTemplates = taggedStruct(
    "FailedNewsletterTemplates",
    { details: S.String }
)
export const ReceivedSocialTemplates = taggedStruct("ReceivedSocialTemplates", {
    domain_id: S.String,
    templates: S.Array(RemoteSocialTemplate),
})
export const ReceivedSocialData = taggedStruct("ReceivedSocialData", {
    domain_id: S.String,
    accounts: S.Array(RemoteSocialAccount),
    posts: S.Array(RemoteSocialPost),
    templates: S.Array(RemoteSocialTemplate),
    analytics: S.NullOr(RemoteSocialAnalyticsSnapshot),
    media: S.Array(RemoteMediaImage),
})
export const FailedSocialData = taggedStruct("FailedSocialData", {
    domain_id: S.String,
    details: S.String,
})
export const RequestedUseDocumentTemplate = taggedStruct(
    "RequestedUseDocumentTemplate",
    { template_id: S.String }
)
export const RequestedUseBlogTemplate = taggedStruct(
    "RequestedUseBlogTemplate",
    { template_id: S.String }
)
export const RequestedUseSocialTemplate = taggedStruct(
    "RequestedUseSocialTemplate",
    {
        template_id: S.String,
    }
)
export const RequestedUseNewsletterTemplate = taggedStruct(
    "RequestedUseNewsletterTemplate",
    { template_id: S.String }
)
export const CreatedNewsletterFromTemplate = taggedStruct(
    "CreatedNewsletterFromTemplate",
    { draft_id: S.String }
)
export const RequestedUseFormTemplate = taggedStruct(
    "RequestedUseFormTemplate",
    {
        template_id: S.String,
        name: S.String,
    }
)
export const SavedLandingTemplate = taggedStruct("SavedLandingTemplate", {
    account_id: S.String,
    catalog: LandingTemplateCatalog,
})
export const FailedLandingTemplateSave = taggedStruct(
    "FailedLandingTemplateSave",
    {
        details: S.String,
    }
)
export const RequestedUseLandingTemplate = taggedStruct(
    "RequestedUseLandingTemplate",
    {
        template_id: S.String,
    }
)
export const RequestedRemoveLandingTemplate = taggedStruct(
    "RequestedRemoveLandingTemplate",
    { template_id: S.String }
)
export const CreatedLandingFromTemplate = taggedStruct(
    "CreatedLandingFromTemplate",
    {
        page: Page,
    }
)
export const RemovedLandingTemplate = taggedStruct("RemovedLandingTemplate", {
    account_id: S.String,
    catalog: LandingTemplateCatalog,
})
export const FailedDomains = taggedStruct("FailedDomains", {
    details: S.String,
})
export const GotIssuesMessage = taggedStruct("GotIssuesMessage", {
    message: DesktopIssues.Message,
})
export const GotEventsMessage = taggedStruct("GotEventsMessage", {
    message: DesktopEvents.Message,
})
export const GotTagsMessage = taggedStruct("GotTagsMessage", {
    message: Tags.Message,
})

export const GotMediaMessage = taggedStruct("GotMediaMessage", {
    message: DesktopMedia.Message,
})
export const GotProjectsMessage = taggedStruct("GotProjectsMessage", {
    message: DesktopProjects.Message,
})
export const GotShopMessage = taggedStruct("GotShopMessage", {
    message: DesktopShop.Message,
})
export const GotMembersMessage = taggedStruct("GotMembersMessage", {
    message: Members.Message,
})
export const GotContactsMessage = taggedStruct("GotContactsMessage", {
    message: Contacts.Message,
})
export const GotMailMessage = taggedStruct("GotMailMessage", {
    message: DesktopMail.Message,
})
export const GotFormsMessage = taggedStruct("GotFormsMessage", {
    message: Forms.Message,
})
export const GotSysadminMessage = taggedStruct("GotSysadminMessage", {
    message: DesktopSysadmin.Message,
})
export const FailedData = taggedStruct("FailedData", { details: S.String })

export const Message = S.Union([
    CompletedLoadExternal,
    CompletedNavigateInternal,
    ClickedLink,
    ChangedUrl,
    ToggledSidebar,
    ToggledMobileSidebar,
    ToggledSpotifyPlayer,
    GotSpotifyPlayerPopoverMessage,
    ChangedSpotifyPlaylistId,
    SubmittedSpotifyPlaylistId,
    ReceivedSpotifyPreference,
    SavedSpotifyPreference,
    FailedSpotifyPreference,
    ReceivedAccountPreferences,
    FailedAccountPreferences,
    ReceivedAccountNavigation,
    SavedAccountNavigation,
    FailedAccountNavigation,
    ReceivedAccountPublicationTheme,
    FailedAccountPublicationTheme,
    SavedAccountAppearance,
    GotSidebarTooltipMessage,
    GotAppearanceMessage,
    GotNavigationSettingsMessage,
    GotAuthKitMessage,
    ReceivedAuthSession,
    FailedAuthSession,
    ReceivedAppearancePreference,
    GotDomainSwitcherMessage,
    GotDomainsMessage,
    GotSocialMessage,
    GotChatMessage,
    GotDomainPublishingMessage,
    GotPagesMessage,
    GotDesignMessage,
    GotDevMessage,
    GotLabsMarketingLandingMessage,
    GotDevBookmarksMessage,
    GotDesignLogoMessage,
    GotDataMessage,
    GotBlogMessage,
    GotDocumentsMessage,
    GotBookmarksMessage,
    ReceivedDomains,
    ReceivedDomainLogos,
    FailedDomainLogos,
    ReceivedLandingTemplates,
    FailedLandingTemplates,
    ReceivedFormTemplates,
    ReceivedFormsCatalog,
    ReceivedFormsDetail,
    ReceivedNewsletterTemplates,
    FailedNewsletterTemplates,
    ReceivedSocialTemplates,
    ReceivedSocialData,
    FailedSocialData,
    RequestedUseDocumentTemplate,
    RequestedUseBlogTemplate,
    RequestedUseSocialTemplate,
    RequestedUseNewsletterTemplate,
    CreatedNewsletterFromTemplate,
    RequestedUseFormTemplate,
    SavedLandingTemplate,
    FailedLandingTemplateSave,
    RequestedUseLandingTemplate,
    RequestedRemoveLandingTemplate,
    CreatedLandingFromTemplate,
    RemovedLandingTemplate,
    FailedDomains,
    GotIssuesMessage,
    GotEventsMessage,
    GotTagsMessage,
    GotMediaMessage,
    GotProjectsMessage,
    GotShopMessage,
    GotMailMessage,
    GotContactsMessage,
    GotMembersMessage,
    GotFormsMessage,
    GotSysadminMessage,
    FailedData,
])
export type Message = typeof Message.Type

const LoadAccountPreferences = Command.define("LoadAccountPreferences", {
    args: { domain_id: S.String, account_id: S.String },
    messages: [ReceivedAccountPreferences, FailedAccountPreferences],
    execute: ({ domain_id, account_id }) =>
        load_preferences(domain_id, account_id).pipe(
            Effect.map((snapshot) => ReceivedAccountPreferences({ snapshot })),
            Effect.catch((error) =>
                Effect.succeed(
                    FailedAccountPreferences({
                        account_id,
                        details: globalThis.String(error),
                    })
                )
            )
        ),
})
const LoadAccountNavigation = Command.define("LoadAccountNavigation", {
    args: {
        domain_id: S.String,
        account_id: S.String,
        legacy_domain_id: S.String,
    },
    messages: [ReceivedAccountNavigation, FailedAccountNavigation],
    execute: ({ domain_id, account_id, legacy_domain_id }) =>
        load_navigation(domain_id, account_id).pipe(
            Effect.map((snapshot) =>
                ReceivedAccountNavigation({
                    account_id,
                    legacy_domain_id,
                    snapshot,
                })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    FailedAccountNavigation({
                        account_id,
                        domain_id,
                        legacy_domain_id,
                        details: globalThis.String(error),
                    })
                )
            )
        ),
})
const LoadAccountPublicationTheme = Command.define(
    "LoadAccountPublicationTheme",
    {
        args: { domain_id: S.String, account_id: S.String },
        messages: [
            ReceivedAccountPublicationTheme,
            FailedAccountPublicationTheme,
        ],
        execute: ({ domain_id, account_id }) =>
            load_publication_theme(domain_id).pipe(
                Effect.map((theme) =>
                    ReceivedAccountPublicationTheme({ account_id, theme })
                ),
                Effect.catch((error) =>
                    Effect.succeed(
                        FailedAccountPublicationTheme({
                            account_id,
                            domain_id,
                            details: globalThis.String(error),
                        })
                    )
                )
            ),
    }
)
const SaveAccountNavigation = Command.define("SaveAccountNavigation", {
    args: {
        domain_id: S.String,
        account_id: S.String,
        legacy_domain_id: S.String,
        kind: S.Literals(["sidebar", "modules"]),
        sidebar_order: NavigationSettings.Snapshot.fields.sidebar_order,
        hidden_modules: NavigationSettings.Snapshot.fields.hidden_modules,
        enabled_modules: NavigationSettings.Snapshot.fields.enabled_modules,
    },
    messages: [SavedAccountNavigation, FailedAccountNavigation],
    execute: ({
        domain_id,
        account_id,
        legacy_domain_id,
        kind,
        sidebar_order,
        hidden_modules,
        enabled_modules,
    }) =>
        (kind === "sidebar"
            ? save_sidebar(domain_id, account_id, {
                  sidebar_order,
                  hidden_modules,
              })
            : save_modules(domain_id, account_id, enabled_modules)
        ).pipe(
            Effect.map((snapshot) =>
                SavedAccountNavigation({
                    account_id,
                    legacy_domain_id,
                    kind,
                    snapshot,
                })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    FailedAccountNavigation({
                        account_id,
                        domain_id,
                        legacy_domain_id,
                        details: globalThis.String(error),
                    })
                )
            )
        ),
})
const SaveAppearancePreference = Command.define("SaveAppearancePreference", {
    args: {
        domain_id: S.String,
        account_id: S.String,
        theme: Appearance.Model.fields.theme,
        font: Appearance.Model.fields.font,
        code_font: Appearance.Model.fields.codeFont,
    },
    messages: [SavedAccountAppearance, FailedAccountPreferences],
    execute: ({ domain_id, account_id, theme, font, code_font }) =>
        save_appearance(domain_id, account_id, {
            theme,
            font,
            code_font,
        }).pipe(
            Effect.map((saved) =>
                SavedAccountAppearance({ account_id, ...saved })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    FailedAccountPreferences({
                        account_id,
                        details: globalThis.String(error),
                    })
                )
            )
        ),
})
const SaveSpotifyPreference = Command.define("SaveSpotifyPreference", {
    args: {
        domain_id: S.String,
        account_id: S.String,
        playlist_id: SpotifyPlaylistId,
    },
    messages: [SavedSpotifyPreference, FailedSpotifyPreference],
    execute: ({ domain_id, account_id, playlist_id }) =>
        save_spotify(domain_id, account_id, playlist_id).pipe(
            Effect.map((saved) =>
                SavedSpotifyPreference({ account_id, ...saved })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    FailedSpotifyPreference({
                        account_id,
                        details: globalThis.String(error),
                    })
                )
            )
        ),
})

const LoadLandingTemplates = Command.define("LoadLandingTemplates", {
    args: { domain_id: S.String, account_id: S.String },
    messages: [ReceivedLandingTemplates, FailedLandingTemplates],
    execute: ({ domain_id, account_id }) =>
        load_landing_templates(domain_id).pipe(
            Effect.map((catalog) =>
                ReceivedLandingTemplates({ account_id, catalog })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    FailedLandingTemplates({
                        account_id,
                        domain_id,
                        details: globalThis.String(error),
                    })
                )
            )
        ),
})
const LoadLogoCatalog = Command.define("LoadLogoCatalog", {
    args: { domain_id: S.String, account_id: S.String },
    messages: [ReceivedDomainLogos, FailedDomainLogos],
    execute: ({ domain_id, account_id }) =>
        load_logo_catalog(domain_id).pipe(
            Effect.map((catalog) =>
                ReceivedDomainLogos({ account_id, catalog })
            ),
            Effect.catch(() =>
                Effect.succeed(FailedDomainLogos({ account_id, domain_id }))
            )
        ),
})
const LoadLogoDetail = Command.define("LoadLogoDetail", {
    args: { domain_id: S.String, account_id: S.String },
    messages: [GotDesignLogoMessage],
    execute: ({ domain_id, account_id }) =>
        load_logo_detail(domain_id).pipe(
            Effect.map((detail) =>
                GotDesignLogoMessage({
                    message: DesktopLogo.LoadedLogo({ account_id, detail }),
                })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    GotDesignLogoMessage({
                        message: DesktopLogo.FailedLogoSave({
                            details: globalThis.String(error),
                        }),
                    })
                )
            )
        ),
})
const SaveLandingTemplate = Command.define("SaveLandingTemplate", {
    args: {
        domain_id: S.String,
        account_id: S.String,
        template: SaveLandingTemplateInput,
    },
    messages: [SavedLandingTemplate, FailedLandingTemplateSave],
    execute: ({ domain_id, account_id, template }) =>
        save_landing_template(domain_id, account_id, template).pipe(
            Effect.map(({ catalog }) =>
                SavedLandingTemplate({ account_id, catalog })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    FailedLandingTemplateSave({
                        details: globalThis.String(error),
                    })
                )
            )
        ),
})

const CreateNewsletterFromTemplate = Command.define(
    "CreateNewsletterFromTemplate",
    {
        args: { domain_id: S.String, draft: SaveNewsletterDraftInput },
        messages: [CreatedNewsletterFromTemplate, FailedData],
        execute: ({ domain_id, draft }) =>
            Effect.gen(function* () {
                const api = yield* ContactsApi
                yield* Remote.mutate(
                    SaveNewsletterDraft,
                    { domain_id, draft },
                    `${domain_id}/${draft.id}/template`
                ).pipe(Effect.provide(api.remote(domain_id)))
                return CreatedNewsletterFromTemplate({ draft_id: draft.id })
            }).pipe(
                Effect.catch(() =>
                    Effect.succeed(
                        FailedData({
                            details: "The newsletter could not be created.",
                        })
                    )
                )
            ),
    }
)

const RemoveLandingTemplate = Command.define("RemoveLandingTemplate", {
    args: { domain_id: S.String, account_id: S.String, template_id: S.String },
    messages: [RemovedLandingTemplate, FailedData],
    execute: ({ domain_id, account_id, template_id }) =>
        remove_landing_template(domain_id, account_id, template_id).pipe(
            Effect.map(({ catalog }) =>
                RemovedLandingTemplate({ account_id, catalog })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    FailedData({ details: globalThis.String(error) })
                )
            )
        ),
})

type Commands = ReadonlyArray<
    Command.Command<
        Message,
        never,
        ContactsApi | AuthKit.Service
    >
>

const map_auth_commands = (
    commands: ReadonlyArray<
        Command.Command<AuthKit.MessageType, never, AuthKit.Service>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotAuthKitMessage({ message }))

const map_issue_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopIssues.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotIssuesMessage({ message }))

const map_event_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopEvents.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotEventsMessage({ message }))

const map_domain_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopDomains.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotDomainsMessage({ message }))

const RefreshDomainSession = Command.define("RefreshDomainSession", {
    args: { epoch: S.Number },
    messages: [GotContactsMessage],
    execute: () =>
        Effect.succeed(
            GotContactsMessage({ message: Contacts.refresh_session() })
        ),
})

const map_social_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopSocial.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotSocialMessage({ message }))

const map_domain_publishing_commands = (
    commands: ReadonlyArray<
        Command.Command<
            DomainPublishing.Message,
            never,
            AuthKit.Service | ContactsApi
        >
    >
): Commands =>
    Command.mapMessages(commands, (message) =>
        GotDomainPublishingMessage({ message })
    )

const map_page_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopPages.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotPagesMessage({ message }))

const map_design_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopDesign.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotDesignMessage({ message }))

const map_data_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopData.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotDataMessage({ message }))

const map_document_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopDocuments.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotDocumentsMessage({ message }))

const map_blog_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopBlog.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotBlogMessage({ message }))

const map_bookmark_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopBookmarks.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotBookmarksMessage({ message }))

const documents_path_for_route = (route: DesktopRoute): Option.Option<string> =>
    route._tag === "Content" &&
    DesktopDocuments.is_document_location(route.content_path)
        ? Option.some(`${route.content_path}${route.content_search}`)
        : documentsFeaturePath(route)

const blog_path_for_route = (route: DesktopRoute): Option.Option<string> =>
    route._tag === "Content"
        ? DesktopBlog.content_blog_path(
              route.content_path,
              route.content_search
          )
        : route._tag === "Blog"
          ? Option.some(route.blog_path)
          : Option.none()

const forms_path_for_route = (route: DesktopRoute): Option.Option<string> =>
    route._tag === "Content" && Forms.is_content_form_path(route.content_path)
        ? Option.some("/forms")
        : formsFeaturePath(route)

const map_media_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopMedia.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotMediaMessage({ message }))

const map_project_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopProjects.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotProjectsMessage({ message }))

const map_shop_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopShop.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotShopMessage({ message }))

const NewsletterTemplateCache = Surface.application({
    Model: S.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
const NewsletterTemplateData = Remote.make({
    model: NewsletterTemplateCache.model.remote,
    entities: [NewsletterTemplateCatalog],
})
const LoadNewsletterTemplates = Command.define("LoadNewsletterTemplates", {
    args: { domain_id: S.String },
    messages: [ReceivedNewsletterTemplates, FailedNewsletterTemplates],
    execute: ({ domain_id }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const query = NewsletterTemplateData.get(
                NewsletterTemplateSummary,
                newsletter_template_catalog_id(domain_id)
            )
            const result = yield* NewsletterTemplateData.prefetch(
                { remote: Remote.initial },
                query
            ).pipe(Effect.provide(api.remote(domain_id)))
            const catalog = query.read(result)
            return catalog._tag === "Ready" && catalog.value !== undefined
                ? ReceivedNewsletterTemplates({
                      templates: catalog.value.templates,
                  })
                : FailedNewsletterTemplates({
                      details: "Newsletter templates could not be loaded.",
                  })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    FailedNewsletterTemplates({
                        details: globalThis.String(error),
                    })
                )
            )
        ),
})

const map_mail_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopMail.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotMailMessage({ message }))

const map_sysadmin_commands = (
    commands: ReadonlyArray<
        Command.Command<DesktopSysadmin.Message, never, ContactsApi>
    >
): Commands =>
    Command.mapMessages(commands, (message) => GotSysadminMessage({ message }))

const map_forms_commands = (
    commands: ReadonlyArray<Command.Command<Forms.Message, never, ContactsApi>>
): Commands =>
    Command.mapMessages(commands, (message) => GotFormsMessage({ message }))

const grep_preview = S.decodeUnknownSync(Preview)(preview_data)

const create_sidebar_tooltips = () => ({
    toggle: createSidebarTooltip("desktop-sidebar-toggle"),
    home: createSidebarTooltip("desktop-sidebar-home"),
    navItems: {
        Dashboard: createSidebarTooltip("desktop-sidebar-dashboard"),
        Stats: createSidebarTooltip("desktop-sidebar-stats"),
        Marketing: createSidebarTooltip("desktop-sidebar-marketing"),
        MarketingTemplates: createSidebarTooltip(
            "desktop-sidebar-marketing-templates"
        ),
        StatsReports: createSidebarTooltip("desktop-sidebar-stats-reports"),
        MailSend: createSidebarTooltip("desktop-sidebar-mail-send"),
        MailSent: createSidebarTooltip("desktop-sidebar-mail-sent"),
        MailStats: createSidebarTooltip("desktop-sidebar-mail-stats"),
        MailGroups: createSidebarTooltip("desktop-sidebar-mail-groups"),
        Dev: createSidebarTooltip("desktop-sidebar-dev"),
        DevKbdShortcuts: createSidebarTooltip(
            "desktop-sidebar-dev-kbd-shortcuts"
        ),
        DevTerminal: createSidebarTooltip("desktop-sidebar-dev-terminal"),
        DevGrep: createSidebarTooltip("desktop-sidebar-dev-grep"),
        DevBookmarks: createSidebarTooltip("desktop-sidebar-dev-bookmarks"),
        DesignLogo: createSidebarTooltip("desktop-sidebar-design-logo"),
        DesignFavicons: createSidebarTooltip("desktop-sidebar-design-favicons"),
        DesignIdeas: createSidebarTooltip("desktop-sidebar-design-ideas"),
        Mail: createSidebarTooltip("desktop-sidebar-mail"),
        Projects: createSidebarTooltip("desktop-sidebar-projects"),
        Shop: createSidebarTooltip("desktop-sidebar-shop"),
        Issues: createSidebarTooltip("desktop-sidebar-issues"),
        Events: createSidebarTooltip("desktop-sidebar-events"),
        Data: createSidebarTooltip("desktop-sidebar-data"),
        ContentBookmarks: createSidebarTooltip(
            "desktop-sidebar-content-bookmarks"
        ),
        ContentEmail: createSidebarTooltip("desktop-sidebar-content-email"),
        Documents: createSidebarTooltip("desktop-sidebar-documents"),
        Pages: createSidebarTooltip("desktop-sidebar-pages"),
        PagesNew: createSidebarTooltip("desktop-sidebar-pages-new"),
        PagesBookmarks: createSidebarTooltip("desktop-sidebar-pages-bookmarks"),
        Blog: createSidebarTooltip("desktop-sidebar-blog"),
        Design: createSidebarTooltip("desktop-sidebar-design"),
        DesignMainLayout: createSidebarTooltip(
            "desktop-sidebar-design-main-layout"
        ),
        Forms: createSidebarTooltip("desktop-sidebar-forms"),
        FormsDetail: createSidebarTooltip("desktop-sidebar-forms-detail"),
        FormsSubmissions: createSidebarTooltip(
            "desktop-sidebar-forms-submissions"
        ),
        FormsSettings: createSidebarTooltip("desktop-sidebar-forms-settings"),
        Sysadmin: createSidebarTooltip("desktop-sidebar-sysadmin"),
        SysadminAudit: createSidebarTooltip("desktop-sidebar-sysadmin-audit"),
        SysadminLogging: createSidebarTooltip(
            "desktop-sidebar-sysadmin-logging"
        ),
        SysadminTracing: createSidebarTooltip(
            "desktop-sidebar-sysadmin-tracing"
        ),
        SysadminMetrics: createSidebarTooltip(
            "desktop-sidebar-sysadmin-metrics"
        ),
        SysadminErrors: createSidebarTooltip("desktop-sidebar-sysadmin-errors"),
        SysadminSessions: createSidebarTooltip(
            "desktop-sidebar-sysadmin-sessions"
        ),
        SysadminSystem: createSidebarTooltip("desktop-sidebar-sysadmin-system"),
        Domains: createSidebarTooltip("desktop-sidebar-domains"),
        Social: createSidebarTooltip("desktop-sidebar-social"),
        Chat: createSidebarTooltip("desktop-sidebar-chat"),
        SettingsSidebar: createSidebarTooltip(
            "desktop-sidebar-settings-sidebar"
        ),
        SettingsModules: createSidebarTooltip(
            "desktop-sidebar-settings-modules"
        ),
        Settings: createSidebarTooltip("desktop-sidebar-settings"),
        Media: createSidebarTooltip("desktop-sidebar-media"),
        Tags: createSidebarTooltip("desktop-sidebar-tags"),
        Finance: createSidebarTooltip("desktop-sidebar-finance"),
    },
})

/**
 * Initializes the shell and the children needed for the parsed entry route.
 * Cold loads must apply the same route ownership as navigation: retaining a
 * child's model does not authorize running its boot commands on unrelated pages.
 * Shared shell data is an explicit exception to route-local work.
 */
export const init: Runtime.RoutingApplicationInit<
    Model,
    Message,
    void,
    ContactsApi | AuthKit.Service,
    never
> = (url) => {
    const [appearance] = Appearance.init()
    const [auth] = AuthKit.init()
    const route = routeForUrl(url)
    const legacy_marketing_href = legacy_marketing_replacement_href(url)
    const legacy_mail_templates_href =
        legacy_mail_templates_replacement_href(url)
    const legacy_pages_href = legacy_pages_replacement_href(url)
    const legacy_documents_href = legacy_content_replacement_href(url)
    const initial_landing_editor_path =
        route._tag === "Marketing" ? route.marketing_path : ""
    const [labs_marketing_landing, labs_marketing_landing_commands] =
        MarketingLanding.init(
            MarketingLanding.editorPresetForPath(initial_landing_editor_path)
        )
    const issues = Option.match(issuesFeaturePath(route), {
        onNone: () => DesktopIssues.init(url),
        onSome: (pathname) => DesktopIssues.init(url, pathname),
    })
    const media = DesktopMedia.init(
        Option.getOrElse(mediaFeaturePath(route), () => "/media/library")
    )
    const events = DesktopEvents.init(
        Option.getOrElse(eventsFeaturePath(route), () => "/events")
    )
    const data = DesktopData.init(
        Option.getOrElse(dataFeaturePath(route), () => "/data")
    )
    const blog = DesktopBlog.init(
        Option.getOrElse(blog_path_for_route(route), documentsBlogHref)
    )
    const documents = DesktopDocuments.init(
        Option.getOrElse(
            documents_path_for_route(route),
            content_documents_href
        )
    )
    const initial_mail = DesktopMail.init(
        Option.getOrElse(mailFeaturePath(route), () => "/mail")
    )
    const mail =
        route._tag === "Content" &&
        Content.is_content_email_path(route.content_path)
            ? DesktopMail.sync_content_location(
                  initial_mail,
                  route.content_path,
                  route.content_search
              )
            : initial_mail
    const [sysadmin, sysadmin_commands] = Option.match(
        sysadminFeaturePath(route),
        {
            onNone: (): readonly [
                Option.Option<DesktopSysadmin.Model>,
                DesktopSysadmin.UpdateReturn[1],
            ] => [Option.none(), []],
            onSome: (pathname) => {
                const [sysadmin_model, commands] =
                    DesktopSysadmin.init(pathname)
                return [Option.some(sysadmin_model), commands]
            },
        }
    )
    const [forms, forms_commands] = Option.match(forms_path_for_route(route), {
        onNone: (): readonly [
            Option.Option<Forms.Model>,
            Forms.UpdateReturn[1],
        ] => [Option.none(), []],
        onSome: (pathname) => {
            const [forms_model, commands] = Forms.init(pathname)
            return [Option.some(forms_model), commands]
        },
    })
    const landing_editor_commands =
        (route._tag === "Marketing" &&
            MarketingLanding.isLandingEditorPath(route.marketing_path)) ||
        (route._tag === "Content" &&
            is_content_web_item_path(route.content_path))
            ? Command.mapMessages(labs_marketing_landing_commands, (message) =>
                  GotLabsMarketingLandingMessage({ message })
              )
            : []

    return {
        model: Model.make({
            route,
            host_context: host_context_for_url(url),
            auth,
            auth_connection_id: "",
            domains_status: "idle",
            domains: [],
            domain_logos: [],
            landing_templates: [],
            landing_templates_error: "",
            form_templates: [],
            forms_refresh: 0,
            newsletter_templates: [],
            social_templates: [],
            social_refresh: 0,
            active_domain_id: Option.none(),
            domain_management: DesktopDomains.init(),
            social: DesktopSocial.init(),
            domain_publishing: DomainPublishing.init(),
            pages: DesktopPages.init(url),
            design: DesktopDesign.init(url),
            design_logo: DesktopLogo.init(route),
            dev: restore_grep_route(Dev.init()[0], url),
            labs_marketing_landing,
            dev_bookmarks: DevBookmarks.init(route),
            data,
            blog,
            documents,
            bookmarks: DesktopBookmarks.init(),
            issues,
            events,
            media,
            tags: Tags.init(),
            projects: DesktopProjects.init(route),
            shop: DesktopShop.init(
                url,
                Option.getOrElse(shopFeaturePath(route), () => "/shop")
            ),
            mail,
            contacts: Contacts.initial,
            members: Members.initial,
            chat: DesktopChat.init(),
            forms,
            sysadmin,
            maybe_error: Option.none(),
            appearance,
            navigation_settings: NavigationSettings.init(),
            domain_switcher: Ui.Listbox.init({
                id: "desktop-domain-switcher",
            }),
            is_sidebar_collapsed: false,
            is_sidebar_mobile_open: false,
            spotify_player_state: "NotLoaded",
            spotify_player_popover: Ui.Popover.init({
                id: "spotify-player-popover",
                contentFocus: true,
            }),
            spotify_playlist_id: DEFAULT_SPOTIFY_PLAYLIST_ID,
            spotify_playlist_id_draft: DEFAULT_SPOTIFY_PLAYLIST_ID,
            spotify_playlist_status: "Idle",
            spotify_playlist_error: "",
            sidebar_tooltips: create_sidebar_tooltips(),
        }),
        commands: [
            ...Option.match(legacy_mail_templates_href, {
                onNone: () => [],
                onSome: (href) => [ReplaceInternalHref({ href })],
            }),
            ...Option.match(legacy_marketing_href, {
                onNone: () => [],
                onSome: (href) => [ReplaceInternalHref({ href })],
            }),
            ...Option.match(legacy_pages_href, {
                onNone: () => [],
                onSome: (href) => [ReplaceInternalHref({ href })],
            }),
            ...Option.match(legacy_documents_href, {
                onNone: () => [],
                onSome: (href) => [ReplaceInternalHref({ href })],
            }),
            ...landing_editor_commands,
            ...map_sysadmin_commands(sysadmin_commands),
            ...map_forms_commands(forms_commands),
        ],
    }
}

const update_sidebar_tooltip = (
    model: Model,
    key: string,
    message: Ui.Tooltip.Message
): readonly [Model, Commands] => {
    const maybe_tooltip =
        key === SIDEBAR_TOOLTIP_TOGGLE_KEY
            ? model.sidebar_tooltips.toggle
            : key === SIDEBAR_TOOLTIP_HOME_KEY
              ? model.sidebar_tooltips.home
              : model.sidebar_tooltips.navItems[key]

    if (maybe_tooltip === undefined) {
        return [model, []]
    }

    const { model: tooltip, commands = [] } = Ui.Tooltip.update(
        maybe_tooltip,
        message
    )
    const sidebar_tooltips =
        key === SIDEBAR_TOOLTIP_TOGGLE_KEY
            ? { ...model.sidebar_tooltips, toggle: tooltip }
            : key === SIDEBAR_TOOLTIP_HOME_KEY
              ? { ...model.sidebar_tooltips, home: tooltip }
              : {
                    ...model.sidebar_tooltips,
                    navItems: {
                        ...model.sidebar_tooltips.navItems,
                        [key]: tooltip,
                    },
                }

    return [
        modifyFields(model, { sidebar_tooltips: () => sidebar_tooltips }),
        Command.mapMessages(commands, (next_message) =>
            GotSidebarTooltipMessage({
                id: key,
                message: next_message,
            })
        ),
    ]
}

const retain_requested_domain = (url: Url, host_context: HostContext): Url =>
    Option.match(host_context.requested_domain_slug, {
        onNone: () => url,
        onSome: (slug) => {
            const next_host_context = host_context_for_url(url)
            if (
                url.pathname === "/" ||
                Option.isSome(next_host_context.requested_domain_slug)
            ) {
                return url
            }

            const search = new URLSearchParams(
                Option.getOrElse(url.search, () => "")
            )
            search.set("domain", slug)
            return { ...url, search: Option.some(search.toString()) }
        },
    })

const update_inner = (
    model: Model,
    message: Message
): readonly [Model, Commands] =>
    M.value(message).pipe(
        M.withReturnType<readonly [Model, Commands]>(),
        M.tagsExhaustive({
            GotNavigationSettingsMessage: ({ message }) => {
                const [navigation_settings, child_commands] =
                    NavigationSettings.update(
                        model.navigation_settings,
                        message
                    )
                const commands: Commands = Command.mapMessages(
                    child_commands,
                    (message) => GotNavigationSettingsMessage({ message })
                )
                if (
                    message._tag !== "Save" ||
                    navigation_settings.saving === "idle" ||
                    model.navigation_settings.saving !== "idle" ||
                    (Option.isNone(model.active_domain_id) &&
                        account_domain(model) === undefined) ||
                    model.contacts.session === null ||
                    model.contacts.domain_id === ""
                )
                    return [{ ...model, navigation_settings }, commands]
                return [
                    { ...model, navigation_settings },
                    [
                        ...commands,
                        SaveAccountNavigation({
                            domain_id: model.contacts.domain_id,
                            account_id: model.contacts.session.account_id,
                            legacy_domain_id:
                                account_domain(model)?.id ??
                                Option.getOrElse(
                                    model.active_domain_id,
                                    () => ""
                                ),
                            kind: message.kind,
                            sidebar_order: navigation_settings.sidebar_order,
                            hidden_modules: navigation_settings.hidden_modules,
                            enabled_modules:
                                navigation_settings.enabled_modules,
                        }),
                    ],
                ]
            },
            ReceivedAccountNavigation: ({
                account_id,
                legacy_domain_id,
                snapshot,
            }): readonly [Model, Commands] => {
                if (
                    model.contacts.session?.account_id !== account_id ||
                    model.contacts.domain_id !== snapshot.domain_id ||
                    (!Option.contains(
                        model.active_domain_id,
                        legacy_domain_id
                    ) &&
                        account_domain(model)?.id !== legacy_domain_id)
                )
                    return [model, []]
                const [next, commands] = update_inner(
                    model,
                    GotNavigationSettingsMessage({
                        message: NavigationSettings.Received({
                            snapshot: {
                                ...snapshot,
                                domain_id: legacy_domain_id,
                            },
                        }),
                    })
                )
                return [
                    next,
                    snapshot.enabled_modules.includes("Mail")
                        ? [
                              ...commands,
                              LoadAccountPublicationTheme({
                                  domain_id: snapshot.domain_id,
                                  account_id,
                              }),
                          ]
                        : commands,
                ]
            },
            SavedAccountNavigation: ({
                account_id,
                legacy_domain_id,
                kind,
                snapshot,
            }) =>
                model.contacts.session?.account_id === account_id &&
                model.contacts.domain_id === snapshot.domain_id &&
                (Option.contains(model.active_domain_id, legacy_domain_id) ||
                    account_domain(model)?.id === legacy_domain_id)
                    ? update_inner(
                          model,
                          GotNavigationSettingsMessage({
                              message: NavigationSettings.Saved({
                                  snapshot: {
                                      ...snapshot,
                                      domain_id: legacy_domain_id,
                                  },
                                  kind,
                              }),
                          })
                      )
                    : [model, []],
            FailedAccountNavigation: ({
                account_id,
                domain_id,
                legacy_domain_id,
                details,
            }) =>
                model.contacts.session?.account_id === account_id &&
                model.contacts.domain_id === domain_id &&
                (Option.contains(model.active_domain_id, legacy_domain_id) ||
                    account_domain(model)?.id === legacy_domain_id)
                    ? update_inner(
                          model,
                          GotNavigationSettingsMessage({
                              message: NavigationSettings.Failed({
                                  domain_id: legacy_domain_id,
                                  details,
                              }),
                          })
                      )
                    : [model, []],
            ReceivedAccountPublicationTheme: ({ account_id, theme }) =>
                model.contacts.session?.account_id === account_id &&
                model.contacts.domain_id === theme.domain_id &&
                module_enabled(model, "Mail")
                    ? update_inner(
                          model,
                          GotMailMessage({
                              message:
                                  DesktopMail.loaded_publication_email_theme({
                                      theme,
                                  }),
                          })
                      )
                    : [model, []],
            FailedAccountPublicationTheme: ({
                account_id,
                domain_id,
                details,
            }) =>
                model.contacts.session?.account_id === account_id &&
                model.contacts.domain_id === domain_id &&
                module_enabled(model, "Mail")
                    ? update_inner(model, FailedData({ details }))
                    : [model, []],
            CompletedLoadExternal: () => [model, []],
            CompletedNavigateInternal: () => [model, []],
            ClickedLink: ({ request }) =>
                M.value(request).pipe(
                    M.withReturnType<readonly [Model, Commands]>(),
                    M.tagsExhaustive({
                        Internal: ({ url }) => [
                            model,
                            [
                                navigateInternal(
                                    retain_requested_domain(
                                        url,
                                        model.host_context
                                    )
                                ),
                            ],
                        ],
                        External: ({ href }) => [model, [loadExternal(href)]],
                    })
                ),
            ChangedUrl: ({ url }) => {
                const retained_url = retain_requested_domain(
                    url,
                    model.host_context
                )
                if (retained_url !== url) {
                    return [
                        model,
                        [
                            ReplaceInternalHref({
                                href: urlToString(retained_url),
                            }),
                        ],
                    ]
                }
                const legacy_marketing_href =
                    legacy_marketing_replacement_href(url)
                if (Option.isSome(legacy_marketing_href)) {
                    return [
                        model,
                        [
                            ReplaceInternalHref({
                                href: legacy_marketing_href.value,
                            }),
                        ],
                    ]
                }
                const legacy_mail_templates_href =
                    legacy_mail_templates_replacement_href(url)
                if (Option.isSome(legacy_mail_templates_href)) {
                    return [
                        model,
                        [
                            ReplaceInternalHref({
                                href: legacy_mail_templates_href.value,
                            }),
                        ],
                    ]
                }
                const legacy_pages_href = legacy_pages_replacement_href(url)
                if (Option.isSome(legacy_pages_href)) {
                    return [
                        model,
                        [
                            ReplaceInternalHref({
                                href: legacy_pages_href.value,
                            }),
                        ],
                    ]
                }
                const legacy_documents_href =
                    legacy_content_replacement_href(url)
                if (Option.isSome(legacy_documents_href)) {
                    return [
                        model,
                        [
                            ReplaceInternalHref({
                                href: legacy_documents_href.value,
                            }),
                        ],
                    ]
                }
                const next_host_context = host_context_for_url(url)
                const requested_domain_changed =
                    Option.getOrUndefined(
                        next_host_context.requested_domain_slug
                    ) !==
                    Option.getOrUndefined(
                        model.host_context.requested_domain_slug
                    )

                if (requested_domain_changed) {
                    const [domain_model, domain_commands] = update_inner(
                        { ...model, host_context: next_host_context },
                        ReceivedDomains({ domains: model.domains })
                    )
                    const [contact_model, contact_commands] = Option.match(
                        next_host_context.requested_domain_slug,
                        {
                            onNone: () => [domain_model, []] as const,
                            onSome: (slug) =>
                                update_inner(
                                    domain_model,
                                    GotContactsMessage({
                                        message: Contacts.opened_domain(
                                            slug,
                                            routeForUrl(url)._tag !== "Mail"
                                        ),
                                    })
                                ),
                        }
                    )
                    const [route_model, route_commands] = update_inner(
                        contact_model,
                        ChangedUrl({ url })
                    )
                    return [
                        route_model,
                        [
                            ...domain_commands,
                            ...contact_commands,
                            ...route_commands,
                        ],
                    ]
                }

                const route = routeForUrl(url)
                if (
                    route._tag === "Dev" &&
                    route.dev_path === "/dev/grep" &&
                    model.route._tag === "Dev" &&
                    model.route.dev_path === "/dev/grep"
                )
                    return [
                        modifyFields(model, {
                            dev: (dev) => restore_grep_route(dev, url),
                        }),
                        [],
                    ]
                const projects = DesktopProjects.changed_route(
                    model.projects,
                    route
                )
                const [shop, shop_commands] = Option.match(
                    shopFeaturePath(route),
                    {
                        onNone: (): DesktopShop.UpdateReturn => [
                            model.shop,
                            [],
                        ],
                        onSome: (pathname) =>
                            DesktopShop.changed_url(
                                model.shop,
                                url,
                                pathname,
                                model.active_domain_id
                            ),
                    }
                )
                const [issues, issue_commands] = Option.match(
                    issuesFeaturePath(route),
                    {
                        onNone: (): DesktopIssues.UpdateReturn => [
                            model.issues,
                            [],
                        ],
                        onSome: (pathname) =>
                            DesktopIssues.changed_url(
                                model.issues,
                                url,
                                pathname,
                                model.active_domain_id
                            ),
                    }
                )
                const [media, media_commands] = Option.match(
                    mediaFeaturePath(route),
                    {
                        onNone: (): DesktopMedia.UpdateReturn => [
                            model.media,
                            [],
                        ],
                        onSome: (pathname) =>
                            DesktopMedia.changed_url(
                                model.media,
                                url,
                                pathname,
                                model.active_domain_id
                            ),
                    }
                )
                const [events, event_commands] = Option.match(
                    eventsFeaturePath(route),
                    {
                        onNone: (): DesktopEvents.UpdateReturn => [
                            model.events,
                            [],
                        ],
                        onSome: (pathname) =>
                            DesktopEvents.changed_url(
                                model.events,
                                url,
                                pathname,
                                model.active_domain_id
                            ),
                    }
                )
                const [changed_mail, mail_commands] = Option.match(
                    mailFeaturePath(route),
                    {
                        onNone: (): DesktopMail.UpdateReturn => [
                            model.mail,
                            [],
                        ],
                        onSome: (pathname) =>
                            DesktopMail.changed_url(
                                model.mail,
                                url,
                                pathname,
                                model.contacts.domain_id
                            ),
                    }
                )
                const mail =
                    route._tag === "Content" &&
                    Content.is_content_email_path(route.content_path)
                        ? DesktopMail.sync_content_location(
                              changed_mail,
                              route.content_path,
                              route.content_search
                          )
                        : changed_mail
                const [data, data_commands] = Option.match(
                    dataFeaturePath(route),
                    {
                        onNone: (): DesktopData.UpdateReturn => [
                            model.data,
                            [],
                        ],
                        onSome: (pathname) =>
                            DesktopData.changed_path(
                                model.data,
                                pathname,
                                model.active_domain_id
                            ),
                    }
                )
                const [social, social_commands] =
                    route._tag === "Content"
                        ? DesktopSocial.changed_content_url(
                              model.social,
                              route.content_path,
                              route.content_search,
                              social_domain_id(model)
                          )
                        : DesktopSocial.changed_content_url(
                              model.social,
                              "",
                              "",
                              social_domain_id(model)
                          )
                const [blog, blog_commands] = Option.match(
                    blog_path_for_route(route),
                    {
                        onNone: (): DesktopBlog.UpdateReturn => [
                            model.blog,
                            [],
                        ],
                        onSome: (pathname) =>
                            DesktopBlog.changed_url(model.blog, pathname),
                    }
                )
                const [documents, document_commands] = Option.match(
                    documents_path_for_route(route),
                    {
                        onNone: (): DesktopDocuments.UpdateReturn => [
                            model.documents,
                            [],
                        ],
                        onSome: (pathname) =>
                            DesktopDocuments.changed_url(
                                model.documents,
                                pathname
                            ),
                    }
                )
                const [sysadmin, sysadmin_commands] = Option.match(
                    sysadminFeaturePath(route),
                    {
                        onNone: (): readonly [
                            Option.Option<DesktopSysadmin.Model>,
                            DesktopSysadmin.UpdateReturn[1],
                        ] => [Option.none(), []],
                        onSome: (pathname) =>
                            Option.match(model.sysadmin, {
                                onNone: () => {
                                    const [sysadmin_model, commands] =
                                        DesktopSysadmin.init(
                                            pathname,
                                            model.contacts.session === null
                                                ? undefined
                                                : model.contacts.domain_id,
                                            model.contacts.session?.account_id
                                        )
                                    return [
                                        Option.some(sysadmin_model),
                                        commands,
                                    ]
                                },
                                onSome: (sysadmin_model) => {
                                    const [next_sysadmin, commands] =
                                        DesktopSysadmin.changed_url(
                                            sysadmin_model,
                                            url,
                                            pathname,
                                            model.contacts.session === null
                                                ? undefined
                                                : model.contacts.domain_id,
                                            model.contacts.session?.account_id
                                        )
                                    return [
                                        Option.some(next_sysadmin),
                                        commands,
                                    ]
                                },
                            }),
                    }
                )
                const [base_forms, base_forms_commands] = Option.match(
                    forms_path_for_route(route),
                    {
                        onNone: (): readonly [
                            Option.Option<Forms.Model>,
                            Forms.UpdateReturn[1],
                        ] => [Option.none(), []],
                        onSome: (pathname) =>
                            Option.match(model.forms, {
                                onNone: () => {
                                    const [forms_model, commands] =
                                        Forms.init(pathname)
                                    return [Option.some(forms_model), commands]
                                },
                                onSome: (forms_model) => {
                                    if (route._tag === "Content")
                                        return [Option.some(forms_model), []]
                                    const [next_forms, commands] = Forms.update(
                                        forms_model,
                                        Forms.ChangedPath({ pathname }),
                                        forms_domain_id(model)
                                    )
                                    return [Option.some(next_forms), commands]
                                },
                            }),
                    }
                )
                const [forms, forms_content_commands]: readonly [
                    Option.Option<Forms.Model>,
                    Forms.UpdateReturn[1],
                ] =
                    route._tag === "Content"
                        ? Option.match(base_forms, {
                              onNone: () => [Option.none(), []],
                              onSome: (forms_model) => {
                                  const [next_forms, commands] =
                                      Forms.changed_content_url(
                                          forms_model,
                                          route.content_path,
                                          route.content_search,
                                          forms_domain_id(model)
                                      )
                                  return [Option.some(next_forms), commands]
                              },
                          })
                        : [base_forms, []]
                const forms_commands = [
                    ...base_forms_commands,
                    ...forms_content_commands,
                ]
                const landing_editor_path =
                    route._tag === "Marketing" ? route.marketing_path : ""
                const preset_marketing_landing =
                    MarketingLanding.isLandingEditorPath(landing_editor_path)
                        ? MarketingLanding.changed_preset(
                              model.labs_marketing_landing,
                              MarketingLanding.editorPresetForPath(
                                  landing_editor_path
                              )
                          )
                        : model.labs_marketing_landing
                const landing_editor_page_id =
                    landing_editor_page_id_for_route(route)
                const landing_editor_page =
                    landing_editor_page_id === null
                        ? undefined
                        : DesktopPages.project(model.pages).pages.find(
                              (page) => page.id === landing_editor_page_id
                          )
                const labs_marketing_landing =
                    landing_editor_page?.content_type === "landing_json"
                        ? load_landing_editor_page(
                              preset_marketing_landing,
                              landing_editor_page,
                              route
                          )
                        : landing_editor_page_id === null &&
                            MarketingLanding.editorPresetForPath(
                                landing_editor_path
                            ) === "blank"
                          ? MarketingLanding.init("blank")[0]
                          : preset_marketing_landing
                const [pages, page_commands] = DesktopPages.update(
                    model.pages,
                    DesktopPages.ChangedUrl({ url }),
                    model.active_domain_id,
                    DesktopDomains.project(model.domain_management).subdomains
                )
                const [domain_publishing, publishing_commands] =
                    route._tag === "Web" &&
                    route.web_path === "/web/publishing" &&
                    (model.route._tag !== "Web" ||
                        model.route.web_path !== "/web/publishing")
                        ? DomainPublishing.update(
                              model.domain_publishing,
                              DomainPublishing.Refreshed()
                          )
                        : [model.domain_publishing, []]
                const routed_design = DesktopDesign.changed_url(
                    model.design,
                    url
                )
                const [design, design_commands] =
                    route._tag === "Design" &&
                    route.design_path === "/design/layouts/main-layout" &&
                    !routed_design.pending
                        ? DesktopDesign.update(
                              routed_design,
                              DesktopDesign.Refreshed(),
                              model.active_domain_id,
                              DesktopDomains.project(model.domain_management)
                                  .subdomains
                          )
                        : [routed_design, []]
                return [
                    modifyFields(model, {
                        route: () => route,
                        dev: (dev) => restore_grep_route(dev, url),
                        issues: () => issues,
                        events: () => events,
                        media: () => media,
                        projects: () => projects,
                        shop: () => shop,
                        mail: () => mail,
                        data: () => data,
                        blog: () => blog,
                        social: () => social,
                        documents: () => documents,
                        pages: () => pages,
                        design: () => design,
                        domain_publishing: () => domain_publishing,
                        forms: () => forms,
                        sysadmin: () => sysadmin,
                        labs_marketing_landing: () => labs_marketing_landing,
                        dev_bookmarks: () =>
                            DevBookmarks.changed_route(
                                model.dev_bookmarks,
                                route
                            ),
                        design_logo: () =>
                            DesktopLogo.changed_route(model.design_logo, route),
                        is_sidebar_mobile_open: () => false,
                    }),
                    [
                        ...map_issue_commands(issue_commands),
                        ...map_event_commands(event_commands),
                        ...map_media_commands(media_commands),
                        ...map_mail_commands(mail_commands),
                        ...map_data_commands(data_commands),
                        ...map_blog_commands(blog_commands),
                        ...map_social_commands(social_commands),
                        ...map_document_commands(document_commands),
                        ...map_blog_commands(blog_commands),
                        ...map_page_commands(page_commands),
                        ...map_design_commands(design_commands),
                        ...map_domain_publishing_commands(publishing_commands),
                        ...map_shop_commands(shop_commands),
                        ...map_sysadmin_commands(sysadmin_commands),
                        ...map_forms_commands(forms_commands),
                    ],
                ]
            },
            ToggledSidebar: () => [
                modifyFields(model, {
                    is_sidebar_collapsed: (is_collapsed) => !is_collapsed,
                }),
                [],
            ],
            ToggledMobileSidebar: () => [
                modifyFields(model, {
                    is_sidebar_mobile_open: (is_open) => !is_open,
                }),
                [],
            ],
            ToggledSpotifyPlayer: () => {
                const {
                    model: spotify_player_popover,
                    commands = [],
                    outMessage: maybe_output_value,
                } = Ui.Popover.update(
                    model.spotify_player_popover,
                    model.spotify_player_popover.isOpen
                        ? Ui.Popover.Message.RequestedClose()
                        : Ui.Popover.Message.RequestedOpen()
                )
                const maybe_output = Option.fromUndefinedOr(maybe_output_value)

                return [
                    modifyFields(model, {
                        spotify_player_popover: () => spotify_player_popover,
                        spotify_player_state: (state) =>
                            Option.match(maybe_output, {
                                onNone: () => state,
                                onSome: (output) =>
                                    output._tag === "Opened"
                                        ? "Expanded"
                                        : "Collapsed",
                            }),
                    }),
                    Command.mapMessages(commands, (message) =>
                        GotSpotifyPlayerPopoverMessage({ message })
                    ),
                ]
            },
            GotSpotifyPlayerPopoverMessage: ({ message: child_message }) => {
                const {
                    model: spotify_player_popover,
                    commands = [],
                    outMessage: maybe_output_value,
                } = Ui.Popover.update(
                    model.spotify_player_popover,
                    child_message
                )
                const maybe_output = Option.fromUndefinedOr(maybe_output_value)

                return [
                    modifyFields(model, {
                        spotify_player_popover: () => spotify_player_popover,
                        spotify_player_state: (state) =>
                            Option.match(maybe_output, {
                                onNone: () => state,
                                onSome: (output) =>
                                    output._tag === "Opened"
                                        ? "Expanded"
                                        : "Collapsed",
                            }),
                    }),
                    Command.mapMessages(commands, (message) =>
                        GotSpotifyPlayerPopoverMessage({ message })
                    ),
                ]
            },
            ChangedSpotifyPlaylistId: ({ value }) => [
                modifyFields(model, {
                    spotify_playlist_id_draft: () => value,
                    spotify_playlist_status: () => "Idle",
                    spotify_playlist_error: () => "",
                }),
                [],
            ],
            SubmittedSpotifyPlaylistId: () =>
                Option.match(
                    S.decodeUnknownOption(SpotifyPlaylistId)(
                        model.spotify_playlist_id_draft.trim()
                    ),
                    {
                        onNone: () => [
                            modifyFields(model, {
                                spotify_playlist_status: () => "Error",
                                spotify_playlist_error: () =>
                                    "Enter the 22-character ID from a Spotify playlist URL.",
                            }),
                            [],
                        ],
                        onSome: (playlist_id) =>
                            model.contacts.session === null ||
                            model.contacts.domain_id === ""
                                ? [
                                      modifyFields(model, {
                                          spotify_playlist_status: () =>
                                              "Error",
                                          spotify_playlist_error: () =>
                                              "Sign in to save this preference.",
                                      }),
                                      [],
                                  ]
                                : [
                                      modifyFields(model, {
                                          spotify_playlist_id_draft: () =>
                                              playlist_id,
                                          spotify_playlist_status: () =>
                                              "Saving",
                                          spotify_playlist_error: () => "",
                                      }),
                                      [
                                          SaveSpotifyPreference({
                                              domain_id:
                                                  model.contacts.domain_id,
                                              account_id:
                                                  model.contacts.session
                                                      .account_id,
                                              playlist_id,
                                          }),
                                      ],
                                  ],
                    }
                ),
            ReceivedSpotifyPreference: ({ playlist_id, is_saved }) => [
                modifyFields(model, {
                    spotify_playlist_id: () => playlist_id,
                    spotify_playlist_id_draft: () => playlist_id,
                    spotify_playlist_status: () =>
                        is_saved ? "Saved" : "Idle",
                    spotify_playlist_error: () => "",
                }),
                [],
            ],
            SavedSpotifyPreference: ({ account_id, playlist_id }) =>
                model.contacts.session?.account_id !== account_id
                    ? [model, []]
                    : [
                          modifyFields(model, {
                              spotify_playlist_id: () => playlist_id,
                              spotify_playlist_id_draft: () => playlist_id,
                              spotify_playlist_status: () => "Saved",
                              spotify_playlist_error: () => "",
                          }),
                          [],
                      ],
            FailedSpotifyPreference: ({ account_id, details }) =>
                account_id !== "" &&
                model.contacts.session?.account_id !== account_id
                    ? [model, []]
                    : [
                          modifyFields(model, {
                              spotify_playlist_status: () => "Error",
                              spotify_playlist_error: () => details,
                          }),
                          [],
                      ],
            ReceivedAccountPreferences: ({ snapshot }) => {
                if (model.contacts.session?.account_id !== snapshot.id)
                    return [model, []]
                const [with_appearance, appearance_commands] = update_inner(
                    model,
                    ReceivedAppearancePreference(snapshot.appearance)
                )
                const [with_spotify, spotify_commands] = update_inner(
                    with_appearance,
                    ReceivedSpotifyPreference(snapshot.spotify)
                )
                return [
                    with_spotify,
                    [...appearance_commands, ...spotify_commands],
                ]
            },
            FailedAccountPreferences: ({ account_id, details }) =>
                model.contacts.session?.account_id === account_id
                    ? [
                          modifyFields(model, {
                              maybe_error: () => Option.some(details),
                          }),
                          [],
                      ]
                    : [model, []],
            SavedAccountAppearance: ({ account_id, theme, font, code_font }) =>
                model.contacts.session?.account_id === account_id
                    ? update_inner(
                          model,
                          GotAppearanceMessage({
                              message: Appearance.AppearancePreferencesLoaded({
                                  theme,
                                  font,
                                  codeFont: code_font,
                              }),
                          })
                      )
                    : [model, []],
            GotSidebarTooltipMessage: ({ id, message }) =>
                update_sidebar_tooltip(model, id, message),
            GotAppearanceMessage: ({ message }) => {
                const [appearance, commands] = Appearance.updateDeviceCache(
                    model.appearance,
                    message
                )
                const persistence_commands: Commands =
                    (message._tag === "ThemeSelected" ||
                        message._tag === "FontSelected") &&
                    model.contacts.session !== null &&
                    model.contacts.domain_id !== ""
                        ? [
                              SaveAppearancePreference({
                                  domain_id: model.contacts.domain_id,
                                  account_id: model.contacts.session.account_id,
                                  theme: appearance.savedTheme,
                                  font: appearance.savedFont,
                                  code_font: appearance.savedCodeFont,
                              }),
                          ]
                        : []

                return [
                    modifyFields(model, { appearance: () => appearance }),
                    [
                        ...Command.mapMessages(commands, (next_message) =>
                            GotAppearanceMessage({ message: next_message })
                        ),
                        ...persistence_commands,
                    ],
                ]
            },
            ReceivedAuthSession: ({ profile }) => {
                const changed_user =
                    Option.isSome(model.auth.profile) &&
                    Option.isSome(profile) &&
                    model.auth.profile.value.id !== profile.value.id
                const session_model = changed_user
                    ? update_inner(
                          model,
                          GotAuthKitMessage({
                              message: { _tag: "AuthKitSignedOut" },
                          })
                      )[0]
                    : model
                const [next, commands] = update_inner(
                    { ...session_model, auth_connection_id },
                    GotAuthKitMessage({
                        message: { _tag: "AuthKitLoaded", profile },
                    })
                )
                const [sysadmin, pending_sysadmin_commands] =
                    !has_verified_session(model) &&
                    has_verified_session(next) &&
                    next.contacts.session !== null &&
                    next.contacts.domain_id !== ""
                        ? Option.match(next.sysadmin, {
                              onNone: () => [next.sysadmin, []] as const,
                              onSome: (current) => {
                                  const [loaded, load_commands] =
                                      DesktopSysadmin.account_domain_changed(
                                          current,
                                          next.contacts.domain_id,
                                          next.contacts.session?.account_id
                                      )
                                  return [
                                      Option.some(loaded),
                                      map_sysadmin_commands(load_commands),
                                  ] as const
                              },
                          })
                        : ([next.sysadmin, []] as const)
                return [
                    { ...next, sysadmin },
                    [...commands, ...pending_sysadmin_commands],
                ]
            },
            FailedAuthSession: ({ details }) =>
                update_inner(
                    { ...model, auth_connection_id: "" },
                    GotAuthKitMessage({
                        message: { _tag: "AuthKitFailed", details },
                    })
                ),
            GotAuthKitMessage: ({ message }) => {
                if (
                    account_domain(model) !== undefined &&
                    message._tag === "GotAccountMenuMessage"
                ) {
                    const {
                        model: account_menu,
                        commands = [],
                        outMessage: maybe_output,
                    } = AccountMenu.update(
                        model.auth.account_menu,
                        message.message
                    )
                    const next_model = modifyFields(model, {
                        auth: (auth) =>
                            modifyFields(auth, {
                                account_menu: () => account_menu,
                            }),
                    })
                    const menu_commands = Command.mapMessages(
                        commands,
                        (next_message) =>
                            GotAuthKitMessage({
                                message: {
                                    _tag: "GotAccountMenuMessage",
                                    message: next_message,
                                },
                            })
                    )
                    if (maybe_output === undefined)
                        return [next_model, menu_commands]
                    const [signed_out, sign_out_commands] = update_inner(
                        next_model,
                        GotContactsMessage({
                            message: Contacts.sign_out(),
                        })
                    )
                    return [
                        signed_out,
                        [...menu_commands, ...sign_out_commands],
                    ]
                }
                const [auth, commands] = AuthKit.update(model.auth, message)

                if (account_domain(model) !== undefined)
                    return [
                        modifyFields(model, { auth: () => auth }),
                        map_auth_commands(commands),
                    ]

                if (auth.status !== "signed_in") {
                    return [
                        modifyFields(model, {
                            auth: () => auth,
                            domains_status: () => "idle",
                            domains: () => [],
                            sysadmin: (sysadmin) =>
                                Option.map(
                                    sysadmin,
                                    DesktopSysadmin.clear_data
                                ),
                            active_domain_id: () => Option.none(),
                            domain_management: (domain_management) =>
                                DesktopDomains.clear_subdomains(
                                    domain_management
                                ),
                            domain_publishing: (publishing) =>
                                DomainPublishing.clear(publishing),
                            design_logo: (design_logo) =>
                                DesktopLogo.clear(design_logo),
                            issues: (issues) => DesktopIssues.clear(issues),
                            events: (events) => DesktopEvents.clear(events),
                            media: (media) => DesktopMedia.clear(media),
                            tags: (tags) => Tags.clear(tags),
                            projects: (projects) =>
                                DesktopProjects.clear(projects),
                            shop: (shop) => DesktopShop.clear(shop),
                            mail: (mail) =>
                                DesktopMail.with_domain(mail, Option.none()),
                            data: (data) =>
                                DesktopData.with_domain(data, Option.none()),
                            blog: (blog) => DesktopBlog.clear(blog),
                            documents: (documents) =>
                                DesktopDocuments.clear(documents),
                            bookmarks: (bookmarks) =>
                                DesktopBookmarks.clear(bookmarks),
                            pages: (pages) => DesktopPages.clear(pages),
                            forms: (forms) => Option.map(forms, Forms.clear),
                            spotify_playlist_id: () =>
                                DEFAULT_SPOTIFY_PLAYLIST_ID,
                            spotify_playlist_id_draft: () =>
                                DEFAULT_SPOTIFY_PLAYLIST_ID,
                            spotify_playlist_status: () => "Idle",
                            spotify_playlist_error: () => "",
                        }),
                        map_auth_commands(commands),
                    ]
                }

                return [
                    modifyFields(model, {
                        auth: () => auth,
                        domains_status: (status) =>
                            model.auth.status === "signed_in"
                                ? status
                                : "loading",
                    }),
                    map_auth_commands(commands),
                ]
            },
            ReceivedAppearancePreference: ({
                theme,
                font,
                code_font,
                is_saved,
            }) => {
                if (!is_saved) {
                    return [
                        model,
                        model.contacts.session !== null &&
                        model.contacts.domain_id !== ""
                            ? [
                                  SaveAppearancePreference({
                                      domain_id: model.contacts.domain_id,
                                      account_id:
                                          model.contacts.session.account_id,
                                      theme: model.appearance.savedTheme,
                                      font: model.appearance.savedFont,
                                      code_font: model.appearance.savedCodeFont,
                                  }),
                              ]
                            : [],
                    ]
                }

                const [appearance, commands] = Appearance.updateDeviceCache(
                    model.appearance,
                    Appearance.AppearancePreferencesLoaded({
                        theme,
                        font,
                        codeFont: code_font,
                    })
                )

                return [
                    modifyFields(model, { appearance: () => appearance }),
                    Command.mapMessages(commands, (next_message) =>
                        GotAppearanceMessage({ message: next_message })
                    ),
                ]
            },
            GotIssuesMessage: ({ message }) => {
                const [issues, commands] = DesktopIssues.update(
                    model.issues,
                    message,
                    model.active_domain_id
                )

                return [
                    modifyFields(model, { issues: () => issues }),
                    map_issue_commands(commands),
                ]
            },
            GotEventsMessage: ({ message }) => {
                const [events, commands] = DesktopEvents.update(
                    model.events,
                    message,
                    model.active_domain_id
                )

                return [
                    modifyFields(model, { events: () => events }),
                    map_event_commands(commands),
                ]
            },
            GotTagsMessage: ({ message }) => {
                if ("epoch" in message && message.epoch !== model.tags.epoch)
                    return [model, []]
                const [tags, commands] = Tags.update(model.tags, message)
                const [media, media_commands] =
                    (message._tag === "TagsLoaded" ||
                        message._tag === "TagsSaved") &&
                    message.result !== null
                        ? DesktopMedia.update(model.media, {
                              _tag: "Refreshed",
                          })
                        : [model.media, []]
                const changed =
                    message._tag === "TagsLoaded" ||
                    message._tag === "TagsSaved"
                const [issues, issue_commands] = changed
                    ? DesktopIssues.update(
                          model.issues,
                          DesktopIssues.Refreshed()
                      )
                    : [model.issues, []]
                const [projects, project_commands] = changed
                    ? DesktopProjects.update(
                          model.projects,
                          DesktopProjects.Refreshed()
                      )
                    : [model.projects, []]
                return [
                    { ...model, tags, media, issues, projects },
                    [
                        ...Command.mapMessages(commands, (message) =>
                            GotTagsMessage({ message })
                        ),
                        ...map_media_commands(media_commands),
                        ...map_issue_commands(issue_commands),
                        ...map_project_commands(project_commands),
                    ],
                ]
            },
            GotMediaMessage: ({ message }) => {
                if ("epoch" in message && message.epoch !== model.media.epoch)
                    return [model, []]
                const [media, commands] = DesktopMedia.update(
                    model.media,
                    message,
                    model.active_domain_id
                )
                const result_message = DesktopMedia.result_message(message)
                const [tags, tag_commands] =
                    message._tag === "LibraryLoaded" && message.result !== null
                        ? Tags.update(model.tags, {
                              _tag: "TagsRefreshed",
                          })
                        : [model.tags, []]
                const landing_image_upload_busy =
                    model.labs_marketing_landing.hero_image_upload_busy ||
                    Option.isSome(
                        model.labs_marketing_landing.logo_image_upload_index
                    )
                const [labs_marketing_landing, landing_commands] =
                    landing_image_upload_busy
                        ? result_message?._tag === "UploadedImages"
                            ? Option.match(Array.head(result_message.images), {
                                  onNone: () => [
                                      model.labs_marketing_landing,
                                      [],
                                  ],
                                  onSome: (image) =>
                                      Option.match(
                                          model.labs_marketing_landing
                                              .logo_image_upload_index,
                                          {
                                              onNone: () =>
                                                  MarketingLanding.update(
                                                      model.labs_marketing_landing,
                                                      MarketingLanding.UploadedHeroImage(
                                                          {
                                                              image_id:
                                                                  image.id,
                                                              alt: image.alt,
                                                          }
                                                      )
                                                  ),
                                              onSome: (index) =>
                                                  MarketingLanding.update(
                                                      model.labs_marketing_landing,
                                                      MarketingLanding.UploadedLogoImage(
                                                          {
                                                              index,
                                                              image_id:
                                                                  image.id,
                                                              alt: image.alt,
                                                          }
                                                      )
                                                  ),
                                          }
                                      ),
                              })
                            : result_message?._tag === "UploadImagesFailed"
                              ? Option.isSome(
                                    model.labs_marketing_landing
                                        .logo_image_upload_index
                                )
                                  ? MarketingLanding.update(
                                        model.labs_marketing_landing,
                                        MarketingLanding.LogoImageUploadFailed({
                                            error: result_message.error,
                                        })
                                    )
                                  : MarketingLanding.update(
                                        model.labs_marketing_landing,
                                        MarketingLanding.HeroImageUploadFailed({
                                            error: result_message.error,
                                        })
                                    )
                              : [model.labs_marketing_landing, []]
                        : [model.labs_marketing_landing, []]

                return [
                    modifyFields(model, {
                        media: () => media,
                        tags: () => tags,
                        labs_marketing_landing: () => labs_marketing_landing,
                    }),
                    [
                        ...map_media_commands(commands),
                        ...Command.mapMessages(tag_commands, (message) =>
                            GotTagsMessage({ message })
                        ),
                        ...Command.mapMessages(
                            landing_commands,
                            (next_message) =>
                                GotLabsMarketingLandingMessage({
                                    message: next_message,
                                })
                        ),
                    ],
                ]
            },
            GotBlogMessage: ({ message }) => {
                const [blog, commands] = DesktopBlog.update(model.blog, message)
                return [{ ...model, blog }, map_blog_commands(commands)]
            },
            GotDocumentsMessage: ({ message }) => {
                const [documents, commands] = DesktopDocuments.update(
                    model.documents,
                    message
                )

                return [
                    modifyFields(model, { documents: () => documents }),
                    map_document_commands(commands),
                ]
            },
            GotBookmarksMessage: ({ message }) => {
                const [bookmarks, commands] = DesktopBookmarks.update(
                    model.bookmarks,
                    message
                )

                return [
                    modifyFields(model, { bookmarks: () => bookmarks }),
                    map_bookmark_commands(commands),
                ]
            },
            GotLabsMarketingLandingMessage: ({ message }) => {
                const [labs_marketing_landing, commands] =
                    MarketingLanding.update(
                        model.labs_marketing_landing,
                        message
                    )
                const [media, media_commands] =
                    (message._tag === "GotHeroImageDropMessage" ||
                        message._tag === "GotLogoImageDropMessage") &&
                    message.message._tag === "DroppedFiles"
                        ? DesktopMedia.update(
                              model.media,
                              DesktopMedia.requested_upload_images({
                                  files: message.message.files,
                              }),
                              model.active_domain_id
                          )
                        : [model.media, []]
                const page_id = Option.flatMap(
                    labs_marketing_landing.page_id,
                    S.decodeUnknownOption(DesktopPages.Page.fields.id)
                )
                const [pages, page_commands] =
                    message._tag === "ClickedSave"
                        ? Option.match(page_id, {
                              onNone: (): DesktopPages.UpdateReturn => [
                                  model.pages,
                                  [],
                              ],
                              onSome: (landing_page_id) =>
                                  DesktopPages.update(
                                      model.pages,
                                      DesktopPages.RequestedSaveLandingContent({
                                          page_id: landing_page_id,
                                          content: JSON.stringify(
                                              MarketingLanding.landing_page_document(
                                                  labs_marketing_landing
                                              )
                                          ),
                                      }),
                                      model.active_domain_id,
                                      DesktopDomains.project(
                                          model.domain_management
                                      ).subdomains
                                  ),
                          })
                        : [model.pages, []]
                const template_commands =
                    message._tag === "ClickedSaveTemplate" &&
                    labs_marketing_landing.template_save_status === "saving"
                        ? model.contacts.session !== null &&
                          model.contacts.domain_id !== ""
                            ? [
                                  SaveLandingTemplate({
                                      domain_id: model.contacts.domain_id,
                                      account_id:
                                          model.contacts.session.account_id,
                                      template: {
                                          template_id: null,
                                          expected_revision: 0,
                                          name: labs_marketing_landing.template_name.trim(),
                                          description:
                                              labs_marketing_landing.template_description.trim(),
                                          category: Option.getOrUndefined(
                                              S.decodeUnknownOption(
                                                  Content.CatalogCategory
                                              )(
                                                  labs_marketing_landing.template_category.trim()
                                              )
                                          ),
                                          tags: MarketingLanding.template_tags_from_input(
                                              labs_marketing_landing.template_tags
                                          ),
                                          document:
                                              MarketingLanding.landing_page_document(
                                                  labs_marketing_landing
                                              ),
                                      },
                                  }),
                              ]
                            : []
                        : []
                return [
                    modifyFields(model, {
                        labs_marketing_landing: () => labs_marketing_landing,
                        pages: () => pages,
                        media: () => media,
                    }),
                    [
                        ...Command.mapMessages(commands, (next_message) =>
                            GotLabsMarketingLandingMessage({
                                message: next_message,
                            })
                        ),
                        ...map_page_commands(page_commands),
                        ...map_media_commands(media_commands),
                        ...template_commands,
                    ],
                ]
            },
            GotDevBookmarksMessage: ({ message }) => {
                const [dev_bookmarks, commands] = DevBookmarks.update(
                    model.dev_bookmarks,
                    message
                )
                return [
                    modifyFields(model, { dev_bookmarks: () => dev_bookmarks }),
                    Command.mapMessages(commands, (message) =>
                        GotDevBookmarksMessage({ message })
                    ),
                ]
            },
            GotDesignLogoMessage: ({ message }) => {
                if (
                    (message._tag === "LoadedLogo" ||
                        message._tag === "SavedLogo") &&
                    (model.contacts.session?.account_id !==
                        message.account_id ||
                        model.contacts.domain_id !== message.detail.id)
                )
                    return [model, []]
                const [design_logo, commands] = DesktopLogo.update(
                    model.design_logo,
                    message,
                    model.contacts.session === null ||
                        model.contacts.domain_id === ""
                        ? null
                        : {
                              account_id: model.contacts.session.account_id,
                              domain_id: model.contacts.domain_id,
                          }
                )
                return [
                    modifyFields(model, {
                        design_logo: () => design_logo,
                        domain_logos: (logos) =>
                            message._tag === "SavedLogo"
                                ? message.catalog.drafts
                                : logos,
                    }),
                    Command.mapMessages(commands, (message) =>
                        GotDesignLogoMessage({ message })
                    ),
                ]
            },
            GotDevMessage: ({ message }) => {
                const [dev, commands] = Dev.update(model.dev, message)
                return [
                    modifyFields(model, { dev: () => dev }),
                    [
                        ...Command.mapMessages(commands, (message) =>
                            GotDevMessage({ message })
                        ),
                        ...(message._tag === "GotGrepMessage" &&
                        grep_request_key(dev.grep) !==
                            grep_request_key(model.dev.grep) &&
                        model.route._tag === "Dev" &&
                        model.route.dev_path === "/dev/grep"
                            ? [
                                  ReplaceInternalHref({
                                      href: grep_url_href(
                                          dev.grep.query,
                                          grep_request_parameters(dev.grep)
                                      ),
                                  }),
                              ]
                            : []),
                    ],
                ]
            },
            GotPagesMessage: ({ message }) => {
                const [pages, commands] = DesktopPages.update(
                    model.pages,
                    message,
                    model.active_domain_id,
                    DesktopDomains.project(model.domain_management).subdomains
                )
                const landing_editor_page_id = landing_editor_page_id_for_route(
                    model.route
                )
                const landing_editor_page =
                    landing_editor_page_id === null
                        ? undefined
                        : DesktopPages.project(pages).pages.find(
                              (page) => page.id === landing_editor_page_id
                          )
                const labs_marketing_landing =
                    (message._tag === "PagesLoaded" ||
                        message._tag === "PagesSaved") &&
                    landing_editor_page?.content_type === "landing_json"
                        ? load_landing_editor_page(
                              model.labs_marketing_landing,
                              landing_editor_page,
                              model.route
                          )
                        : model.labs_marketing_landing

                return [
                    modifyFields(model, {
                        pages: () => pages,
                        labs_marketing_landing: () => labs_marketing_landing,
                    }),
                    map_page_commands(commands),
                ]
            },
            GotDesignMessage: ({ message }) => {
                const [design, commands] = DesktopDesign.update(
                    model.design,
                    message,
                    model.active_domain_id,
                    DesktopDomains.project(model.domain_management).subdomains
                )
                return [
                    modifyFields(model, { design: () => design }),
                    [
                        ...map_design_commands(commands),
                        ...(message._tag === "ConfigurationSaved" &&
                        message.epoch === model.design.epoch &&
                        model.design.subdomain_slug === null &&
                        model.contacts.session !== null &&
                        model.contacts.domain_id !== "" &&
                        module_enabled(model, "Mail")
                            ? [
                                  LoadAccountPublicationTheme({
                                      domain_id: model.contacts.domain_id,
                                      account_id:
                                          model.contacts.session.account_id,
                                  }),
                              ]
                            : []),
                    ],
                ]
            },
            GotSocialMessage: ({ message }) => {
                const is_new_social_route =
                    model.route._tag === "Content" &&
                    Content.is_content_creation_path(
                        model.route.content_path,
                        "social"
                    )
                const [updated_social, commands] = DesktopSocial.update(
                    model.social,
                    message,
                    social_domain_id(model)
                )
                const [social, route_commands] =
                    message._tag === "LoadedPosts" &&
                    model.route._tag === "Content"
                        ? DesktopSocial.changed_content_url(
                              updated_social,
                              model.route.content_path,
                              model.route.content_search,
                              social_domain_id(model)
                          )
                        : [updated_social, []]

                return [
                    modifyFields(model, {
                        social: () => social,
                        social_refresh: (refresh) =>
                            message._tag === "SucceededSyncAccounts" ||
                            message._tag === "SucceededSchedulePost" ||
                            message._tag === "SucceededCancelPost" ||
                            message._tag === "SucceededDeletePost" ||
                            message._tag === "SucceededUpdatePost" ||
                            message._tag === "SucceededSaveSocialTemplate" ||
                            message._tag === "SucceededRefreshAnalytics" ||
                            message._tag === "SucceededCheckPostStatus" ||
                            message._tag === "SucceededPublishDraft"
                                ? refresh + 1
                                : refresh,
                    }),
                    [
                        ...map_social_commands([
                            ...commands,
                            ...route_commands,
                        ]),
                        ...(is_new_social_route &&
                        message._tag === "SucceededSchedulePost"
                            ? [
                                  navigateInternalHref(
                                      Content.content_item_href(
                                          "social",
                                          message.post_id
                                      )
                                  ),
                              ]
                            : []),
                    ],
                ]
            },
            GotDomainsMessage: ({ message }) => {
                const [domain_management, commands] = DesktopDomains.update(
                    model.domain_management,
                    message,
                    model.contacts.session?.domains ?? [],
                    model.contacts.domain_id === ""
                        ? Option.none()
                        : Option.some(model.contacts.domain_id)
                )
                const domain_changed =
                    message._tag === "DomainChanged" &&
                    message.epoch === model.domain_management.epoch
                const navigate_domain =
                    domain_changed &&
                    (message.operation === "create" ||
                        (message.operation === "update" &&
                            message.domain_id === model.contacts.domain_id))
                return [
                    modifyFields(model, {
                        domain_management: () => domain_management,
                    }),
                    [
                        ...map_domain_commands(commands),
                        ...(navigate_domain
                            ? [
                                  navigateInternalHref(
                                      domain_href_for_host(
                                          model.host_context.hostname,
                                          message.slug
                                      )
                                  ),
                              ]
                            : domain_changed
                              ? [
                                    RefreshDomainSession({
                                        epoch: model.contacts.epoch,
                                    }),
                                ]
                              : []),
                    ],
                ]
            },
            GotDomainPublishingMessage: ({ message }) => {
                const [domain_publishing, commands] = DomainPublishing.update(
                    model.domain_publishing,
                    message,
                    model.active_domain_id,
                    DesktopDomains.project(model.domain_management).subdomains
                )

                return [
                    modifyFields(model, {
                        domain_publishing: () => domain_publishing,
                    }),
                    map_domain_publishing_commands(commands),
                ]
            },
            GotDomainSwitcherMessage: ({ message }) => {
                const {
                    model: domain_switcher,
                    commands = [],
                    outMessage: maybe_selection_value,
                } = updateDomainSwitcher(model.domain_switcher, message)
                const maybe_selection = Option.fromUndefinedOr(
                    maybe_selection_value
                )

                const mapped_commands = Command.mapMessages(
                    commands,
                    (next_message) =>
                        GotDomainSwitcherMessage({ message: next_message })
                )
                const account_selection = model.contacts.session?.domains.find(
                    (domain) =>
                        model.host_context.kind === "central" &&
                        Option.exists(
                            maybe_selection,
                            ({ value }) => value === domain.id
                        )
                )
                if (account_selection !== undefined)
                    return [
                        modifyFields(model, {
                            domain_switcher: () => domain_switcher,
                        }),
                        [
                            ...mapped_commands,
                            navigateSelectedDomain(account_selection.slug),
                        ],
                    ]
                const maybe_domain_id = Option.flatMap(
                    maybe_selection,
                    ({ value }) => S.decodeUnknownOption(DomainId)(value)
                )

                return Option.match(maybe_domain_id, {
                    onNone: () => [
                        modifyFields(model, {
                            domain_switcher: () => domain_switcher,
                        }),
                        mapped_commands,
                    ],
                    onSome: (domain_id) => [
                        modifyFields(model, {
                            domain_switcher: () => domain_switcher,
                            sysadmin: (sysadmin) =>
                                Option.map(
                                    sysadmin,
                                    DesktopSysadmin.clear_data
                                ),
                            active_domain_id: () => Option.some(domain_id),
                            domain_management: (domain_management) =>
                                DesktopDomains.clear_subdomains(
                                    domain_management
                                ),
                            domain_publishing: (publishing) =>
                                DomainPublishing.clear(publishing),
                            design_logo: (design_logo) =>
                                DesktopLogo.clear(design_logo),
                            issues: (issues) => DesktopIssues.clear(issues),
                            events: (events) => DesktopEvents.clear(events),
                            media: (media) => DesktopMedia.clear(media),
                            tags: (tags) => Tags.clear(tags),
                            projects: (projects) =>
                                DesktopProjects.clear(projects),
                            shop: (shop) => DesktopShop.clear(shop),
                            mail: (mail) =>
                                DesktopMail.with_domain(
                                    mail,
                                    Option.some(domain_id)
                                ),
                            data: (data) =>
                                DesktopData.with_domain(
                                    data,
                                    Option.some(domain_id)
                                ),
                            blog: (blog) => DesktopBlog.clear(blog),
                            documents: (documents) =>
                                DesktopDocuments.clear(documents),
                            bookmarks: (bookmarks) =>
                                DesktopBookmarks.clear(bookmarks),
                            pages: (pages) => DesktopPages.clear(pages),
                            is_sidebar_mobile_open: () => false,
                        }),
                        [
                            ...mapped_commands,
                            ...Option.match(
                                Array.findFirst(
                                    model.domains,
                                    (domain) => domain._id === domain_id
                                ),
                                {
                                    onNone: () => [],
                                    onSome: (domain) => [
                                        navigateInternalHref(
                                            domain_href_for_host(
                                                model.host_context.hostname,
                                                domain.slug
                                            )
                                        ),
                                    ],
                                }
                            ),
                        ],
                    ],
                })
            },
            ReceivedDomains: ({ domains }) => {
                if (domains.length === 0) {
                    return [
                        modifyFields(model, {
                            domains_status: () => "success",
                            domains: () => [],
                            sysadmin: (sysadmin) =>
                                Option.map(
                                    sysadmin,
                                    DesktopSysadmin.clear_data
                                ),
                            active_domain_id: () => Option.none(),
                            domain_management: (domain_management) =>
                                DesktopDomains.clear_subdomains(
                                    domain_management
                                ),
                            domain_publishing: (publishing) =>
                                DomainPublishing.clear(publishing),
                            design_logo: (design_logo) =>
                                DesktopLogo.clear(design_logo),
                            issues: (issues) => DesktopIssues.clear(issues),
                            events: (events) => DesktopEvents.clear(events),
                            media: (media) => DesktopMedia.clear(media),
                            tags: (tags) => Tags.clear(tags),
                            projects: (projects) =>
                                DesktopProjects.clear(projects),
                            shop: (shop) => DesktopShop.clear(shop),
                            mail: (mail) =>
                                DesktopMail.with_domain(mail, Option.none()),
                            data: (data) =>
                                DesktopData.with_domain(data, Option.none()),
                            blog: (blog) => DesktopBlog.clear(blog),
                            documents: (documents) =>
                                DesktopDocuments.clear(documents),
                            bookmarks: (bookmarks) =>
                                DesktopBookmarks.clear(bookmarks),
                            pages: (pages) => DesktopPages.clear(pages),
                        }),
                        [],
                    ]
                }

                const requested_domain_id = Option.flatMap(
                    model.host_context.requested_domain_slug,
                    (slug) =>
                        Option.map(
                            Array.findFirst(
                                domains,
                                (domain) => domain.slug === slug
                            ),
                            (domain) => domain._id
                        )
                )
                const active_domain_id = Option.match(
                    Option.filter(
                        model.host_context.requested_domain_slug,
                        () => model.host_context.kind === "central"
                    ),
                    { onSome: () => requested_domain_id, onNone: Option.none }
                )
                const domain_changed = Option.match(active_domain_id, {
                    onNone: () => Option.isSome(model.active_domain_id),
                    onSome: (domain_id) =>
                        !Option.contains(model.active_domain_id, domain_id),
                })
                const selected_slug = Option.flatMap(active_domain_id, (id) =>
                    Option.map(
                        Array.findFirst(domains, (domain) => domain._id === id),
                        (domain) => domain.slug
                    )
                )
                const mail_account_ready =
                    model.contacts.session !== null &&
                    model.contacts.domain_id !== "" &&
                    Option.match(selected_slug, {
                        onNone: () => false,
                        onSome: (slug) =>
                            model.contacts.session?.domains.some(
                                (domain) =>
                                    domain.id === model.contacts.domain_id &&
                                    domain.slug === slug
                            ) ?? false,
                    })

                return [
                    modifyFields(model, {
                        domains_status: () => "success",
                        domains: () => domains,
                        sysadmin: (sysadmin) =>
                            domain_changed
                                ? Option.map(
                                      sysadmin,
                                      DesktopSysadmin.clear_data
                                  )
                                : sysadmin,
                        active_domain_id: () => active_domain_id,
                        landing_templates: (templates) =>
                            domain_changed ? [] : templates,
                        landing_templates_error: (error) =>
                            domain_changed ? "" : error,
                        form_templates: (templates) =>
                            domain_changed ? [] : templates,
                        newsletter_templates: (templates) =>
                            domain_changed ? [] : templates,
                        social_templates: (templates) =>
                            domain_changed ? [] : templates,
                        domain_management: (domain_management) =>
                            domain_changed
                                ? DesktopDomains.clear_subdomains(
                                      domain_management
                                  )
                                : domain_management,
                        domain_publishing: (domain_publishing) =>
                            domain_changed
                                ? DomainPublishing.clear(domain_publishing)
                                : domain_publishing,
                        design_logo: (design_logo) =>
                            domain_changed && !mail_account_ready
                                ? DesktopLogo.clear(design_logo)
                                : design_logo,
                        issues: (issues) =>
                            domain_changed
                                ? DesktopIssues.clear(issues)
                                : issues,
                        events: (events) =>
                            domain_changed
                                ? DesktopEvents.clear(events)
                                : events,
                        media: (media) =>
                            domain_changed ? DesktopMedia.clear(media) : media,
                        tags: (tags) =>
                            domain_changed ? Tags.clear(tags) : tags,
                        projects: (projects) =>
                            domain_changed
                                ? DesktopProjects.clear(projects)
                                : projects,
                        shop: (shop) =>
                            domain_changed ? DesktopShop.clear(shop) : shop,
                        mail: (mail) =>
                            domain_changed
                                ? DesktopMail.with_domain(
                                      mail,
                                      active_domain_id
                                  )
                                : mail,
                        data: (data) =>
                            domain_changed
                                ? DesktopData.with_domain(
                                      data,
                                      active_domain_id
                                  )
                                : data,
                        blog: (blog) =>
                            domain_changed ? DesktopBlog.clear(blog) : blog,
                        documents: (documents) =>
                            domain_changed
                                ? DesktopDocuments.clear(documents)
                                : documents,
                        bookmarks: (bookmarks) =>
                            domain_changed
                                ? DesktopBookmarks.clear(bookmarks)
                                : bookmarks,
                        pages: (pages) =>
                            domain_changed ? DesktopPages.clear(pages) : pages,
                        forms: (forms) =>
                            domain_changed
                                ? Option.map(forms, Forms.clear)
                                : forms,
                        maybe_error: () => Option.none(),
                    }),
                    domain_changed && mail_account_ready
                        ? map_mail_commands(
                              DesktopMail.load_transactional_commands(
                                  model.contacts.domain_id
                              )
                          )
                        : [],
                ]
            },
            ReceivedDomainLogos: ({ account_id, catalog }) =>
                model.contacts.session?.account_id === account_id &&
                model.contacts.domain_id === catalog.domain_id
                    ? [
                          modifyFields(model, {
                              domain_logos: () => catalog.drafts,
                          }),
                          [],
                      ]
                    : [model, []],
            FailedDomainLogos: () => [model, []],
            ReceivedLandingTemplates: ({ account_id, catalog }) =>
                model.contacts.session?.account_id === account_id &&
                model.contacts.domain_id === catalog.id
                    ? [
                          modifyFields(model, {
                              landing_templates: () => catalog.templates,
                              landing_templates_error: () => "",
                          }),
                          [],
                      ]
                    : [model, []],
            FailedLandingTemplates: ({ account_id, domain_id, details }) =>
                model.contacts.session?.account_id === account_id &&
                model.contacts.domain_id === domain_id
                    ? [
                          modifyFields(model, {
                              landing_templates_error: () => details,
                          }),
                          [],
                      ]
                    : [model, []],
            ReceivedFormTemplates: ({ templates }) => [
                modifyFields(model, { form_templates: () => templates }),
                [],
            ],
            ReceivedFormsCatalog: ({ domain_id, catalog }) => {
                if (!Option.contains(forms_domain_id(model), domain_id))
                    return [model, []]
                return Option.match(model.forms, {
                    onNone: () => [
                        modifyFields(model, {
                            form_templates: () => catalog.templates,
                        }),
                        [],
                    ],
                    onSome: (forms_model) => {
                        const [listed] = Forms.update(
                            forms_model,
                            Forms.loaded_forms(catalog.forms),
                            forms_domain_id(model)
                        )
                        const [forms, commands] =
                            model.route._tag === "Content"
                                ? Forms.changed_content_url(
                                      listed,
                                      model.route.content_path,
                                      model.route.content_search,
                                      forms_domain_id(model)
                                  )
                                : [listed, []]
                        return [
                            modifyFields(model, {
                                form_templates: () => catalog.templates,
                                forms: () => Option.some(forms),
                            }),
                            map_forms_commands(commands),
                        ]
                    },
                })
            },
            ReceivedFormsDetail: ({ domain_id, slug, detail }) => {
                if (!Option.contains(forms_domain_id(model), domain_id))
                    return [model, []]
                return Option.match(model.forms, {
                    onNone: () => [model, []],
                    onSome: (forms_model) => {
                        if (
                            !Option.contains(
                                Forms.activeSlug(forms_model),
                                slug
                            )
                        )
                            return [model, []]
                        const snapshot =
                            detail.form === null
                                ? null
                                : { form: detail.form, fields: detail.fields }
                        const [forms] = Forms.update(
                            forms_model,
                            Forms.loaded_detail(snapshot),
                            forms_domain_id(model)
                        )
                        return [
                            modifyFields(model, {
                                forms: () => Option.some(forms),
                            }),
                            [],
                        ]
                    },
                })
            },
            ReceivedNewsletterTemplates: ({ templates }) => [
                modifyFields(model, { newsletter_templates: () => templates }),
                [],
            ],
            FailedNewsletterTemplates: ({ details }) => [
                modifyFields(model, {
                    maybe_error: () => Option.some(details),
                }),
                [],
            ],
            ReceivedSocialTemplates: ({ domain_id, templates }) =>
                Option.contains(social_domain_id(model), domain_id)
                    ? [
                          modifyFields(model, {
                              social_templates: () => templates,
                          }),
                          [],
                      ]
                    : [model, []],
            ReceivedSocialData: ({
                domain_id,
                accounts,
                posts,
                templates,
                analytics,
                media,
            }) => {
                if (!Option.contains(social_domain_id(model), domain_id))
                    return [model, []]
                const messages: ReadonlyArray<DesktopSocial.Message> = [
                    DesktopSocial.loaded(accounts),
                    DesktopSocial.loaded_posts(posts),
                    DesktopSocial.loaded_media(media),
                    DesktopSocial.loaded_analytics(analytics),
                ]
                let social = model.social
                const commands: Array<
                    Command.Command<DesktopSocial.Message, never, ContactsApi>
                > = []
                for (const message of messages) {
                    const [next, produced] = DesktopSocial.update(
                        social,
                        message,
                        social_domain_id(model)
                    )
                    social = next
                    commands.push(...produced)
                }
                if (model.route._tag === "Content") {
                    const [next, produced] = DesktopSocial.changed_content_url(
                        social,
                        model.route.content_path,
                        model.route.content_search,
                        social_domain_id(model)
                    )
                    social = next
                    commands.push(...produced)
                }
                return [
                    modifyFields(model, {
                        social: () => social,
                        social_templates: () => templates,
                    }),
                    map_social_commands(commands),
                ]
            },
            FailedSocialData: ({ domain_id, details }) => {
                if (!Option.contains(social_domain_id(model), domain_id))
                    return [model, []]
                let social = model.social
                for (const message of [
                    DesktopSocial.failed_loading(details),
                    DesktopSocial.failed_loading_posts(details),
                    DesktopSocial.failed_loading_media(details),
                    DesktopSocial.failed_loading_analytics(details),
                ]) {
                    const [next] = DesktopSocial.update(
                        social,
                        message,
                        social_domain_id(model)
                    )
                    social = next
                }
                return [modifyFields(model, { social: () => social }), []]
            },
            RequestedUseDocumentTemplate: ({ template_id }) => {
                const [documents, commands] = DesktopDocuments.update(
                    model.documents,
                    DesktopDocuments.UseTemplate({ template_id })
                )
                return [
                    { ...model, documents },
                    map_document_commands(commands),
                ]
            },
            RequestedUseBlogTemplate: ({ template_id }) => {
                const [blog, commands] = DesktopBlog.update(
                    model.blog,
                    DesktopBlog.UseTemplate({ template_id })
                )
                return [{ ...model, blog }, map_blog_commands(commands)]
            },
            RequestedUseSocialTemplate: ({ template_id }) =>
                Option.match(
                    Array.findFirst(
                        model.social_templates,
                        (template) => template.id === template_id
                    ),
                    {
                        onNone: () => [model, []],
                        onSome: (template) => {
                            const [social, commands] = DesktopSocial.update(
                                model.social,
                                DesktopSocial.selected_template(
                                    template.id,
                                    template.content
                                ),
                                social_domain_id(model)
                            )
                            return [
                                modifyFields(model, { social: () => social }),
                                [
                                    ...map_social_commands(commands),
                                    navigateInternalHref(
                                        Content.content_social_new_href()
                                    ),
                                ],
                            ]
                        },
                    }
                ),
            RequestedUseNewsletterTemplate: ({ template_id }) =>
                Option.match(
                    Option.all({
                        template: Array.findFirst(
                            model.newsletter_templates,
                            (template) => template.id === template_id
                        ),
                    }),
                    {
                        onNone: () => [model, []],
                        onSome: ({ template }) => [
                            model,
                            [
                                // The template now lives in PostgreSQL, so the
                                // legacy draft mutation is given its content
                                // rather than an id it cannot resolve.
                                CreateNewsletterFromTemplate({
                                    domain_id: model.contacts.domain_id,
                                    draft: {
                                        id: crypto.randomUUID(),
                                        name: template.name,
                                        subject: template.subject,
                                        headline: template.headline,
                                        body_text: template.body_text,
                                        cta_url: template.cta_url,
                                        cta_label: template.cta_label,
                                        list_key: "newsletter",
                                        template_source: {
                                            template_id: `organization.email.${template.id}`,
                                            template_version: template.revision,
                                            provenance: "organization",
                                        },
                                        expected_updated_at: 0,
                                    },
                                }),
                            ],
                        ],
                    }
                ),
            CreatedNewsletterFromTemplate: ({ draft_id }) => [
                model,
                [
                    navigateInternalHref(
                        Content.content_email_draft_href(draft_id, true)
                    ),
                ],
            ],
            RequestedUseFormTemplate: ({ template_id, name }) =>
                Option.match(model.forms, {
                    onNone: () => [model, []],
                    onSome: (forms) => {
                        const [next_forms, commands] = Forms.update(
                            forms,
                            Forms.SelectedCreationTemplate({
                                template_id,
                                name,
                            }),
                            forms_domain_id(model)
                        )
                        return [
                            modifyFields(model, {
                                forms: () => Option.some(next_forms),
                            }),
                            [
                                ...Command.mapMessages(commands, (message) =>
                                    GotFormsMessage({ message })
                                ),
                                navigateInternalHref("/content/form/new"),
                            ],
                        ]
                    },
                }),
            SavedLandingTemplate: ({ account_id, catalog }) => {
                if (
                    model.contacts.session?.account_id !== account_id ||
                    model.contacts.domain_id !== catalog.id
                )
                    return [model, []]
                const [labs_marketing_landing, commands] =
                    MarketingLanding.update(
                        model.labs_marketing_landing,
                        MarketingLanding.SavedTemplate()
                    )
                return [
                    modifyFields(model, {
                        labs_marketing_landing: () => labs_marketing_landing,
                        landing_templates: () => catalog.templates,
                    }),
                    Command.mapMessages(commands, (message) =>
                        GotLabsMarketingLandingMessage({ message })
                    ),
                ]
            },
            FailedLandingTemplateSave: ({ details }) => {
                const [labs_marketing_landing, commands] =
                    MarketingLanding.update(
                        model.labs_marketing_landing,
                        MarketingLanding.FailedTemplateSave({ error: details })
                    )
                return [
                    modifyFields(model, {
                        labs_marketing_landing: () => labs_marketing_landing,
                    }),
                    Command.mapMessages(commands, (message) =>
                        GotLabsMarketingLandingMessage({ message })
                    ),
                ]
            },
            RequestedUseLandingTemplate: ({ template_id }) => {
                const template = model.landing_templates.find(
                    (item) => item.id === template_id
                )
                if (template === undefined) return [model, []]
                if (
                    model.pages.domain_id === "" ||
                    model.pages.pending ||
                    model.pages.ui.is_loading
                )
                    return [
                        modifyFields(model, {
                            landing_templates_error: () =>
                                "Pages are still loading. Try again in a moment.",
                        }),
                        [],
                    ]
                if (
                    DesktopPages.project(model.pages).pages.some(
                        (page) => page.content_type === "landing_json"
                    )
                )
                    return [
                        modifyFields(model, {
                            landing_templates_error: () =>
                                "This publication already has a landing page. Edit or remove it before using a template.",
                        }),
                        [],
                    ]
                const [pages, commands] = DesktopPages.update(
                    model.pages,
                    DesktopPages.CreateFromTemplate({
                        title: template.name,
                        content: JSON.stringify(template.document),
                        content_type: "landing_json",
                        slug: null,
                        navigation_label: template.name,
                        show_in_navigation: false,
                        is_homepage: false,
                        publication_state: "draft",
                        seo_title: null,
                        seo_description: null,
                        noindex: true,
                        template_source: {
                            template_id: `organization.web.${template.id}`,
                            template_version: template.revision,
                            provenance: "organization",
                        },
                    })
                )
                return [
                    { ...model, pages, landing_templates_error: "" },
                    map_page_commands(commands),
                ]
            },
            RequestedRemoveLandingTemplate: ({ template_id }) =>
                model.contacts.session !== null &&
                model.contacts.domain_id !== ""
                    ? [
                          model,
                          [
                              RemoveLandingTemplate({
                                  domain_id: model.contacts.domain_id,
                                  account_id: model.contacts.session.account_id,
                                  template_id,
                              }),
                          ],
                      ]
                    : [model, []],
            CreatedLandingFromTemplate: ({ page }) => {
                return [
                    model,
                    [
                        navigateInternalHref(
                            MarketingLanding.blankLandingEditorHref(page._id)
                        ),
                    ],
                ]
            },
            RemovedLandingTemplate: ({ account_id, catalog }) =>
                model.contacts.session?.account_id === account_id &&
                model.contacts.domain_id === catalog.id
                    ? [
                          modifyFields(model, {
                              landing_templates: () => catalog.templates,
                          }),
                          [],
                      ]
                    : [model, []],
            FailedDomains: ({ details }) => [
                modifyFields(model, {
                    domains_status: () => "error",
                    maybe_error: () => Option.some(details),
                }),
                [],
            ],
            GotProjectsMessage: ({ message }) => {
                const [projects, commands] = DesktopProjects.update(
                    model.projects,
                    message,
                    model.active_domain_id
                )

                return [
                    modifyFields(model, { projects: () => projects }),
                    map_project_commands(commands),
                ]
            },
            GotShopMessage: ({ message }) => {
                const [shop, commands] = DesktopShop.update(
                    model.shop,
                    message,
                    model.active_domain_id
                )

                return [
                    modifyFields(model, { shop: () => shop }),
                    map_shop_commands(commands),
                ]
            },
            GotMembersMessage: ({ message }) => {
                if (model.contacts.connection_id !== Contacts.boot_id)
                    return [model, []]
                const next = Members.update(model.members, message)
                return [
                    { ...model, members: next.model },
                    Command.mapMessages(next.commands ?? [], (message) =>
                        GotMembersMessage({ message })
                    ),
                ]
            },
            GotContactsMessage: ({ message }) => {
                const next = Contacts.update(model.contacts, message)
                const session = next.model.session
                const session_model = { ...model, contacts: next.model }
                const members = Members.synchronize(
                    model.members,
                    session === null || next.model.session_only
                        ? null
                        : {
                              account_id: session.account_id,
                              domain_id: next.model.domain_id,
                              can_write:
                                  Contacts.domain(next.model)?.can_write ===
                                  true,
                          }
                )
                const [bookmarks, bookmark_commands] =
                    DesktopBookmarks.synchronize(
                        model.bookmarks,
                        session === null ||
                            !module_enabled(session_model, "Documents")
                            ? null
                            : {
                                  account_id: session.account_id,
                                  domain_id: next.model.domain_id,
                                  can_write:
                                      Contacts.domain(next.model)?.can_write ===
                                      true,
                              }
                    )
                const [documents, document_commands] =
                    DesktopDocuments.synchronize(
                        model.documents,
                        session === null ||
                            !module_enabled(session_model, "Documents")
                            ? null
                            : {
                                  account_id: session.account_id,
                                  domain_id: next.model.domain_id,
                                  can_write:
                                      Contacts.domain(next.model)?.can_write ===
                                      true,
                              }
                    )
                const [projects, project_commands] =
                    DesktopProjects.synchronize(
                        model.projects,
                        session === null ||
                            !module_enabled(session_model, "Projects")
                            ? null
                            : {
                                  account_id: session.account_id,
                                  domain_id: next.model.domain_id,
                                  can_write:
                                      Contacts.domain(next.model)?.can_write ===
                                      true,
                              }
                    )
                const [issues, issue_commands] = DesktopIssues.synchronize(
                    model.issues,
                    session === null || !module_enabled(session_model, "Issues")
                        ? null
                        : {
                              account_id: session.account_id,
                              domain_id: next.model.domain_id,
                              can_write:
                                  Contacts.domain(next.model)?.can_write ===
                                  true,
                          }
                )
                const [events, event_commands] = DesktopEvents.synchronize(
                    model.events,
                    session === null || !module_enabled(session_model, "Events")
                        ? null
                        : {
                              account_id: session.account_id,
                              domain_id: next.model.domain_id,
                              can_write:
                                  Contacts.domain(next.model)?.can_write ===
                                  true,
                          }
                )
                const [shop, shop_commands] = DesktopShop.synchronize(
                    model.shop,
                    session === null || !module_enabled(session_model, "Shop")
                        ? null
                        : {
                              account_id: session.account_id,
                              domain_id: next.model.domain_id,
                          }
                )
                const [domain_management, subdomain_commands] =
                    DesktopDomains.synchronize(
                        model.domain_management,
                        session === null
                            ? null
                            : {
                                  account_id: session.account_id,
                                  domain_id: next.model.domain_id,
                                  can_write:
                                      Contacts.domain(next.model)?.can_write ===
                                      true,
                              }
                    )
                const [domain_publishing, publishing_commands] =
                    DomainPublishing.synchronize(
                        model.domain_publishing,
                        session === null
                            ? null
                            : {
                                  account_id: session.account_id,
                                  domain_id: next.model.domain_id,
                                  can_write:
                                      Contacts.domain(next.model)?.can_write ===
                                      true,
                              }
                    )
                const [design, design_commands] = DesktopDesign.synchronize(
                    model.design,
                    session === null
                        ? null
                        : {
                              account_id: session.account_id,
                              domain_id: next.model.domain_id,
                              can_write:
                                  Contacts.domain(next.model)?.can_write ===
                                  true,
                          }
                )
                const [pages, page_commands] = DesktopPages.synchronize(
                    model.pages,
                    session === null
                        ? null
                        : {
                              account_id: session.account_id,
                              domain_id: next.model.domain_id,
                              can_write:
                                  Contacts.domain(next.model)?.can_write ===
                                  true,
                          }
                )
                const [blog, blog_commands] = DesktopBlog.synchronize(
                    model.blog,
                    session === null || !module_enabled(session_model, "Blog")
                        ? null
                        : {
                              account_id: session.account_id,
                              domain_id: next.model.domain_id,
                              can_write:
                                  Contacts.domain(next.model)?.can_write ===
                                  true,
                          }
                )
                const [tags, tag_commands] = Tags.synchronize(
                    model.tags,
                    session === null || !module_enabled(session_model, "Tags")
                        ? null
                        : {
                              account_id: session.account_id,
                              domain_id: next.model.domain_id,
                              can_write:
                                  Contacts.domain(next.model)?.can_write ===
                                  true,
                          }
                )
                const [media, media_commands] = DesktopMedia.synchronize(
                    model.media,
                    session === null || !module_enabled(session_model, "Media")
                        ? null
                        : {
                              account_id: session.account_id,
                              domain_id: next.model.domain_id,
                              can_write:
                                  Contacts.domain(next.model)?.can_write ===
                                  true,
                          }
                )
                const [data, data_commands] = DesktopData.synchronize(
                    model.data,
                    session === null || !module_enabled(session_model, "Data")
                        ? null
                        : {
                              domain_id: next.model.domain_id,
                              can_write:
                                  Contacts.domain(next.model)?.can_write ===
                                  true,
                          }
                )
                const domain_resolved =
                    session !== null &&
                    next.model.domain_id !== "" &&
                    model.contacts.domain_id !== next.model.domain_id
                const account_scope_changed =
                    model.contacts.domain_id !== next.model.domain_id ||
                    model.contacts.session?.account_id !== session?.account_id
                const account_preference_commands =
                    account_scope_changed &&
                    session !== null &&
                    next.model.domain_id !== ""
                        ? [
                              LoadAccountPreferences({
                                  domain_id: next.model.domain_id,
                                  account_id: session.account_id,
                              }),
                              LoadLandingTemplates({
                                  domain_id: next.model.domain_id,
                                  account_id: session.account_id,
                              }),
                              LoadLogoCatalog({
                                  domain_id: next.model.domain_id,
                                  account_id: session.account_id,
                              }),
                              LoadLogoDetail({
                                  domain_id: next.model.domain_id,
                                  account_id: session.account_id,
                              }),
                              LoadAccountNavigation({
                                  domain_id: next.model.domain_id,
                                  account_id: session.account_id,
                                  legacy_domain_id:
                                      account_domain(session_model)?.id ??
                                      Option.getOrElse(
                                          model.active_domain_id,
                                          () => next.model.domain_id
                                      ),
                              }),
                          ]
                        : []
                const publication_theme_commands =
                    account_scope_changed &&
                    session !== null &&
                    next.model.domain_id !== "" &&
                    module_enabled(session_model, "Mail")
                        ? [
                              LoadAccountPublicationTheme({
                                  domain_id: next.model.domain_id,
                                  account_id: session.account_id,
                              }),
                          ]
                        : []
                const [sysadmin, sysadmin_commands] = Option.match(
                    model.sysadmin,
                    {
                        onNone: () => [model.sysadmin, []] as const,
                        onSome: (current) => {
                            if (!account_scope_changed)
                                return [model.sysadmin, []] as const
                            const [next_sysadmin, commands] =
                                DesktopSysadmin.account_domain_changed(
                                    current,
                                    session === null
                                        ? undefined
                                        : next.model.domain_id,
                                    session?.account_id
                                )
                            return [
                                Option.some(next_sysadmin),
                                commands,
                            ] as const
                        },
                    }
                )
                const send_domain_changed =
                    model.contacts.domain_id !== next.model.domain_id &&
                    model.route._tag === "Mail" &&
                    model.route.mail_path.replace(/\/$/, "") === "/mail/send"
                const [mail, send_recipient_commands] = send_domain_changed
                    ? DesktopMail.request_send_recipients(
                          model.mail,
                          next.model.domain_id
                      )
                    : ([model.mail, []] as const)
                const newsletter_template_commands = domain_resolved
                    ? [
                          LoadNewsletterTemplates({
                              domain_id: next.model.domain_id,
                          }),
                      ]
                    : []
                const transactional_commands =
                    domain_resolved && module_enabled(session_model, "Mail")
                        ? map_mail_commands(
                              DesktopMail.load_transactional_commands(
                                  next.model.domain_id
                              )
                          )
                        : []
                const chat = DesktopChat.synchronize(
                    model.chat,
                    session === null
                        ? null
                        : {
                              account_id: session.account_id,
                              domain_id: next.model.domain_id,
                              can_write:
                                  Contacts.domain(next.model)?.can_write ===
                                  true,
                          }
                )
                return [
                    {
                        ...model,
                        contacts: next.model,
                        sysadmin,
                        mail,
                        design_logo: account_scope_changed
                            ? DesktopLogo.clear(model.design_logo)
                            : model.design_logo,
                        domain_logos: account_scope_changed
                            ? []
                            : model.domain_logos,
                        events,
                        shop,
                        issues,
                        projects,
                        domain_management,
                        domain_publishing,
                        design,
                        pages,
                        bookmarks,
                        documents,
                        blog,
                        tags,
                        media,
                        data,
                        chat,
                        members: members.model,
                    },
                    [
                        ...map_event_commands(event_commands),
                        ...map_shop_commands(shop_commands),
                        ...map_issue_commands(issue_commands),
                        ...map_project_commands(project_commands),
                        ...map_domain_commands(subdomain_commands),
                        ...map_domain_publishing_commands(publishing_commands),
                        ...map_page_commands(page_commands),
                        ...map_design_commands(design_commands),
                        ...map_bookmark_commands(bookmark_commands),
                        ...map_document_commands(document_commands),
                        ...map_blog_commands(blog_commands),
                        ...Command.mapMessages(tag_commands, (message) =>
                            GotTagsMessage({ message })
                        ),
                        ...newsletter_template_commands,
                        ...account_preference_commands,
                        ...publication_theme_commands,
                        ...transactional_commands,
                        ...map_mail_commands(send_recipient_commands),
                        ...map_data_commands(data_commands),
                        ...map_sysadmin_commands(sysadmin_commands),
                        ...map_media_commands(media_commands),
                        ...Command.mapMessages(next.commands ?? [], (message) =>
                            GotContactsMessage({ message })
                        ),
                        ...Command.mapMessages(
                            members.commands ?? [],
                            (message) => GotMembersMessage({ message })
                        ),
                    ],
                ]
            },
            GotMailMessage: ({ message }) => {
                if (
                    message._tag === "GotContactsMessage" ||
                    message._tag === "GotMembersMessage" ||
                    message._tag === "GotMembersManageMessage"
                )
                    return [model, []]
                const [updated_mail, commands] = DesktopMail.update(
                    model.mail,
                    message,
                    model.contacts.domain_id
                )
                const is_email_content_route =
                    model.route._tag === "Content" &&
                    Content.is_content_email_path(model.route.content_path)
                const loaded_drafts =
                    message._tag === "GotNewsletterMessage" &&
                    message.message._tag === "NewsletterDraftsLoaded"
                const saved_draft_id =
                    message._tag === "GotNewsletterMessage" &&
                    message.message._tag === "NewsletterDraftSaved"
                        ? message.message.draft.id
                        : null
                const is_new_email_route =
                    model.route._tag === "Content" &&
                    Content.is_content_creation_path(
                        model.route.content_path,
                        "email"
                    )
                const mail =
                    is_email_content_route && loaded_drafts
                        ? DesktopMail.sync_content_location(
                              updated_mail,
                              model.route._tag === "Content"
                                  ? model.route.content_path
                                  : "",
                              model.route._tag === "Content"
                                  ? model.route.content_search
                                  : "",
                              model.mail.newsletter.base_draft !== null
                          )
                        : updated_mail

                return [
                    modifyFields(model, { mail: () => mail }),
                    [
                        ...map_mail_commands(commands),
                        ...(is_new_email_route && saved_draft_id !== null
                            ? [
                                  navigateInternalHref(
                                      Content.content_email_draft_href(
                                          saved_draft_id
                                      )
                                  ),
                              ]
                            : []),
                    ],
                ]
            },
            GotChatMessage: ({ message }) => {
                const [chat, commands] = DesktopChat.update(model.chat, message)

                return [
                    modifyFields(model, { chat: () => chat }),
                    Command.mapMessages(commands, (message) =>
                        GotChatMessage({ message })
                    ),
                ]
            },
            GotFormsMessage: ({ message }) =>
                Option.match(model.forms, {
                    onNone: () => [model, []],
                    onSome: (forms_model) => {
                        const is_new_form_route =
                            model.route._tag === "Content" &&
                            Content.is_content_creation_path(
                                model.route.content_path,
                                "form"
                            )
                        const [updated_forms, commands] = Forms.update(
                            forms_model,
                            message,
                            forms_domain_id(model)
                        )
                        const cancelled_new_form =
                            is_new_form_route &&
                            message._tag === "ToggledCreating" &&
                            !updated_forms.is_creating
                        const [forms, route_commands] =
                            model.route._tag === "Content" &&
                            !(
                                (is_new_form_route &&
                                    message._tag === "FormCreated") ||
                                cancelled_new_form
                            )
                                ? Forms.changed_content_url(
                                      updated_forms,
                                      model.route.content_path,
                                      model.route.content_search,
                                      forms_domain_id(model)
                                  )
                                : [updated_forms, []]
                        const routed_commands =
                            is_new_form_route && message._tag === "FormCreated"
                                ? commands.filter(
                                      (command) =>
                                          command.name !== "NavigateToForm"
                                  )
                                : commands
                        return [
                            modifyFields(model, {
                                forms: () => Option.some(forms),
                                forms_refresh: (current) =>
                                    message._tag === "FormTemplateSaved"
                                        ? current + 1
                                        : current,
                            }),
                            [
                                ...map_forms_commands([
                                    ...routed_commands,
                                    ...route_commands,
                                ]),
                                ...(is_new_form_route &&
                                message._tag === "FormCreated"
                                    ? [
                                          navigateInternalHref(
                                              Content.content_item_href(
                                                  "form",
                                                  message.form.id
                                              )
                                          ),
                                      ]
                                    : []),
                                ...(cancelled_new_form
                                    ? [
                                          navigateInternalHref(
                                              Content.content_href()
                                          ),
                                      ]
                                    : []),
                            ],
                        ]
                    },
                }),
            GotDataMessage: ({ message }) => {
                const [data, commands] = DesktopData.update(
                    model.data,
                    message,
                    model.active_domain_id
                )

                return [
                    modifyFields(model, { data: () => data }),
                    map_data_commands(commands),
                ]
            },
            GotSysadminMessage: ({ message }) =>
                Option.match(model.sysadmin, {
                    onNone: () => [model, []],
                    onSome: (sysadmin_model) => {
                        const [sysadmin, commands] = DesktopSysadmin.update(
                            sysadmin_model,
                            message,
                            has_verified_session(model) &&
                                model.contacts.session !== null &&
                                model.contacts.domain_id !== ""
                                ? model.contacts.domain_id
                                : undefined,
                            model.contacts.session?.account_id
                        )
                        return [
                            modifyFields(model, {
                                sysadmin: () => Option.some(sysadmin),
                            }),
                            [
                                ...map_sysadmin_commands(commands),
                                ...(message._tag === "RequestedSessions" &&
                                has_verified_session(model) &&
                                model.contacts.session !== null &&
                                model.contacts.domain_id !== ""
                                    ? Command.mapMessages(
                                          [
                                              DesktopSysadmin.load_sessions(
                                                  model.contacts.domain_id,
                                                  sysadmin.sessions_all_tenants,
                                                  message.as_of,
                                                  message.request_id
                                              ),
                                          ],
                                          (message) =>
                                              GotSysadminMessage({ message })
                                      )
                                    : []),
                            ],
                        ]
                    },
                }),
            FailedData: ({ details }) => [
                modifyFields(model, {
                    maybe_error: () => Option.some(details),
                }),
                [],
            ],
        })
    )

const account_domain = (model: Model) => {
    if (
        model.host_context.kind !== "central" ||
        model.contacts.connection_id !== Contacts.boot_id ||
        model.contacts.session === null ||
        model.contacts.domain_id === ""
    )
        return undefined
    const slug = Option.getOrUndefined(model.host_context.requested_domain_slug)
    return model.contacts.session.domains.find(
        (domain) =>
            domain.id === model.contacts.domain_id && domain.slug === slug
    )
}

export const selected_publication_domain = (model: Model) => {
    const domain =
        model.host_context.kind === "central"
            ? account_domain(model)
            : Option.getOrUndefined(
                  Option.flatMap(model.active_domain_id, (domain_id) =>
                      Array.findFirst(
                          model.domains,
                          (candidate) => candidate._id === domain_id
                      )
                  )
              )
    return Option.fromNullishOr(
        domain === undefined
            ? undefined
            : { name: domain.name, slug: domain.slug }
    )
}

const module_enabled = (model: Model, id: typeof ModuleId.Type): boolean =>
    account_domain(model) !== undefined
        ? is_module_enabled(
              Option.isSome(model.navigation_settings.snapshot) &&
                  model.navigation_settings.domain_id ===
                      model.contacts.domain_id
                  ? model.navigation_settings.snapshot.value.enabled_modules
                  : module_ids,
              id
          )
        : has_verified_session(model) &&
          Option.isSome(model.active_domain_id) &&
          model.navigation_settings.domain_id ===
              model.active_domain_id.value &&
          Option.isSome(model.navigation_settings.snapshot) &&
          is_module_enabled(
              model.navigation_settings.snapshot.value.enabled_modules,
              id
          )

const module_domain = (model: Model, id: typeof ModuleId.Type) =>
    module_enabled(model, id) ? model.active_domain_id : Option.none()

const forms_domain_id = (model: Model): Option.Option<string> => {
    const selected_domain = account_domain(model)
    if (selected_domain !== undefined) return Option.some(selected_domain.id)
    const active_domain = Option.flatMap(model.active_domain_id, (domain_id) =>
        Array.findFirst(model.domains, (domain) => domain._id === domain_id)
    )
    if (
        Option.isNone(active_domain) ||
        model.contacts.session === null ||
        model.contacts.domain_id === "" ||
        model.contacts.requested_slug !== active_domain.value.slug
    )
        return Option.none()
    const domain = model.contacts.session.domains.find(
        (item) =>
            item.id === model.contacts.domain_id &&
            item.slug === active_domain.value.slug
    )
    return domain === undefined ? Option.none() : Option.some(domain.id)
}

const social_domain_id = (model: Model): Option.Option<string> => {
    const selected_domain = account_domain(model)
    if (selected_domain !== undefined) return Option.some(selected_domain.id)
    const active_domain = Option.flatMap(model.active_domain_id, (domain_id) =>
        Array.findFirst(model.domains, (domain) => domain._id === domain_id)
    )
    if (
        Option.isNone(active_domain) ||
        model.contacts.requested_slug !== active_domain.value.slug ||
        model.contacts.session === null
    )
        return Option.none()
    const domain = model.contacts.session.domains.find(
        (item) => item.slug === active_domain.value.slug
    )
    return Option.some(domain?.id ?? active_domain.value._id)
}

export const social_has_active_domain = (model: Model): boolean =>
    Option.isSome(social_domain_id(model))

const message_module = (
    message: Message
): Option.Option<typeof ModuleId.Type> => {
    switch (message._tag) {
        case "GotEventsMessage":
            return Option.some("Events")
        case "GotMediaMessage":
            return Option.some("Media")
        case "GotProjectsMessage":
            return Option.some("Projects")
        case "GotIssuesMessage":
            return Option.some("Issues")
        case "GotShopMessage":
            return Option.some("Shop")
        case "GotTagsMessage":
            return Option.some("Tags")
        case "GotMailMessage":
            return Option.some("Mail")
        case "GotDataMessage":
            return Option.some("Data")
        case "GotBlogMessage":
            return Option.some("Blog")
        case "GotDocumentsMessage":
            return Option.some("Documents")
        default:
            return Option.none()
    }
}
export const update = (
    model: Model,
    message: Message
): readonly [Model, Commands] => {
    const target_module = message_module(message)
    if (
        Option.isSome(target_module) &&
        !module_enabled(model, target_module.value)
    )
        return [model, []]
    const [next, commands] = update_inner(model, message)
    if (message._tag === "GotProjectsMessage") return [next, commands]
    const domain_id =
        account_domain(next)?.id ??
        (next.auth.status === "signed_in"
            ? Option.getOrElse(next.active_domain_id, () => "")
            : "")
    const scoped =
        domain_id === next.navigation_settings.domain_id
            ? next
            : {
                  ...next,
                  navigation_settings: NavigationSettings.init(domain_id),
              }
    const was_disabled = (id: typeof ModuleId.Type) =>
        module_enabled(model, id) && !module_enabled(scoped, id)
    const mail_enabled =
        !module_enabled(model, "Mail") &&
        module_enabled(scoped, "Mail") &&
        scoped.contacts.session !== null &&
        scoped.contacts.domain_id !== ""
    const active_domain = Option.flatMap(scoped.active_domain_id, (domain_id) =>
        Array.findFirst(scoped.domains, (domain) => domain._id === domain_id)
    )
    const active_domain_changed =
        Option.getOrUndefined(model.active_domain_id) !==
        Option.getOrUndefined(scoped.active_domain_id)
    return [
        {
            ...scoped,
            members:
                active_domain_changed ||
                (has_verified_session(model) && !has_verified_session(scoped))
                    ? {
                          ...Members.initial,
                          epoch: scoped.members.epoch + 1,
                      }
                    : scoped.members,
            contacts:
                active_domain_changed ||
                (has_verified_session(model) && !has_verified_session(scoped))
                    ? {
                          ...Contacts.initial,
                          epoch: scoped.contacts.epoch + 1,
                      }
                    : scoped.contacts,
            chat: active_domain_changed
                ? DesktopChat.clear(scoped.chat)
                : scoped.chat,
            social: active_domain_changed
                ? DesktopSocial.clear()
                : scoped.social,
            design:
                active_domain_changed ||
                scoped.domains !== model.domains ||
                scoped.domain_management.remote !==
                    model.domain_management.remote ||
                scoped.design !== model.design
                    ? DesktopDesign.with_publications(
                          active_domain_changed
                              ? DesktopDesign.clear(scoped.design)
                              : scoped.design,
                          active_domain,
                          DesktopDomains.project(scoped.domain_management)
                              .subdomains,
                          account_domain(scoped)
                      )
                    : scoped.design,
            events: was_disabled("Events")
                ? DesktopEvents.clear(scoped.events)
                : scoped.events,
            media: was_disabled("Media")
                ? DesktopMedia.clear(scoped.media)
                : scoped.media,
            projects: was_disabled("Projects")
                ? DesktopProjects.clear(scoped.projects)
                : scoped.projects,
            issues: was_disabled("Issues")
                ? DesktopIssues.clear(scoped.issues)
                : scoped.issues,
            shop: was_disabled("Shop")
                ? DesktopShop.clear(scoped.shop)
                : scoped.shop,
            tags: was_disabled("Tags") ? Tags.clear(scoped.tags) : scoped.tags,
            blog:
                was_disabled("Blog") || active_domain_changed
                    ? DesktopBlog.clear(scoped.blog)
                    : scoped.blog,
            documents: was_disabled("Documents")
                ? DesktopDocuments.clear(scoped.documents)
                : scoped.documents,
            bookmarks:
                active_domain_changed || was_disabled("Documents")
                    ? DesktopBookmarks.clear(scoped.bookmarks)
                    : scoped.bookmarks,
            data: was_disabled("Data")
                ? DesktopData.with_domain(scoped.data, scoped.active_domain_id)
                : scoped.data,
            mail: was_disabled("Mail")
                ? DesktopMail.with_domain(
                      DesktopMail.with_domain(scoped.mail, Option.none()),
                      scoped.active_domain_id
                  )
                : scoped.mail,
            navigation_settings:
                model.route._tag === "Settings" &&
                model.route.settings_path === "/settings/sidebar" &&
                (scoped.route._tag !== "Settings" ||
                    scoped.route.settings_path !== "/settings/sidebar")
                    ? {
                          ...scoped.navigation_settings,
                          drag_and_drop:
                              NavigationSettings.init().drag_and_drop,
                      }
                    : scoped.navigation_settings,
        },
        mail_enabled
            ? [
                  ...commands,
                  ...map_mail_commands(
                      DesktopMail.load_transactional_commands(
                          scoped.contacts.domain_id
                      )
                  ),
              ]
            : commands,
    ]
}

const navigation_subscriptions = FoldkitSubscription.lift(
    NavigationSettings.subscriptions
)<Model, Message>({
    read: (model) => Option.some(model.navigation_settings),
    toParentMessage: (message) => GotNavigationSettingsMessage({ message }),
    when: (model) =>
        model.route._tag === "Settings" &&
        model.route.settings_path === "/settings/sidebar",
})

const forms_drag_subscriptions = FoldkitSubscription.lift(Forms.subscriptions)<
    Model,
    Message
>({
    read: (model) => model.forms,
    toParentMessage: (message) => GotFormsMessage({ message }),
})

const project_subscriptions = DesktopProjects.subscriptions<Model, Message>({
    read: (model) => Option.some(model.projects),
    toActiveDomainId: (model) => module_domain(model, "Projects"),
    toParentMessage: (message) => GotProjectsMessage({ message }),
})

const issue_drag_subscriptions = FoldkitSubscription.lift(
    Ui.DragAndDrop.subscriptions
)<Model, Message>({
    when: (model) => module_enabled(model, "Issues"),
    read: (model) =>
        Option.some(DesktopIssues.project(model.issues).dragAndDrop),
    toParentMessage: (message) =>
        GotIssuesMessage({
            message: DesktopIssues.got_drag_and_drop_message({ message }),
        }),
})

const is_content_web_item_path = (pathname: string): boolean => {
    return Option.isSome(DesktopPages.content_page_id_for_path(pathname))
}

const landing_editor_page_id_for_route = (route: DesktopRoute) =>
    route._tag === "Marketing"
        ? MarketingLanding.landingEditorPageId(route.marketing_path)
        : route._tag === "Content"
          ? Option.getOrNull(
                DesktopPages.content_page_id_for_path(route.content_path)
            )
          : null

const load_landing_editor_page = (
    editor: MarketingLanding.Model,
    page: DesktopPages.Page,
    route: DesktopRoute
): MarketingLanding.Model => {
    const loaded_editor = MarketingLanding.loaded_page_content(
        editor,
        page.id,
        page.content
    )
    const requested_edit_mode =
        route._tag === "Content" &&
        Content.is_content_edit_requested(route.content_search)
    return requested_edit_mode
        ? MarketingLanding.update(
              loaded_editor,
              MarketingLanding.ClickedEdit()
          )[0]
        : loaded_editor
}

const is_content_blog_item_path = (pathname: string): boolean =>
    Option.isSome(DesktopBlog.content_blog_path(pathname, ""))

const is_content_document_path = (pathname: string): boolean =>
    DesktopDocuments.is_document_location(pathname)

const is_content_social_item_path = (pathname: string): boolean =>
    Option.isSome(DesktopSocial.content_social_post_id_for_path(pathname))

const is_content_form_item_path = (pathname: string): boolean =>
    Forms.is_content_form_path(pathname)

const is_social_route = (route: DesktopRoute): boolean =>
    route._tag === "Social" ||
    (route._tag === "Content" &&
        is_content_social_item_path(route.content_path))

const is_pages_domain_route = (route: DesktopRoute): boolean =>
    (route._tag === "Web" && route.web_path !== web_publishing_href()) ||
    (route._tag === "Pages" &&
        !route.pages_path.startsWith("/pages/bookmarks")) ||
    (route._tag === "Content" && is_content_web_item_path(route.content_path))

const desktop_subscriptions = FoldkitSubscription.make<Model, Message>()(
    (entry) => ({
        issueDragPointer: issue_drag_subscriptions.documentPointer,
        issueDragEscape: issue_drag_subscriptions.documentEscape,
        issueDragKeyboard: issue_drag_subscriptions.documentKeyboard,
        issueDragAutoScroll: issue_drag_subscriptions.autoScroll,
        issueCompactViewport: entry(
            { query: S.String },
            {
                modelToDependencies: () => ({
                    query: DesktopIssues.compact_viewport_query,
                }),
                dependenciesToStream: ({ query }) => {
                    const media_query = window.matchMedia(query)

                    return Stream.make(
                        GotIssuesMessage({
                            message: DesktopIssues.viewport_changed({
                                isCompact: media_query.matches,
                            }),
                        })
                    ).pipe(
                        Stream.concat(
                            streamFromEvent({
                                target: media_query,
                                type: "change",
                                mapEvent: (event) =>
                                    GotIssuesMessage({
                                        message: DesktopIssues.viewport_changed(
                                            {
                                                isCompact: event.matches,
                                            }
                                        ),
                                    }),
                            })
                        )
                    )
                },
            }
        ),
    })
)

const appearance_subscriptions = Appearance.subscriptions<Model, Message>({
    read: (model) => Option.some(model.appearance),
    toParentMessage: (message) => GotAppearanceMessage({ message }),
})

const media_subscriptions = DesktopMedia.subscriptions<Model, Message>({
    read: (model) => Option.some(model.media),
    toParentMessage: (message) => GotMediaMessage({ message }),
})

const event_subscriptions = DesktopEvents.subscriptions<Model, Message>({
    read: (model) => Option.some(DesktopEvents.project(model.events)),
    toParentMessage: (message) => GotEventsMessage({ message }),
})

const blog_subscriptions = DesktopBlog.subscriptions<Model, Message>({
    read: (model) => Option.some(model.blog),
    toParentMessage: (message) => GotBlogMessage({ message }),
})

const document_subscriptions = FoldkitSubscription.lift(
    DesktopDocuments.subscriptions
)<Model, Message>({
    read: (model) => Option.some(model.documents),
    toParentMessage: (message) => GotDocumentsMessage({ message }),
    when: (model) =>
        module_enabled(model, "Documents") &&
        is_content_document_path(
            model.route._tag === "Content" ? model.route.content_path : ""
        ),
})

const page_editor_subscriptions = FoldkitSubscription.lift(
    DesktopPages.subscriptions
)<Model, Message>({
    read: (model) => Option.some(model.pages),
    toParentMessage: (message) => GotPagesMessage({ message }),
    when: (model) =>
        is_pages_domain_route(model.route) &&
        Option.isSome(model.pages.ui.edit_draft),
})

export const verify_auth_session = Effect.gen(function* () {
    const auth = yield* AuthKit.Service
    return yield* auth.load().pipe(
        Effect.match({
            onSuccess: (profile) => ReceivedAuthSession({ profile }),
            onFailure: (error) =>
                FailedAuthSession({
                    details:
                        error.cause instanceof Error
                            ? error.cause.message
                            : globalThis.String(error.cause),
                }),
        })
    )
})

const auth_session_subscriptions = FoldkitSubscription.make<
    Model,
    Message,
    AuthKit.Service
>()((entry) => ({
    authSession: entry(
        {},
        {
            modelToDependencies: () => ({}),
            dependenciesToStream: () => Stream.fromEffect(verify_auth_session),
        }
    ),
}))

const contacts_subscriptions = FoldkitSubscription.make<Model, Message>()(
    (entry) => ({
        session: entry(
            {
                domain_id: S.String,
                slug: S.String,
                session_only: S.Boolean,
                documents_enabled: S.Boolean,
                blog_enabled: S.Boolean,
                issues_enabled: S.Boolean,
                projects_enabled: S.Boolean,
                shop_enabled: S.Boolean,
                events_enabled: S.Boolean,
                media_enabled: S.Boolean,
                tags_enabled: S.Boolean,
            },
            {
                modelToDependencies: (model) => ({
                    session_only: model.route._tag !== "Mail",
                    documents_enabled: module_enabled(model, "Documents"),
                    blog_enabled: module_enabled(model, "Blog"),
                    issues_enabled: module_enabled(model, "Issues"),
                    projects_enabled: module_enabled(model, "Projects"),
                    shop_enabled: module_enabled(model, "Shop"),
                    events_enabled: module_enabled(model, "Events"),
                    media_enabled: module_enabled(model, "Media"),
                    tags_enabled: module_enabled(model, "Tags"),
                    domain_id: Option.getOrElse(
                        model.active_domain_id,
                        () => ""
                    ),
                    slug:
                        model.host_context.kind === "central"
                            ? Option.getOrElse(
                                  model.host_context.requested_domain_slug,
                                  () => ""
                              )
                            : (model.domains.find(
                                  (domain) =>
                                      domain._id ===
                                      Option.getOrElse(
                                          model.active_domain_id,
                                          () => ""
                                      )
                              )?.slug ?? ""),
                }),
                dependenciesToStream: ({ slug, session_only }) =>
                    Stream.succeed(
                        GotContactsMessage({
                            message: Contacts.opened_domain(slug, session_only),
                        })
                    ),
            }
        ),
    })
)

const social_data_subscriptions = FoldkitSubscription.make<
    Model,
    Message,
    ContactsApi
>()((entry) => ({
    socialData: entry(
        {
            domain_id: S.String,
            active: S.Boolean,
            refresh: S.Number,
            period: RemoteSocialAnalyticsSnapshot.fields.period,
            platform: RemoteSocialAnalyticsSnapshot.fields.platform,
            account_id: S.NullOr(S.String),
        },
        {
            modelToDependencies: (model) => ({
                domain_id: Option.getOrElse(social_domain_id(model), () => ""),
                active:
                    (model.auth.status === "signed_in" ||
                        account_domain(model) !== undefined) &&
                    is_social_route(model.route),
                refresh: model.social_refresh,
                period: model.social.analytics_period,
                platform: model.social.analytics_platform,
                account_id: model.social.analytics_account_id,
            }),
            dependenciesToStream: ({
                domain_id,
                active,
                period,
                platform,
                account_id,
            }) =>
                !active || domain_id === ""
                    ? Stream.empty
                    : Stream.fromEffect(
                          load_social_data(
                              domain_id,
                              period,
                              platform,
                              account_id
                          ).pipe(
                              Effect.map((data) =>
                                  ReceivedSocialData({ domain_id, ...data })
                              ),
                              Effect.catch((error) =>
                                  Effect.succeed(
                                      FailedSocialData({
                                          domain_id,
                                          details: globalThis.String(error),
                                      })
                                  )
                              )
                          )
                      ),
        }
    ),
    socialTemplates: entry(
        { domain_id: S.String, active: S.Boolean, refresh: S.Number },
        {
            modelToDependencies: (model) => ({
                domain_id: Option.getOrElse(social_domain_id(model), () => ""),
                active:
                    (model.auth.status === "signed_in" ||
                        account_domain(model) !== undefined) &&
                    model.route._tag === "Content" &&
                    !is_social_route(model.route),
                refresh: model.social_refresh,
            }),
            dependenciesToStream: ({ domain_id, active }) =>
                !active || domain_id === ""
                    ? Stream.empty
                    : Stream.fromEffect(
                          load_social_templates(domain_id).pipe(
                              Effect.map((templates) =>
                                  ReceivedSocialTemplates({
                                      domain_id,
                                      templates,
                                  })
                              ),
                              Effect.catch((error) =>
                                  Effect.succeed(
                                      FailedData({
                                          details: globalThis.String(error),
                                      })
                                  )
                              )
                          )
                      ),
        }
    ),
}))

const forms_data_subscriptions = FoldkitSubscription.make<
    Model,
    Message,
    ContactsApi
>()((entry) => ({
    catalog: entry(
        { domain_id: S.String, refresh: S.Number, forms_active: S.Boolean },
        {
            modelToDependencies: (model) => ({
                domain_id: Option.getOrElse(forms_domain_id(model), () => ""),
                refresh: model.forms_refresh,
                forms_active: Option.isSome(model.forms),
            }),
            dependenciesToStream: ({ domain_id }) =>
                domain_id === ""
                    ? Stream.empty
                    : Stream.fromEffect(
                          load_forms_catalog(domain_id).pipe(
                              Effect.map((catalog) =>
                                  ReceivedFormsCatalog({ domain_id, catalog })
                              ),
                              Effect.catch((error) =>
                                  Effect.succeed(
                                      GotFormsMessage({
                                          message: Forms.failed_forms(error),
                                      })
                                  )
                              )
                          )
                      ),
        }
    ),
    detail: entry(
        { domain_id: S.String, slug: S.String },
        {
            modelToDependencies: (model) => ({
                domain_id: Option.getOrElse(forms_domain_id(model), () => ""),
                slug: Option.flatMap(model.forms, Forms.activeSlug).pipe(
                    Option.getOrElse(() => "")
                ),
            }),
            dependenciesToStream: ({ domain_id, slug }) =>
                domain_id === "" || slug === ""
                    ? Stream.empty
                    : Stream.fromEffect(
                          load_form_detail(domain_id, slug).pipe(
                              Effect.map((detail) =>
                                  ReceivedFormsDetail({
                                      domain_id,
                                      slug,
                                      detail,
                                  })
                              ),
                              Effect.catch((error) =>
                                  Effect.succeed(
                                      GotFormsMessage({
                                          message: Forms.failed_detail(error),
                                      })
                                  )
                              )
                          )
                      ),
        }
    ),
}))

export const contacts_mail_subscriptions = FoldkitSubscription.lift(
    contacts_subscriptions
)<Model, Message>({
    read: (model) => Option.some(model),
    toParentMessage: (message) => message,
    when: (model) =>
        has_verified_session(model) || model.host_context.kind === "central",
})

/**
 * Composes subscriptions under their route or shared-shell ownership conditions.
 * A retained inactive model must not keep route-local listeners or data work alive.
 */
export const subscriptions = FoldkitSubscription.aggregate<
    Model,
    Message,
    ContactsApi | AuthKit.Service
>()(
    auth_session_subscriptions,
    contacts_mail_subscriptions,
    FoldkitSubscription.lift(social_data_subscriptions)<Model, Message>({
        read: (model) => Option.some(model),
        toParentMessage: (message) => message,
        when: (model) =>
            has_verified_session(model) || account_domain(model) !== undefined,
    }),
    FoldkitSubscription.lift(forms_data_subscriptions)<Model, Message>({
        read: (model) => Option.some(model),
        toParentMessage: (message) => message,
        when: (model) => Option.isSome(forms_domain_id(model)),
    }),
    FoldkitSubscription.lift(MarketingLanding.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.labs_marketing_landing),
        toParentMessage: (message) =>
            GotLabsMarketingLandingMessage({ message }),
        when: (model) =>
            (model.route._tag === "Marketing" &&
                MarketingLanding.isLandingEditorPath(
                    model.route.marketing_path
                )) ||
            (model.route._tag === "Content" &&
                is_content_web_item_path(model.route.content_path)),
    }),
    FoldkitSubscription.lift(DesktopChat.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.chat),
        toParentMessage: (message) => GotChatMessage({ message }),
        when: (model) =>
            model.route._tag === "Chat" && has_verified_session(model),
    }),
    DesktopMail.subscriptions<Model, Message>({
        read: (model) => Option.some(model.mail),
        toParentMessage: (message) => GotMailMessage({ message }),
        when: (model) =>
            model.route._tag === "Content" &&
            Content.is_content_email_path(model.route.content_path) &&
            model.mail.newsletter.editing,
    }),
    FoldkitSubscription.lift(desktop_subscriptions)<Model, Message>({
        read: (model) => Option.some(model),
        toParentMessage: (message) => message,
        when: has_verified_session,
    }),
    FoldkitSubscription.lift(grep_search_subscriptions)<Model, Message>({
        read: (model) => Option.some(model.dev.grep),
        toParentMessage: (message) =>
            GotDevMessage({ message: Dev.GotGrepMessage({ message }) }),
        when: (model) =>
            grep_preview.snapshot === "remote" &&
            has_verified_session(model) &&
            model.route._tag === "Dev" &&
            model.route.dev_path === "/dev/grep",
    }),
    navigation_subscriptions,
    FoldkitSubscription.lift(DesktopDesign.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.design),
        toParentMessage: (message) => GotDesignMessage({ message }),
        when: (model) =>
            model.route._tag === "Design" &&
            model.route.design_path === "/design/layouts/main-layout",
    }),
    forms_drag_subscriptions,
    FoldkitSubscription.lift(project_subscriptions)<Model, Message>({
        read: (model) => Option.some(model),
        toParentMessage: (message) => message,
        when: (model) => module_enabled(model, "Projects"),
    }),
    appearance_subscriptions,
    FoldkitSubscription.lift(media_subscriptions)<Model, Message>({
        read: (model) => Option.some(model),
        toParentMessage: (message) => message,
        when: (model) => module_enabled(model, "Media"),
    }),
    FoldkitSubscription.lift(event_subscriptions)<Model, Message>({
        read: (model) => Option.some(model),
        toParentMessage: (message) => message,
        when: (model) => module_enabled(model, "Events"),
    }),
    FoldkitSubscription.lift(blog_subscriptions)<Model, Message>({
        read: (model) => Option.some(model),
        toParentMessage: (message) => message,
        when: (model) => module_enabled(model, "Blog"),
    }),
    document_subscriptions,
    page_editor_subscriptions,
    FoldkitSubscription.lift(DataTables.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.data),
        toParentMessage: (message) => GotDataMessage({ message }),
        when: (model) =>
            model.route._tag === "Data" && module_enabled(model, "Data"),
    })
)

/**
 * Owns external resource lifetimes independently of retained child state.
 * Route-local resources must release when their owner becomes inactive, even
 * when its model remains available for back-navigation.
 */
export const managedResources = ManagedResource.aggregate<Model, Message>()()

const projects_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    model.projects.domain_id === ""
        ? h.submodel({
              slotId: "projects-session",
              model: model.contacts,
              view: projects_session_view,
              toParentMessage: (message) => GotContactsMessage({ message }),
          })
        : h.submodel({
              slotId: "desktop-projects",
              model: model.projects,
              view: DesktopProjects.view,
              toParentMessage: (message) => GotProjectsMessage({ message }),
          })

const shop_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    model.shop.domain_id === ""
        ? h.submodel({
              slotId: "shop-session",
              model: model.contacts,
              view: shop_session_view,
              toParentMessage: (message) => GotContactsMessage({ message }),
          })
        : h.submodel({
              slotId: "desktop-shop",
              model: model.shop,
              view: DesktopShop.view,
              toParentMessage: (message) => GotShopMessage({ message }),
          })

const nav_items: ReadonlyArray<PortalSidebarNavItem<Message>> = [
    {
        label: "Dashboard",
        routeTag: "Dashboard",
        href: dashboardHref(),
        icon: AppIcon.IconLayoutDashboard,
    },
    {
        label: "Stats",
        routeTag: "Stats",
        href: statsHref(),
        icon: AppIcon.IconChartColumnDecreasing,
        children: [
            {
                label: "Reports",
                routeTag: "StatsReports",
                href: statsReportsHref(),
                icon: AppIcon.IconFileText,
            },
        ],
    },
    {
        label: "Content",
        routeTag: "Content",
        href: content_href(),
        icon: AppIcon.IconFileText,
        children: [
            {
                label: "New content",
                routeTag: "ContentNew",
                href: content_new_href(),
                icon: AppIcon.IconPlus,
            },
            {
                label: "Documents",
                routeTag: "ContentDocuments",
                href: content_documents_href(),
                icon: AppIcon.IconFileText,
            },
            {
                label: "New email",
                routeTag: "ContentEmail",
                href: Content.content_email_new_href(),
                icon: AppIcon.IconMail,
            },
            {
                label: "Bookmarks",
                routeTag: "ContentBookmarks",
                href: content_bookmarks_href(),
                icon: AppIcon.IconBookmark,
            },
            {
                label: "Templates",
                routeTag: "ContentTemplates",
                href: content_templates_href(),
                icon: AppIcon.IconLayout,
            },
        ],
    },
    {
        label: "Web",
        routeTag: "Pages",
        href: web_href(),
        icon: AppIcon.IconFileText,
        children: [
            {
                label: "Pages",
                routeTag: "WebPages",
                href: web_pages_href(),
                icon: AppIcon.IconFileText,
            },
            {
                label: "New page",
                routeTag: "WebPagesNew",
                href: web_pages_new_href(),
                icon: AppIcon.IconPlus,
            },
            {
                label: "Publishing",
                routeTag: "WebPublishing",
                href: web_publishing_href(),
                icon: AppIcon.IconCloud,
            },
            {
                label: "Blog",
                routeTag: "Blog",
                href: documentsBlogHref(),
                icon: AppIcon.IconFileText,
                children: [
                    {
                        label: "Published posts",
                        routeTag: "BlogPublished",
                        href: documentsBlogPublishedHref(),
                        icon: AppIcon.IconFolderOpen,
                    },
                    {
                        label: "Drafts",
                        routeTag: "BlogDrafts",
                        href: documentsBlogDraftsHref(),
                        icon: AppIcon.IconFolder,
                    },
                    {
                        label: "New post",
                        routeTag: "BlogNew",
                        href: documentsBlogNewHref(),
                        icon: AppIcon.IconFilePlus,
                    },
                ],
            },
        ],
    },
    {
        label: "Design",
        routeTag: "Design",
        href: designHref(),
        icon: AppIcon.IconLayoutTemplate,
        children: [
            {
                label: "Ideas",
                routeTag: "DesignIdeas",
                href: designIdeasHref(),
                icon: AppIcon.IconZap,
            },
            {
                label: "Main layout",
                routeTag: "DesignMainLayout",
                href: designMainLayoutHref(),
                icon: AppIcon.IconLayout,
            },
            {
                label: "Logo",
                routeTag: "DesignLogo",
                href: DesktopLogo.logo_href(),
                icon: AppIcon.IconSquarePen,
            },
            {
                label: "Favicons",
                routeTag: "DesignFavicons",
                href: designFaviconsHref(),
                icon: AppIcon.IconImage,
            },
        ],
    },
    {
        label: "Forms",
        routeTag: "Forms",
        href: formsHref(),
        icon: AppIcon.IconListChecks,
    },
    {
        label: "Projects",
        routeTag: "Projects",
        href: projectsHref(),
        icon: AppIcon.IconFolder,
    },
    {
        label: "Shop",
        routeTag: "Shop",
        href: shopHref(),
        icon: AppIcon.IconShoppingCart,
        children: [
            {
                label: "Products",
                routeTag: "ShopProducts",
                href: shopProductsHref(),
                icon: AppIcon.IconFile,
                children: [
                    {
                        label: "New",
                        routeTag: "ShopProductCreate",
                        href: shopProductCreateHref(),
                        icon: AppIcon.IconPlus,
                    },
                ],
            },
            {
                label: "Collections",
                routeTag: "ShopCollections",
                href: shopCollectionsHref(),
                icon: AppIcon.IconLayoutGrid,
            },
            {
                label: "Cart",
                routeTag: "ShopCart",
                href: shopCartHref(),
                icon: AppIcon.IconShoppingCart,
            },
            {
                label: "Checkout",
                routeTag: "ShopCheckout",
                href: shopCheckoutHref(),
                icon: AppIcon.IconCreditCard,
            },
            {
                label: "Orders",
                routeTag: "ShopOrders",
                href: shopOrdersHref(),
                icon: AppIcon.IconArchive,
            },
        ],
    },
    {
        label: "Issues",
        routeTag: "Issues",
        href: issuesHref(),
        icon: AppIcon.IconFileText,
    },
    {
        label: "Events",
        routeTag: "Events",
        href: eventsHref(),
        icon: AppIcon.IconCalendar,
        children: [
            {
                label: "Menu",
                routeTag: "EventsMenu",
                href: eventsMenuHref(),
                icon: AppIcon.IconLayoutGrid,
            },
        ],
    },
    {
        label: "Tags",
        routeTag: "Tags",
        href: tagsHref(),
        icon: AppIcon.IconTags,
    },
    {
        label: "Finance",
        routeTag: "Finance",
        href: finance_href(),
        icon: AppIcon.IconCreditCard,
    },
    {
        label: "Mail",
        routeTag: "Mail",
        href: mailHref(),
        icon: AppIcon.IconMail,
        children: [
            {
                label: "Dashboard",
                routeTag: "Mail",
                href: mailHref(),
                icon: AppIcon.IconLayoutDashboard,
            },
            {
                label: "Send",
                routeTag: "MailSend",
                href: mailSendHref(),
                icon: AppIcon.IconSend,
            },
            {
                label: "Sent",
                routeTag: "MailSent",
                href: mailSentHref(),
                icon: AppIcon.IconCircleCheck,
            },
            {
                label: "Stats",
                routeTag: "MailStats",
                href: mailStatsHref(),
                icon: AppIcon.IconChartColumnDecreasing,
            },
            {
                label: "Contacts",
                routeTag: "MailContacts",
                href: mailContactsHref(),
                icon: AppIcon.IconUsers,
            },
            {
                label: "Groups",
                routeTag: "MailGroups",
                href: mailGroupsHref(),
                icon: AppIcon.IconUsers,
            },
            {
                label: "Members",
                routeTag: "MailMembers",
                href: mailMembersHref(),
                icon: AppIcon.IconUser,
            },
            {
                label: "Manage Members",
                routeTag: "MailMembersManage",
                href: mailManageMembersHref(),
                icon: AppIcon.IconUsers,
            },
            {
                label: "Newsletter delivery",
                routeTag: "MailNewsletter",
                href: mailNewsletterHref(),
                icon: AppIcon.IconSend,
            },
            {
                label: "Transactional",
                routeTag: "MailTransactional",
                href: mailTransactionalHref(),
                icon: AppIcon.IconMail,
            },
            {
                label: "Subscriptions",
                routeTag: "MailSubscriptions",
                href: mailSubscriptionsHref(),
                icon: AppIcon.IconUsers,
            },
        ],
    },
    {
        label: "Media",
        routeTag: "Media",
        href: mediaHref(),
        icon: AppIcon.IconImage,
        children: [
            {
                label: "Gallery",
                routeTag: "MediaGallery",
                href: mediaGalleryHref(),
                icon: AppIcon.IconLayoutGrid,
            },
            {
                label: "Video",
                routeTag: "MediaVideo",
                href: mediaVideoHref(),
                icon: AppIcon.IconVideo,
            },
            {
                label: "Streaming",
                routeTag: "MediaStreaming",
                href: media_streaming_href(),
                icon: AppIcon.IconRadio,
            },
        ],
    },
    {
        label: "Domains",
        routeTag: "Domains",
        href: domainsHref(),
        icon: AppIcon.IconCloud,
    },
    {
        label: "Social",
        routeTag: "Social",
        href: social_href(),
        icon: AppIcon.IconMessages,
    },
    {
        label: "Chat",
        routeTag: "Chat",
        href: chat_href(),
        icon: AppIcon.IconMessages,
    },
    {
        label: "Data",
        routeTag: "Data",
        href: dataHref(),
        icon: AppIcon.IconLayoutGrid,
        children: [
            {
                label: "Spreadsheets",
                routeTag: "DataSpreadsheets",
                href: dataSpreadsheetsHref(),
                icon: AppIcon.IconGrid3x3,
            },
            {
                label: "CSV",
                routeTag: "DataCsv",
                href: dataCsvHref(),
                icon: AppIcon.IconDownload,
            },
        ],
    },
    {
        label: "Settings",
        routeTag: "Settings",
        href: settingsHref(),
        icon: AppIcon.IconSettings,
        children: [
            {
                label: "Sidebar",
                routeTag: "SettingsSidebar",
                href: settingsSidebarHref(),
                icon: AppIcon.IconLayout,
            },
            {
                label: "Modules",
                routeTag: "SettingsModules",
                href: settingsModulesHref(),
                icon: AppIcon.IconLayoutGrid,
            },
            {
                label: "Theme",
                routeTag: "SettingsTheme",
                href: settingsThemeHref(),
                icon: AppIcon.IconPaintRoller,
            },
            {
                label: "Fonts",
                routeTag: "SettingsFonts",
                href: settingsFontsHref(),
                icon: AppIcon.IconFileText,
            },
        ],
    },
    {
        label: "Sysadmin",
        routeTag: "Sysadmin",
        href: sysadminHref(),
        icon: AppIcon.IconTerminal,
        children: [
            {
                label: "Audit",
                routeTag: "SysadminAudit",
                href: sysadminAuditHref(),
                icon: AppIcon.IconLayoutDashboard,
            },
            {
                label: "Logging",
                routeTag: "SysadminLogging",
                href: sysadminLoggingHref(),
                icon: AppIcon.IconTerminal,
            },
            {
                label: "Tracing",
                routeTag: "SysadminTracing",
                href: sysadminTracingHref(),
                icon: AppIcon.IconLayout,
            },
            {
                label: "Metrics",
                routeTag: "SysadminMetrics",
                href: sysadminMetricsHref(),
                icon: AppIcon.IconChartColumnDecreasing,
            },
            {
                label: "Errors",
                routeTag: "SysadminErrors",
                href: sysadminErrorsHref(),
                icon: AppIcon.IconAlertTriangle,
            },
            {
                label: "Sessions",
                routeTag: "SysadminSessions",
                href: sysadminSessionsHref(),
                icon: AppIcon.IconUsers,
            },
            {
                label: "System",
                routeTag: "SysadminSystem",
                href: sysadminSystemHref(),
                icon: AppIcon.IconSettings,
            },
        ],
    },
    {
        label: "Dev",
        routeTag: "Dev",
        href: devHref(),
        icon: AppIcon.IconBrandTypescript,
        children: [
            {
                label: "Keyboard Shortcuts",
                routeTag: "DevKbdShortcuts",
                href: devKbdShortcutsHref(),
                icon: AppIcon.IconListChecks,
            },
            {
                label: "Terminal",
                routeTag: "DevTerminal",
                href: devTerminalHref(),
                icon: AppIcon.IconTerminal,
            },
            {
                label: "Grep",
                routeTag: "DevGrep",
                href: dev_grep_href(),
                icon: AppIcon.IconSearch,
            },
            {
                label: "Bookmarks",
                routeTag: "DevBookmarks",
                href: DevBookmarks.bookmarks_href(),
                icon: AppIcon.IconBookmark,
            },
        ],
    },
]

const to_sidebar_tooltip_message = (key: string, message: Ui.Tooltip.Message) =>
    GotSidebarTooltipMessage({ id: key, message })

const issues_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    model.issues.domain_id === ""
        ? h.submodel({
              slotId: "issues-session",
              model: model.contacts,
              view: issues_session_view,
              toParentMessage: (message) => GotContactsMessage({ message }),
          })
        : h.div(
              [
                  h.Class(
                      "min-h-full bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8"
                  ),
              ],
              [
                  h.submodel({
                      slotId: "desktop-issues",
                      model: model.issues,
                      view: DesktopIssues.view,
                      viewInputs: DesktopIssues.hrefs,
                      toParentMessage: (message) =>
                          GotIssuesMessage({ message }),
                  }),
              ]
          )

const tags_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    model.tags.domain_id === ""
        ? h.submodel({
              slotId: "tags-session",
              model: model.contacts,
              view: tags_session_view,
              toParentMessage: (message) => GotContactsMessage({ message }),
          })
        : h.submodel({
              slotId: "desktop-tags",
              model: model.tags,
              view: Tags.view,
              toParentMessage: (message) => GotTagsMessage({ message }),
          })

const media_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    model.media.domain_id === ""
        ? h.submodel({
              slotId: "media-session",
              model: model.contacts,
              view: media_session_view,
              toParentMessage: (message) => GotContactsMessage({ message }),
          })
        : h.submodel({
              slotId: "desktop-media",
              model: model.media,
              view: DesktopMedia.view,
              viewInputs: DesktopMedia.hrefs,
              toParentMessage: (message) => GotMediaMessage({ message }),
          })

const events_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    model.events.domain_id === ""
        ? h.submodel({
              slotId: "events-session",
              model: model.contacts,
              view: events_session_view,
              toParentMessage: (message) => GotContactsMessage({ message }),
          })
        : h.submodel({
              slotId: "desktop-events",
              model: model.events,
              view: DesktopEvents.view,
              toParentMessage: (message) => GotEventsMessage({ message }),
          })

const social_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.submodel({
        slotId: "desktop-social",
        model: model.social,
        view: DesktopSocial.view,
        viewInputs: {
            link_suggestions: DesktopBookmarks.link_suggestions(
                DesktopBookmarks.project(model.bookmarks).bookmarks
            ),
            has_active_domain: social_has_active_domain(model),
        },
        toParentMessage: (message) => GotSocialMessage({ message }),
    })

const domains_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    model.domain_management.domain_id === ""
        ? h.submodel({
              slotId: "domains-session",
              model: model.contacts,
              view: domains_session_view,
              toParentMessage: (message) => GotContactsMessage({ message }),
          })
        : h.div(
              [h.Class("pb-8")],
              [
                  h.submodel({
                      slotId: "desktop-domains",
                      model: model.domain_management,
                      view: DesktopDomains.view,
                      viewInputs: {
                          domains: model.contacts.session?.domains ?? [],
                          active_domain_id:
                              model.contacts.domain_id === ""
                                  ? Option.none()
                                  : Option.some(model.contacts.domain_id),
                      },
                      toParentMessage: (message) =>
                          GotDomainsMessage({ message }),
                  }),
              ]
          )

const publishing_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    if (model.domain_publishing.domain_id === "")
        return h.submodel({
            slotId: "publishing-session",
            model: model.contacts,
            view: publishing_session_view,
            toParentMessage: (message) => GotContactsMessage({ message }),
        })
    return Option.match(selected_publication_domain(model), {
        onNone: () =>
            h.main(
                [h.Class("mx-auto grid w-full max-w-4xl gap-4 p-6 lg:p-10")],
                [
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        ["Publishing"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-sm text-muted-foreground")],
                        [
                            "Choose or add a domain before building and deploying a web release.",
                        ]
                    ),
                    h.a(
                        [
                            h.Href(domainsHref()),
                            h.Class(
                                "inline-flex min-h-10 w-fit items-center rounded-[var(--radius-control)] border border-border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            ),
                        ],
                        ["Open Domains"]
                    ),
                ]
            ),
        onSome: (domain) =>
            h.main(
                [h.Class("mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8")],
                [
                    h.submodel({
                        slotId: "domain-publishing",
                        model: model.domain_publishing,
                        view: DomainPublishing.view,
                        viewInputs: {
                            domain_name: domain.name,
                            domain_slug: domain.slug,
                            subdomains: DesktopDomains.project(
                                model.domain_management
                            ).subdomains,
                        },
                        toParentMessage: (message) =>
                            GotDomainPublishingMessage({ message }),
                    }),
                ]
            ),
    })
}

const web_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    model.route._tag === "Web" && model.route.web_path === web_publishing_href()
        ? publishing_view(model, h)
        : pages_view(model, h)

const mail_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    model.route._tag === "Mail" && is_members_path(model.route.mail_path)
        ? model.contacts.connection_id !== Contacts.boot_id ||
          model.contacts.session === null ||
          model.contacts.domain_id === ""
            ? h.submodel({
                  slotId: "members-session",
                  model: model.contacts,
                  view: members_session_view,
                  toParentMessage: (message) => GotContactsMessage({ message }),
              })
            : h.submodel({
                  slotId: "members",
                  model: {
                      ...model.members,
                      managing: model.route.mail_path.includes("/manage"),
                  },
                  view: members_view,
                  toParentMessage: (message) => GotMembersMessage({ message }),
              })
        : model.route._tag === "Mail" && is_contacts_path(model.route.mail_path)
          ? h.submodel({
                slotId: "contacts",
                model: model.contacts,
                view: contacts_view,
                toParentMessage: (message) => GotContactsMessage({ message }),
            })
          : h.div(
                [h.Class("h-[calc(100dvh-4rem)] min-h-0 overflow-hidden")],
                [
                    h.submodel({
                        slotId: "desktop-mail",
                        model: model.mail,
                        view: DesktopMail.view,
                        toParentMessage: (message) =>
                            GotMailMessage({ message }),
                    }),
                ]
            )

const email_authoring_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    DesktopMail.content_authoring_view(
        model.mail,
        DesktopBookmarks.link_suggestions(
            DesktopBookmarks.project(model.bookmarks).bookmarks
        ),
        (message) => GotMailMessage({ message }),
        h,
        Option.isSome(module_domain(model, "Media"))
            ? DesktopMedia.project(model.media).images.map((image) => ({
                  src: image.stored_url ?? image.url,
                  url: image.url,
                  alt: image.alt,
              }))
            : [],
        globalThis.location.origin
    )

const data_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.submodel({
        slotId: "desktop-data",
        model: model.data,
        view: DesktopData.view,
        toParentMessage: (message) => GotDataMessage({ message }),
    })

const documents_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.submodel({
        slotId: "desktop-documents",
        model: model.documents,
        view: DesktopDocuments.view,
        viewInputs: {
            link_suggestions: DesktopBookmarks.link_suggestions(
                DesktopBookmarks.project(model.bookmarks).bookmarks
            ),
        },
        toParentMessage: (message) => GotDocumentsMessage({ message }),
    })

const blog_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.submodel({
        slotId: "desktop-blog",
        model: model.blog,
        view: DesktopBlog.view,
        viewInputs: {
            link_suggestions: DesktopBookmarks.link_suggestions(
                DesktopBookmarks.project(model.bookmarks).bookmarks
            ),
        },
        toParentMessage: (message) => GotBlogMessage({ message }),
    })

const bookmarks_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    model.bookmarks.domain_id === ""
        ? h.submodel({
              slotId: "bookmarks-session",
              model: model.contacts,
              view: bookmarks_session_view,
              toParentMessage: (message) => GotContactsMessage({ message }),
          })
        : h.submodel({
              slotId: "desktop-bookmarks",
              model: model.bookmarks,
              view: DesktopBookmarks.view,
              toParentMessage: (message) => GotBookmarksMessage({ message }),
          })

const pages_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    if (model.pages.domain_id === "")
        return h.submodel({
            slotId: "pages-session",
            model: model.contacts,
            view: pages_session_view,
            toParentMessage: (message) => GotContactsMessage({ message }),
        })
    const active_domain = Option.flatMap(model.active_domain_id, (domain_id) =>
        Array.findFirst(model.domains, (domain) => domain._id === domain_id)
    )

    return h.submodel({
        slotId: "desktop-pages",
        model: model.pages,
        view: DesktopPages.view,
        viewInputs: {
            domain_name: Option.getOrUndefined(
                Option.map(active_domain, (domain) => domain.name)
            ),
            domain_slug: Option.getOrUndefined(
                Option.map(active_domain, (domain) => domain.slug)
            ),
            subdomains: DesktopDomains.project(model.domain_management)
                .subdomains,
            link_suggestions: DesktopBookmarks.link_suggestions(
                DesktopBookmarks.project(model.bookmarks).bookmarks
            ),
            blog_enabled: module_enabled(model, "Blog"),
            blog_published_count: DesktopBlog.project(
                model.blog
            ).documents.filter((post) => post.published).length,
            events_enabled: module_enabled(model, "Events"),
            events_published_count: DesktopEvents.project(
                model.events
            ).events.filter((event) => event.published).length,
        },
        toParentMessage: (message) => GotPagesMessage({ message }),
    })
}

const landing_page_editor_view = (
    model: Model,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [],
        [
            ...Option.match(model.labs_marketing_landing.page_id, {
                onNone: () => [],
                onSome: (page_id) => [
                    h.submodel({
                        slotId: "landing-publication-controls",
                        model: model.pages,
                        view: DesktopPages.publicationControlsView,
                        viewInputs: {
                            page_id,
                            is_editing:
                                model.labs_marketing_landing.editor_state
                                    ._tag === "Editing",
                        },
                        toParentMessage: (message) =>
                            GotPagesMessage({ message }),
                    }),
                ],
            }),
            MarketingLanding.view(
                model.labs_marketing_landing,
                (message) => GotLabsMarketingLandingMessage({ message }),
                h,
                DesktopMedia.project(model.media).images,
                {
                    theme_id: model.design.ui.editor.theme_id,
                    appearance: model.design.ui.editor.appearance,
                }
            ),
        ]
    )

const content_web_item_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const page_id = landing_editor_page_id_for_route(model.route)
    const is_landing_page =
        page_id !== null &&
        DesktopPages.project(model.pages).pages.some(
            (page) =>
                page.id === page_id && page.content_type === "landing_json"
        )
    return is_landing_page
        ? landing_page_editor_view(model, h)
        : pages_view(model, h)
}

const sysadmin_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    Option.match(model.sysadmin, {
        onNone: () =>
            h.div(
                [h.Class("p-6 text-sm text-muted-foreground")],
                ["Loading Sysadmin…"]
            ),
        onSome: (sysadmin) =>
            h.submodel({
                slotId: "desktop-sysadmin",
                model: sysadmin,
                view: DesktopSysadmin.view,
                toParentMessage: (message) => GotSysadminMessage({ message }),
            }),
    })

const forms_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const content_form_path =
        model.route._tag === "Content" &&
        Option.isSome(Forms.content_form_id_for_path(model.route.content_path))
            ? Option.some(model.route.content_path)
            : Option.none()
    const form_href_for_view = Option.match(content_form_path, {
        onNone: () => formHref,
        onSome: (pathname) => (_slug: string) => pathname,
    })

    return Option.match(model.forms, {
        onNone: () =>
            h.div(
                [h.Class("p-6 text-sm text-muted-foreground")],
                ["Loading Forms…"]
            ),
        onSome: (forms) =>
            h.submodel({
                slotId: "desktop-forms",
                model: forms,
                view: Forms.view,
                viewInputs: {
                    forms_href: formsHref(),
                    link_suggestions: DesktopBookmarks.link_suggestions(
                        DesktopBookmarks.project(model.bookmarks).bookmarks
                    ),
                    form_item_href: (form_id) =>
                        Content.content_item_href("form", form_id),
                    form_href: form_href_for_view,
                    submissions_href: formSubmissionsHref,
                    settings_href: formSettingsHref,
                },
                toParentMessage: (message) => GotFormsMessage({ message }),
            }),
    })
}

const visible_nav_items = (
    model: Model
): ReadonlyArray<PortalSidebarNavItem<Message>> => {
    const snapshot = model.navigation_settings.snapshot
    const order = normalize_sidebar_order(
        Option.isSome(snapshot) ? snapshot.value.sidebar_order : []
    )
    const hidden = Option.isSome(snapshot) ? snapshot.value.hidden_modules : []
    const items: PortalSidebarNavItem<Message>[] = nav_items.filter(
        (item) => !S.is(SidebarItemId)(item.routeTag)
    )
    let separator_before = false
    for (const id of order) {
        if (!S.is(SidebarItemId)(id)) {
            separator_before = true
            continue
        }
        const item = nav_items.find((candidate) => candidate.routeTag === id)
        if (item === undefined || (id !== "Settings" && hidden.includes(id)))
            continue
        const module_id = S.decodeUnknownOption(ModuleId)(id)
        if (Option.isSome(module_id) && !module_enabled(model, module_id.value))
            continue
        const visible_item =
            item.children === undefined
                ? item
                : {
                      ...item,
                      children: item.children.filter((child) =>
                          child.routeTag === "ContentDocuments"
                              ? module_enabled(model, "Documents") &&
                                !hidden.includes("Documents")
                              : child.routeTag === "ContentEmail"
                                ? module_enabled(model, "Mail")
                                : child.routeTag === "Blog"
                                  ? module_enabled(model, "Blog") &&
                                    !hidden.includes("Blog")
                                  : true
                      ),
                  }
        items.push({ ...visible_item, separatorBefore: separator_before })
        separator_before = false
    }
    return items
}

const settings_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    if (model.route._tag !== "Settings") {
        return h.div([], [])
    }

    if (
        model.route.settings_path === "/settings/sidebar" ||
        model.route.settings_path === "/settings/modules"
    ) {
        return NavigationSettings.view(
            model.navigation_settings,
            model.route.settings_path === "/settings/sidebar"
                ? "sidebar"
                : "modules",
            (message) => GotNavigationSettingsMessage({ message }),
            h
        )
    }
    if (model.route.settings_path.startsWith("/settings/theme")) {
        return Appearance.appearanceThemeSettingsView(
            model.appearance,
            (message) => GotAppearanceMessage({ message }),
            h
        )
    }

    if (model.route.settings_path.startsWith("/settings/fonts")) {
        return Appearance.appearanceFontSettingsView(
            model.appearance,
            (message) => GotAppearanceMessage({ message }),
            h
        )
    }

    return Appearance.appearanceSettingsOverviewView(
        {
            sidebar_href: settingsSidebarHref(),
            modules_href: settingsModulesHref(),
            theme_href: settingsThemeHref(),
            fonts_href: settingsFontsHref(),
        },
        h
    )
}

const dashboard_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const domain = account_domain(model)
    const active_domain = Option.flatMap(model.active_domain_id, (domain_id) =>
        Array.findFirst(model.domains, (domain) => domain._id === domain_id)
    )
    const domain_name =
        domain?.name ??
        Option.getOrUndefined(
            Option.map(active_domain, (domain) => domain.name)
        )

    return Dashboard.view(
        {
            enabled_modules: Option.isSome(model.navigation_settings.snapshot)
                ? model.navigation_settings.snapshot.value.enabled_modules
                : domain === undefined
                  ? []
                  : module_ids,
            domain_name,
            domains_href: domainsHref(),
            projects_href: projectsHref(),
            issues_href: issuesHref(),
            events_href: eventsHref(),
            media_href: mediaHref(),
            projects: Array.map(
                DesktopProjects.project(model.projects).projects,
                (project) => ({
                    id: project.id,
                    name: project.name,
                    href: projectHref(project.slug),
                    status: project.status,
                    updated_at: project.updated_at,
                })
            ),
            issues: Array.map(
                DesktopIssues.project(model.issues).issues,
                (issue) => ({
                    id: issue.id,
                    title: issue.title,
                    href: issueHref(issue.id),
                    status: issue.status,
                    updated_at: issue.updated_at,
                })
            ),
            events: Array.map(
                DesktopEvents.project(model.events).events,
                (event) => ({
                    id: event.id,
                    title: event.title,
                    href: eventsHref(),
                    published: event.published,
                    updated_at: event.updated_at,
                })
            ),
            media: [
                ...Array.map(
                    DesktopMedia.project(model.media).images,
                    (image): Dashboard.DashboardMediaItem => ({
                        id: image.id,
                        title: image.alt === "" ? "Untitled image" : image.alt,
                        href: mediaHref(),
                        kind: "image",
                        updated_at: image.updated_at,
                    })
                ),
                ...Array.map(
                    DesktopMedia.project(model.media).videos,
                    (video): Dashboard.DashboardMediaItem => ({
                        id: video.id,
                        title: video.title,
                        href: mediaVideoHref(),
                        kind: "video",
                        updated_at: video.updated_at,
                    })
                ),
            ],
            sites: Array.map(
                DesktopDomains.project(model.domain_management).subdomains,
                (subdomain) => ({
                    id: subdomain.id,
                    name: subdomain.name,
                    href: domainsHref(),
                    status: subdomain.status,
                    updated_at: subdomain.updated_at,
                })
            ),
        },
        h
    )
}

const stats_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const active_domain = Option.flatMap(model.active_domain_id, (domain_id) =>
        Array.findFirst(model.domains, (domain) => domain._id === domain_id)
    )
    const tag_catalog = Tags.project(model.tags)

    return h.div(
        [
            h.Class(
                "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
            ),
        ],
        [
            Stats.overviewView({
                domain_name: Option.getOrUndefined(
                    Option.map(active_domain, (domain) => domain.name)
                ),
                projects: Array.map(
                    DesktopProjects.project(model.projects).projects,
                    (project) => ({
                        status: project.status,
                    })
                ),
                issues: Array.map(
                    DesktopIssues.project(model.issues).issues,
                    (issue) => ({
                        status: issue.status,
                        priority: issue.priority,
                    })
                ),
                events: Array.map(
                    DesktopEvents.project(model.events).events,
                    (event) => ({
                        published: event.published,
                    })
                ),
                media: [
                    ...Array.map(
                        DesktopMedia.project(model.media).images,
                        (): Readonly<{ kind: "image" }> => ({
                            kind: "image",
                        })
                    ),
                    ...Array.map(
                        DesktopMedia.project(model.media).videos,
                        (): Readonly<{ kind: "video" }> => ({
                            kind: "video",
                        })
                    ),
                ],
                sites: Array.map(
                    DesktopDomains.project(model.domain_management).subdomains,
                    (subdomain) => ({
                        status: subdomain.status,
                        purpose:
                            subdomain.kind === "documentation"
                                ? "document"
                                : subdomain.kind,
                    })
                ),
                tags: Array.map(tag_catalog.tags, (tag) => ({
                    id: tag.id,
                    name: tag.name,
                    color: tag.color,
                    usage_count: count_tag_usage(
                        tag_catalog.entityTags,
                        tag.id
                    ),
                })),
            }),
        ]
    )
}

const count_tag_usage = (
    entity_tags: ReadonlyArray<Readonly<{ tag_id: string }>>,
    tag_id: string
): number =>
    Array.filter(entity_tags, (entity_tag) => entity_tag.tag_id === tag_id)
        .length

const placeholder_view = (
    h: HtmlBuilder<Message>,
    title: string,
    description: string
): Html =>
    h.section(
        [h.Class("space-y-4 px-6 py-10")],
        [
            h.h1([h.Class("text-2xl font-semibold")], [title]),
            h.p([h.Class("text-muted-foreground")], [description]),
        ]
    )

const marketing_card_class =
    "grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
const marketing_link_class =
    "inline-flex min-h-10 w-fit items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"

const marketing_templates_view = (
    model: Model,
    h: HtmlBuilder<Message>
): Html =>
    h.main(
        [h.Class("mx-auto grid w-full max-w-6xl gap-8 p-6 lg:p-10")],
        [
            h.header(
                [h.Class("grid gap-2")],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-muted-foreground")],
                        ["Marketing / Landing templates"]
                    ),
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        ["Choose a starting point"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-muted-foreground")],
                        [
                            "Templates are copied into a new landing-page draft, so every domain can customize its own blocks.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-4 md:grid-cols-3")],
                [
                    h.article(
                        [h.Class(marketing_card_class)],
                        [
                            AppIcon.IconPlus({ class: "size-6 text-primary" }),
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                ["Build from scratch"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "Start with an empty canvas and add only the blocks you need.",
                                ]
                            ),
                            h.a(
                                [
                                    h.Href(marketing_new_href()),
                                    h.Class(marketing_link_class),
                                ],
                                ["Create blank landing page"]
                            ),
                        ]
                    ),
                    h.article(
                        [h.Class(marketing_card_class)],
                        [
                            AppIcon.IconLayoutTemplate({
                                class: "size-6 text-primary",
                            }),
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                ["Marketing starter"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "A compact hero, feature grid, FAQ, and call to action.",
                                ]
                            ),
                            h.a(
                                [
                                    h.Href(marketing_starter_href()),
                                    h.Class(marketing_link_class),
                                ],
                                ["Use starter"]
                            ),
                        ]
                    ),
                    h.article(
                        [h.Class(marketing_card_class)],
                        [
                            AppIcon.IconMegaphone({
                                class: "size-6 text-primary",
                            }),
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                ["URM marketing"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "The complete URM example, including its bundled integration marks.",
                                ]
                            ),
                            h.a(
                                [
                                    h.Href(
                                        MarketingLanding.landingEditorHref()
                                    ),
                                    h.Class(marketing_link_class),
                                ],
                                ["Preview URM template"]
                            ),
                        ]
                    ),
                ]
            ),
            h.section(
                [h.Class("grid gap-3"), h.AriaLabel("Saved landing templates")],
                [
                    h.div(
                        [h.Class("grid gap-1")],
                        [
                            h.h2(
                                [h.Class("text-xl font-semibold")],
                                ["Saved templates"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "Reusable across this organization. Domain-specific images are left empty when a template is saved.",
                                ]
                            ),
                        ]
                    ),
                    ...(model.landing_templates_error !== ""
                        ? [
                              h.p(
                                  [
                                      h.AriaLive("polite"),
                                      h.Class("text-sm text-destructive"),
                                  ],
                                  [model.landing_templates_error]
                              ),
                          ]
                        : []),
                    ...(model.landing_templates.length === 0
                        ? [
                              h.p(
                                  [
                                      h.Class(
                                          "rounded-[var(--radius-surface)] border border-dashed border-border p-6 text-sm text-muted-foreground"
                                      ),
                                  ],
                                  [
                                      "No saved templates yet. Open a landing page, turn on editing, and choose Save as template.",
                                  ]
                              ),
                          ]
                        : [
                              h.ul(
                                  [
                                      h.Class(
                                          "grid list-none gap-4 md:grid-cols-3"
                                      ),
                                  ],
                                  model.landing_templates.map((template) =>
                                      h.keyed("li")(
                                          template.id,
                                          [h.Class(marketing_card_class)],
                                          [
                                              AppIcon.IconLayoutTemplate({
                                                  class: "size-6 text-primary",
                                              }),
                                              h.h3(
                                                  [
                                                      h.Class(
                                                          "text-lg font-semibold"
                                                      ),
                                                  ],
                                                  [template.name]
                                              ),
                                              h.p(
                                                  [
                                                      h.Class(
                                                          "text-sm text-muted-foreground"
                                                      ),
                                                  ],
                                                  [
                                                      `${template.document.blocks.length} blocks`,
                                                  ]
                                              ),
                                              h.button(
                                                  [
                                                      h.Type("button"),
                                                      h.OnClick(
                                                          RequestedUseLandingTemplate(
                                                              {
                                                                  template_id:
                                                                      template.id,
                                                              }
                                                          )
                                                      ),
                                                      h.Class(
                                                          marketing_link_class
                                                      ),
                                                  ],
                                                  ["Create landing page"]
                                              ),
                                          ]
                                      )
                                  )
                              ),
                          ]),
                ]
            ),
        ]
    )

const marketing_index_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const active_domain = Option.flatMap(model.active_domain_id, (domain_id) =>
        Array.findFirst(model.domains, (domain) => domain._id === domain_id)
    )
    const landing_pages = DesktopPages.project(model.pages).pages.filter(
        (page) => page.content_type === "landing_json"
    )
    const domain_name = Option.match(active_domain, {
        onNone: () => "the selected domain",
        onSome: (domain) => domain.name,
    })

    return h.main(
        [h.Class("mx-auto grid w-full max-w-6xl gap-8 p-6 lg:p-10")],
        [
            h.header(
                [h.Class("grid gap-2")],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-primary")],
                        [domain_name]
                    ),
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        ["Marketing"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-muted-foreground")],
                        [
                            "Build a landing page from blocks, save it as a draft, and publish it to a domain or subdomain when it is ready.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-4 md:grid-cols-2")],
                [
                    h.article(
                        [h.Class(marketing_card_class)],
                        [
                            AppIcon.IconPlus({ class: "size-6 text-primary" }),
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                ["Build from scratch"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "Create an empty landing draft for this publication.",
                                ]
                            ),
                            h.a(
                                [
                                    h.Href(marketing_new_href()),
                                    h.Class(marketing_link_class),
                                ],
                                ["Create landing page"]
                            ),
                        ]
                    ),
                    h.article(
                        [h.Class(marketing_card_class)],
                        [
                            AppIcon.IconLayoutTemplate({
                                class: "size-6 text-primary",
                            }),
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                ["Landing templates"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "Start with a reusable layout and then edit its copied blocks.",
                                ]
                            ),
                            h.a(
                                [
                                    h.Href(marketing_templates_href()),
                                    h.Class(marketing_link_class),
                                ],
                                ["Browse templates"]
                            ),
                        ]
                    ),
                ]
            ),
            h.section(
                [h.Class("grid gap-3"), h.AriaLabel("Landing pages")],
                [
                    h.div(
                        [h.Class("flex items-end justify-between gap-4")],
                        [
                            h.div(
                                [h.Class("grid gap-1")],
                                [
                                    h.h2(
                                        [h.Class("text-xl font-semibold")],
                                        ["Landing pages"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            `${landing_pages.length} saved for ${domain_name}`,
                                        ]
                                    ),
                                ]
                            ),
                            h.a(
                                [
                                    h.Href(web_pages_href()),
                                    h.Class("text-sm underline"),
                                ],
                                ["Manage all pages"]
                            ),
                        ]
                    ),
                    ...(landing_pages.length === 0
                        ? [
                              h.p(
                                  [
                                      h.Class(
                                          "rounded-[var(--radius-surface)] border border-dashed border-border p-6 text-sm text-muted-foreground"
                                      ),
                                  ],
                                  ["No landing pages yet."]
                              ),
                          ]
                        : landing_pages.map((page) =>
                              h.keyed("article")(
                                  page.id,
                                  [h.Class(marketing_card_class)],
                                  [
                                      h.div(
                                          [
                                              h.Class(
                                                  "flex flex-wrap items-center justify-between gap-3"
                                              ),
                                          ],
                                          [
                                              h.h3(
                                                  [h.Class("font-semibold")],
                                                  [page.title]
                                              ),
                                              h.span(
                                                  [
                                                      h.Class(
                                                          "rounded-full bg-muted px-2 py-1 text-xs capitalize text-muted-foreground"
                                                      ),
                                                  ],
                                                  [
                                                      page.is_homepage
                                                          ? `${page.publication_state} · homepage`
                                                          : page.publication_state,
                                                  ]
                                              ),
                                          ]
                                      ),
                                      h.a(
                                          [
                                              h.Href(
                                                  MarketingLanding.blankLandingEditorHref(
                                                      page.id
                                                  )
                                              ),
                                              h.Class(marketing_link_class),
                                          ],
                                          ["Edit blocks"]
                                      ),
                                  ]
                              )
                          )),
                ]
            ),
        ]
    )
}

const marketing_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    if (model.route._tag !== "Marketing") return marketing_index_view(model, h)
    if (MarketingLanding.isLandingEditorPath(model.route.marketing_path)) {
        return landing_page_editor_view(model, h)
    }
    return model.route.marketing_path.startsWith("/marketing/layouts")
        ? marketing_templates_view(model, h)
        : marketing_index_view(model, h)
}

const route_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const module_id = S.decodeUnknownOption(ModuleId)(
        model.route._tag === "Content" &&
            model.route.content_path === content_documents_href()
            ? "Documents"
            : model.route._tag === "Content" &&
                is_content_blog_item_path(model.route.content_path)
              ? "Blog"
              : model.route._tag === "Content" &&
                  Content.is_content_email_path(model.route.content_path)
                ? "Mail"
                : model.route._tag === "Project"
                  ? "Projects"
                  : model.route._tag === "Issue"
                    ? "Issues"
                    : model.route._tag
    )
    if (Option.isSome(module_id) && !module_enabled(model, module_id.value)) {
        return h.div(
            [h.Class("grid gap-4 p-8")],
            [
                h.h1(
                    [h.Class("text-2xl font-semibold")],
                    [
                        Option.isNone(model.navigation_settings.snapshot)
                            ? "Loading module settings…"
                            : `${module_id.value} is disabled for this domain`,
                    ]
                ),
                h.a(
                    [h.Href(settingsModulesHref()), h.Class("underline")],
                    ["Open module settings"]
                ),
            ]
        )
    }
    switch (model.route._tag) {
        case "Dashboard":
            return dashboard_view(model, h)
        case "Marketing":
            return marketing_view(model, h)
        case "Stats":
            return model.route.stats_path === "/stats/reports"
                ? placeholder_view(h, "Reports", "Reports are coming soon.")
                : stats_view(model, h)
        case "Dev":
            if (DevBookmarks.is_bookmarks_path(model.route.dev_path)) {
                return h.submodel({
                    slotId: "desktop-dev-bookmarks",
                    model: model.dev_bookmarks,
                    view: DevBookmarks.view,
                    toParentMessage: (message) =>
                        GotDevBookmarksMessage({ message }),
                })
            }
            return h.div(
                [h.Class("min-w-0 px-4 py-6 sm:px-6 lg:px-8")],
                [
                    h.submodel({
                        slotId: "desktop-dev",
                        model: model.dev,
                        view: Dev.view,
                        viewInputs: {
                            path: model.route.dev_path,
                            terminal_href: devTerminalHref(),
                            grep_href: dev_grep_href(),
                            bookmarks_href: DevBookmarks.bookmarks_href(),
                            grep_preview,
                            kbd_shortcuts_href: devKbdShortcutsHref(),
                        },
                        toParentMessage: (message) =>
                            GotDevMessage({ message }),
                    }),
                ]
            )
        case "Mail":
            return model.route.mail_path === "/mail/groups"
                ? placeholder_view(h, "Groups", "Mail groups are coming soon.")
                : mail_view(model, h)
        case "Data":
            return data_view(model, h)
        case "Content":
            return is_content_document_path(model.route.content_path)
                ? documents_view(model, h)
                : model.route.content_path === content_bookmarks_href()
                  ? bookmarks_view(model, h)
                  : Content.is_content_email_path(model.route.content_path)
                    ? email_authoring_view(model, h)
                    : is_content_web_item_path(model.route.content_path)
                      ? content_web_item_view(model, h)
                      : is_content_blog_item_path(model.route.content_path)
                        ? blog_view(model, h)
                        : is_content_social_item_path(model.route.content_path)
                          ? social_view(model, h)
                          : is_content_form_item_path(model.route.content_path)
                            ? forms_view(model, h)
                            : Content.view(
                                  model.route.content_path,
                                  model.route.content_search,
                                  [
                                      ...(
                                          DesktopDocuments.library(
                                              model.documents
                                          )?.templates ?? []
                                      ).map(
                                          (
                                              template
                                          ): Content.OrganizationTemplateSummary<string> => ({
                                              template_id: globalThis.String(
                                                  template.id
                                              ),
                                              name: template.name,
                                              description: template.description,
                                              category: "Documents",
                                              tags: template.tags,
                                              content_kind: "document",
                                              provenance: "organization",
                                              capability: "authoring",
                                              block_count: 1,
                                              revision: template.revision,
                                          })
                                      ),
                                      ...model.landing_templates.map(
                                          (
                                              template
                                          ): Content.OrganizationTemplateSummary<string> => ({
                                              template_id: template.id,
                                              name: template.name,
                                              description:
                                                  template.description ??
                                                  "Reusable landing-page template.",
                                              category:
                                                  template.category ?? "Web",
                                              tags: template.tags ?? [],
                                              content_kind: "web",
                                              provenance: "organization",
                                              capability: "authoring",
                                              block_count:
                                                  template.document.blocks
                                                      .length,
                                              revision: template.revision,
                                          })
                                      ),
                                      ...model.form_templates.map(
                                          (
                                              template
                                          ): Content.OrganizationTemplateSummary<string> => ({
                                              template_id: globalThis.String(
                                                  template.id
                                              ),
                                              name: template.name,
                                              description: template.description,
                                              category: "Forms",
                                              tags: template.tags,
                                              content_kind: "form",
                                              provenance: "organization",
                                              capability: "authoring",
                                              block_count:
                                                  template.fields.length,
                                              revision: template.revision,
                                          })
                                      ),
                                      ...model.newsletter_templates.map(
                                          (
                                              template
                                          ): Content.OrganizationTemplateSummary<string> => ({
                                              template_id: template.id,
                                              name: template.name,
                                              description: template.description,
                                              category: "Marketing",
                                              tags: template.tags,
                                              content_kind: "email",
                                              provenance: "organization",
                                              capability: "authoring",
                                              block_count: 1,
                                              revision: template.revision,
                                          })
                                      ),
                                      ...model.social_templates.map(
                                          (
                                              template
                                          ): Content.OrganizationTemplateSummary<string> => ({
                                              template_id: globalThis.String(
                                                  template.id
                                              ),
                                              name: template.name,
                                              description: template.description,
                                              category: "Social",
                                              tags: template.tags,
                                              content_kind: "social",
                                              provenance: "organization",
                                              capability: "authoring",
                                              block_count: 1,
                                              revision: template.revision,
                                          })
                                      ),
                                      ...(
                                          DesktopBlog.library(model.blog)
                                              ?.templates ?? []
                                      ).map(
                                          (
                                              template
                                          ): Content.OrganizationTemplateSummary<string> => ({
                                              template_id: globalThis.String(
                                                  template.id
                                              ),
                                              name: template.name,
                                              description: template.description,
                                              category: "Blog",
                                              tags: template.tags,
                                              content_kind: "blog",
                                              provenance: "organization",
                                              capability: "authoring",
                                              block_count: 1,
                                              revision: template.revision,
                                          })
                                      ),
                                  ],
                                  (template) =>
                                      template.content_kind === "document"
                                          ? RequestedUseDocumentTemplate({
                                                template_id:
                                                    template.template_id,
                                            })
                                          : template.content_kind === "form"
                                            ? RequestedUseFormTemplate({
                                                  template_id:
                                                      template.template_id,
                                                  name: template.name,
                                              })
                                            : template.content_kind === "email"
                                              ? RequestedUseNewsletterTemplate({
                                                    template_id:
                                                        template.template_id,
                                                })
                                              : template.content_kind ===
                                                  "social"
                                                ? RequestedUseSocialTemplate({
                                                      template_id:
                                                          template.template_id,
                                                  })
                                                : template.content_kind ===
                                                    "blog"
                                                  ? RequestedUseBlogTemplate({
                                                        template_id:
                                                            template.template_id,
                                                    })
                                                  : RequestedUseLandingTemplate(
                                                        {
                                                            template_id:
                                                                template.template_id,
                                                        }
                                                    ),
                                  h
                              )
        case "Documents":
            return documents_view(model, h)
        case "Web":
            return web_view(model, h)
        case "Pages":
            return pages_view(model, h)
        case "Blog":
            return blog_view(model, h)
        case "Design":
            if (
                (model.route.design_path === "/design/layouts/main-layout" ||
                    model.route.design_path === designFaviconsHref()) &&
                (model.contacts.connection_id !== Contacts.boot_id ||
                    model.contacts.session === null ||
                    model.contacts.domain_id === "")
            )
                return h.submodel({
                    slotId: "design-session",
                    model: model.contacts,
                    view: design_session_view,
                    toParentMessage: (message) =>
                        GotContactsMessage({ message }),
                })
            return model.route.design_path.replace(/\/$/, "") ===
                designIdeasHref()
                ? DesignIdeas.view(h)
                : model.route.design_path === DesktopLogo.logo_href()
                  ? h.submodel({
                        slotId: "desktop-design-logo",
                        model: model.design_logo,
                        view: DesktopLogo.view,
                        toParentMessage: (message) =>
                            GotDesignLogoMessage({ message }),
                    })
                  : model.route.design_path === designFaviconsHref()
                    ? h.submodel({
                          slotId: "desktop-design-favicons",
                          model: model.design,
                          view: DesktopDesign.faviconsSubmodelView,
                          toParentMessage: (message) =>
                              GotDesignMessage({ message }),
                      })
                    : model.route.design_path === "/design/layouts/main-layout"
                      ? h.submodel({
                            slotId: "desktop-design-layout",
                            model: model.design,
                            view: DesktopDesign.submodelView,
                            toParentMessage: (message) =>
                                GotDesignMessage({ message }),
                        })
                      : placeholder_view(
                            h,
                            "Design",
                            "Choose a design area from the sidebar."
                        )
        case "Forms":
            return forms_view(model, h)
        case "Sysadmin":
            return sysadmin_view(model, h)
        case "Shop":
            return shop_view(model, h)
        case "Projects":
        case "Project":
            return projects_view(model, h)
        case "Issues":
        case "Issue":
            return issues_view(model, h)
        case "Tags":
            return tags_view(model, h)
        case "Finance":
            return Finance.view(h)
        case "Media":
            return model.route.media_path.startsWith("/media/streaming")
                ? placeholder_view(
                      h,
                      "Streaming",
                      "Media streaming is coming soon."
                  )
                : media_view(model, h)
        case "Events":
            return events_view(model, h)
        case "Domains":
            return domains_view(model, h)
        case "Social":
            return social_view(model, h)
        case "Chat":
            return h.submodel({
                slotId: "desktop-admin-chat",
                model: model.chat,
                view: DesktopChat.view,
                toParentMessage: (message) => GotChatMessage({ message }),
            })
        case "Settings":
            return settings_view(model, h)
    }
}

const nav_item_label = (
    items: ReadonlyArray<PortalSidebarNavItem<Message>>,
    route_tag: string
): string | undefined => {
    for (const item of items) {
        if (item.routeTag === route_tag) return item.label
        const child_label = nav_item_label(item.children ?? [], route_tag)
        if (child_label !== undefined) return child_label
    }
    return undefined
}

const route_title = (route: DesktopRoute): string => {
    switch (route._tag) {
        case "Dashboard":
            return "Dashboard · URM"
        case "Marketing":
            return route.marketing_path.startsWith("/marketing/layouts")
                ? "Landing templates · Marketing · URM"
                : "Marketing · URM"
        case "Stats":
            return route.stats_path === "/stats/reports"
                ? "Reports · Stats · URM"
                : "Stats · URM"
        case "Dev":
            if (route.dev_path.replace(/\/$/, "") === "/dev/grep")
                return "Grep · Dev · URM"
            if (route.dev_path.replace(/\/$/, "") === "/dev/bookmarks")
                return "Bookmarks · Dev · URM"
            return route.dev_path === "/dev/kbd-shortcuts"
                ? "Keyboard Shortcuts · Dev · URM"
                : route.dev_path === "/dev/terminal"
                  ? "Terminal · Dev · URM"
                  : "Dev · URM"
        case "Mail":
            return route.mail_path === "/mail/groups"
                ? "Groups · Mail · URM"
                : "Mail · URM"
        case "Data":
            return "Data · URM"
        case "Content":
            return is_content_web_item_path(route.content_path)
                ? "Web page · Content · URM"
                : Content.is_content_email_path(route.content_path)
                  ? "Email draft · Content · URM"
                  : is_content_blog_item_path(route.content_path)
                    ? Content.is_content_creation_path(
                          route.content_path,
                          "blog"
                      )
                        ? "New blog post · Content · URM"
                        : "Blog post · Content · URM"
                    : is_content_document_path(route.content_path)
                      ? route.content_path === "/content/documents/new"
                          ? "New document · Content · URM"
                          : route.content_path === "/content/documents"
                            ? "Documents · Content · URM"
                            : "Document · Content · URM"
                      : is_content_social_item_path(route.content_path)
                        ? Content.is_content_creation_path(
                              route.content_path,
                              "social"
                          )
                            ? "New social post · Content · URM"
                            : "Social post · Content · URM"
                        : is_content_form_item_path(route.content_path)
                          ? Content.is_content_creation_path(
                                route.content_path,
                                "form"
                            )
                              ? "New form · Content · URM"
                              : "Form · Content · URM"
                          : route.content_path === "/content/new"
                            ? "Create content · Content · URM"
                            : route.content_path === "/content/documents"
                              ? "Documents · Content · URM"
                              : route.content_path === "/content/bookmarks"
                                ? "Bookmarks · Content · URM"
                                : route.content_path === "/content/templates"
                                  ? "Templates · Content · URM"
                                  : "Content · URM"
        case "Documents":
            return "Documents · Content · URM"
        case "Web":
            return route.web_path === web_publishing_href()
                ? "Publishing · Web · URM"
                : route.web_path.endsWith("/new")
                  ? "New page · Web · URM"
                  : "Pages · Web · URM"
        case "Pages":
            return route.pages_path.startsWith("/pages/bookmarks")
                ? "Bookmarks · Content · URM"
                : route.pages_path === "/pages/new" ||
                    route.pages_path.endsWith("/new")
                  ? "New page · Pages · URM"
                  : "Pages · URM"
        case "Blog":
            return "Blog · URM"
        case "Design":
            return route.design_path.replace(/\/$/, "") === designIdeasHref()
                ? "Ideas · Design · URM"
                : route.design_path === DesktopLogo.logo_href()
                  ? "Logo · Design · URM"
                  : route.design_path === designFaviconsHref()
                    ? "Favicons · Design · URM"
                    : route.design_path.startsWith(
                            "/design/layouts/main-layout"
                        )
                      ? "Main layout · Design · URM"
                      : "Design · URM"
        case "Forms":
            return "Forms · URM"
        case "Sysadmin":
            return "Sysadmin · URM"
        case "Shop":
            return "Shop · URM"
        case "Projects":
        case "Project":
            return "Projects · URM"
        case "Issues":
        case "Issue":
            return "Issues · URM"
        case "Tags":
            return "Tags · URM"
        case "Finance":
            return "Finance · URM"
        case "Media":
            return route.media_path.startsWith("/media/streaming")
                ? "Streaming · Media · URM"
                : "Media · URM"
        case "Events":
            return "Events · URM"
        case "Domains":
            return "Domains · URM"
        case "Social":
            return "Social · URM"
        case "Chat":
            return "Chat · URM"
        case "Settings":
            return "Settings · URM"
    }
}

const route_label = (route: DesktopRoute): string => {
    switch (route._tag) {
        case "Dashboard":
            return "Dashboard"
        case "Marketing":
            return route.marketing_path.startsWith("/marketing/layouts")
                ? "Marketing / Landing templates"
                : "Marketing"
        case "Stats":
            return route.stats_path === "/stats/reports"
                ? "Stats / Reports"
                : "Stats"
        case "Dev":
            if (route.dev_path.replace(/\/$/, "") === "/dev/grep")
                return "Dev / Grep"
            if (route.dev_path.replace(/\/$/, "") === "/dev/bookmarks")
                return "Dev / Bookmarks"
            return route.dev_path === "/dev/kbd-shortcuts"
                ? "Dev / Keyboard Shortcuts"
                : route.dev_path === "/dev/terminal"
                  ? "Dev / Terminal"
                  : "Dev"
        case "Mail":
            return route.mail_path === "/mail/groups"
                ? "Mail / Groups"
                : model_mail_label(route.mail_path)
        case "Data":
            return model_data_label(route.data_path)
        case "Content":
            return is_content_web_item_path(route.content_path)
                ? "Content / Web page"
                : Content.is_content_email_path(route.content_path)
                  ? "Content / Email draft"
                  : is_content_blog_item_path(route.content_path)
                    ? Content.is_content_creation_path(
                          route.content_path,
                          "blog"
                      )
                        ? "Content / New blog post"
                        : "Content / Blog post"
                    : is_content_document_path(route.content_path)
                      ? route.content_path === "/content/documents/new"
                          ? "Content / New document"
                          : route.content_path === "/content/documents"
                            ? "Content / Documents"
                            : "Content / Document"
                      : is_content_social_item_path(route.content_path)
                        ? Content.is_content_creation_path(
                              route.content_path,
                              "social"
                          )
                            ? "Content / New social post"
                            : "Content / Social post"
                        : is_content_form_item_path(route.content_path)
                          ? Content.is_content_creation_path(
                                route.content_path,
                                "form"
                            )
                              ? "Content / New form"
                              : "Content / Form"
                          : route.content_path === "/content/new"
                            ? "Content / New content"
                            : route.content_path === "/content/documents"
                              ? "Content / Documents"
                              : route.content_path === "/content/bookmarks"
                                ? "Content / Bookmarks"
                                : route.content_path === "/content/templates"
                                  ? "Content / Templates"
                                  : "Content"
        case "Documents":
            return "Content / Documents"
        case "Web":
            return route.web_path === web_publishing_href()
                ? "Web / Publishing"
                : route.web_path.endsWith("/new")
                  ? "Web / Pages / New page"
                  : "Web / Pages"
        case "Pages":
            return route.pages_path.startsWith("/pages/bookmarks")
                ? "Content / Bookmarks"
                : route.pages_path === "/pages/new" ||
                    route.pages_path.endsWith("/new")
                  ? "Pages / New page"
                  : "Pages"
        case "Blog":
            return "Blog"
        case "Design":
            return route.design_path.replace(/\/$/, "") === designIdeasHref()
                ? "Design / Ideas"
                : route.design_path === DesktopLogo.logo_href()
                  ? "Design / Logo"
                  : route.design_path === designFaviconsHref()
                    ? "Design / Favicons"
                    : route.design_path.startsWith(
                            "/design/layouts/main-layout"
                        )
                      ? "Design / Main layout"
                      : "Design"
        case "Forms":
            return model_forms_label(route.forms_path)
        case "Sysadmin":
            return model_sysadmin_label(route.sysadmin_path)
        case "Shop":
            return model_shop_label(route.shop_path)
        case "Projects":
            return "Projects"
        case "Project":
            return "Project tasks"
        case "Issues":
            return "Issues"
        case "Issue":
            return "Issue"
        case "Tags":
            return "Tags"
        case "Finance":
            return "Finance"
        case "Media":
            return model_media_label(route.media_path)
        case "Events":
            return route.events_path.startsWith("/events/menu")
                ? "Events / Menu"
                : "Events"
        case "Domains":
            return "Domains"
        case "Social":
            return "Social"
        case "Chat":
            return "Chat"
        case "Settings":
            return route.settings_path === "/settings/sidebar"
                ? "Settings / Sidebar"
                : route.settings_path === "/settings/modules"
                  ? "Settings / Modules"
                  : route.settings_path.startsWith("/settings/theme")
                    ? "Settings / Theme"
                    : route.settings_path.startsWith("/settings/fonts")
                      ? "Settings / Fonts"
                      : "Settings"
    }
}

const model_media_label = (path: string): string =>
    path.startsWith("/media/gallery")
        ? "Media / Gallery"
        : path.startsWith("/media/video")
          ? "Media / Video"
          : path.startsWith("/media/streaming")
            ? "Media / Streaming"
            : "Media / Library"

const model_forms_label = (path: string): string =>
    path.endsWith("/submissions")
        ? "Forms / Submissions"
        : path.endsWith("/settings")
          ? "Forms / Settings"
          : path === "/forms"
            ? "Forms"
            : "Forms / Form"

const model_sysadmin_label = (path: string): string =>
    path.startsWith("/sysadmin/audit")
        ? "Sysadmin / Audit"
        : path.startsWith("/sysadmin/logging")
          ? "Sysadmin / Logging"
          : path.startsWith("/sysadmin/tracing")
            ? "Sysadmin / Tracing"
            : path.startsWith("/sysadmin/metrics")
              ? "Sysadmin / Metrics"
              : path.startsWith("/sysadmin/errors")
                ? "Sysadmin / Errors"
                : path.startsWith("/sysadmin/sessions")
                  ? "Sysadmin / Sessions"
                  : path.startsWith("/sysadmin/system")
                    ? "Sysadmin / System"
                    : "Sysadmin"

const model_shop_label = (path: string): string =>
    path.startsWith("/shop/products/new")
        ? "Shop / Products / New"
        : path.startsWith("/shop/products/")
          ? "Shop / Product"
          : path.startsWith("/shop/products")
            ? "Shop / Products"
            : path.startsWith("/shop/collections/")
              ? "Shop / Collection"
              : path.startsWith("/shop/collections")
                ? "Shop / Collections"
                : path.startsWith("/shop/cart")
                  ? "Shop / Cart"
                  : path.startsWith("/shop/checkout")
                    ? "Shop / Checkout"
                    : path.startsWith("/shop/orders/")
                      ? "Shop / Order"
                      : path.startsWith("/shop/orders")
                        ? "Shop / Orders"
                        : "Shop"

const model_mail_label = (path: string): string =>
    path.startsWith("/mail/send")
        ? "Mail / Send"
        : path.startsWith("/mail/members/manage")
          ? "Mail / Manage Members"
          : path.startsWith("/mail/members")
            ? "Mail / Members"
            : path.startsWith("/mail/contacts")
              ? "Mail / Contacts"
              : path.startsWith("/mail/templates")
                ? "Mail / Templates"
                : "Mail"

const model_data_label = (path: string): string =>
    path.startsWith("/data/spreadsheets")
        ? "Data / Spreadsheets"
        : path.startsWith("/data/csv")
          ? "Data / CSV"
          : "Data"

const stable_toggled_sidebar = ToggledSidebar()
const stable_toggled_mobile_sidebar = ToggledMobileSidebar()

const domain_switcher_view = (
    model: Model,
    slot_id: string,
    is_collapsed: boolean,
    h: HtmlBuilder<Message>
): Html =>
    domainSwitcherView<Message>(
        {
            slotId: slot_id,
            model: model.domain_switcher,
            maybeSelectedDomainId:
                account_domain(model) === undefined
                    ? model.active_domain_id
                    : Option.some(model.contacts.domain_id),
            domains:
                model.host_context.kind === "central" &&
                model.contacts.session !== null
                    ? Array.map(model.contacts.session.domains, (domain) => ({
                          id: domain.id,
                          label: domain.slug,
                      }))
                    : Array.map(model.domains, (domain) => ({
                          id: domain._id,
                          label: domain.slug,
                          ...Option.match(
                              Array.findFirst(
                                  model.domain_logos,
                                  (logo) => logo.slug === domain.slug
                              ),
                              {
                                  onNone: () => ({}),
                                  onSome: (logo) => ({
                                      logo_scene: logo.scene,
                                  }),
                              }
                          ),
                      })),
            isCollapsed: is_collapsed,
            toParentMessage: (message) => GotDomainSwitcherMessage({ message }),
        },
        h
    )

const tenant_document = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: route_title(model.route),
    body: portalShellView<Message>(
        {
            mobileSidebar: sidebarShellMobileView<Message>(
                {
                    currentRoute: sidebarRouteTag(model.route),
                    title: "URM",
                    subtitle: "",
                    homeHref: dashboardHref(),
                    homeIcon: logoView,
                    navItems: visible_nav_items(model),
                    showHeader: false,
                    topContent: domain_switcher_view(
                        model,
                        "mobile-drawer-domain-switcher",
                        false,
                        h
                    ),
                    isOpen: model.is_sidebar_mobile_open,
                    onToggle: stable_toggled_mobile_sidebar,
                },
                h
            ),
            desktopSidebar: sidebarShellView<Message>(
                {
                    currentRoute: sidebarRouteTag(model.route),
                    title: "URM",
                    subtitle: "",
                    homeHref: dashboardHref(),
                    homeIcon: logoView,
                    toggleIconCollapsed: AppIcon.IconSidebarOpen,
                    toggleIconExpanded: AppIcon.IconPanelLeft,
                    navItems: visible_nav_items(model),
                    topContent: domain_switcher_view(
                        model,
                        "desktop-domain-switcher",
                        model.is_sidebar_collapsed,
                        h
                    ),
                    sidebarTooltips: model.sidebar_tooltips,
                    isCollapsed: model.is_sidebar_collapsed,
                    showHeader: false,
                    showToggle: false,
                    showDivider: false,
                    onToggle: stable_toggled_sidebar,
                    toSidebarTooltipMessage: to_sidebar_tooltip_message,
                },
                h
            ),
            header: headerView<Message>(
                {
                    title: route_label(model.route),
                    is_sidebar_collapsed: model.is_sidebar_collapsed,
                    spotify_player_state: model.spotify_player_state,
                    spotify_player_popover: model.spotify_player_popover,
                    spotify_playlist_id: model.spotify_playlist_id,
                    spotify_playlist_id_draft: model.spotify_playlist_id_draft,
                    spotify_playlist_status: model.spotify_playlist_status,
                    spotify_playlist_error: model.spotify_playlist_error,
                    appearance: model.appearance,
                    on_toggle_sidebar: stable_toggled_sidebar,
                    on_toggle_mobile_sidebar: stable_toggled_mobile_sidebar,
                    to_spotify_player_popover_message: (message) =>
                        GotSpotifyPlayerPopoverMessage({ message }),
                    on_change_spotify_playlist_id: (value) =>
                        ChangedSpotifyPlaylistId({ value }),
                    on_submit_spotify_playlist_id: SubmittedSpotifyPlaylistId(),
                    to_appearance_message: (message) =>
                        GotAppearanceMessage({ message }),
                    auth: h.submodel({
                        slotId: "desktop-authkit",
                        model:
                            account_domain(model) === undefined
                                ? model.auth
                                : {
                                      ...model.auth,
                                      status: "signed_in",
                                      profile: Option.some(
                                          AuthKit.Profile.make({
                                              id:
                                                  model.contacts.account
                                                      ?.profile.id ??
                                                  model.contacts.session
                                                      ?.account_id ??
                                                  "",
                                              email:
                                                  model.contacts.account
                                                      ?.profile.email ?? "",
                                              display_name:
                                                  model.contacts.account
                                                      ?.profile.display_name ??
                                                  "Account",
                                              image_url: Option.fromNullishOr(
                                                  model.contacts.account
                                                      ?.profile.image_url
                                              ),
                                          })
                                      ),
                                  },
                        view: AuthKit.headerView,
                        toParentMessage: (message) =>
                            GotAuthKitMessage({ message }),
                    }),
                },
                h
            ),
            content: h.div(
                [h.Class("relative min-h-full")],
                [
                    ...Option.match(model.maybe_error, {
                        onNone: () => [],
                        onSome: (details) => [
                            h.p(
                                [h.Class("error-banner"), h.AriaLive("polite")],
                                [details]
                            ),
                        ],
                    }),
                    route_view(model, h),
                ]
            ),
        },
        h
    ),
})

export type AppSurface =
    | "public"
    | "insecure_auth_origin"
    | "checking_session"
    | "sign_in"
    | "account"
    | "loading_domain"
    | "domain_error"
    | "access_denied"
    | "domain"

export const app_surface = (model: Model): AppSurface => {
    if (model.host_context.kind === "custom") {
        return "public"
    }

    if (model.host_context.kind === "central") {
        return model.contacts.connection_id !== Contacts.boot_id ||
            (model.contacts.busy && model.contacts.session === null)
            ? "checking_session"
            : model.contacts.session === null
              ? "sign_in"
              : Option.isNone(model.host_context.requested_domain_slug)
                ? "account"
                : account_domain(model) === undefined
                  ? "access_denied"
                  : "domain"
    }

    if (!model.host_context.auth_capable) {
        return "insecure_auth_origin"
    }

    if (
        model.auth.status === "loading" ||
        (model.auth.status === "signed_in" && !has_verified_session(model))
    ) {
        return "checking_session"
    }

    if (model.auth.status !== "signed_in") {
        return "sign_in"
    }

    if (model.domains_status === "error") {
        return "domain_error"
    }

    if (model.domains_status !== "success") {
        return "loading_domain"
    }

    return Option.isSome(model.active_domain_id) ? "domain" : "access_denied"
}

const auth_control = (
    model: Model,
    slot_id: string,
    h: HtmlBuilder<Message>
): Html =>
    h.submodel({
        slotId: slot_id,
        model: model.auth,
        view: AuthKit.view,
        toParentMessage: (message) => GotAuthKitMessage({ message }),
    })

const standalone_document = (
    title: string,
    content: ReadonlyArray<Html | string>,
    h: HtmlBuilder<Message>
): Document => ({
    title,
    body: h.main(
        [
            h.Class(
                "flex min-h-dvh items-center justify-center bg-background px-6 py-12 text-foreground"
            ),
        ],
        [
            h.section(
                [
                    h.Class(
                        "w-full max-w-xl rounded-xl border border-border bg-card p-8 shadow-sm"
                    ),
                ],
                content
            ),
        ]
    ),
})

const session_document = (
    model: Model,
    title: string,
    description: string,
    h: HtmlBuilder<Message>
): Document =>
    standalone_document(
        title,
        [
            h.div([h.Class("mb-6")], [logoView()]),
            h.h1([h.Class("text-2xl font-semibold tracking-tight")], [title]),
            h.p([h.Class("mt-2 text-sm text-muted-foreground")], [description]),
            ...Option.match(model.auth.error, {
                onNone: () => [],
                onSome: (details) => [
                    h.p(
                        [
                            h.Class(
                                "mt-4 break-words rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                            ),
                            h.AriaLive("polite"),
                        ],
                        [details]
                    ),
                ],
            }),
            h.div(
                [h.Class("mt-6")],
                [auth_control(model, "standalone-authkit", h)]
            ),
        ],
        h
    )

const account_document = (model: Model, h: HtmlBuilder<Message>): Document => {
    const domains = model.contacts.session?.domains ?? []
    const domain_content =
        domains.length === 0
            ? [
                  h.p(
                      [h.Class("text-sm text-muted-foreground")],
                      [
                          "No domains are available. Ask an organization administrator to invite you.",
                      ]
                  ),
              ]
            : Array.map(domains, (domain) =>
                  h.a(
                      [
                          h.Href(
                              domain_href_for_host(
                                  model.host_context.hostname,
                                  domain.slug
                              )
                          ),
                          h.Class(
                              "flex flex-col items-start gap-1 rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                          ),
                      ],
                      [
                          h.span(
                              [h.Class("min-w-0 [overflow-wrap:anywhere]")],
                              [domain.name]
                          ),
                          h.span(
                              [
                                  h.Class(
                                      "min-w-0 text-muted-foreground [overflow-wrap:anywhere]"
                                  ),
                              ],
                              [domain.slug]
                          ),
                      ]
                  )
              )

    return standalone_document(
        "Your domains",
        [
            h.div(
                [h.Class("flex items-start justify-between gap-6")],
                [
                    h.div(
                        [],
                        [
                            h.div([h.Class("mb-5")], [logoView()]),
                            h.h1(
                                [
                                    h.Class(
                                        "text-2xl font-semibold tracking-tight"
                                    ),
                                ],
                                ["Your domains"]
                            ),
                            h.p(
                                [h.Class("mt-2 text-sm text-muted-foreground")],
                                [
                                    "Choose a domain to open its administration app.",
                                ]
                            ),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(
                                "text-sm text-muted-foreground hover:text-foreground"
                            ),
                            h.OnClick(
                                GotContactsMessage({
                                    message: Contacts.sign_out(),
                                })
                            ),
                        ],
                        ["Sign out"]
                    ),
                ]
            ),
            h.div([h.Class("mt-8 grid gap-3")], domain_content),
        ],
        h
    )
}

const public_document = (model: Model, h: HtmlBuilder<Message>): Document =>
    standalone_document(
        "URM",
        [
            h.div([h.Class("mb-6")], [logoView()]),
            h.h1([h.Class("text-2xl font-semibold tracking-tight")], ["URM"]),
            h.p(
                [h.Class("mt-2 text-sm text-muted-foreground")],
                [
                    "This host is a public site surface. Domain administration is available through the account app.",
                ]
            ),
            h.a(
                [
                    h.Href(central_href_for_host(model.host_context.hostname)),
                    h.Class(
                        "mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    ),
                ],
                ["Open account"]
            ),
        ],
        h
    )

const insecure_auth_origin_document = (
    model: Model,
    h: HtmlBuilder<Message>
): Document =>
    standalone_document(
        "Secure development origin required",
        [
            h.div([h.Class("mb-6")], [logoView()]),
            h.h1(
                [h.Class("text-2xl font-semibold tracking-tight")],
                ["Secure development origin required"]
            ),
            h.p(
                [h.Class("mt-2 text-sm text-muted-foreground")],
                [
                    "WorkOS AuthKit uses Web Crypto for PKCE. Open the localhost development origin, or configure trusted HTTPS for this hostname.",
                ]
            ),
            h.a(
                [
                    h.Href(central_href_for_host(model.host_context.hostname)),
                    h.Class(
                        "mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    ),
                ],
                ["Open secure development account"]
            ),
        ],
        h
    )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
    const surface = app_surface(model)
    const central_account = model.host_context.kind === "central"

    if (surface === "domain") {
        return tenant_document(model, h)
    }

    if (surface === "public") {
        return public_document(model, h)
    }

    if (surface === "insecure_auth_origin") {
        return insecure_auth_origin_document(model, h)
    }

    if (surface === "account") {
        return account_document(model, h)
    }

    if (surface === "checking_session") {
        if (central_account) {
            return standalone_document(
                "Checking your session",
                [h.p([h.Role("status")], ["Checking your account session…"])],
                h
            )
        }
        return session_document(
            model,
            "Checking your session",
            "URM is verifying your WorkOS session.",
            h
        )
    }

    if (surface === "sign_in") {
        if (central_account) {
            return standalone_document(
                "Sign in to URM",
                [
                    h.submodel({
                        slotId: "account-session",
                        model: model.contacts,
                        view: account_session_view,
                        toParentMessage: (message) =>
                            GotContactsMessage({ message }),
                    }),
                ],
                h
            )
        }
        return session_document(
            model,
            "Sign in to URM",
            model.host_context.kind === "generated"
                ? "Sign in to access this domain."
                : "Sign in to choose a domain.",
            h
        )
    }

    if (surface === "loading_domain") {
        if (central_account) {
            return standalone_document(
                "Loading domain",
                [h.p([h.Role("status")], ["Loading domain data…"])],
                h
            )
        }
        return session_document(
            model,
            "Loading domain",
            "URM is checking your access to this domain.",
            h
        )
    }

    if (surface === "domain_error") {
        return session_document(
            model,
            "Domain unavailable",
            "The domain could not be loaded. Reload to try again.",
            h
        )
    }

    if (central_account) {
        return standalone_document(
            "Access denied",
            [
                h.p([], ["This domain is not available to your account."]),
                h.a(
                    [
                        h.Href(
                            central_href_for_host(model.host_context.hostname)
                        ),
                    ],
                    ["Your domains"]
                ),
            ],
            h
        )
    }
    return session_document(
        model,
        "Access denied",
        "This domain does not exist or your account is not an active member of its organization.",
        h
    )
}
