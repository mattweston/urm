import { is_urmcss_path } from "@urm/features/labs/design/urmcss"
import { isSearchBarPath } from "@urm/features/labs/search/search-bar"
import { isQuerySyncTablePath } from "@urm/features/labs/routing/query-sync-table"
import { isLandingEditorPath } from "@urm/features/marketing/landing"
import { Option, Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import type { Url } from "foldkit/url"

// The labs sit at the root of this app, so `Labs` is the catch-all: only the
// two reserved prefixes, `/learn` and `/dev`, are claimed ahead of it.
export const LabsRoute = taggedStruct("Labs", { labs_path: S.String })
export const LearnRoute = taggedStruct("Learn", { learn_path: S.String })
export const DevRoute = taggedStruct("Dev", { dev_path: S.String })

export const DesktopRoute = S.Union([LabsRoute, LearnRoute, DevRoute])
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

    if (path === "/learn" || path.startsWith("/learn/")) {
        return LearnRoute({ learn_path: path })
    }
    if (path === "/dev" || path.startsWith("/dev/")) {
        return DevRoute({ dev_path: path })
    }
    return LabsRoute({ labs_path: path })
}

export const labsHref = () => "/"
export const labsEventsHref = () => "/events"
export const labsMapHref = () => "/events/map"
export const labsMapDemoHref = (slug: string) => `/events/map/${slug}`
export const learn_href = () => "/learn"
export const devHref = () => "/dev"
export const devKbdShortcutsHref = () => "/dev/kbd-shortcuts"
export const devTerminalHref = () => "/dev/terminal"
export const dev_grep_href = () => "/dev/grep"

export const labsFeaturePath = (route: DesktopRoute): Option.Option<string> =>
    route._tag === "Labs" ? Option.some(route.labs_path) : Option.none()

const labs_path_tag = (labs_path: string): string => {
    const path = labs_path.replace(/\/+$/, "")
    return path === "" || path === "/" ? "Labs" : `Labs-${path.slice(1)}`
}

export const sidebarRouteTag = (route: DesktopRoute): string => {
    switch (route._tag) {
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
            // The lesson catalogue owns the per-lesson tags.
            return "Learn"
        case "Labs":
            if (isLandingEditorPath(route.labs_path))
                return "LabsMarketingLanding"
            if (route.labs_path.replace(/\/$/, "") === "/marketing")
                return "LabsMarketing"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/layout/conditional-grid"
            )
                return "LabsConditionalGrid"
            if (route.labs_path.replace(/\/$/, "") === "/layout/auto-grid")
                return "LabsAutoGrid"
            if (
                route.labs_path.replace(/\/$/, "") === "/layout/fukol-grid"
            )
                return "LabsFukolGrid"
            if (route.labs_path.replace(/\/$/, "") === "/layout/flex-form")
                return "LabsFlexForm"
            if (route.labs_path.replace(/\/$/, "") === "/finance/invoice")
                return "LabsFinanceInvoice"
            if (route.labs_path.replace(/\/$/, "") === "/finance/chart")
                return "LabsFinanceChart"
            if (
                route.labs_path.replace(/\/$/, "") === "/data/spreadsheets"
            )
                return "LabsSpreadsheets"
            if (route.labs_path.replace(/\/$/, "") === "/data")
                return "LabsData"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/settings/services-canvas"
            )
                return "LabsServicesCanvas"
            if (route.labs_path.replace(/\/$/, "") === "/stats/charting")
                return "LabsStatsCharting"
            if (
                route.labs_path.replace(/\/$/, "") === "/stats/charts" ||
                route.labs_path.replace(/\/$/, "") === "/charts"
            )
                return "LabsStatsCharts"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/media/gallery-view-transitions"
            )
                return "LabsGalleryTransitions"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/media/music-notation"
            )
                return "LabsMusicNotation"
            if (route.labs_path.replace(/\/$/, "") === "/auth")
                return "LabsAuth"
            if (
                route.labs_path.replace(/\/$/, "") === "/auth/breach-check"
            )
                return "LabsBreachCheck"
            if (route.labs_path.replace(/\/$/, "") === "/auth/otp-field")
                return "LabsOtpField"
            if (route.labs_path.replace(/\/$/, "") === "/sysadmin")
                return "LabsSysadmin"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/sysadmin/slow-warnings"
            )
                return "LabsSlowWarnings"
            if (route.labs_path.replace(/\/$/, "") === "/design")
                return "LabsDesign"
            if (is_urmcss_path(route.labs_path)) return "LabsUrmcss"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/design/dom-depth-visualizer"
            )
                return "LabsDomDepth"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/design/grid-builder"
            )
                return "LabsGridBuilder"
            if (route.labs_path.replace(/\/$/, "") === "/design/prop-grid")
                return "LabsPropGrid"
            if (route.labs_path.replace(/\/$/, "") === "/typography")
                return "LabsTypography"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/typography/variable-fonts"
            )
                return "LabsVariableFonts"
            if (route.labs_path.replace(/\/$/, "") === "/media/audio")
                return "LabsAudio"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/media/audio/cuelume"
            )
                return "LabsCuelume"
            if (route.labs_path === "/media") return "LabsMedia"
            if (
                route.labs_path.replace(/\/$/, "") ===
                "/media/youtube-embed"
            )
                return "LabsYouTube"
            if (
                route.labs_path === "/media/3d-gallery" ||
                route.labs_path.startsWith("/media/3d-gallery/")
            )
                return "LabsGallery"
            if (
                isQuerySyncTablePath(
                    route.labs_path.split("?")[0] ?? route.labs_path
                )
            )
                return "LabsQuerySyncTable"
            if (isSearchBarPath(route.labs_path)) return "LabsSearchBar"
            if (route.labs_path === "/ui") return "LabsUi"
            if (route.labs_path.startsWith("/ui/"))
                return `LabsUi-${route.labs_path.slice("/ui/".length)}`
            return route.labs_path === "/events"
                ? "LabsEvents"
                : route.labs_path.startsWith("/events/map/")
                  ? `LabsMap-${route.labs_path.slice("/events/map/".length)}`
                  : route.labs_path === "/events/map"
                    ? "LabsMap"
                    : // The index owns the bare "Labs" tag; every other path
                      // derives its own, so a lab without a branch above still
                      // highlights for itself rather than for the index.
                      labs_path_tag(route.labs_path)
    }
}
