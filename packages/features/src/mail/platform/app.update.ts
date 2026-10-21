import { Array, Effect, Match as M, Option } from "effect"
import { Command } from "foldkit"
import {
    init as initTransactional,
    update as updateTransactional,
} from "../transactional/editor.ts"
import * as Ui from "@foldkit/ui"
import { toString as urlToString } from "foldkit/url"
import { mails } from "../components/mail-data.ts"
import type { AppModel } from "./app.model.ts"
import {
    GotContactsMessage,
    GotTransactionalMessage,
    GotMembersManageMessage,
    GotMembersMessage,
    GotNewsletterMessage,
    GotSendMessage,
    GotSentMessage,
    GotStatsMessage,
    GotSubscriptionsMessage,
    GotTemplatesMessage,
    GotSidebarTooltipMessage,
    type AppMessage,
} from "./app.message.ts"
import { loadExternal, navigateInternal } from "./route.command.ts"
import { isAppScope, urlToAppRoute } from "./route.ts"
import {
    init as initContacts,
    update as updateContacts,
} from "../contacts/index.ts"
import type { Message as ContactsMessage } from "../contacts/index.ts"
import {
    init as initMembers,
    update as updateMembers,
} from "../members/index.ts"
import type { Message as MembersMessage } from "../members/index.ts"
import {
    initDeferred as initMembersManageDeferred,
    reflectMembers,
    reflectMembersFailure,
    update as updateMembersManage,
} from "../members/manage.ts"
import type { Message as MembersManageMessage } from "../members/manage.ts"
import {
    init as initNewsletter,
    update as updateNewsletter,
} from "../newsletter/index.ts"
import type { Message as NewsletterMessage } from "../newsletter/index.ts"
import {
    init as initSend,
    reflectContacts as reflectSendContacts,
    update as updateSend,
} from "../send/index.ts"
import type { Message as SendMessage } from "../send/index.ts"
import {
    init as initSent,
    reflectContacts as reflectSentContacts,
    update as updateSent,
} from "../sent/index.ts"
import type { Message as SentMessage } from "../sent/index.ts"
import { init as initStats, update as updateStats } from "../stats/index.ts"
import type { Message as StatsMessage } from "../stats/index.ts"
import {
    init as initSubscriptions,
    reflectContacts as reflectSubscriptionContacts,
    update as updateSubscriptions,
} from "../subscriptions/index.ts"
import type { Message as SubscriptionsMessage } from "../subscriptions/index.ts"
import {
    init as initTemplates,
    update as updateTemplates,
} from "../templates/app.update.ts"
import type { Message as TemplatesMessage } from "../templates/app.message.ts"
import {
    getSidebarTooltipsState,
    resetSidebarTooltipsState,
    setSidebarTooltipsState,
} from "./sidebar.tooltips.state.ts"
import {
    SIDEBAR_TOOLTIP_HOME_KEY,
    SIDEBAR_TOOLTIP_TOGGLE_KEY,
} from "@urm/ui/foldkit/sidebar-shell.tooltips.ts"

type UpdateReturn = readonly [
    AppModel,
    ReadonlyArray<Command.Command<AppMessage>>,
]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const mapContactsCommands = (
    commands: ReadonlyArray<Command.Command<ContactsMessage>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) => GotContactsMessage({ message }))
        )
    )

const mapMembersCommands = (
    commands: ReadonlyArray<Command.Command<MembersMessage>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) => GotMembersMessage({ message }))
        )
    )

const mapMembersManageCommands = (
    commands: ReadonlyArray<Command.Command<MembersManageMessage>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) => GotMembersManageMessage({ message }))
        )
    )

const mapNewsletterCommands = (
    commands: ReadonlyArray<Command.Command<NewsletterMessage>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) => GotNewsletterMessage({ message }))
        )
    )

const mapSendCommands = (
    commands: ReadonlyArray<Command.Command<SendMessage>>
) =>
    commands.map(
        Command.mapEffect(Effect.map((message) => GotSendMessage({ message })))
    )

const mapSentCommands = (
    commands: ReadonlyArray<Command.Command<SentMessage>>
) =>
    commands.map(
        Command.mapEffect(Effect.map((message) => GotSentMessage({ message })))
    )

const mapStatsCommands = (
    commands: ReadonlyArray<Command.Command<StatsMessage>>
) =>
    commands.map(
        Command.mapEffect(Effect.map((message) => GotStatsMessage({ message })))
    )

const mapSubscriptionsCommands = (
    commands: ReadonlyArray<Command.Command<SubscriptionsMessage>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) => GotSubscriptionsMessage({ message }))
        )
    )

const mapTemplatesCommands = (
    commands: ReadonlyArray<Command.Command<TemplatesMessage>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) => GotTemplatesMessage({ message }))
        )
    )

const mapSidebarTooltipCommands = (
    key: string,
    commands: ReadonlyArray<Command.Command<Ui.Tooltip.Message>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) =>
                GotSidebarTooltipMessage({ tooltipId: key, message })
            )
        )
    )

