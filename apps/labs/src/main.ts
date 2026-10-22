/** # Labs application shell
 *
 *  Model, Message, init, update and view for the labs app.
 *
 *  Each stateful lab under `src/<topic>/` owns its Model, Message, update and
 *  view, and joins the shell in four places: a field on the Model, its init in
 *  `init`, a `Got<Lab>Message` arm in `update`, and a branch in `view`. The
 *  labs that answer a path without state are left to `labs_view`, which takes
 *  the path and an `HtmlBuilder`.
 *
 *  The routed lessons under `/learn` need the ManagedResources and the
 *  three services `Learn.Services` names, so the lesson index is what the shell
 *  shows for them today.
 */
import { Match as M, Option, Schema as S } from "effect"
import {
    Command,
    ManagedResource,
    Subscription,
    type Update,
} from "foldkit"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import { Tooltip } from "@foldkit/ui"
import {
    SIDEBAR_TOOLTIP_HOME_KEY,
    SIDEBAR_TOOLTIP_TOGGLE_KEY,
    SidebarTooltips,
    createSidebarTooltip,
} from "@urm/ui/foldkit/sidebar-shell.tooltips.ts"
import { sidebarShellView } from "@urm/ui/foldkit/sidebar-shell.view.ts"
import type { Url } from "foldkit/url"

import * as BreachCheck from "./auth/breach-check/submodel.ts"
import * as OtpField from "./auth/otp-field/submodel.ts"
import * as Spreadsheets from "./data/spreadsheets/submodel.ts"
import * as Dev from "@urm/features/labs/dev/submodel"
import {
    Preview,
    request_key as grep_request_key,
    request_parameters as grep_request_parameters,
} from "@urm/features/labs/dev/grep"
import { grep_url_href } from "@urm/features/labs/dev/grep/route"
import preview_data from "virtual:grep-preview"
import { restore_grep_route } from "./grep-route.ts"
import { grep_search_subscriptions } from "./grep-search.subscription.ts"
import * as DomDepth from "./design/dom-depth-visualizer/submodel.ts"
import * as Maps from "./events/map/submodel.ts"
import * as Gallery from "./media/3d-gallery/submodel.ts"
import * as DevBookmarks from "./dev/bookmarks/submodel.ts"
import * as FinanceChart from "@urm/features/labs/finance/chart"
import * as InvoiceLab from "@urm/features/labs/finance/invoice"
import * as AutoGridLab from "@urm/features/labs/layout/auto-grid"
import * as ConditionalGridLab from "@urm/features/labs/layout/conditional-grid"
import * as FukolGridLab from "@urm/features/labs/layout/fukol-grid"
import * as UrmcssLab from "@urm/features/labs/design/urmcss"
import * as CtScanLab from "@urm/features/labs/performance/ct-scan"
import * as FlexFormLab from "@urm/features/labs/layout/flex-form"
import * as GridBuilderLab from "@urm/features/labs/design/grid-builder"
import * as PropGridLab from "@urm/features/labs/design/prop-grid"
import * as Cuelume from "./media/audio/cuelume/submodel.ts"
import * as GalleryTransitions from "./media/gallery-view-transitions/submodel.ts"
import * as MusicNotation from "./media/music-notation/submodel.ts"
import * as YouTubeEmbed from "./media/youtube-embed/submodel.ts"
import * as Appearance from "@urm/features/settings/appearance"
import * as ManagedResourceLayer from "@urm/features/labs/managed-resource-layer"
import * as EffectRunner from "@urm/features/labs/runner"
import * as FoldkitLesson from "@urm/features/labs/walkthrough"
import { route_title as learn_route_title } from "./nav.ts"
import * as Learn from "./submodel.ts"
import * as QuerySyncTable from "./routing/query-sync-table/submodel.ts"
import {
    loadExternal,
    navigateInternal,
    replaceInternalHref,
} from "./routing/commands.ts"
import {
    ChangedUrl,
    ClickedLink,
    CompletedLoadExternal,
    CompletedNavigateInternal,
} from "./routing/message.ts"
import {
    DesktopRoute,
    devKbdShortcutsHref,
    devTerminalHref,
    dev_grep_href,
    LabsRoute,
    labsHref,
    labsMapHref,
    learn_href,
    routeForUrl,
    sidebarRouteTag,
} from "./routing/route.ts"
import * as SearchBar from "./search/search-bar/submodel.ts"
import * as ServicesCanvas from "./settings/services-canvas/submodel.ts"
import * as Charting from "./stats/charting/submodel.ts"
import * as SlowWarnings from "./sysadmin/slow-warnings/submodel.ts"
import * as VariableFonts from "./typography/variable-fonts/submodel.ts"
import {
    demos as ui_demos,
    demo_href as ui_demo_href,
    index_href as ui_index_href,
    is_ui_path,
} from "./ui/catalog.ts"
import * as UiLabs from "./ui/submodel.ts"
import { view as labs_view } from "./view.ts"

// MODEL

