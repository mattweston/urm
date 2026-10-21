import { is_urmcss_path } from "@urm/features/labs/design/urmcss"
import { isSearchBarPath } from "@urm/features/labs/search/search-bar"
import { isQuerySyncTablePath } from "@urm/features/labs/routing/query-sync-table"
import { isLandingEditorPath } from "@urm/features/marketing/landing"
import { is_content_email_path } from "@urm/features/content"
import { Option, Schema as S } from "effect"
import { r } from "foldkit/route"
import type { Url } from "foldkit/url"

export const DashboardRoute = r("Dashboard")
export const MarketingRoute = r("Marketing", { marketing_path: S.String })
export const StatsRoute = r("Stats", { stats_path: S.String })
export const ShopRoute = r("Shop", { shop_path: S.String })
export const DevRoute = r("Dev", { dev_path: S.String })
export const LearnRoute = r("Learn", { learn_path: S.String })
export const LabsRoute = r("Labs", { labs_path: S.String })
export const ProjectsRoute = r("Projects")
export const ProjectRoute = r("Project", { project_slug: S.String })
export const IssuesRoute = r("Issues")
export const IssueRoute = r("Issue", { issue_id: S.String })
export const TagsRoute = r("Tags")
export const FinanceRoute = r("Finance")
export const MediaRoute = r("Media", { media_path: S.String })
export const EventsRoute = r("Events", { events_path: S.String })
export const MailRoute = r("Mail", { mail_path: S.String })
export const DataRoute = r("Data", { data_path: S.String })
export const ContentRoute = r("Content", {
    content_path: S.String,
    content_search: S.String,
})
export const DocumentsRoute = r("Documents", { documents_path: S.String })
export const WebRoute = r("Web", { web_path: S.String })
export const PagesRoute = r("Pages", { pages_path: S.String })
export const BlogRoute = r("Blog", { blog_path: S.String })
export const DesignRoute = r("Design", { design_path: S.String })
export const FormsRoute = r("Forms", { forms_path: S.String })
export const SysadminRoute = r("Sysadmin", { sysadmin_path: S.String })
export const DomainsRoute = r("Domains")
export const SocialRoute = r("Social")
export const ChatRoute = r("Chat")
export const SettingsRoute = r("Settings", { settings_path: S.String })

export const DesktopRoute = S.Union([
    DashboardRoute,
    MarketingRoute,
    StatsRoute,
    ShopRoute,
    LabsRoute,
    DevRoute,
    LearnRoute,
    ProjectsRoute,
    ProjectRoute,
    IssuesRoute,
    IssueRoute,
    TagsRoute,
    FinanceRoute,
    MediaRoute,
    EventsRoute,
    MailRoute,
    DataRoute,
    ContentRoute,
    DocumentsRoute,
    WebRoute,
    PagesRoute,
    BlogRoute,
    DesignRoute,
    FormsRoute,
    SysadminRoute,
    DomainsRoute,
    SocialRoute,
    ChatRoute,
    SettingsRoute,
])
export type DesktopRoute = typeof DesktopRoute.Type

const route_path = (url: Url): string => {
    const path = url.pathname.replace(/\/$/, "")
    if (isQuerySyncTablePath(path)) {
        const search = Option.getOrElse(url.search, () => "").replace(/^\?/, "")
        return search === "" ? path : `${path}?${search}`
    }
    return path === "" ? "/" : path
}

