import {
    type SidebarTooltips,
    createSidebarTooltip,
} from "@urm/ui/foldkit/sidebar-shell.tooltips.ts"
import { BLOG_NAV_ROUTE_TAGS } from "../blog.sidebar.ts"

const createBlogSidebarNavTooltipModels = () =>
    Object.fromEntries(
        BLOG_NAV_ROUTE_TAGS.map((routeTag) => [
            routeTag,
            createSidebarTooltip(`blog-sidebar-${routeTag}`),
        ])
    )

export const createSidebarTooltips = (): SidebarTooltips => ({
    toggle: createSidebarTooltip("blog-sidebar-toggle"),
    home: createSidebarTooltip("blog-sidebar-home"),
    navItems: createBlogSidebarNavTooltipModels(),
})
