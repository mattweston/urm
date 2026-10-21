import type { PortalSidebarNavItem } from "@urm/ui/foldkit/sidebar-shell.view.ts"
import {
    IconFilePlus,
    IconFolder,
    IconFolderOpen,
    IconHome,
} from "@urm/ui/foldkit/icons/view.ts"

export const BLOG_SIDEBAR_TITLE = "Blog"
export const BLOG_SIDEBAR_SUBTITLE = "URM"
export const BLOG_HOME_HREF = "/blog/urm/drafts/"

export const BLOG_NAV_ROUTE_TAGS = ["new", "published", "drafts"] as const

export const BLOG_NAV_ITEMS: ReadonlyArray<PortalSidebarNavItem> = [
    {
        label: "new",
        routeTag: "new",
        href: "/blog/urm/new/",
        icon: IconFilePlus,
    },
    {
        label: "published",
        routeTag: "published",
        href: "/blog/urm/published/",
        icon: IconFolderOpen,
    },
    {
        label: "drafts",
        routeTag: "drafts",
        href: "/blog/urm/drafts/",
        icon: IconFolder,
    },
]

export const BLOG_HOME_ICON = IconHome
