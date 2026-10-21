import { mail_navigation as NAV_ITEMS } from "./navigation.ts"
import { Match as M } from "effect"
import { Array, Option } from "effect"
import { Submodel } from "foldkit"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import {
    sidebarShellMobileView,
    sidebarShellView,
} from "@urm/ui/foldkit/sidebar-shell.view.ts"
import { mails } from "../components/mail-data.ts"
import { mailDisplayView } from "../components/mail-display.ts"
import { mailListView } from "../components/mail-list.ts"
import { view as contactsView } from "../contacts/index.ts"
import { view as membersView } from "../members/index.ts"
import { membersManageView } from "../members/index.ts"
import { view as newsletterView } from "../newsletter/index.ts"
import { view as sendView } from "../send/index.ts"
import { view as sentView } from "../sent/index.ts"
import { view as statsView } from "../stats/index.ts"
import { view as subscriptionsView } from "../subscriptions/index.ts"
import { view as templatesView } from "../templates/app.view.ts"
import { transactional_view } from "../transactional/view.ts"
import type { AppModel } from "./app.model.ts"
import {
    GotContactsMessage,
    GotMembersMessage,
    GotMembersManageMessage,
    GotNewsletterMessage,
    GotSendMessage,
    GotTransactionalMessage,
    GotSentMessage,
    GotStatsMessage,
    GotSubscriptionsMessage,
    GotTemplatesMessage,
    GotSidebarTooltipMessage,
    ToggledAppSidebarIsCollapsed,
    ToggledAppSidebarMobileIsOpen,
} from "./app.message.ts"
import {
    MuteThreadToggled,
    SearchChanged,
    SelectedFilterChanged,
    SelectedMailChanged,
    type AppMessage,
} from "./app.message.ts"
import { mailHref } from "./route.ts"
import { getSidebarTooltipsState } from "./sidebar.tooltips.state.ts"
// import type { Message as ContactsMessage } from "../contacts/index.ts"
// import type { Message as MembersMessage } from "../members/index.ts"
// import type { Message as MembersManageMessage } from "../members/manage.ts"
const stableToggledAppSidebarIsCollapsed = ToggledAppSidebarIsCollapsed()
const stableToggledAppSidebarMobileIsOpen = ToggledAppSidebarMobileIsOpen()

const toSidebarTooltipMessage = (
    key: string,
    message: import("@foldkit/ui/tooltip").Message
) => GotSidebarTooltipMessage({ tooltipId: key, message })

const sidebarView = (
    currentRouteTag: string,
    isCollapsed: boolean,
    h: HtmlBuilder<AppMessage>
) =>
    sidebarShellView<AppMessage>(
        {
            currentRoute: currentRouteTag,
            title: "Mail",
            subtitle: "URM",
            homeHref: mailHref(),
            homeIcon: AppIcon.IconMail,
            toggleIconCollapsed: AppIcon.IconSidebarOpen,
            toggleIconExpanded: AppIcon.IconPanelLeft,
            navItems: NAV_ITEMS,
            sidebarTooltips: getSidebarTooltipsState(),
            isCollapsed,
            onToggle: stableToggledAppSidebarIsCollapsed,
            toSidebarTooltipMessage,
        },
        h
    )

const sidebarMobileView = (
    currentRouteTag: string,
    isOpen: boolean,
    h: HtmlBuilder<AppMessage>
) =>
    sidebarShellMobileView<AppMessage>(
        {
            currentRoute: currentRouteTag,
            title: "Mail",
            subtitle: "URM",
            homeHref: mailHref(),
            homeIcon: AppIcon.IconMail,
            navItems: NAV_ITEMS,
            isOpen,
            onToggle: stableToggledAppSidebarMobileIsOpen,
        },
        h
    )

const mailAppView = (
    model: AppModel,
    h: HtmlBuilder<AppMessage>
): Document["body"] => {
    const maybeSelectedMail = Array.findFirst(
        mails,
        ({ id }) => id === model.selectedMailId
    )
    const selectedMail = Option.match(maybeSelectedMail, {
        onNone: () =>
            Option.match(Array.head(mails), {
                onNone: () => null,
                onSome: (mail) => mail,
            }),
        onSome: (mail) => mail,
    })

    return h.div(
        [h.Class("h-full overflow-hidden bg-background text-foreground")],
        [
            h.div(
                [
                    h.Class(
                        "mx-auto grid h-full max-w-[1600px] gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:p-6"
                    ),
                ],
                [
                    mailListView<AppMessage>(
                        {
                            mails,
                            selectedMailId: model.selectedMailId,
                            filter: model.filter,
                            search: model.search,
                            onSelectMail: (mailId) =>
                                SelectedMailChanged({ mailId }),
                            onFilterChanged: (filter) =>
                                SelectedFilterChanged({ filter }),
                            onSearchChanged: (value) =>
                                SearchChanged({ value }),
                        },
                        h
                    ),
                    mailDisplayView<AppMessage>(
                        {
                            mail: selectedMail,
                            mutedThread: model.mutedThread,
                            onToggleMute: () => MuteThreadToggled(),
                        },
                        h
                    ),
                ]
            ),
        ]
    )
}

