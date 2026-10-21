import type { SidebarTooltips } from "@urm/ui/foldkit/sidebar-shell.tooltips.ts"
import { createSidebarTooltips } from "./sidebar.tooltips.ts"

const sidebarTooltipsState = {
    current: createSidebarTooltips(),
}

export const resetSidebarTooltipsState = () => {
    sidebarTooltipsState.current = createSidebarTooltips()
}

export const getSidebarTooltipsState = (): SidebarTooltips =>
    sidebarTooltipsState.current

export const setSidebarTooltipsState = (sidebarTooltips: SidebarTooltips) => {
    sidebarTooltipsState.current = sidebarTooltips
}
