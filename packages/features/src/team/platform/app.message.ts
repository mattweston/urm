import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Role } from "./app.model.ts"
import { Message as SidebarTooltipMessageSchema } from "@foldkit/ui/tooltip"

export const SelectedRoleChanged = taggedStruct("SelectedRoleChanged", {
    memberId: S.String,
    role: Role,
})

export const ClickedTeamHome = taggedStruct("ClickedTeamHome")

export const GotSidebarTooltipMessage = taggedStruct(
    "GotSidebarTooltipMessage",
    {
        tooltipId: S.String,
        message: SidebarTooltipMessageSchema,
    }
)

export const ToggledAppSidebarIsCollapsed = taggedStruct(
    "ToggledAppSidebarIsCollapsed"
)
export const ToggledAppSidebarMobileIsOpen = taggedStruct(
    "ToggledAppSidebarMobileIsOpen"
)

export const Message = S.Union([
    SelectedRoleChanged,
    ClickedTeamHome,
    GotSidebarTooltipMessage,
    ToggledAppSidebarIsCollapsed,
    ToggledAppSidebarMobileIsOpen,
])

export type Message = typeof Message.Type