export const Model = S.Struct({
    route: DesktopRoute,
    appearance: Appearance.Model,
    is_sidebar_collapsed: S.Boolean,
    sidebar_tooltips: SidebarTooltips,
    breach_check: BreachCheck.Model,
    charting: Charting.Model,
    ct_scan: CtScanLab.Model,
    cuelume: Cuelume.Model,
    flex_form: FlexFormLab.Model,
    grid_builder: GridBuilderLab.Model,
    invoice: InvoiceLab.Model,
    prop_grid: PropGridLab.Model,
    dev: Dev.Model,
    dev_bookmarks: DevBookmarks.Model,
    dom_depth: DomDepth.Model,
    gallery: Gallery.Model,
    gallery_transitions: GalleryTransitions.Model,
    learn: Learn.Model,
    maps: Maps.Model,
    music_notation: MusicNotation.Model,
    otp_field: OtpField.Model,
    query_sync_table: QuerySyncTable.Model,
    search_bar: SearchBar.Model,
    services_canvas: ServicesCanvas.Model,
    slow_warnings: SlowWarnings.Model,
    spreadsheets: Spreadsheets.Model,
    ui: UiLabs.Model,
    variable_fonts: VariableFonts.Model,
    youtube: YouTubeEmbed.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const GotBreachCheckMessage = taggedStruct("GotBreachCheckMessage", {
    message: BreachCheck.Message,
})
export const GotChartingMessage = taggedStruct("GotChartingMessage", {
    message: Charting.Message,
})
export const GotAppearanceMessage = taggedStruct("GotAppearanceMessage", {
    message: Appearance.Message,
})
export const GotSidebarTooltipMessage = taggedStruct(
    "GotSidebarTooltipMessage",
    { id: S.String, message: Tooltip.Message }
)
export const ToggledSidebar = taggedStruct("ToggledSidebar")
export const GotCtScanMessage = taggedStruct("GotCtScanMessage", {
    message: CtScanLab.Message,
})
export const GotFlexFormMessage = taggedStruct("GotFlexFormMessage", {
    message: FlexFormLab.Message,
})
export const GotGridBuilderMessage = taggedStruct("GotGridBuilderMessage", {
    message: GridBuilderLab.Message,
})
export const GotInvoiceMessage = taggedStruct("GotInvoiceMessage", {
    message: InvoiceLab.Message,
})
export const GotPropGridMessage = taggedStruct("GotPropGridMessage", {
    message: PropGridLab.Message,
})
export const GotCuelumeMessage = taggedStruct("GotCuelumeMessage", {
    message: Cuelume.Message,
})
export const GotDevMessage = taggedStruct("GotDevMessage", {
    message: Dev.Message,
})
export const GotDevBookmarksMessage = taggedStruct("GotDevBookmarksMessage", {
    message: DevBookmarks.Message,
})
export const GotDomDepthMessage = taggedStruct("GotDomDepthMessage", {
    message: DomDepth.Message,
})
export const GotGalleryMessage = taggedStruct("GotGalleryMessage", {
    message: Gallery.Message,
})
export const GotGalleryTransitionsMessage = taggedStruct(
    "GotGalleryTransitionsMessage",
    { message: GalleryTransitions.Message }
)
export const GotLearnMessage = taggedStruct("GotLearnMessage", {
    message: Learn.Message,
})
export const GotMapsMessage = taggedStruct("GotMapsMessage", {
    message: Maps.Message,
})
export const GotMusicNotationMessage = taggedStruct("GotMusicNotationMessage", {
    message: MusicNotation.Message,
})
export const GotOtpFieldMessage = taggedStruct("GotOtpFieldMessage", {
    message: OtpField.Message,
})
export const GotQuerySyncTableMessage = taggedStruct(
    "GotQuerySyncTableMessage",
    { message: QuerySyncTable.Message }
)
export const GotSearchBarMessage = taggedStruct("GotSearchBarMessage", {
    message: SearchBar.Message,
})
export const GotServicesCanvasMessage = taggedStruct(
    "GotServicesCanvasMessage",
    { message: ServicesCanvas.Message }
)
export const GotSlowWarningsMessage = taggedStruct("GotSlowWarningsMessage", {
    message: SlowWarnings.Message,
})
export const GotSpreadsheetsMessage = taggedStruct("GotSpreadsheetsMessage", {
    message: Spreadsheets.Message,
})
export const GotUiMessage = taggedStruct("GotUiMessage", {
    message: UiLabs.Message,
})
export const GotVariableFontsMessage = taggedStruct("GotVariableFontsMessage", {
    message: VariableFonts.Message,
})
export const GotYouTubeMessage = taggedStruct("GotYouTubeMessage", {
    message: YouTubeEmbed.Message,
})

export const Message = S.Union([
    ChangedUrl,
    ClickedLink,
    CompletedNavigateInternal,
    CompletedLoadExternal,
    GotBreachCheckMessage,
    GotChartingMessage,
    GotAppearanceMessage,
    GotCtScanMessage,
    GotCuelumeMessage,
    GotDevBookmarksMessage,
    GotFlexFormMessage,
    GotGridBuilderMessage,
    GotInvoiceMessage,
    GotPropGridMessage,
    GotSidebarTooltipMessage,
    ToggledSidebar,
    GotDevMessage,
    GotDomDepthMessage,
    GotGalleryMessage,
    GotGalleryTransitionsMessage,
    GotLearnMessage,
    GotMapsMessage,
    GotMusicNotationMessage,
    GotOtpFieldMessage,
    GotQuerySyncTableMessage,
    GotSearchBarMessage,
    GotServicesCanvasMessage,
    GotSlowWarningsMessage,
    GotSpreadsheetsMessage,
    GotUiMessage,
    GotVariableFontsMessage,
    GotYouTubeMessage,
])
export type Message = typeof Message.Type

export type Services = BreachCheck.BreachCheckApi | Learn.Services

type UpdateReturn = Update.Return<Model, Message, Services>
type Commands = ReadonlyArray<Command.Command<Message, never, Services>>

const grep_preview = S.decodeUnknownSync(Preview)(preview_data)

// INIT

type NavItem = Readonly<{
    label: string
    routeTag: string
    href: string
    icon: (props?: Readonly<{ class?: string }>) => Html
    separatorBefore?: boolean
    children?: ReadonlyArray<NavItem>
}>

// Route tags come from the router rather than a parallel table, so a nav item
// highlights for exactly the path it links to.
const labs_tag = (href: string): string =>
    sidebarRouteTag(LabsRoute({ labs_path: href.replace(/\/+$/, "") }))

// A lesson's tag lives in the lesson catalogue, so the sidebar highlights the
// lesson its own href names rather than whatever a second table guessed.
const current_route_tag = (route: DesktopRoute): string =>
    route._tag === "Learn"
        ? Learn.route_tag(route.learn_path)
        : sidebarRouteTag(route)

const lab = (label: string, href: string, icon: NavItem["icon"]): NavItem => ({
    label,
    routeTag: labs_tag(href),
    href,
    icon,
})

const group = (
    label: string,
    icon: NavItem["icon"],
    children: ReadonlyArray<NavItem>
): NavItem => ({
    label,
    routeTag: `LabsGroup-${label}`,
    href: children[0]?.href ?? labsHref(),
    icon,
    children,
})

// This app is the labs, so the topics are the top level: there is no "Labs"
// node above them to click.
const nav_items: ReadonlyArray<NavItem> = [
    group("Auth", AppIcon.IconLock, [
        lab("Breach Check", BreachCheck.breach_check_href(), AppIcon.IconLock),
        lab("OTP Field", OtpField.otp_field_href(), AppIcon.IconHash),
    ]),
    group("Data", AppIcon.IconFileSpreadsheet, [
        lab("Spreadsheets", Spreadsheets.spreadsheets_href(), AppIcon.IconFileSpreadsheet),
    ]),
    group("Design", AppIcon.IconLayout, [
        lab("DOM Depth", DomDepth.dom_depth_href(), AppIcon.IconLayout),
        lab("Grid Builder", GridBuilderLab.grid_builder_href(), AppIcon.IconLayoutGrid),
        lab("Prop Grid", PropGridLab.prop_grid_href(), AppIcon.IconLayoutGrid),
        lab("URMCSS", UrmcssLab.urmcss_href(), AppIcon.IconFileCode),
    ]),
    group("Events", AppIcon.IconPin, [
        lab("Map", labsMapHref(), AppIcon.IconPin),
    ]),
    group("Finance", AppIcon.IconChartColumnDecreasing, [
        lab("Chart", FinanceChart.chart_href(), AppIcon.IconChartColumnDecreasing),
        lab("Invoice", InvoiceLab.invoice_href(), AppIcon.IconFileText),
    ]),
    group("Layout", AppIcon.IconLayoutGrid, [
        lab("Auto Grid", AutoGridLab.auto_grid_href(), AppIcon.IconLayoutGrid),
        lab("Conditional Grid", ConditionalGridLab.conditional_grid_href(), AppIcon.IconLayoutGrid),
        lab("Flex Form", FlexFormLab.flexFormHref(), AppIcon.IconRows),
        lab("Fukol Grid", FukolGridLab.fukol_grid_href(), AppIcon.IconColumns),
    ]),
    group("Media", AppIcon.IconImage, [
        lab("3D Gallery", Gallery.gallery_path, AppIcon.IconImage),
        lab("Cuelume", Cuelume.cuelume_href(), AppIcon.IconVolume),
        lab("Gallery Transitions", GalleryTransitions.gallery_href(), AppIcon.IconImagePlus),
        lab("Music Notation", MusicNotation.music_notation_href(), AppIcon.IconVolume),
        lab("YouTube", YouTubeEmbed.embed_href(), AppIcon.IconBrandYoutube),
    ]),
    group("Performance", AppIcon.IconTimer, [
        lab("CT Scan", CtScanLab.ct_scan_href(), AppIcon.IconTimer),
    ]),
    group("Routing", AppIcon.IconFileSpreadsheet, [
        lab("Query Sync Table", QuerySyncTable.query_sync_table_href(), AppIcon.IconFileSpreadsheet),
    ]),
    group("Search", AppIcon.IconSearch, [
        lab("Search Bar", SearchBar.search_bar_href(), AppIcon.IconSearch),
    ]),
    group("Settings", AppIcon.IconSettings, [
        lab("Services Canvas", ServicesCanvas.services_canvas_href(), AppIcon.IconSettings),
    ]),
    group("Stats", AppIcon.IconChartColumnDecreasing, [
        lab("Charting", Charting.charting_href(), AppIcon.IconChartColumnDecreasing),
    ]),
    group("Sysadmin", AppIcon.IconTimer, [
        lab("Slow Warnings", SlowWarnings.slow_warnings_href(), AppIcon.IconTimer),
    ]),
    group("Typography", AppIcon.IconFileType, [
        lab("Variable Fonts", VariableFonts.variable_fonts_href(), AppIcon.IconFileType),
    ]),
    {
        label: "UI",
        routeTag: labs_tag(ui_index_href()),
        href: ui_index_href(),
        icon: AppIcon.IconLayoutGrid,
        children: ui_demos.map((demo) =>
            lab(demo.label, ui_demo_href(demo.slug), AppIcon.IconLayoutGrid)
        ),
    },
    {
        label: "Learn",
        routeTag: "Learn",
        href: learn_href(),
        icon: AppIcon.IconListChecks,
        children: Learn.nav_items<Message>(),
    },
    {
        label: "Dev",
        routeTag: "Dev",
        href: dev_grep_href(),
        icon: AppIcon.IconBrandTypescript,
        separatorBefore: true,
        children: [
            {
                label: "Grep",
                routeTag: "DevGrep",
                href: dev_grep_href(),
                icon: AppIcon.IconSearch,
            },
            {
                label: "Terminal",
                routeTag: "DevTerminal",
                href: devTerminalHref(),
                icon: AppIcon.IconTerminal,
            },
            {
                label: "Keyboard Shortcuts",
                routeTag: "DevKbdShortcuts",
                href: devKbdShortcutsHref(),
                icon: AppIcon.IconCommand,
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

const flatten_nav = (items: ReadonlyArray<NavItem>): ReadonlyArray<NavItem> =>
    items.flatMap((item) => [item, ...flatten_nav(item.children ?? [])])

const initial_sidebar_tooltips = (): SidebarTooltips => ({
    toggle: createSidebarTooltip("labs-sidebar-toggle"),
    home: createSidebarTooltip("labs-sidebar-home"),
    navItems: Object.fromEntries(
        flatten_nav(nav_items).map((item) => [
            item.routeTag,
            createSidebarTooltip(`labs-sidebar-${item.routeTag}`),
        ])
    ),
})

const update_sidebar_tooltip = (
    tooltips: SidebarTooltips,
    id: string,
    message: Tooltip.Message
): SidebarTooltips => {
    const current =
        id === SIDEBAR_TOOLTIP_TOGGLE_KEY
            ? tooltips.toggle
            : id === SIDEBAR_TOOLTIP_HOME_KEY
              ? tooltips.home
              : tooltips.navItems[id]

    if (current === undefined) return tooltips

    const { model: tooltip } = Tooltip.update(current, message)
    if (id === SIDEBAR_TOOLTIP_TOGGLE_KEY)
        return { ...tooltips, toggle: tooltip }
    if (id === SIDEBAR_TOOLTIP_HOME_KEY) return { ...tooltips, home: tooltip }
    return {
        ...tooltips,
        navItems: { ...tooltips.navItems, [id]: tooltip },
    }
}

const learn_path_of = (route: DesktopRoute): string =>
    route._tag === "Learn" ? route.learn_path : ""

export const init = (url: Url): UpdateReturn => {
    const route = routeForUrl(url)
    const [appearance, appearance_commands] = Appearance.init()
    const [ct_scan] = CtScanLab.init()
    const [flex_form] = FlexFormLab.init()
    const [grid_builder] = GridBuilderLab.init()
    const [prop_grid] = PropGridLab.init()
    const [learn, learn_commands] = Learn.init(learn_path_of(route))
    const [maps, maps_commands] = Maps.init(route)
    const [charting, charting_commands] = Charting.init(route)
    const [dom_depth, dom_depth_commands] = DomDepth.init(route)
    const [gallery, gallery_commands] = Gallery.init(route)
    const spreadsheets = Spreadsheets.init(route)
    const [ui, ui_commands] = UiLabs.init(route)

    return {
        model: {
            route,
            appearance,
            is_sidebar_collapsed: false,
            sidebar_tooltips: initial_sidebar_tooltips(),
            breach_check: BreachCheck.init(route),
            charting,
            ct_scan,
            cuelume: Cuelume.init(route),
            flex_form,
            grid_builder,
            invoice: InvoiceLab.init(),
            prop_grid,
            dev: restore_grep_route(Dev.init()[0], url),
            dev_bookmarks: DevBookmarks.init(route),
            dom_depth,
            gallery,
            gallery_transitions: GalleryTransitions.init(route),
            learn,
            maps,
            music_notation: MusicNotation.init(route),
            otp_field: OtpField.init(route),
            query_sync_table: QuerySyncTable.init(route),
            search_bar: SearchBar.init(),
            services_canvas: ServicesCanvas.init(route),
            slow_warnings: SlowWarnings.init(route),
            spreadsheets: spreadsheets.model,
            ui,
            variable_fonts: VariableFonts.init(route),
            youtube: YouTubeEmbed.init(route),
        },
        commands: [
            ...Command.mapMessages(appearance_commands, (message) =>
                GotAppearanceMessage({ message })
            ),
            ...Command.mapMessages(charting_commands, (message) =>
                GotChartingMessage({ message })
            ),
            ...Command.mapMessages(dom_depth_commands, (message) =>
                GotDomDepthMessage({ message })
            ),
            ...Command.mapMessages(gallery_commands, (message) =>
                GotGalleryMessage({ message })
            ),
            ...Command.mapMessages(learn_commands, (message) =>
                GotLearnMessage({ message })
            ),
            ...Command.mapMessages(maps_commands, (message) =>
                GotMapsMessage({ message })
            ),
            ...Command.mapMessages(spreadsheets.commands ?? [], (message) =>
                GotSpreadsheetsMessage({ message })
            ),
            ...Command.mapMessages(ui_commands, (message) =>
                GotUiMessage({ message })
            ),
        ],
    }
}

// UPDATE

const changed_route = (
    model: Model,
    route: DesktopRoute,
    url: Url
): UpdateReturn => {
    const [charting, charting_commands] = Charting.changed_route(
        model.charting,
        route
    )
    const [dom_depth, dom_depth_commands] = DomDepth.changed_route(
        model.dom_depth,
        route
    )
    const [gallery, gallery_commands] = Gallery.changed_route(
        model.gallery,
        route
    )
    const [learn, learn_commands] = Learn.changed_route(
        model.learn,
        learn_path_of(route),
        learn_path_of(model.route)
    )
    const [maps, maps_commands] = Maps.changed_route(
        model.maps,
        model.route,
        route
    )
    const [music_notation, music_notation_commands] =
        MusicNotation.changed_route(model.music_notation, route)
    const spreadsheets = Spreadsheets.changed_route(model.spreadsheets, route)
    const [ui, ui_commands] = UiLabs.changed_route(model.ui, route)

    return {
        model: {
            ...model,
            route,
            breach_check: BreachCheck.changed_route(model.breach_check, route),
            charting,
            cuelume: Cuelume.changed_route(model.cuelume, route),
            dev: restore_grep_route(model.dev, url),
            dev_bookmarks: DevBookmarks.changed_route(
                model.dev_bookmarks,
                route
            ),
            dom_depth,
            gallery,
            gallery_transitions: GalleryTransitions.changed_route(
                model.gallery_transitions,
                route
            ),
            learn,
            maps,
            music_notation,
            otp_field: OtpField.changed_route(model.otp_field, route),
            query_sync_table: QuerySyncTable.changed_route(
                model.query_sync_table,
                route
            ),
            search_bar: SearchBar.changed_route(),
            services_canvas: ServicesCanvas.changed_route(
                model.services_canvas,
                route
            ),
            slow_warnings: SlowWarnings.changed_route(
                model.slow_warnings,
                route
            ),
            spreadsheets: spreadsheets.model,
            ui,
            variable_fonts: VariableFonts.changed_route(
                model.variable_fonts,
                route
            ),
            youtube: YouTubeEmbed.changed_route(model.youtube, route),
        },
        commands: [
            ...Command.mapMessages(charting_commands, (message) =>
                GotChartingMessage({ message })
            ),
            ...Command.mapMessages(dom_depth_commands, (message) =>
                GotDomDepthMessage({ message })
            ),
            ...Command.mapMessages(gallery_commands, (message) =>
                GotGalleryMessage({ message })
            ),
            ...Command.mapMessages(learn_commands, (message) =>
                GotLearnMessage({ message })
            ),
            ...Command.mapMessages(maps_commands, (message) =>
                GotMapsMessage({ message })
            ),
            ...Command.mapMessages(music_notation_commands, (message) =>
                GotMusicNotationMessage({ message })
            ),
            ...Command.mapMessages(spreadsheets.commands ?? [], (message) =>
                GotSpreadsheetsMessage({ message })
            ),
            ...Command.mapMessages(ui_commands, (message) =>
                GotUiMessage({ message })
            ),
        ],
    }
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedUrl: ({ url }) =>
                changed_route(model, routeForUrl(url), url),
            ClickedLink: ({ request }) =>
                M.value(request).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tagsExhaustive({
                        Internal: ({ url }) => ({
                            model,
                            commands: [navigateInternal(url)] as Commands,
                        }),
                        External: ({ href }) => ({
                            model,
                            commands: [loadExternal(href)] as Commands,
                        }),
                    })
                ),
            CompletedNavigateInternal: () => ({ model }),
            CompletedLoadExternal: () => ({ model }),
            GotBreachCheckMessage: ({ message: child }) => {
                const [breach_check, commands] = BreachCheck.update(
                    model.breach_check,
                    child
                )
                return {
                    model: { ...model, breach_check },
                    commands: Command.mapMessages(commands, (message) =>
                        GotBreachCheckMessage({ message })
                    ),
                }
            },
            GotChartingMessage: ({ message: child }) => {
                const [charting, commands] = Charting.update(
                    model.charting,
                    child
                )
                return {
                    model: { ...model, charting },
                    commands: Command.mapMessages(commands, (message) =>
                        GotChartingMessage({ message })
                    ),
                }
            },
            GotAppearanceMessage: ({ message: child }) => {
                const [appearance, commands] = Appearance.updateDeviceCache(
                    model.appearance,
                    child
                )
                return {
                    model: { ...model, appearance },
                    commands: Command.mapMessages(commands, (message) =>
                        GotAppearanceMessage({ message })
                    ),
                }
            },
            GotSidebarTooltipMessage: ({ id, message: child }) => ({
                model: {
                    ...model,
                    sidebar_tooltips: update_sidebar_tooltip(
                        model.sidebar_tooltips,
                        id,
                        child
                    ),
                },
            }),
            ToggledSidebar: () => ({
                model: {
                    ...model,
                    is_sidebar_collapsed: !model.is_sidebar_collapsed,
                },
            }),
            GotCtScanMessage: ({ message: child }) => {
                const [ct_scan, commands] = CtScanLab.update(
                    model.ct_scan,
                    child
                )
                return {
                    model: { ...model, ct_scan },
                    commands: Command.mapMessages(commands, (message) =>
                        GotCtScanMessage({ message })
                    ),
                }
            },
            GotFlexFormMessage: ({ message: child }) => {
                const [flex_form, commands] = FlexFormLab.update(
                    model.flex_form,
                    child
                )
                return {
                    model: { ...model, flex_form },
                    commands: Command.mapMessages(commands, (message) =>
                        GotFlexFormMessage({ message })
                    ),
                }
            },
            GotGridBuilderMessage: ({ message: child }) => {
                const [grid_builder, commands] = GridBuilderLab.update(
                    model.grid_builder,
                    child
                )
                return {
                    model: { ...model, grid_builder },
                    commands: Command.mapMessages(commands, (message) =>
                        GotGridBuilderMessage({ message })
                    ),
                }
            },
            GotInvoiceMessage: ({ message: child }) => ({
                model: {
                    ...model,
                    invoice: InvoiceLab.update(model.invoice, child),
                },
            }),
            GotPropGridMessage: ({ message: child }) => {
                const [prop_grid, commands] = PropGridLab.update(
                    model.prop_grid,
                    child
                )
                return {
                    model: { ...model, prop_grid },
                    commands: Command.mapMessages(commands, (message) =>
                        GotPropGridMessage({ message })
                    ),
                }
            },
            GotCuelumeMessage: ({ message: child }) => {
                const [cuelume, commands] = Cuelume.update(model.cuelume, child)
                return {
                    model: { ...model, cuelume },
                    commands: Command.mapMessages(commands, (message) =>
                        GotCuelumeMessage({ message })
                    ),
                }
            },
            GotDevMessage: ({ message: child }) => {
                const [dev, commands] = Dev.update(model.dev, child)
                const query_changed =
                    child._tag === "GotGrepMessage" &&
                    grep_request_key(dev.grep) !==
                        grep_request_key(model.dev.grep) &&
                    model.route._tag === "Dev" &&
                    model.route.dev_path === "/dev/grep"
                return {
                    model: { ...model, dev },
                    commands: [
                        ...Command.mapMessages(commands, (message) =>
                            GotDevMessage({ message })
                        ),
                        ...(query_changed
                            ? [
                                  replaceInternalHref(
                                      grep_url_href(
                                          dev.grep.query,
                                          grep_request_parameters(dev.grep)
                                      )
                                  ),
                              ]
                            : []),
                    ] as Commands,
                }
            },
            GotDevBookmarksMessage: ({ message: child }) => {
                const [dev_bookmarks, commands] = DevBookmarks.update(
                    model.dev_bookmarks,
                    child
                )
                return {
                    model: { ...model, dev_bookmarks },
                    commands: Command.mapMessages(commands, (message) =>
                        GotDevBookmarksMessage({ message })
                    ),
                }
            },
            GotDomDepthMessage: ({ message: child }) => {
                const [dom_depth, commands] = DomDepth.update(
                    model.dom_depth,
                    child
                )
                return {
                    model: { ...model, dom_depth },
                    commands: Command.mapMessages(commands, (message) =>
                        GotDomDepthMessage({ message })
                    ),
                }
            },
            GotGalleryMessage: ({ message: child }) => {
                const [gallery, commands] = Gallery.update(model.gallery, child)
                return {
                    model: { ...model, gallery },
                    commands: Command.mapMessages(commands, (message) =>
                        GotGalleryMessage({ message })
                    ),
                }
            },
            GotGalleryTransitionsMessage: ({ message: child }) => {
                const [gallery_transitions] = GalleryTransitions.update(
                    model.gallery_transitions,
                    child
                )
                return { model: { ...model, gallery_transitions } }
            },
            GotLearnMessage: ({ message: child }) => {
                const [learn, commands] = Learn.update(model.learn, child)
                return {
                    model: { ...model, learn },
                    commands: Command.mapMessages(commands, (message) =>
                        GotLearnMessage({ message })
                    ),
                }
            },
            GotMapsMessage: ({ message: child }) => {
                const [maps, commands] = Maps.update(model.maps, child)
                return {
                    model: { ...model, maps },
                    commands: Command.mapMessages(commands, (message) =>
                        GotMapsMessage({ message })
                    ),
                }
            },
            GotMusicNotationMessage: ({ message: child }) => {
                const [music_notation, commands] = MusicNotation.update(
                    model.music_notation,
                    child
                )
                return {
                    model: { ...model, music_notation },
                    commands: Command.mapMessages(commands, (message) =>
                        GotMusicNotationMessage({ message })
                    ),
                }
            },
            GotOtpFieldMessage: ({ message: child }) => {
                const [otp_field, commands] = OtpField.update(
                    model.otp_field,
                    child
                )
                return {
                    model: { ...model, otp_field },
                    commands: Command.mapMessages(commands, (message) =>
                        GotOtpFieldMessage({ message })
                    ),
                }
            },
            GotQuerySyncTableMessage: ({ message: child }) => {
                const next = QuerySyncTable.update(
                    model.query_sync_table,
                    child
                )
                return {
                    model: { ...model, query_sync_table: next.model },
                    commands: Command.mapMessages(
                        next.commands ?? [],
                        (message) => GotQuerySyncTableMessage({ message })
                    ),
                }
            },
            GotSearchBarMessage: ({ message: child }) => {
                const next = SearchBar.update(model.search_bar, child)
                return { model: { ...model, search_bar: next.model } }
            },
            GotServicesCanvasMessage: ({ message: child }) => ({
                model: {
                    ...model,
                    services_canvas: ServicesCanvas.update(
                        model.services_canvas,
                        child
                    ),
                },
            }),
            GotSlowWarningsMessage: ({ message: child }) => {
                const [slow_warnings, commands] = SlowWarnings.update(
                    model.slow_warnings,
                    child
                )
                return {
                    model: { ...model, slow_warnings },
                    commands: Command.mapMessages(commands, (message) =>
                        GotSlowWarningsMessage({ message })
                    ),
                }
            },
            GotSpreadsheetsMessage: ({ message: child }) => {
                const next = Spreadsheets.update(model.spreadsheets, child)
                return {
                    model: { ...model, spreadsheets: next.model },
                    commands: Command.mapMessages(
                        next.commands ?? [],
                        (message) => GotSpreadsheetsMessage({ message })
                    ),
                }
            },
            GotUiMessage: ({ message: child }) => {
                const [ui, commands] = UiLabs.update(model.ui, child)
                return {
                    model: { ...model, ui },
                    commands: Command.mapMessages(commands, (message) =>
                        GotUiMessage({ message })
                    ),
                }
            },
            GotVariableFontsMessage: ({ message: child }) => {
                const [variable_fonts, commands] = VariableFonts.update(
                    model.variable_fonts,
                    child
                )
                return {
                    model: { ...model, variable_fonts },
                    commands: Command.mapMessages(commands, (message) =>
                        GotVariableFontsMessage({ message })
                    ),
                }
            },
            GotYouTubeMessage: ({ message: child }) => {
                const [youtube, commands] = YouTubeEmbed.update(
                    model.youtube,
                    child
                )
                return {
                    model: { ...model, youtube },
                    commands: Command.mapMessages(commands, (message) =>
                        GotYouTubeMessage({ message })
                    ),
                }
            },
        })
    )

// SUBSCRIPTIONS

export const subscriptions = Subscription.aggregate<Model, Message>()(
    Subscription.lift(Spreadsheets.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.spreadsheets),
        toParentMessage: (message) => GotSpreadsheetsMessage({ message }),
    }),
    Subscription.lift(Charting.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.charting),
        toParentMessage: (message) => GotChartingMessage({ message }),
    }),
    Subscription.lift(SearchBar.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.search_bar),
        toParentMessage: (message) => GotSearchBarMessage({ message }),
    }),
    Subscription.lift(UiLabs.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.ui),
        toParentMessage: (message) => GotUiMessage({ message }),
    }),
    YouTubeEmbed.subscriptions<Model, Message>({
        read: (model) => Option.some(model.youtube),
        toParentMessage: (message) => GotYouTubeMessage({ message }),
    }),
    Maps.subscriptions<Model, Message>({
        read: (model) => Option.some(model.maps),
        toParentMessage: (message) => GotMapsMessage({ message }),
        when: (model) =>
            model.route._tag === "Labs" && Maps.isAppScope(model.route.labs_path),
    }),
    Appearance.subscriptions<Model, Message>({
        read: (model) => Option.some(model.appearance),
        toParentMessage: (message) => GotAppearanceMessage({ message }),
    }),
    Subscription.lift(grep_search_subscriptions)<Model, Message>({
        read: (model) => Option.some(model.dev.grep),
        toParentMessage: (message) =>
            GotDevMessage({ message: Dev.GotGrepMessage({ message }) }),
        when: (model) =>
            grep_preview.snapshot === "remote" &&
            model.route._tag === "Dev" &&
            model.route.dev_path === "/dev/grep",
    }),
    Subscription.lift(FoldkitLesson.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.learn.foldkit),
        toParentMessage: (message) =>
            GotLearnMessage({ message: Learn.GotFoldkitMessage({ message }) }),
        when: (model) =>
            model.route._tag === "Learn" &&
            FoldkitLesson.isFoldkitPath(model.route.learn_path),
    }),
    Subscription.lift(EffectRunner.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.learn.effect_runner),
        toParentMessage: (message) =>
            GotLearnMessage({
                message: Learn.GotEffectRunnerMessage({ message }),
            }),
        when: (model) =>
            model.route._tag === "Learn" &&
            EffectRunner.isEffectExamplePath(model.route.learn_path),
    })
)

