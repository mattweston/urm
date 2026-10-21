import { type Html, type HtmlBuilder } from "foldkit/html"

import { HamburgerMenuIcon, IconPanelLeft } from "@urm/ui/foldkit/icons/view.ts"
import {
    IconLogo,
    IconMail,
    IconSettings,
    IconSquarePen,
    IconUsers,
} from "@urm/ui/foldkit/icons/view.ts"
import { Separator } from "../separator/view.ts"
import {
    ToggledIsCollapsed,
    ToggledMobileIsOpen,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"
import { designHref } from "@urm/features/design/submodel"

type NavItem = Readonly<{
    label: string
    icon: (props?: Readonly<{ class?: string }>) => Html
    active?: boolean
}>

const navItems: ReadonlyArray<NavItem> = [
    { label: "Inbox", icon: IconMail, active: true },
    { label: "Drafts", icon: IconSquarePen },
    { label: "Team", icon: IconUsers },
    { label: "Members", icon: IconUsers },
    { label: "Settings", icon: IconSettings },
    { label: "Profile", icon: IconUsers },
    { label: "Design", icon: IconLogo },
]

const shellClassName = (isCollapsed: boolean) =>
    isCollapsed
        ? "hidden min-h-[760px] gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)] lg:grid lg:grid-cols-[5rem_minmax(0,1fr)]"
        : "hidden min-h-[760px] gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)] lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]"

const sidebarClassName = (isCollapsed: boolean) =>
    isCollapsed
        ? "flex h-full flex-col items-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
        : "flex h-full flex-col rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"

const contentClassName =
    "flex min-h-0 flex-col rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-6"
const itemClassName =
    "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
const activeItemClassName = "bg-accent text-accent-foreground"
const chipClassName =
    "rounded-full border-(length:--surface-border-width) border-border px-3 py-1 text-[11px] font-medium text-muted-foreground"
const iconButtonClassName =
    "flex size-10 items-center justify-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"

const navItem = <ParentMessage>(
    item: NavItem,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.button(
        [
            h.Class(
                `${itemClassName} w-full ${item.active ? activeItemClassName : ""}`.trim()
            ),
            h.AriaLabel(item.label),
        ],
        [item.icon({ class: "size-4 shrink-0" }), h.span([], [item.label])]
    )
}

const collapsedRailItem = <ParentMessage>(
    item: NavItem,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.button(
        [h.Class(iconButtonClassName), h.AriaLabel(item.label)],
        [item.icon({ class: "size-4" })]
    )
}

const sidebarTitleView = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("flex items-center gap-3")],
        [
            h.div(
                [
                    h.Class(
                        "flex size-10 items-center justify-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"
                    ),
                ],
                [IconLogo({ class: "size-6" })]
            ),
            h.div(
                [h.Class("min-w-0")],
                [
                    h.div(
                        [h.Class("text-sm font-semibold text-foreground")],
                        ["Design"]
                    ),
                    h.div(
                        [h.Class("text-xs text-muted-foreground")],
                        ["Sidebar demo"]
                    ),
                ]
            ),
        ]
    )
}

const desktopSidebarHeaderView = <ParentMessage>(
    isCollapsed: boolean,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                isCollapsed
                    ? "flex flex-col items-center gap-3"
                    : "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-3 hover:bg-accent"
            ),
        ],
        [
            h.button(
                [
                    h.OnClick(toParentMessage(ToggledIsCollapsed())),
                    h.Class(iconButtonClassName),
                    h.AriaLabel(
                        isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                    ),
                ],
                [IconPanelLeft({ class: "size-4" })]
            ),
            isCollapsed
                ? h.div(
                      [
                          h.Class(
                              "flex size-10 items-center justify-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"
                          ),
                      ],
                      [IconLogo({ class: "size-6" })]
                  )
                : h.a(
                      [
                          h.Href(designHref()),
                          h.Class("flex flex-1 items-center gap-3"),
                      ],
                      [sidebarTitleView<ParentMessage>(h)]
                  ),
        ]
    )
}

const mobileSidebarHeaderView = <ParentMessage>(
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                "flex items-center justify-between rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)] lg:hidden"
            ),
        ],
        [
            h.a(
                [h.Href(designHref()), h.Class("flex items-center gap-3")],
                [sidebarTitleView<ParentMessage>(h)]
            ),
            h.button(
                [
                    h.OnClick(toParentMessage(ToggledMobileIsOpen())),
                    h.Class(iconButtonClassName),
                    h.AriaLabel("Open sidebar"),
                ],
                [HamburgerMenuIcon({ class: "size-4" })]
            ),
        ]
    )
}

