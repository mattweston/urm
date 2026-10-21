import { Schema as S } from "effect"

export const Role = S.Literals(["Viewer", "Developer", "Billing", "Owner"])

export type Role = typeof Role.Type

export const TeamMember = S.Struct({
    id: S.String,
    name: S.String,
    email: S.String,
    role: Role,
})

export type TeamMember = typeof TeamMember.Type

export const Model = S.Struct({
    members: S.Array(TeamMember),
    isSidebarCollapsed: S.Boolean,
    isSidebarMobileOpen: S.Boolean,
    sidebarTooltipsRevision: S.Number,
})

export type Model = typeof Model.Type