// MANAGED RESOURCES

/**
 * The lessons' external handles. A resource is released when its reader returns
 * None, which is how leaving a lesson's route tears its handle down.
 */
export const managedResources = ManagedResource.aggregate<Model, Message>()(
    ManagedResource.lift(ManagedResourceLayer.managedResources)<
        Model,
        Message
    >({
        read: (model) =>
            model.route._tag === "Learn" &&
            ManagedResourceLayer.isManagedResourceLayerPath(
                model.route.learn_path
            )
                ? Option.some(model.learn.managed_resource_layer)
                : Option.none(),
        toParentMessage: (message) =>
            GotLearnMessage({
                message: Learn.GotManagedResourceLayerMessage({ message }),
            }),
    }),
    ManagedResource.lift(FoldkitLesson.managedResources)<Model, Message>({
        read: (model) =>
            model.route._tag === "Learn" &&
            FoldkitLesson.isFoldkitPath(model.route.learn_path)
                ? Option.some(model.learn.foldkit)
                : Option.none(),
        toParentMessage: (message) =>
            GotLearnMessage({ message: Learn.GotFoldkitMessage({ message }) }),
    }),
    ManagedResource.lift(EffectRunner.managedResources)<Model, Message>({
        read: (model) =>
            model.route._tag === "Learn" &&
            EffectRunner.isEffectExamplePath(model.route.learn_path)
                ? Option.some(model.learn.effect_runner)
                : Option.none(),
        toParentMessage: (message) =>
            GotLearnMessage({
                message: Learn.GotEffectRunnerMessage({ message }),
            }),
    })
)

