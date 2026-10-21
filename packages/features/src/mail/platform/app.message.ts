import { Schema as S } from "effect"
import { EmailPublicationTheme } from "@urm/email/publication-theme"
import { taggedStruct } from "foldkit/schema"
import { Message as TransactionalMessage } from "../transactional/editor.ts"
export const GotTransactionalMessage = taggedStruct("GotTransactionalMessage", {
    message: TransactionalMessage,
})
import { Message as ContactsMessageSchema } from "@urm/features/mail/contacts"
import { Message as MembersMessageSchema } from "@urm/features/mail/members"
import { Message as MembersManageMessageSchema } from "@urm/features/mail/members/manage"
import { Message as NewsletterMessageSchema } from "../newsletter/index.ts"
import { Message as SendMessageSchema } from "../send/index.ts"
import { Message as SentMessageSchema } from "../sent/index.ts"
import { Message as StatsMessageSchema } from "../stats/index.ts"
import { Message as SubscriptionsMessageSchema } from "../subscriptions/index.ts"
import { Message as TemplatesMessageSchema } from "../templates/app.message.ts"
import { Message as SidebarTooltipMessageSchema } from "@foldkit/ui/tooltip"
import {
    ChangedUrl,
    ClickedLink,
    CompletedLoadExternal,
    CompletedNavigateInternal,
} from "./route.message.ts"

export const SelectedMailChanged = taggedStruct("SelectedMailChanged", {
    mailId: S.String,
})
export const LoadedPublicationEmailTheme = taggedStruct(
    "LoadedPublicationEmailTheme",
    {
        theme: EmailPublicationTheme,
    }
)

export const SelectedFilterChanged = taggedStruct("SelectedFilterChanged", {
    filter: S.Union([S.Literal("all"), S.Literal("unread")]),
})

export const SearchChanged = taggedStruct("SearchChanged", {
    value: S.String,
})

export const MuteThreadToggled = taggedStruct("MuteThreadToggled")

export const GotContactsMessage = taggedStruct("GotContactsMessage", {
    message: ContactsMessageSchema,
})

export const GotMembersMessage = taggedStruct("GotMembersMessage", {
    message: MembersMessageSchema,
})

export const GotMembersManageMessage = taggedStruct("GotMembersManageMessage", {
    message: MembersManageMessageSchema,
})

export const GotNewsletterMessage = taggedStruct("GotNewsletterMessage", {
    message: NewsletterMessageSchema,
})

export const GotSendMessage = taggedStruct("GotSendMessage", {
    message: SendMessageSchema,
})

export const GotSentMessage = taggedStruct("GotSentMessage", {
    message: SentMessageSchema,
})

export const GotStatsMessage = taggedStruct("GotStatsMessage", {
    message: StatsMessageSchema,
})

export const GotSubscriptionsMessage = taggedStruct("GotSubscriptionsMessage", {
    message: SubscriptionsMessageSchema,
})

export const GotTemplatesMessage = taggedStruct("GotTemplatesMessage", {
    message: TemplatesMessageSchema,
})

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
    GotTransactionalMessage,
    LoadedPublicationEmailTheme,
    ClickedLink,
    ChangedUrl,
    CompletedNavigateInternal,
    CompletedLoadExternal,
    SelectedMailChanged,
    SelectedFilterChanged,
    SearchChanged,
    MuteThreadToggled,
    GotContactsMessage,
    GotMembersMessage,
    GotMembersManageMessage,
    GotNewsletterMessage,
    GotSendMessage,
    GotSentMessage,
    GotStatsMessage,
    GotSubscriptionsMessage,
    GotTemplatesMessage,
    GotSidebarTooltipMessage,
    ToggledAppSidebarIsCollapsed,
    ToggledAppSidebarMobileIsOpen,
])

export type AppMessage = typeof AppMessage.Type