const delegateSidebarTooltip = (
    model: AppModel,
    key: string,
    message: Ui.Tooltip.Message
): UpdateReturn => {
    const sidebarTooltips = getSidebarTooltipsState()

    const maybeTooltip =
        key === SIDEBAR_TOOLTIP_TOGGLE_KEY
            ? sidebarTooltips.toggle
            : key === SIDEBAR_TOOLTIP_HOME_KEY
              ? sidebarTooltips.home
              : sidebarTooltips.navItems[key]

    if (maybeTooltip === undefined) {
        return [model, []]
    }

    const { model: nextTooltip, commands = [] } = Ui.Tooltip.update(
        maybeTooltip,
        message
    )

    const nextSidebarTooltips =
        key === SIDEBAR_TOOLTIP_TOGGLE_KEY
            ? {
                  ...sidebarTooltips,
                  toggle: nextTooltip,
              }
            : key === SIDEBAR_TOOLTIP_HOME_KEY
              ? {
                    ...sidebarTooltips,
                    home: nextTooltip,
                }
              : {
                    ...sidebarTooltips,
                    navItems: {
                        ...sidebarTooltips.navItems,
                        [key]: nextTooltip,
                    },
                }

    setSidebarTooltipsState(nextSidebarTooltips)

    return [
        {
            ...model,
            sidebarTooltipsRevision: model.sidebarTooltipsRevision + 1,
        },
        mapSidebarTooltipCommands(key, commands),
    ]
}

const delegateContacts = (
    model: AppModel,
    message: ContactsMessage
): UpdateReturn => {
    const [contacts, commands] = updateContacts(model.contacts, message)

    return [
        {
            ...model,
            contacts,
            subscriptions:
                message._tag === "ContactsLoaded" ||
                message._tag === "ContactCreated" ||
                message._tag === "ContactUpdated" ||
                message._tag === "ContactDeleted"
                    ? reflectSubscriptionContacts(
                          model.subscriptions,
                          contacts.contacts
                      )
                    : model.subscriptions,
            send:
                message._tag === "ContactsLoaded" ||
                message._tag === "ContactCreated" ||
                message._tag === "ContactUpdated" ||
                message._tag === "ContactDeleted"
                    ? reflectSendContacts(model.send, contacts.contacts)
                    : model.send,
            sent:
                message._tag === "ContactsLoaded" ||
                message._tag === "ContactCreated" ||
                message._tag === "ContactUpdated" ||
                message._tag === "ContactDeleted"
                    ? reflectSentContacts(model.sent, contacts.contacts)
                    : model.sent,
        },
        mapContactsCommands(commands),
    ]
}

const delegateMembers = (
    model: AppModel,
    message: MembersMessage
): UpdateReturn => {
    const [members, commands] = updateMembers(model.members, message)

    return [
        {
            ...model,
            members,
            membersManage:
                message._tag === "MembersLoaded"
                    ? reflectMembers(model.membersManage, members.members)
                    : message._tag === "FailedLoadingMembers"
                      ? reflectMembersFailure(
                            model.membersManage,
                            members.error ?? "Failed to load members"
                        )
                      : model.membersManage,
        },
        mapMembersCommands(commands),
    ]
}

const delegateMembersManage = (
    model: AppModel,
    message: MembersManageMessage
): UpdateReturn => {
    const [membersManage, commands] = updateMembersManage(
        model.membersManage,
        message
    )

    return [
        {
            ...model,
            membersManage,
            members:
                message._tag === "MembersLoaded" ||
                message._tag === "MemberCreated" ||
                message._tag === "MemberUpdated" ||
                message._tag === "MemberDeleted"
                    ? {
                          ...model.members,
                          loading: false,
                          error: null,
                          members: [...membersManage.members],
                      }
                    : message._tag === "FailedLoadingMembers"
                      ? {
                            ...model.members,
                            loading: false,
                            error: membersManage.error,
                        }
                      : model.members,
        },
        mapMembersManageCommands(commands),
    ]
}

const delegateNewsletter = (
    model: AppModel,
    message: NewsletterMessage
): UpdateReturn => {
    const [newsletter, commands] = updateNewsletter(model.newsletter, message)

    return [
        {
            ...model,
            newsletter,
        },
        mapNewsletterCommands(commands),
    ]
}

const delegateSend = (model: AppModel, message: SendMessage): UpdateReturn => {
    const [send, commands] = updateSend(model.send, message)

    return [{ ...model, send }, mapSendCommands(commands)]
}

const delegateSent = (model: AppModel, message: SentMessage): UpdateReturn => {
    const [sent, commands] = updateSent(model.sent, message)

    return [{ ...model, sent }, mapSentCommands(commands)]
}

const delegateStats = (
    model: AppModel,
    message: StatsMessage
): UpdateReturn => {
    const [stats, commands] = updateStats(model.stats, message)

    return [{ ...model, stats }, mapStatsCommands(commands)]
}

const delegateSubscriptions = (
    model: AppModel,
    message: SubscriptionsMessage
): UpdateReturn => {
    const [subscriptions, commands] = updateSubscriptions(
        model.subscriptions,
        message
    )

    return [
        {
            ...model,
            subscriptions,
        },
        mapSubscriptionsCommands(commands),
    ]
}