// VIEW

const lab_view = (model: Model, h: HtmlBuilder<Message>, path: string): Html => {
    if (BreachCheck.is_breach_check_path(path))
        return h.submodel({
            slotId: "labs-auth-breach-check",
            model: model.breach_check,
            view: BreachCheck.view,
            toParentMessage: (message) => GotBreachCheckMessage({ message }),
        })
    if (OtpField.is_otp_field_path(path))
        return h.submodel({
            slotId: "labs-auth-otp-field",
            model: model.otp_field,
            view: OtpField.view,
            toParentMessage: (message) => GotOtpFieldMessage({ message }),
        })
    if (Spreadsheets.is_spreadsheets_path(path))
        return h.submodel({
            slotId: "labs-data-spreadsheets",
            model: model.spreadsheets,
            view: Spreadsheets.view,
            toParentMessage: (message) => GotSpreadsheetsMessage({ message }),
        })
    if (Cuelume.is_cuelume_path(path))
        return h.submodel({
            slotId: "labs-media-audio-cuelume",
            model: model.cuelume,
            view: Cuelume.view,
            toParentMessage: (message) => GotCuelumeMessage({ message }),
        })
    if (DomDepth.is_dom_depth_path(path))
        return h.submodel({
            slotId: "labs-design-dom-depth",
            model: model.dom_depth,
            view: DomDepth.view,
            toParentMessage: (message) => GotDomDepthMessage({ message }),
        })
    if (Gallery.is_gallery_path(path))
        return h.submodel({
            slotId: "labs-media-3d-gallery",
            model: model.gallery,
            view: Gallery.view,
            toParentMessage: (message) => GotGalleryMessage({ message }),
        })
    if (GalleryTransitions.is_gallery_path(path))
        return h.submodel({
            slotId: "labs-media-gallery-transitions",
            model: model.gallery_transitions,
            view: GalleryTransitions.view,
            toParentMessage: (message) =>
                GotGalleryTransitionsMessage({ message }),
        })
    if (Maps.isAppScope(path))
        return h.submodel({
            slotId: "labs-events-map",
            model: model.maps,
            view: Maps.view,
            viewInputs: {},
            toParentMessage: (message) => GotMapsMessage({ message }),
        })
    if (MusicNotation.is_music_notation_path(path))
        return h.submodel({
            slotId: "labs-media-music-notation",
            model: model.music_notation,
            view: MusicNotation.view,
            toParentMessage: (message) => GotMusicNotationMessage({ message }),
        })
    if (YouTubeEmbed.is_embed_path(path))
        return h.submodel({
            slotId: "labs-media-youtube-embed",
            model: model.youtube,
            view: YouTubeEmbed.view,
            toParentMessage: (message) => GotYouTubeMessage({ message }),
        })
    if (QuerySyncTable.is_query_sync_table_path(path))
        return h.submodel({
            slotId: "labs-routing-query-sync-table",
            model: model.query_sync_table,
            view: QuerySyncTable.view,
            toParentMessage: (message) =>
                GotQuerySyncTableMessage({ message }),
        })
    if (ServicesCanvas.is_services_canvas_path(path))
        return h.submodel({
            slotId: "labs-settings-services-canvas",
            model: model.services_canvas,
            view: ServicesCanvas.view,
            toParentMessage: (message) =>
                GotServicesCanvasMessage({ message }),
        })
    if (Charting.is_charting_path(path))
        return h.submodel({
            slotId: "labs-stats-charting",
            model: model.charting,
            view: Charting.view,
            toParentMessage: (message) => GotChartingMessage({ message }),
        })
    if (SlowWarnings.is_slow_warnings_path(path))
        return h.submodel({
            slotId: "labs-sysadmin-slow-warnings",
            model: model.slow_warnings,
            view: SlowWarnings.view,
            toParentMessage: (message) => GotSlowWarningsMessage({ message }),
        })
    if (VariableFonts.is_variable_fonts_path(path))
        return h.submodel({
            slotId: "labs-typography-variable-fonts",
            model: model.variable_fonts,
            view: VariableFonts.view,
            toParentMessage: (message) => GotVariableFontsMessage({ message }),
        })
    if (SearchBar.is_search_bar_path(path))
        return SearchBar.view(
            model.search_bar,
            SearchBar.search_sections(nav_items),
            (message) => GotSearchBarMessage({ message }),
            h
        )
    if (GridBuilderLab.is_grid_builder_path(path))
        return GridBuilderLab.view(
            model.grid_builder,
            (message) => GotGridBuilderMessage({ message }),
            h
        )
    if (PropGridLab.is_prop_grid_path(path))
        return PropGridLab.view(
            model.prop_grid,
            (message) => GotPropGridMessage({ message }),
            h
        )
    if (InvoiceLab.is_invoice_path(path))
        return h.submodel({
            slotId: "labs-finance-invoice",
            model: model.invoice,
            view: InvoiceLab.view,
            toParentMessage: (message) => GotInvoiceMessage({ message }),
        })
    if (CtScanLab.is_ct_scan_path(path))
        return CtScanLab.view(
            model.ct_scan,
            (message) => GotCtScanMessage({ message }),
            h
        )
    if (FlexFormLab.isFlexFormPath(path))
        return FlexFormLab.view(
            model.flex_form,
            (message) => GotFlexFormMessage({ message }),
            h
        )
    if (is_ui_path(path))
        return h.submodel({
            slotId: "labs-ui",
            model: model.ui,
            view: UiLabs.view,
            toParentMessage: (message) => GotUiMessage({ message }),
        })

    return labs_view(h, path)
}