export const routeForUrl = (url: Url): DesktopRoute => {
    const path = route_path(url)

    if (path === "" || path === "/" || path === "/dashboard") {
        return DashboardRoute()
    }
    if (path === "/projects") {
        return ProjectsRoute()
    }
    if (path === "/marketing" || path.startsWith("/marketing/")) {
        return MarketingRoute({ marketing_path: path })
    }
    if (path === "/stats" || path === "/stats/reports") {
        return StatsRoute({ stats_path: path })
    }
    if (path === "/shop" || path.startsWith("/shop/")) {
        return ShopRoute({ shop_path: path })
    }
    if (path === "/dev" || path.startsWith("/dev/")) {
        return DevRoute({ dev_path: path })
    }
    if (path === "/learn" || path.startsWith("/learn/")) {
        return LearnRoute({ learn_path: path })
    }
    if (path === "/labs" || path.startsWith("/labs/")) {
        return LabsRoute({ labs_path: path })
    }
    if (path === "/issues") {
        return IssuesRoute()
    }
    if (path === "/tags") {
        return TagsRoute()
    }
    if (path === "/finance") {
        return FinanceRoute()
    }
    if (path === "/media" || path.startsWith("/media/")) {
        return MediaRoute({ media_path: path })
    }
    if (path === "/events" || path.startsWith("/events/")) {
        return EventsRoute({ events_path: path })
    }
    if (path === "/mail" || path.startsWith("/mail/")) {
        return MailRoute({ mail_path: path })
    }
    if (path === "/data" || path.startsWith("/data/")) {
        return DataRoute({ data_path: path })
    }
    if (path === "/content" || path.startsWith("/content/")) {
        return ContentRoute({
            content_path: path,
            content_search: Option.getOrElse(url.search, () => ""),
        })
    }
    if (path === "/documents" || path.startsWith("/documents/")) {
        return DocumentsRoute({ documents_path: path })
    }
    if (path === "/web" || path.startsWith("/web/")) {
        return WebRoute({ web_path: path })
    }
    if (path === "/pages" || path.startsWith("/pages/")) {
        return PagesRoute({ pages_path: path })
    }
    if (path === "/blog" || path.startsWith("/blog/")) {
        return BlogRoute({ blog_path: path })
    }
    if (path === "/design" || path.startsWith("/design/")) {
        return DesignRoute({ design_path: path })
    }
    if (path === "/forms" || path.startsWith("/forms/")) {
        return FormsRoute({ forms_path: path })
    }
    if (path === "/sysadmin" || path.startsWith("/sysadmin/")) {
        return SysadminRoute({ sysadmin_path: path })
    }
    if (path === "/domains") {
        return DomainsRoute()
    }
    if (path === "/social") {
        return SocialRoute()
    }
    if (path === "/chat") {
        return ChatRoute()
    }
    if (path === "/settings" || path.startsWith("/settings/")) {
        return SettingsRoute({ settings_path: path })
    }
    if (path.startsWith("/projects/")) {
        const project_slug = path.slice("/projects/".length)
        if (project_slug !== "" && !project_slug.includes("/")) {
            return ProjectRoute({ project_slug })
        }
    }
    if (path.startsWith("/issues/")) {
        const issue_id = path.slice("/issues/".length)
        if (issue_id !== "" && !issue_id.includes("/")) {
            return IssueRoute({ issue_id })
        }
    }
    return DashboardRoute()
}

export const legacy_pages_replacement_href = (
    url: Url
): Option.Option<string> => {
    const pathname = url.pathname.replace(/\/$/, "")
    if (pathname !== "/pages" && !pathname.startsWith("/pages/"))
        return Option.none()

    const replacement_path =
        pathname === "/pages/bookmarks"
            ? "/content/links"
            : `/web/pages${pathname.slice("/pages".length)}`
    return Option.some(
        `${replacement_path}${Option.getOrElse(url.search, () => "")}${Option.getOrElse(url.hash, () => "")}`
    )
}

export const legacy_documents_replacement_href = (
    url: Url
): Option.Option<string> =>
    url.pathname.replace(/\/$/, "") === "/documents"
        ? Option.some(
              `/content/documents${Option.getOrElse(url.search, () => "")}${Option.getOrElse(url.hash, () => "")}`
          )
        : Option.none()

