import { Submodel } from "foldkit"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import {
    sidebarShellMobileView,
    sidebarShellView,
} from "@urm/ui/foldkit/sidebar-shell.view.ts"
import {
    ClickedTeamHome,
    SelectedRoleChanged,
    GotSidebarTooltipMessage,
    ToggledAppSidebarIsCollapsed,
    ToggledAppSidebarMobileIsOpen,
} from "./app.message.ts"
import type { Model, Role, TeamMember } from "./app.model.ts"
import { getSidebarTooltipsState } from "./sidebar.tooltips.state.ts"
import { Message } from "./app.message.ts"
import { platformRootHref, teamHref } from "./route.ts"

const ROLE_META: Record<
    Role,
    { label: string; description: string; chip: string }
> = {
    Viewer: {
        label: "Viewer",
        description: "Can view projects and comment on updates.",
        chip: "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    },
    Developer: {
        label: "Developer",
        description: "Can view, comment, and edit shared workspaces.",
        chip: "border-sky-500/30 bg-sky-500/10 text-sky-700 hover:bg-sky-500/15 dark:text-sky-300",
    },
    Billing: {
        label: "Billing",
        description: "Can manage invoices, plans, and payment details.",
        chip: "border-warning/30 bg-warning/10 text-warning hover:bg-warning/15",
    },
    Owner: {
        label: "Owner",
        description: "Admin-level access to all team resources.",
        chip: "border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300",
    },
}

const ROLE_ORDER: ReadonlyArray<Role> = [
    "Viewer",
    "Developer",
    "Billing",
    "Owner",
]

const AVATAR_GRADIENTS: Record<string, string> = {
    "sofia-davis": "from-violet-500 to-fuchsia-500",
    "jackson-lee": "from-sky-500 to-cyan-500",
    "amelia-rivera": "from-emerald-500 to-teal-500",
}
const stableToggledAppSidebarIsCollapsed = ToggledAppSidebarIsCollapsed()
const stableToggledAppSidebarMobileIsOpen = ToggledAppSidebarMobileIsOpen()
const stableClickedTeamHome = ClickedTeamHome()

const toSidebarTooltipMessage = (
    key: string,
    message: import("@foldkit/ui/tooltip").Message
) => GotSidebarTooltipMessage({ tooltipId: key, message })

type NavItem = Readonly<{
    label: string
    routeTag: string
    href: string
    icon: (props?: Readonly<{ class?: string }>) => Html
    onClick?: Message
}>

const NAV_ITEMS: ReadonlyArray<NavItem> = [
    {
        label: "Home",
        routeTag: "Home",
        href: "/team/",
        icon: AppIcon.IconHome,
        onClick: stableClickedTeamHome,
    },
]

const sidebarView = (isCollapsed: boolean, h: HtmlBuilder<Message>) =>
    sidebarShellView<Message>(
        {
            currentRoute: "Home",
            title: "Team",
            subtitle: "URM",
            homeHref: "/team/",
            homeIcon: AppIcon.IconUsers,
            homeOnClick: stableClickedTeamHome,
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

const sidebarMobileView = (isOpen: boolean, h: HtmlBuilder<Message>) =>
    sidebarShellMobileView<Message>(
        {
            currentRoute: "Home",
            title: "Team",
            subtitle: "URM",
            homeHref: "/team/",
            homeIcon: AppIcon.IconUsers,
            homeOnClick: stableClickedTeamHome,
            navItems: NAV_ITEMS,
            isOpen,
            onToggle: stableToggledAppSidebarMobileIsOpen,
        },
        h
    )

const initials = (name: string) =>
    name
        .split(" ")
        .map((part) => part[0])
        .filter((part): part is string => part !== undefined)
        .slice(0, 2)
        .join("")
        .toUpperCase()

const roleCount = (members: ReadonlyArray<TeamMember>, role: Role) =>
    members.filter((member) => member.role === role).length

const statCard = (
    label: string,
    value: string,
    detail: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div([h.Class("text-sm text-muted-foreground")], [label]),
            h.div(
                [h.Class("mt-2 text-3xl font-semibold text-foreground")],
                [value]
            ),
            h.div([h.Class("mt-1 text-sm text-muted-foreground")], [detail]),
        ]
    )

const roleChip = (member: TeamMember, role: Role, h: HtmlBuilder<Message>) =>
    h.button(
        [
            h.Type("button"),
            h.OnClick(SelectedRoleChanged({ memberId: member.id, role })),
            h.Class(
                [
                    "rounded-full border-(length:--surface-border-width) px-3 py-1 text-xs font-medium transition-colors",
                    ROLE_META[role].chip,
                    member.role === role
                        ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                        : "",
                ].join(" ")
            ),
        ],
        [ROLE_META[role].label]
    )

const memberCard = (member: TeamMember, h: HtmlBuilder<Message>): Html =>
    h.article(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-start gap-4")],
                [
                    h.div(
                        [
                            h.Class(
                                [
                                    "flex h-14 w-14 items-center justify-center rounded-[var(--radius-surface-sm)] bg-gradient-to-br text-sm font-bold text-white [box-shadow:var(--shadow-control)]",
                                    AVATAR_GRADIENTS[member.id] ??
                                        "from-slate-500 to-slate-700",
                                ].join(" ")
                            ),
                        ],
                        [initials(member.name)]
                    ),
                    h.div(
                        [h.Class("min-w-0 flex-1")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-lg font-semibold text-foreground"
                                    ),
                                ],
                                [member.name]
                            ),
                            h.div(
                                [h.Class("text-sm text-muted-foreground")],
                                [member.email]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-3 inline-flex rounded-full border-(length:--surface-border-width) border-border px-3 py-1 text-xs font-medium text-foreground [box-shadow:var(--shadow-control)]"
                                    ),
                                ],
                                [ROLE_META[member.role].label]
                            ),
                        ]
                    ),
                ]
            ),
            h.p(
                [h.Class("mt-4 text-sm leading-6 text-muted-foreground")],
                [ROLE_META[member.role].description]
            ),
            h.div(
                [h.Class("mt-5 flex flex-wrap gap-2")],
                ROLE_ORDER.map((role) => roleChip(member, role, h))
            ),
        ]
    )

