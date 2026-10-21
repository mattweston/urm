/**
 * # Sidebar shell tooltips
 *
 * Parent-owned tooltip state for the sidebar shell. Foldkit components hold no
 * internal state, so the parent model stores one `Tooltip.Model` per hoverable:
 * `toggle`, `home`, and one per nav item keyed by `routeTag`. Build them with
 * `createSidebarTooltip(id)` at init and update them when the shell emits
 * messages via `toSidebarTooltipMessage` (see the docs feature for the pattern).
 */
import { Schema as S } from "effect"
import { Tooltip } from "@foldkit/ui"

export const SIDEBAR_TOOLTIP_TOGGLE_KEY = "toggle"
export const SIDEBAR_TOOLTIP_HOME_KEY = "home"
const SIDEBAR_TOOLTIP_SHOW_DELAY_MS = 0

export const SidebarTooltips = S.Struct({
    toggle: Tooltip.Model,
    home: Tooltip.Model,
    navItems: S.Record(S.String, Tooltip.Model),
})

export type SidebarTooltips = typeof SidebarTooltips.Type

export const createSidebarTooltip = (id: string) =>
    Tooltip.init({ id, showDelay: SIDEBAR_TOOLTIP_SHOW_DELAY_MS })