const elsewhere_view = (h: HtmlBuilder<Message>) =>
    h.main(
        [h.Class("mx-auto grid w-full max-w-2xl gap-4 px-4 py-10 sm:px-6")],
        [
            h.h1([h.Class("text-2xl font-semibold")], ["Not a labs route"]),
            h.p(
                [h.Class("text-muted-foreground")],
                [
                    "This app serves the labs. Everything else belongs to urm.dev.",
                ]
            ),
            h.a(
                [h.Href(labsHref()), h.Class("underline underline-offset-4")],
                ["Go to the labs index"]
            ),
        ]
    )

const header_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.header(
        [
            h.Class(
                "flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6"
            ),
        ],
        [
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(ToggledSidebar()),
                    h.AriaLabel(
                        model.is_sidebar_collapsed
                            ? "Expand sidebar"
                            : "Collapse sidebar"
                    ),
                    h.Class(
                        "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]"
                    ),
                ],
                [
                    model.is_sidebar_collapsed
                        ? AppIcon.IconSidebarOpen({ class: "size-4" })
                        : AppIcon.IconPanelLeft({ class: "size-4" }),
                ]
            ),
            h.div(
                [
                    h.Role("group"),
                    h.AriaLabel("Appearance"),
                    h.Class("flex flex-wrap items-center gap-2"),
                ],
                [
                    Appearance.themeMenuView(
                        model.appearance,
                        (message) => GotAppearanceMessage({ message }),
                        h
                    ),
                    Appearance.themeModeButtonView(
                        model.appearance,
                        (message) => GotAppearanceMessage({ message }),
                        h
                    ),
                    Appearance.fontMenuView(
                        model.appearance,
                        (message) => GotAppearanceMessage({ message }),
                        h
                    ),
                ]
            ),
        ]
    )