export const legacy_marketing_replacement_href = (
    url: Url
): Option.Option<string> => {
    const pathname = url.pathname.replace(/\/$/, "")
    if (pathname !== "/marketing" && !pathname.startsWith("/marketing/"))
        return Option.none()

    const parameters = new URLSearchParams(
        Option.getOrElse(url.search, () => "")
    )
    const replacement_path = (() => {
        if (pathname === "/marketing") return "/web/pages"
        if (pathname === "/marketing/layouts/urm") {
            parameters.set("kind", "urm_marketing")
            return "/web/pages/new"
        }
        if (pathname === "/marketing/layouts/blank") {
            parameters.set("kind", "landing_blank")
            return "/web/pages/new"
        }

        const page_match = /^\/marketing\/layouts\/blank\/([^/]+)$/.exec(
            pathname
        )
        const encoded_page_id = page_match?.[1]
        if (encoded_page_id !== undefined) {
            parameters.set("mode", "edit")
            return `/content/web/${encoded_page_id}`
        }

        if (
            pathname === "/marketing/layouts" ||
            pathname.startsWith("/marketing/layouts/")
        ) {
            parameters.set("kind", "web")
            return "/content/templates"
        }
        return "/web/pages"
    })()
    const search = parameters.toString()
    return Option.some(
        `${replacement_path}${search === "" ? "" : `?${search}`}${Option.getOrElse(url.hash, () => "")}`
    )
}

export const legacy_mail_templates_replacement_href = (
    url: Url
): Option.Option<string> => {
    if (url.pathname.replace(/\/$/, "") !== "/mail/templates")
        return Option.none()
    const parameters = new URLSearchParams(
        Option.getOrElse(url.search, () => "")
    )
    parameters.set("kind", "email")
    return Option.some(
        `/content/templates?${parameters.toString()}${Option.getOrElse(url.hash, () => "")}`
    )
}

export const dashboardHref = () => "/dashboard"
export const marketing_href = () => "/marketing"
export const marketing_new_href = () => "/web/pages/new?kind=landing_blank"
export const marketing_starter_href = () =>
    "/web/pages/new?kind=marketing_starter"
export const marketing_templates_href = () => "/marketing/layouts"
export const statsHref = () => "/stats"
export const statsReportsHref = () => "/stats/reports"
export const shopHref = () => "/shop"
export const shopProductsHref = () => "/shop/products"
export const shopProductCreateHref = () => "/shop/products/new"
export const shopCollectionsHref = () => "/shop/collections"
export const shopCartHref = () => "/shop/cart"
export const shopCheckoutHref = () => "/shop/checkout"
export const shopOrdersHref = () => "/shop/orders"
export const devHref = () => "/dev"
export const devKbdShortcutsHref = () => "/dev/kbd-shortcuts"
export const devTerminalHref = () => "/dev/terminal"
export const dev_grep_href = () => "/dev/grep"
export const learn_href = () => "/learn"
export const pagesBookmarksHref = () => "/pages/bookmarks"
export const labsEventsHref = () => "/labs/events"
export const labsMapHref = () => "/labs/events/map"
export const labsMapDemoHref = (slug: string) => `/labs/events/map/${slug}`
export const labsHref = () => "/labs"
export const projectsHref = () => "/projects"
export const projectHref = (project_slug: string) =>
    `/projects/${encodeURIComponent(project_slug)}`
export const issuesHref = () => "/issues"
export const issueHref = (issue_id: string) =>
    `/issues/${encodeURIComponent(issue_id)}`