const teamView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const ownerCount = roleCount(model.members, "Owner")
    const developerCount = roleCount(model.members, "Developer")
    const billingCount = roleCount(model.members, "Billing")

    return h.div(
        [
            h.Class(
                "min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8"
            ),
        ],
        [
            h.div(
                [h.Class("mx-auto flex w-full max-w-6xl flex-col gap-6")],
                [
                    h.nav(
                        [
                            h.Class(
                                "flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
                            ),
                        ],
                        [
                            h.a(
                                [
                                    h.Href(platformRootHref()),
                                    h.Class("hover:text-foreground"),
                                ],
                                ["Home"]
                            ),
                            h.span([], ["/"]),
                            h.a(
                                [
                                    h.Href(teamHref()),
                                    h.Class("hover:text-foreground"),
                                ],
                                ["Team"]
                            ),
                            h.span([], ["/"]),
                            h.span([h.Class("text-foreground")], ["Members"]),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded-[2rem] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)] sm:p-8"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
                                    ),
                                ],
                                [
                                    h.div(
                                        [h.Class("max-w-2xl space-y-3")],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "inline-flex rounded-full border-(length:--surface-border-width) border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground [box-shadow:var(--shadow-control)]"
                                                    ),
                                                ],
                                                ["Team access"]
                                            ),
                                            h.h1(
                                                [
                                                    h.Class(
                                                        "text-2xl font-semibold tracking-tight text-foreground"
                                                    ),
                                                ],
                                                ["Team Members"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg"
                                                    ),
                                                ],
                                                [
                                                    "Invite collaborators, review access levels, and switch roles directly in the UI.",
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-3")],
                                        [
                                            h.a(
                                                [
                                                    h.Href(teamHref()),
                                                    h.Class(
                                                        "inline-flex items-center justify-center rounded-full border-(length:--surface-border-width) border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                                    ),
                                                ],
                                                ["Open overview"]
                                            ),
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.Class(
                                                        "inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                    ),
                                                ],
                                                ["Invite member"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("mt-8 grid gap-4 sm:grid-cols-3")],
                                [
                                    statCard(
                                        "Members",
                                        String(model.members.length),
                                        "Active people on the account",
                                        h
                                    ),
                                    statCard(
                                        "Owners",
                                        String(ownerCount),
                                        "Full access and billing control",
                                        h
                                    ),
                                    statCard(
                                        "Developers",
                                        String(developerCount + billingCount),
                                        "Product and finance collaborators",
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]"
                            ),
                        ],
                        [
                            h.section(
                                [h.Class("grid gap-5")],
                                model.members.map((member) =>
                                    memberCard(member, h)
                                )
                            ),
                            h.aside(
                                [
                                    h.Class(
                                        "rounded-[2rem] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
                                    ),
                                ],
                                [
                                    h.h2(
                                        [
                                            h.Class(
                                                "text-lg font-semibold text-foreground"
                                            ),
                                        ],
                                        ["Access notes"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Role changes stay local to this UI. No backend calls, no persistence, just a fast team layout for the Foldkit shell.",
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("mt-5 space-y-3")],
                                        ROLE_ORDER.map((role) =>
                                            h.div(
                                                [
                                                    h.Class(
                                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                                    ),
                                                ],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex items-center justify-between gap-3"
                                                            ),
                                                        ],
                                                        [
                                                            h.span(
                                                                [
                                                                    h.Class(
                                                                        "text-sm font-medium text-foreground"
                                                                    ),
                                                                ],
                                                                [
                                                                    ROLE_META[
                                                                        role
                                                                    ].label,
                                                                ]
                                                            ),
                                                            h.span(
                                                                [
                                                                    h.Class(
                                                                        "text-xs text-muted-foreground"
                                                                    ),
                                                                ],
                                                                [
                                                                    String(
                                                                        roleCount(
                                                                            model.members,
                                                                            role
                                                                        )
                                                                    ),
                                                                ]
                                                            ),
                                                        ]
                                                    ),
                                                    h.p(
                                                        [
                                                            h.Class(
                                                                "mt-2 text-sm leading-6 text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            ROLE_META[role]
                                                                .description,
                                                        ]
                                                    ),
                                                ]
                                            )
                                        )
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

export const submodelView = Submodel.defineView<Model, Message>(teamView)

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: "Team",
    body: h.div(
        [h.Class("min-h-screen bg-background text-foreground")],
        [
            sidebarMobileView(model.isSidebarMobileOpen, h),
            h.div(
                [h.Class("flex h-[calc(100dvh-4rem)] overflow-hidden")],
                [
                    sidebarView(model.isSidebarCollapsed, h),
                    h.main(
                        [
                            h.Class(
                                "relative z-0 flex-1 h-full min-h-0 overflow-auto bg-background"
                            ),
                        ],
                        [teamView(model, h)]
                    ),
                ]
            ),
        ]
    ),
})
