import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Message as SidebarTooltipMessageSchema } from "@foldkit/ui/tooltip"
import {
    ChangedUrl,
    ClickedLink,
    CompletedLoadExternal,
    CompletedNavigateInternal,
} from "./route.message.ts"

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

export const AppMessage = S.Union([
    ClickedLink,
    ChangedUrl,
    CompletedNavigateInternal,
    CompletedLoadExternal,
    GotSidebarTooltipMessage,
    ToggledAppSidebarIsCollapsed,
    ToggledAppSidebarMobileIsOpen,
])

export type AppMessage = typeof AppMessage.Type
