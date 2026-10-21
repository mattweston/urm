import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import { Match as M } from "effect"
import { Submodel } from "foldkit"
import { type Html, type HtmlBuilder } from "foldkit/html"
import type { Document } from "foldkit/html"
import {
    sidebarShellMobileView,
    sidebarShellView,
} from "@urm/ui/foldkit/sidebar-shell.view.ts"
import { emptyStatsInput, type StatsInput } from "../components/charts.ts"
import { chartsPageView } from "../components/charts-page.ts"
import { searchView } from "../components/search.ts"
import type { AppModel } from "./app.model.ts"
import {
    GotSidebarTooltipMessage,
    ToggledAppSidebarIsCollapsed,
    ToggledAppSidebarMobileIsOpen,
    type AppMessage,
} from "./app.message.ts"
import { statsHref } from "./route.ts"
import { getSidebarTooltipsState } from "./sidebar.tooltips.state.ts"

const stableToggledAppSidebarIsCollapsed = ToggledAppSidebarIsCollapsed()
const stableToggledAppSidebarMobileIsOpen = ToggledAppSidebarMobileIsOpen()

const toSidebarTooltipMessage = (
    key: string,
    message: import("@foldkit/ui/tooltip").Message
) => GotSidebarTooltipMessage({ tooltipId: key, message })

type NavItem = Readonly<{
    label: string
    routeTag: string
    href: string
    icon: (props?: Readonly<{ class?: string }>) => Html
}>

const NAV_ITEMS: ReadonlyArray<NavItem> = [
    {
        label: "Stats",
        routeTag: "Charts",
        href: statsHref(),
        icon: AppIcon.IconChartColumnDecreasing,
    },
]

const sidebarView = (
    currentRouteTag: string,
    isCollapsed: boolean,
    h: HtmlBuilder<AppMessage>
) =>
    sidebarShellView<AppMessage>(
        {
            currentRoute: currentRouteTag,
            title: "Stats",
            subtitle: "URM",
            homeHref: statsHref(),
            homeIcon: AppIcon.IconChartColumnDecreasing,
            toggleIconCollapsed: AppIcon.IconSidebarOpen,
            toggleIconExpanded: AppIcon.IconPanelLeft,
            navItems: NAV_ITEMS,
            sidebarTooltips: getSidebarTooltipsState(),
            isCollapsed,
            onToggle: stableToggledAppSidebarIsCollapsed,
            toSidebarTooltipMessage,
        },
        h
    )

const sidebarMobileView = (
    currentRouteTag: string,
    isOpen: boolean,
    h: HtmlBuilder<AppMessage>
) =>
    sidebarShellMobileView<AppMessage>(
        {
            currentRoute: currentRouteTag,
            title: "Stats",
            subtitle: "URM",
            homeHref: statsHref(),
            homeIcon: AppIcon.IconChartColumnDecreasing,
            navItems: NAV_ITEMS,
            isOpen,
            onToggle: stableToggledAppSidebarMobileIsOpen,
        },
        h
    )

const shell = (
    routeContent: Document["body"],
    h: HtmlBuilder<AppMessage>
): Document["body"] =>
    h.div(
        [h.Class("min-h-screen bg-background text-foreground")],
        [
            h.div(
                [
                    h.Class(
                        "mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-4 lg:px-6"
                    ),
                ],
                [
                    h.header(
                        [
                            h.Class(
                                "flex flex-col gap-4 border-b-(length:--surface-border-width) border-border pb-4 md:flex-row md:items-center"
                            ),
                        ],
                        [h.div([h.Class("md:ml-auto")], [searchView()])]
                    ),
                    routeContent,
                ]
            ),
        ]
    )

const statsView = (
    model: AppModel,
    input: StatsInput,
    h: HtmlBuilder<AppMessage>
): Html => {
    const routeContent = M.value(model.route).pipe(
        M.withReturnType<Document["body"]>(),
        M.tagsExhaustive({
            Charts: () => chartsPageView(input),
            NotFound: ({ path }) =>
                h.div(
                    [h.Class("flex min-h-[50vh] items-center justify-center")],
                    [
                        h.div(
                            [h.Class("space-y-3 text-center")],
                            [
                                h.h1(
                                    [h.Class("text-4xl font-bold")],
                                    ["Stats not found"]
                                ),
                                h.p(
                                    [h.Class("text-muted-foreground")],
                                    [`The path "${path}" was not found.`]
                                ),
                            ]
                        ),
                    ]
                ),
        })
    )

    return shell(routeContent, h)
}

export const submodelView = Submodel.defineView<
    AppModel,
    AppMessage,
    StatsInput
>(statsView)

export const view = (model: AppModel, h: HtmlBuilder<AppMessage>): Document => {
    const body = h.div(
        [h.Class("min-h-screen bg-background text-foreground")],
        [
            sidebarMobileView(model.route._tag, model.isSidebarMobileOpen, h),
            h.div(
                [h.Class("flex h-[calc(100dvh-4rem)] overflow-hidden")],
                [
                    sidebarView(model.route._tag, model.isSidebarCollapsed, h),
                    h.main(
                        [
                            h.Class(
                                "relative z-0 flex-1 h-full min-h-0 overflow-auto bg-background"
                            ),
                        ],
                        [statsView(model, emptyStatsInput(), h)]
                    ),
                ]
            ),
        ]
    )

    return { title: "Stats", body }
}