const notFoundView = (
    path: string,
    h: HtmlBuilder<AppMessage>
): Document["body"] =>
    h.div(
        [
            h.Class(
                "flex min-h-screen items-center justify-center bg-background p-8 text-center text-foreground"
            ),
        ],
        [
            h.div(
                [h.Class("max-w-xl space-y-4")],
                [
                    h.h1(
                        [h.Class("text-4xl font-bold")],
                        ["Mail page not found"]
                    ),
                    h.p(
                        [h.Class("text-muted-foreground")],
                        [`The path "${path}" was not found.`]
                    ),
                ]
            ),
        ]
    )

export const titleForRoute = (model: AppModel): string =>
    M.value(model.route).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            Mail: () => "Mail",
            Send: () => "Send email",
            Sent: () => "Sent",
            Stats: () => "Mail stats",
            Contacts: () => "Contacts",
            Members: () => "Members",
            MembersManage: () => "Members",
            Newsletter: () => "Newsletter",
            Subscriptions: () => "Subscriptions",
            Templates: () => "Email Templates",
            Transactional: () => "Transactional emails",
            NotFound: () => "Mail",
        })
    )

const contentView = (model: AppModel, h: HtmlBuilder<AppMessage>): Html => {
    const body = M.value(model.route).pipe(
        M.withReturnType<Document["body"]>(),
        M.tagsExhaustive({
            Mail: () => mailAppView(model, h),
            Send: () =>
                h.submodel({
                    slotId: "mail-send",
                    model: model.send,
                    view: sendView,
                    toParentMessage: (message) => GotSendMessage({ message }),
                }),
            Sent: () =>
                h.submodel({
                    slotId: "mail-sent",
                    model: model.sent,
                    view: sentView,
                    toParentMessage: (message) => GotSentMessage({ message }),
                }),
            Stats: () =>
                h.submodel({
                    slotId: "mail-stats",
                    model: model.stats,
                    view: statsView,
                    toParentMessage: (message) => GotStatsMessage({ message }),
                }),
            Contacts: () =>
                h.submodel({
                    slotId: "mail-contacts",
                    model: model.contacts,
                    view: contactsView,
                    toParentMessage: (message) =>
                        GotContactsMessage({ message }),
                }),
            Members: () =>
                h.submodel({
                    slotId: "mail-members",
                    model: model.members,
                    view: membersView,
                    toParentMessage: (message) =>
                        GotMembersMessage({ message }),
                }),
            MembersManage: () =>
                h.submodel({
                    slotId: "mail-members-manage",
                    model: model.membersManage,
                    view: membersManageView,
                    toParentMessage: (message) =>
                        GotMembersManageMessage({ message }),
                }),
            Newsletter: () =>
                h.submodel({
                    slotId: "mail-newsletter",
                    model: model.newsletter,
                    view: newsletterView,
                    toParentMessage: (message) =>
                        GotNewsletterMessage({ message }),
                }),
            Subscriptions: () =>
                h.submodel({
                    slotId: "mail-subscriptions",
                    model: model.subscriptions,
                    view: subscriptionsView,
                    toParentMessage: (message) =>
                        GotSubscriptionsMessage({ message }),
                }),
            Templates: () =>
                templatesView(
                    model.templates,
                    (message) => GotTemplatesMessage({ message }),
                    h
                ),
            Transactional: ({ template_id }) =>
                transactional_view(
                    template_id,
                    h,
                    model.newsletter.publication_theme,
                    model.transactional,
                    (message) => GotTransactionalMessage({ message })
                ),
            NotFound: ({ path }) => notFoundView(path, h),
        })
    )

    const mainClassName =
        model.route._tag === "Mail"
            ? "relative z-0 flex-1 h-full min-h-0 overflow-auto bg-background"
            : "relative z-0 flex-1 h-full min-h-0 overflow-auto bg-background p-4 md:p-8"

    return h.main(
        [h.Class(mainClassName)],
        [h.keyed("div")(model.route._tag, [], [body])]
    )
}

export const submodelView = Submodel.defineView<AppModel, AppMessage>(
    contentView
)

export const view = (model: AppModel, h: HtmlBuilder<AppMessage>): Document => {
    return {
        title: titleForRoute(model),
        body: h.div(
            [h.Class("min-h-screen bg-background text-foreground")],
            [
                sidebarMobileView(
                    model.route._tag,
                    model.isSidebarMobileOpen,
                    h
                ),
                h.div(
                    [h.Class("flex h-[calc(100dvh-4rem)] overflow-hidden")],
                    [
                        sidebarView(
                            model.route._tag,
                            model.isSidebarCollapsed,
                            h
                        ),
                        contentView(model, h),
                    ]
                ),
            ]
        ),
    }
}