const delegateTemplates = (
    model: AppModel,
    message: TemplatesMessage
): UpdateReturn => {
    const [templates, commands] = updateTemplates(model.templates, message)

    return [
        {
            ...model,
            templates,
        },
        mapTemplatesCommands(commands),
    ]
}

export const init = (pathname: string, domain_id = ""): UpdateReturn => {
    const route = urlToAppRoute(pathname)
    const maybeFirstMail = Array.head(mails)
    const [contacts, contactsCommands] = initContacts(domain_id)
    const [members, membersCommands] = initMembers()
    const [membersManage] = initMembersManageDeferred()
    const [newsletter, newsletterCommands] = initNewsletter()
    const [send, sendCommands] = initSend()
    const [sent, sentCommands] = initSent()
    const [stats, statsCommands] = initStats()
    const [subscriptions, subscriptionsCommands] = initSubscriptions()
    const [templates, templatesCommands] = initTemplates()
    resetSidebarTooltipsState()

    return [
        {
            route,
            transactional: initTransactional(domain_id),
            selectedMailId: Option.match(maybeFirstMail, {
                onNone: () => "",
                onSome: ({ id }) => id,
            }),
            filter: "all",
            search: "",
            mutedThread: false,
            contacts,
            members,
            membersManage,
            newsletter,
            send,
            sent,
            stats,
            subscriptions,
            templates,
            isSidebarCollapsed: false,
            isSidebarMobileOpen: false,
            sidebarTooltipsRevision: 0,
        },
        [
            ...mapContactsCommands(contactsCommands),
            ...mapMembersCommands(membersCommands),
            ...mapNewsletterCommands(newsletterCommands),
            ...mapSendCommands(sendCommands),
            ...mapSentCommands(sentCommands),
            ...mapStatsCommands(statsCommands),
            ...mapSubscriptionsCommands(subscriptionsCommands),
            ...mapTemplatesCommands(templatesCommands),
        ],
    ]
}

export const update = (model: AppModel, message: AppMessage): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            GotTransactionalMessage: ({ message }) => {
                const [transactional, commands] = updateTransactional(
                    model.transactional,
                    message
                )
                return [
                    {
                        ...model,
                        transactional,
                        send: {
                            ...model.send,
                            transactional_templates: transactional.states,
                        },
                    },
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotTransactionalMessage({ message })
                            )
                        )
                    ),
                ]
            },
            LoadedPublicationEmailTheme: ({ theme }) => [
                {
                    ...model,
                    newsletter: {
                        ...model.newsletter,
                        publication_theme: theme,
                    },
                    send: { ...model.send, publication_theme: theme },
                },
                [],
            ],
            GotContactsMessage: ({ message }) =>
                delegateContacts(model, message),
            GotMembersMessage: ({ message }) => delegateMembers(model, message),
            GotMembersManageMessage: ({ message }) =>
                delegateMembersManage(model, message),
            GotNewsletterMessage: ({ message }) =>
                delegateNewsletter(model, message),
            GotSendMessage: ({ message }) => delegateSend(model, message),
            GotSentMessage: ({ message }) => delegateSent(model, message),
            GotStatsMessage: ({ message }) => delegateStats(model, message),
            GotSubscriptionsMessage: ({ message }) =>
                delegateSubscriptions(model, message),
            GotTemplatesMessage: ({ message }) =>
                delegateTemplates(model, message),
            GotSidebarTooltipMessage: ({ tooltipId: key, message }) =>
                delegateSidebarTooltip(model, key, message),
            ToggledAppSidebarIsCollapsed: () => [
                {
                    ...model,
                    isSidebarCollapsed: !model.isSidebarCollapsed,
                },
                [],
            ],
            ToggledAppSidebarMobileIsOpen: () => [
                {
                    ...model,
                    isSidebarMobileOpen: !model.isSidebarMobileOpen,
                },
                [],
            ],
            SelectedMailChanged: ({ mailId }) => [
                {
                    ...model,
                    selectedMailId: mailId,
                },
                [],
            ],
            SelectedFilterChanged: ({ filter }) => [
                {
                    ...model,
                    filter,
                },
                [],
            ],
            SearchChanged: ({ value }) => [
                {
                    ...model,
                    search: value,
                },
                [],
            ],
            MuteThreadToggled: () => [
                {
                    ...model,
                    mutedThread: !model.mutedThread,
                },
                [],
            ],
            ClickedLink: ({ request }) =>
                M.value(request).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        Internal: ({ url }) => {
                            if (isAppScope(url.pathname)) {
                                return [model, [navigateInternal(url)]]
                            }

                            return [model, [loadExternal(urlToString(url))]]
                        },
                        External: ({ href }) => [model, [loadExternal(href)]],
                    })
                ),
            ChangedUrl: ({ url }) => {
                const route = urlToAppRoute(url.pathname)
                return [{ ...model, route }, []]
            },
            CompletedNavigateInternal: () => [model, []],
            CompletedLoadExternal: () => [model, []],
        })
    )
