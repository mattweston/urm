import { Schema as S } from "effect"
import { AppRoute } from "./route.ts"

export const AppModel = S.Struct({
    route: AppRoute,
    isSidebarCollapsed: S.Boolean,
    isSidebarMobileOpen: S.Boolean,
    sidebarTooltipsRevision: S.Number,
})

export type AppModel = typeof AppModel.Type