export const tagsHref = () => "/tags"
export const finance_href = () => "/finance"
export const mediaHref = () => "/media/library"
export const mediaGalleryHref = () => "/media/gallery"
export const mediaVideoHref = () => "/media/video"
export const media_streaming_href = () => "/media/streaming"
export const eventsHref = () => "/events"
export const eventsMenuHref = () => "/events/menu"
export const mailHref = () => "/mail"
export const mailSendHref = () => "/mail/send"
export const mailSentHref = () => "/mail/sent"
export const mailStatsHref = () => "/mail/stats"
export const mailGroupsHref = () => "/mail/groups"
export const mailContactsHref = () => "/mail/contacts"
export const mailMembersHref = () => "/mail/members"
export const mailManageMembersHref = () => "/mail/members/manage"
export const mailNewsletterHref = () => "/mail/newsletter"
export const mailTransactionalHref = () => "/mail/transactional"
export const mailSubscriptionsHref = () => "/mail/subscriptions"
export const mailTemplatesHref = () => "/mail/templates"
export const dataHref = () => "/data"
export const dataSpreadsheetsHref = () => "/data/spreadsheets"
export const dataCsvHref = () => "/data/csv"
export const content_href = () => "/content"
export const content_new_href = () => "/content/new"
export const content_documents_href = () => "/content/documents"
export const content_links_href = () => "/content/links"
export const content_templates_href = () => "/content/templates"
export const documentsHref = () => "/documents"
export const web_href = () => "/web"
export const web_pages_href = () => "/web/pages"
export const web_pages_new_href = () => "/web/pages/new"
export const web_publishing_href = () => "/web/publishing"
export const documentsBlogHref = () => "/blog/published"
export const documentsBlogPublishedHref = () => "/blog/published"
export const documentsBlogDraftsHref = () => "/blog/drafts"
export const documentsBlogNewHref = () => "/blog/new"
export const blogSubdomainHref = (slug: string) =>
    `/blog/subdomains/${encodeURIComponent(slug)}/drafts`
export const pagesHref = () => "/pages"
export const pagesNewHref = () => "/pages/new"
export const designHref = () => "/design"
export const pagesSubdomainHref = (slug: string) =>
    `/web/pages/subdomains/${encodeURIComponent(slug)}`
export const designIdeasHref = () => "/design/ideas"
export const designMainLayoutHref = () => "/design/layouts/main-layout"
export const designFaviconsHref = () => "/design/favicons"
export const formsHref = () => "/forms"
export const formHref = (slug: string) => `/forms/${encodeURIComponent(slug)}`
export const formSubmissionsHref = (slug: string) =>
    `/forms/${encodeURIComponent(slug)}/submissions`
export const formSettingsHref = (slug: string) =>
    `/forms/${encodeURIComponent(slug)}/settings`
export const sysadminHref = () => "/sysadmin"
export const sysadminAuditHref = () => "/sysadmin/audit"
export const sysadminLoggingHref = () => "/sysadmin/logging"
export const sysadminTracingHref = () => "/sysadmin/tracing"
export const sysadminMetricsHref = () => "/sysadmin/metrics"
export const sysadminErrorsHref = () => "/sysadmin/errors"
export const sysadminSessionsHref = () => "/sysadmin/sessions"
export const sysadminSystemHref = () => "/sysadmin/system"
export const domainsHref = () => "/domains"
export const social_href = () => "/social"
export const chat_href = () => "/chat"
export const settingsHref = () => "/settings"
export const settingsThemeHref = () => "/settings/theme"
export const settingsSidebarHref = () => "/settings/sidebar"
export const settingsModulesHref = () => "/settings/modules"
export const settingsFontsHref = () => "/settings/fonts"

const foldkit_sidebar_route_tags: Readonly<Record<string, string>> = {
    "": "LearnFoldkitModelMessage",
    "/derived-view": "LearnFoldkitDerivedView",
    "/derived-input": "LearnFoldkitDerivedInput",
    "/command": "LearnFoldkitCommand",
    "/command-schema": "LearnFoldkitCommandSchema",
    "/command-trigger": "LearnFoldkitCommandTrigger",
    "/async-data": "LearnFoldkitAsyncData",
    "/optimistic-update": "LearnFoldkitOptimisticUpdate",
    "/todo-list": "LearnFoldkitTodoList",
    "/todo-filter": "LearnFoldkitTodoFilter",
    "/submodel": "LearnFoldkitSubmodel",
    "/subscription": "LearnFoldkitSubscription",
}

