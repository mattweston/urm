import {
    type SidebarTooltips,
    createSidebarTooltip,
} from "@urm/ui/foldkit/sidebar-shell.tooltips.ts"

export const SIDEBAR_NAV_ROUTE_TAGS = [
    "Audit",
    "Logging",
    "Tracing",
    "Metrics",
    "Errors",
    "System",
]

const createSidebarNavTooltipModels = () =>
    Object.fromEntries(
        SIDEBAR_NAV_ROUTE_TAGS.map((route_tag) => [
            route_tag,
            createSidebarTooltip(`sidebar-${route_tag}`),
        ])
    )

export const createSidebarTooltips = (): SidebarTooltips => ({
    toggle: createSidebarTooltip("sidebar-toggle"),
    home: createSidebarTooltip("sidebar-home"),
    navItems: createSidebarNavTooltipModels(),
})
