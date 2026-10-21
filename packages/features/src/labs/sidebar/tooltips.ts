import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"

export const SIDEBAR_DEMO_NAV_ITEM_LABELS = [
    "Inbox",
    "Drafts",
    "Team",
    "Members",
    "Settings",
    "Profile",
    "Design",
]

export const sidebarDemoTooltipKey = (label: string): string =>
    label.toLowerCase()

export const SidebarDemoTooltips = S.Struct({
    toggle: Ui.Tooltip.Model,
    logo: Ui.Tooltip.Model,
    navItems: S.Record(S.String, Ui.Tooltip.Model),
})

export type SidebarDemoTooltips = typeof SidebarDemoTooltips.Type

export const createSidebarDemoTooltips = (): SidebarDemoTooltips => ({
    toggle: Ui.Tooltip.init({ id: "sidebar-demo-toggle", showDelay: 0 }),
    logo: Ui.Tooltip.init({ id: "sidebar-demo-logo", showDelay: 0 }),
    navItems: Object.fromEntries(
        SIDEBAR_DEMO_NAV_ITEM_LABELS.map((label) => [
            sidebarDemoTooltipKey(label),
            Ui.Tooltip.init({
                id: `sidebar-demo-${sidebarDemoTooltipKey(label)}`,
                showDelay: 0,
            }),
        ])
    ),
})