const visual_effect_sidebar_route_tags: Readonly<Record<string, string>> = {
    "": "LearnVisualEffectSucceed",
    "/fail": "LearnVisualEffectFail",
    "/die": "LearnVisualEffectDie",
    "/sync": "LearnVisualEffectSync",
    "/promise": "LearnVisualEffectPromise",
    "/sleep": "LearnVisualEffectSleep",
    "/all": "LearnVisualEffectAll",
    "/race": "LearnVisualEffectRace",
    "/race-all": "LearnVisualEffectRaceAll",
    "/for-each": "LearnVisualEffectForEach",
    "/all-short-circuit": "LearnVisualEffectAllShortCircuit",
    "/or-else": "LearnVisualEffectOrElse",
    "/first-success-of": "LearnVisualEffectFirstSuccessOf",
    "/timeout": "LearnVisualEffectTimeout",
    "/eventually": "LearnVisualEffectEventually",
    "/partition": "LearnVisualEffectPartition",
    "/validate": "LearnVisualEffectValidate",
    "/retry-recurs": "LearnVisualEffectRetryRecurs",
    "/retry-exponential": "LearnVisualEffectRetryExponential",
    "/repeat-spaced": "LearnVisualEffectRepeatSpaced",
    "/repeat-while": "LearnVisualEffectRepeatWhile",
    "/ref-make": "LearnVisualEffectRefMake",
    "/ref-update-and-get": "LearnVisualEffectRefUpdateAndGet",
    "/add-finalizer": "LearnVisualEffectAddFinalizer",
    "/acquire-release": "LearnVisualEffectAcquireRelease",
}

const nested_learn_sidebar_route_tag = (
    pathname: string,
    prefix: string,
    route_tags: Readonly<Record<string, string>>,
    fallback: string
): string => {
    const normalized_path = pathname.replace(/\/$/, "")
    return route_tags[normalized_path.slice(prefix.length)] ?? fallback
}

