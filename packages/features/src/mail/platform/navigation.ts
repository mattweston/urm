import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import type { PortalSidebarNavItem } from "@urm/ui/foldkit/sidebar-shell.view.ts"
import {
    contactsHref,
    mailHref,
    manageMembersHref,
    membersHref,
    newsletterHref,
    transactionalHref,
    sendHref,
    sentHref,
    statsHref,
    subscriptionsHref,
} from "./route.ts"
export const mail_navigation: ReadonlyArray<PortalSidebarNavItem> = [
    {
        label: "Send",
        routeTag: "Send",
        href: sendHref(),
        icon: AppIcon.IconSend,
    },
    {
        label: "Sent",
        routeTag: "Sent",
        href: sentHref(),
        icon: AppIcon.IconCircleCheck,
    },
    {
        label: "Stats",
        routeTag: "Stats",
        href: statsHref(),
        icon: AppIcon.IconChartColumnDecreasing,
    },
    {
        label: "Mail",
        routeTag: "Mail",
        href: mailHref(),
        icon: AppIcon.IconInbox,
    },
    {
        label: "Contacts",
        routeTag: "Contacts",
        href: contactsHref(),
        icon: AppIcon.IconUsers,
    },
    {
        label: "Members",
        routeTag: "Members",
        href: membersHref(),
        icon: AppIcon.IconUser,
    },
    {
        label: "Manage Members",
        routeTag: "MembersManage",
        href: manageMembersHref(),
        icon: AppIcon.IconUsers,
    },
    {
        label: "Newsletter delivery",
        routeTag: "Newsletter",
        href: newsletterHref(),
        icon: AppIcon.IconSend,
    },
    {
        label: "Subscriptions",
        routeTag: "Subscriptions",
        href: subscriptionsHref(),
        icon: AppIcon.IconUsers,
    },
    {
        label: "Transactional",
        routeTag: "Transactional",
        href: transactionalHref(),
        icon: AppIcon.IconMail,
    },
]