// The theme tokens are carried by the app's own container, as urm.dev carries
// them: `body` itself stays untouched.
const shell = (
    model: Model,
    h: HtmlBuilder<Message>,
    content: Html
): Html =>
    h.div(
        [h.Class("flex h-dvh overflow-hidden bg-background text-foreground")],
        [
            sidebarShellView<Message>(
                {
                    currentRoute: current_route_tag(model.route),
                    title: "Labs",
                    subtitle: "URM",
                    homeHref: labsHref(),
                    homeIcon: AppIcon.IconFlaskConical,
                    toggleIconCollapsed: AppIcon.IconSidebarOpen,
                    toggleIconExpanded: AppIcon.IconPanelLeft,
                    navItems: nav_items,
                    sidebarTooltips: model.sidebar_tooltips,
                    isCollapsed: model.is_sidebar_collapsed,
                    // The toggle lives in the header, as it does in urm.dev.
                    showToggle: false,
                    onToggle: ToggledSidebar(),
                    toSidebarTooltipMessage: (id, message) =>
                        GotSidebarTooltipMessage({ id, message }),
                },
                h
            ),
            h.div(
                [h.Class("flex min-w-0 flex-1 flex-col overflow-hidden")],
                [
                    header_view(model, h),
                    h.main(
                        [h.Class("min-w-0 flex-1 overflow-y-auto")],
                        [content]
                    ),
                ]
            ),
        ]
    )