export const sidebarRouteTag = (route: DesktopRoute): string => {
    switch (route._tag) {
        case "Dashboard":
            return "Dashboard"
        case "Marketing":
            return route.marketing_path.startsWith("/marketing/layouts")
                ? "MarketingTemplates"
                : "Marketing"
        case "Stats":
            return route.stats_path === "/stats/reports"
                ? "StatsReports"
                : "Stats"
        case "Shop":
            return route.shop_path.startsWith("/shop/products/new")
                ? "ShopProductCreate"
                : route.shop_path.startsWith("/shop/products")
                  ? "ShopProducts"
                  : route.shop_path.startsWith("/shop/collections")
                    ? "ShopCollections"
                    : route.shop_path.startsWith("/shop/cart")
                      ? "ShopCart"
                      : route.shop_path.startsWith("/shop/checkout")
                        ? "ShopCheckout"
                        : route.shop_path.startsWith("/shop/orders")
                          ? "ShopOrders"
                          : "Shop"
        case "Dev":
            if (route.dev_path.replace(/\/$/, "") === "/dev/grep")
                return "DevGrep"
            if (route.dev_path.replace(/\/$/, "") === "/dev/bookmarks")
                return "DevBookmarks"
            return route.dev_path === "/dev/kbd-shortcuts"
                ? "DevKbdShortcuts"
                : route.dev_path === "/dev/terminal"
                  ? "DevTerminal"
                  : "Dev"
        case "Learn":
            return route.learn_path === "/learn/visual-effect" ||
                route.learn_path.startsWith("/learn/visual-effect/")
                ? nested_learn_sidebar_route_tag(
                      route.learn_path,
                      "/learn/visual-effect",
                      visual_effect_sidebar_route_tags,
                      "LearnVisualEffect"
                  )
                : route.learn_path === "/learn/foldkit" ||
                    route.learn_path.startsWith("/learn/foldkit/")
                  ? nested_learn_sidebar_route_tag(
                        route.learn_path,
                        "/learn/foldkit",
                        foldkit_sidebar_route_tags,
                        "LearnFoldkit"
                    )
                  : route.learn_path.replace(/\/$/, "") === "/learn/array"
                    ? "LearnArray"
                    : route.learn_path.replace(/\/$/, "") ===
                        "/learn/nullish-coalescing-input"
                      ? "LearnNullishCoalescingInput"
                      : route.learn_path.replace(/\/$/, "") ===
                          "/learn/managed-resource-layer"
                        ? "LearnManagedResourceLayer"
                        : route.learn_path.replace(/\/$/, "") ===
                            "/learn/reduce"
                          ? "LearnReduce"
                          : route.learn_path.replace(/\/$/, "") ===
                              "/learn/api-effect"
                            ? "LearnApiEffect"
                            : "Learn"
        case "Labs":
            if (isLandingEditorPath(route.labs_path))
                return "LabsMarketingLanding"
            if (route.labs_path.replace(/\/$/, "") === "/labs/marketing")
                return "LabsMarketing"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/labs/layout/conditional-grid"
            )
                return "LabsConditionalGrid"
            if (route.labs_path.replace(/\/$/, "") === "/labs/layout/auto-grid")
                return "LabsAutoGrid"
            if (
                route.labs_path.replace(/\/$/, "") === "/labs/layout/fukol-grid"
            )
                return "LabsFukolGrid"
            if (route.labs_path.replace(/\/$/, "") === "/labs/layout/flex-form")
                return "LabsFlexForm"
            if (route.labs_path.replace(/\/$/, "") === "/labs/finance/invoice")
                return "LabsFinanceInvoice"
            if (route.labs_path.replace(/\/$/, "") === "/labs/finance/chart")
                return "LabsFinanceChart"
            if (
                route.labs_path.replace(/\/$/, "") === "/labs/data/spreadsheets"
            )
                return "LabsSpreadsheets"
            if (route.labs_path.replace(/\/$/, "") === "/labs/data")
                return "LabsData"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/labs/settings/services-canvas"
            )
                return "LabsServicesCanvas"
            if (route.labs_path.replace(/\/$/, "") === "/labs/stats/charting")
                return "LabsStatsCharting"
            if (
                route.labs_path.replace(/\/$/, "") === "/labs/stats/charts" ||
                route.labs_path.replace(/\/$/, "") === "/labs/charts"
            )
                return "LabsStatsCharts"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/labs/media/gallery-view-transitions"
            )
                return "LabsGalleryTransitions"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/labs/media/music-notation"
            )
                return "LabsMusicNotation"
            if (route.labs_path.replace(/\/$/, "") === "/labs/auth")
                return "LabsAuth"
            if (
                route.labs_path.replace(/\/$/, "") === "/labs/auth/breach-check"
            )
                return "LabsBreachCheck"
            if (route.labs_path.replace(/\/$/, "") === "/labs/auth/otp-field")
                return "LabsOtpField"
            if (route.labs_path.replace(/\/$/, "") === "/labs/sysadmin")
                return "LabsSysadmin"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/labs/sysadmin/slow-warnings"
            )
                return "LabsSlowWarnings"
            if (route.labs_path.replace(/\/$/, "") === "/labs/design")
                return "LabsDesign"
            if (is_urmcss_path(route.labs_path)) return "LabsUrmcss"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/labs/design/dom-depth-visualizer"
            )
                return "LabsDomDepth"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/labs/design/grid-builder"
            )
                return "LabsGridBuilder"
            if (route.labs_path.replace(/\/$/, "") === "/labs/design/prop-grid")
                return "LabsPropGrid"
            if (route.labs_path.replace(/\/$/, "") === "/labs/typography")
                return "LabsTypography"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/labs/typography/variable-fonts"
            )
                return "LabsVariableFonts"
            if (route.labs_path.replace(/\/$/, "") === "/labs/media/audio")
                return "LabsAudio"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/labs/media/audio/cuelume"
            )
                return "LabsCuelume"
            if (route.labs_path === "/labs/media") return "LabsMedia"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/labs/media/youtube-embed"
            )
                return "LabsYouTube"
            if (
                route.labs_path === "/labs/media/3d-gallery" ||
                route.labs_path.startsWith("/labs/media/3d-gallery/")
            )
                return "LabsGallery"
            if (
                isQuerySyncTablePath(
                    route.labs_path.split("?")[0] ?? route.labs_path
                )
            )
                return "LabsQuerySyncTable"
            if (isSearchBarPath(route.labs_path)) return "LabsSearchBar"
            if (route.labs_path === "/labs/ui") return "LabsUi"
            if (route.labs_path.startsWith("/labs/ui/"))
                return `LabsUi-${route.labs_path.slice("/labs/ui/".length)}`
            return route.labs_path === "/labs/events"
                ? "LabsEvents"
                : route.labs_path.startsWith("/labs/events/map/")
                  ? `LabsMap-${route.labs_path.slice("/labs/events/map/".length)}`
                  : route.labs_path === "/labs/events/map"
                    ? "LabsMap"
                    : "Labs"
        case "Projects":
        case "Project":
            return "Projects"
        case "Issues":
        case "Issue":
            return "Issues"
        case "Tags":
            return "Tags"
        case "Finance":
            return "Finance"
        case "Media":
            return route.media_path.startsWith("/media/gallery")
                ? "MediaGallery"
                : route.media_path.startsWith("/media/video")
                  ? "MediaVideo"
                  : route.media_path.startsWith("/media/streaming")
                    ? "MediaStreaming"
                    : "Media"
        case "Events":
            return route.events_path.startsWith("/events/menu")
                ? "EventsMenu"
                : "Events"
        case "Mail":
            if (route.mail_path === "/mail/groups") return "MailGroups"
            if (route.mail_path.startsWith("/mail/transactional"))
                return "MailTransactional"
            return route.mail_path.startsWith("/mail/send")
                ? "MailSend"
                : route.mail_path.startsWith("/mail/sent")
                  ? "MailSent"
                  : route.mail_path.startsWith("/mail/stats")
                    ? "MailStats"
                    : route.mail_path.startsWith("/mail/members/manage")
                      ? "MailMembersManage"
                      : route.mail_path.startsWith("/mail/members")
                        ? "MailMembers"
                        : route.mail_path.startsWith("/mail/newsletter")
                          ? "MailNewsletter"
                          : route.mail_path.startsWith("/mail/subscriptions")
                            ? "MailSubscriptions"
                            : route.mail_path.startsWith("/mail/contacts")
                              ? "MailContacts"
                              : route.mail_path.startsWith("/mail/templates")
                                ? "MailTemplates"
                                : "Mail"
        case "Data":
            return route.data_path.startsWith("/data/spreadsheets")
                ? "DataSpreadsheets"
                : route.data_path.startsWith("/data/csv")
                  ? "DataCsv"
                  : "Data"
        case "Content":
            return route.content_path === "/content/new"
                ? "ContentNew"
                : is_content_email_path(route.content_path)
                  ? "ContentEmail"
                  : route.content_path === "/content/documents"
                    ? "ContentDocuments"
                    : route.content_path === "/content/links"
                      ? "ContentLinks"
                      : route.content_path === "/content/templates"
                        ? "ContentTemplates"
                        : "Content"
        case "Documents":
            return "ContentDocuments"
        case "Web":
            return route.web_path === "/web/publishing"
                ? "WebPublishing"
                : route.web_path === "/web/pages/new" ||
                    route.web_path.endsWith("/new")
                  ? "WebPagesNew"
                  : "WebPages"
        case "Pages":
            return route.pages_path.startsWith("/pages/bookmarks")
                ? "ContentLinks"
                : route.pages_path === "/pages/new" ||
                    route.pages_path.endsWith("/new")
                  ? "PagesNew"
                  : "Pages"
        case "Blog":
            return route.blog_path.endsWith("/published")
                ? "BlogPublished"
                : route.blog_path.endsWith("/drafts")
                  ? "BlogDrafts"
                  : route.blog_path.endsWith("/new")
                    ? "BlogNew"
                    : "Blog"
        case "Design":
            return route.design_path.replace(/\/$/, "") === designIdeasHref()
                ? "DesignIdeas"
                : route.design_path.replace(/\/$/, "") === "/design/logo"
                  ? "DesignLogo"
                  : route.design_path.replace(/\/$/, "") ===
                      designFaviconsHref()
                    ? "DesignFavicons"
                    : route.design_path.startsWith(
                            "/design/layouts/main-layout"
                        )
                      ? "DesignMainLayout"
                      : "Design"
        case "Forms":
            return route.forms_path.endsWith("/submissions")
                ? "FormsSubmissions"
                : route.forms_path.endsWith("/settings")
                  ? "FormsSettings"
                  : route.forms_path === "/forms"
                    ? "Forms"
                    : "FormsDetail"
        case "Sysadmin":
            return route.sysadmin_path.startsWith("/sysadmin/audit")
                ? "SysadminAudit"
                : route.sysadmin_path.startsWith("/sysadmin/logging")
                  ? "SysadminLogging"
                  : route.sysadmin_path.startsWith("/sysadmin/tracing")
                    ? "SysadminTracing"
                    : route.sysadmin_path.startsWith("/sysadmin/metrics")
                      ? "SysadminMetrics"
                      : route.sysadmin_path.startsWith("/sysadmin/errors")
                        ? "SysadminErrors"
                        : route.sysadmin_path.startsWith("/sysadmin/sessions")
                          ? "SysadminSessions"
                          : route.sysadmin_path.startsWith("/sysadmin/system")
                            ? "SysadminSystem"
                            : "Sysadmin"
        case "Domains":
            return "Domains"
        case "Social":
            return "Social"
        case "Chat":
            return "Chat"
        case "Settings":
            return route.settings_path === "/settings/sidebar"
                ? "SettingsSidebar"
                : route.settings_path === "/settings/modules"
                  ? "SettingsModules"
                  : route.settings_path.startsWith("/settings/theme")
                    ? "SettingsTheme"
                    : route.settings_path.startsWith("/settings/fonts")
                      ? "SettingsFonts"
                      : "Settings"
    }
}