const mobileSidebarDrawerView = <ParentMessage>(
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("fixed inset-0 z-40 lg:hidden")],
        [
            h.button(
                [
                    h.OnClick(toParentMessage(ToggledMobileIsOpen())),
                    h.Class(
                        "absolute inset-0 bg-background/80 backdrop-blur-sm"
                    ),
                    h.AriaLabel("Close sidebar backdrop"),
                ],
                []
            ),
            h.aside(
                [
                    h.Class(
                        "absolute inset-y-0 left-0 z-50 flex w-[18rem] flex-col rounded-r-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3 text-card-foreground [box-shadow:var(--shadow-overlay)]"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "flex items-center justify-between rounded-2xl px-3 py-3"
                            ),
                        ],
                        [
                            h.a(
                                [
                                    h.Href(designHref()),
                                    h.Class("flex items-center gap-3"),
                                ],
                                [sidebarTitleView<ParentMessage>(h)]
                            ),
                            h.button(
                                [
                                    h.OnClick(
                                        toParentMessage(ToggledMobileIsOpen())
                                    ),
                                    h.Class(iconButtonClassName),
                                    h.AriaLabel("Close sidebar"),
                                ],
                                [IconPanelLeft({ class: "size-4" })]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("py-3")],
                        [Separator({ className: "w-full" }, h)]
                    ),
                    h.div(
                        [h.Class("flex flex-1 flex-col gap-1 overflow-y-auto")],
                        navItems.map((item) => navItem<ParentMessage>(item, h))
                    ),
                    h.div(
                        [h.Class("mt-auto pt-4")],
                        [Separator({ className: "w-full" }, h)]
                    ),
                    h.div(
                        [
                            h.Class(
                                "mt-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-xs uppercase tracking-wide text-muted-foreground"
                                    ),
                                ],
                                ["Footer"]
                            ),
                            h.div(
                                [h.Class("mt-1 text-sm text-foreground")],
                                ["Optional footer slot."]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const mobileOverviewView = <ParentMessage>(
    isCollapsed: boolean,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-4")],
                [
                    h.div(
                        [],
                        [
                            h.h3(
                                [
                                    h.Class(
                                        "text-xl font-semibold text-foreground"
                                    ),
                                ],
                                ["App Sidebar"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                ["Tap the menu button to open the drawer."]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class(chipClassName)],
                        [isCollapsed ? "Collapsed rail" : "Expanded rail"]
                    ),
                ]
            ),
            h.div([h.Class("my-4")], [Separator({ className: "w-full" }, h)]),
            h.div(
                [h.Class("grid gap-4")],
                [
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-xs uppercase tracking-wide text-muted-foreground"
                                    ),
                                ],
                                ["State"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-2 text-lg font-semibold text-foreground"
                                    ),
                                ],
                                [isCollapsed ? "Collapsed" : "Expanded"]
                            ),
                            h.p(
                                [h.Class("mt-1 text-sm text-muted-foreground")],
                                [
                                    "The source sidebar has an icon-only mode and a normal rail mode.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-xs uppercase tracking-wide text-muted-foreground"
                                    ),
                                ],
                                ["Navigation"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-2 text-lg font-semibold text-foreground"
                                    ),
                                ],
                                ["One level only"]
                            ),
                            h.p(
                                [h.Class("mt-1 text-sm text-muted-foreground")],
                                [
                                    "Each item keeps an icon; nested groups were removed.",
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isCollapsed = model.isCollapsed

    return h.div(
        [h.Class("space-y-6")],
        [
            mobileSidebarHeaderView<ParentMessage>(toParentMessage, h),
            mobileOverviewView<ParentMessage>(isCollapsed, h),
            ...(model.mobileIsOpen
                ? [mobileSidebarDrawerView<ParentMessage>(toParentMessage, h)]
                : []),
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h2(
                        [h.Class("text-2xl font-bold text-foreground")],
                        ["Sidebar"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Interactive port of the app sidebar shell with collapse and one-level navigation.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class(shellClassName(isCollapsed))],
                [
                    h.aside(
                        [h.Class(sidebarClassName(isCollapsed))],
                        [
                            desktopSidebarHeaderView<ParentMessage>(
                                isCollapsed,
                                toParentMessage,
                                h
                            ),
                            h.div(
                                [h.Class("py-3")],
                                [Separator({ className: "w-full" }, h)]
                            ),
                            isCollapsed
                                ? h.div(
                                      [
                                          h.Class(
                                              "flex flex-col items-center gap-2"
                                          ),
                                      ],
                                      navItems.map((item) =>
                                          collapsedRailItem<ParentMessage>(
                                              item,
                                              h
                                          )
                                      )
                                  )
                                : h.div(
                                      [h.Class("space-y-1")],
                                      navItems.map((item) =>
                                          navItem<ParentMessage>(item, h)
                                      )
                                  ),
                            h.div(
                                [h.Class("mt-auto pt-4")],
                                [Separator({ className: "w-full" }, h)]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-xs uppercase tracking-wide text-muted-foreground"
                                            ),
                                        ],
                                        ["Footer"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-1 text-sm text-foreground"
                                            ),
                                        ],
                                        ["Optional footer slot."]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.main(
                        [h.Class(contentClassName)],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex items-center justify-between gap-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [],
                                        [
                                            h.h3(
                                                [
                                                    h.Class(
                                                        "text-xl font-semibold text-foreground"
                                                    ),
                                                ],
                                                ["App Sidebar"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    "Collapse/expand plus a single-level nav rail.",
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [h.Class(chipClassName)],
                                        [
                                            isCollapsed
                                                ? "Collapsed rail"
                                                : "Expanded rail",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("my-6")],
                                [Separator({ className: "w-full" }, h)]
                            ),
                            h.div(
                                [h.Class("grid gap-4 lg:grid-cols-2")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-xs uppercase tracking-wide text-muted-foreground"
                                                    ),
                                                ],
                                                ["State"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-2 text-lg font-semibold text-foreground"
                                                    ),
                                                ],
                                                [
                                                    isCollapsed
                                                        ? "Collapsed"
                                                        : "Expanded",
                                                ]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "mt-1 text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    "The source sidebar has an icon-only mode and a normal rail mode.",
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-xs uppercase tracking-wide text-muted-foreground"
                                                    ),
                                                ],
                                                ["Navigation"]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-2 text-lg font-semibold text-foreground"
                                                    ),
                                                ],
                                                ["One level only"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "mt-1 text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    "Each item keeps an icon; nested groups were removed.",
                                                ]
                                            ),
                                        ]
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