const dev_view = (model: Model, h: HtmlBuilder<Message>, path: string): Html =>
    DevBookmarks.is_bookmarks_path(path)
        ? h.submodel({
              slotId: "labs-dev-bookmarks",
              model: model.dev_bookmarks,
              view: DevBookmarks.view,
              toParentMessage: (message) =>
                  GotDevBookmarksMessage({ message }),
          })
        : h.div(
        [h.Class("min-w-0 px-4 py-6 sm:px-6 lg:px-8")],
        [
            h.submodel({
                slotId: "labs-dev",
                model: model.dev,
                view: Dev.view,
                viewInputs: {
                    path,
                    terminal_href: devTerminalHref(),
                    grep_href: dev_grep_href(),
                    bookmarks_href: DevBookmarks.bookmarks_href(),
                    grep_preview,
                    kbd_shortcuts_href: devKbdShortcutsHref(),
                },
                toParentMessage: (message) => GotDevMessage({ message }),
            }),
        ]
    )

export const view = (model: Model, h: HtmlBuilder<Message>): Document =>
    model.route._tag === "Dev"
        ? {
              title: "Dev · Labs · URM",
              body: shell(model, h, dev_view(model, h, model.route.dev_path)),
          }
        : model.route._tag === "Labs"
        ? {
              title: "Labs · URM",
              body: shell(model, h, lab_view(model, h, model.route.labs_path)),
          }
        : model.route._tag === "Learn"
          ? {
                title: learn_route_title(model.route.learn_path, undefined),
                body: shell(model, h, Learn.view(
                        model.learn,
                        model.route.learn_path,
                        (message) => GotLearnMessage({ message }),
                        h
                    )
                ),
            }
          : { title: "Labs · URM", body: shell(model, h, elsewhere_view(h)) }