export const issuesFeaturePath = (
    route: DesktopRoute
): Option.Option<string> => {
    switch (route._tag) {
        case "Issues":
            return Option.some("/issues/")
        case "Issue":
            return Option.some(`/issues/${encodeURIComponent(route.issue_id)}`)
        case "Dashboard":
        case "Stats":
        case "Marketing":
        case "Shop":
        case "Labs":
        case "Dev":
        case "Learn":
        case "Projects":
        case "Project":
        case "Tags":
        case "Media":
        case "Finance":
        case "Events":
        case "Mail":
        case "Data":
        case "Content":
        case "Documents":
        case "Web":
        case "Pages":
        case "Blog":
        case "Design":
        case "Forms":
        case "Sysadmin":
        case "Domains":
        case "Social":
        case "Chat":
        case "Settings":
            return Option.none()
    }
}

export const mediaFeaturePath = (route: DesktopRoute): Option.Option<string> =>
    route._tag === "Media" ? Option.some(route.media_path) : Option.none()

export const shopFeaturePath = (route: DesktopRoute): Option.Option<string> =>
    route._tag === "Shop" ? Option.some(route.shop_path) : Option.none()

export const eventsFeaturePath = (route: DesktopRoute): Option.Option<string> =>
    route._tag === "Events" ? Option.some(route.events_path) : Option.none()

export const labsFeaturePath = (route: DesktopRoute): Option.Option<string> =>
    route._tag === "Labs" ? Option.some(route.labs_path) : Option.none()

export const mailFeaturePath = (route: DesktopRoute): Option.Option<string> =>
    route._tag === "Mail"
        ? Option.some(route.mail_path)
        : route._tag === "Content" && is_content_email_path(route.content_path)
          ? Option.some("/mail/newsletter")
          : Option.none()

export const dataFeaturePath = (route: DesktopRoute): Option.Option<string> =>
    route._tag === "Data" ? Option.some(route.data_path) : Option.none()

export const documentsFeaturePath = (
    route: DesktopRoute
): Option.Option<string> =>
    route._tag === "Content" && route.content_path === "/content/documents"
        ? Option.some(route.content_path)
        : route._tag === "Documents"
          ? Option.some("/content/documents")
          : Option.none()

export const formsFeaturePath = (route: DesktopRoute): Option.Option<string> =>
    route._tag === "Forms" ? Option.some(route.forms_path) : Option.none()

export const sysadminFeaturePath = (
    route: DesktopRoute
): Option.Option<string> =>
    route._tag === "Sysadmin" ? Option.some(route.sysadmin_path) : Option.none()
