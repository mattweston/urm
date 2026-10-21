/**
 * # Sidebar shell
 *
 * Portal navigation chrome shared by the Foldkit features (docs, mail, etc.).
 * Message-polymorphic: every interactive prop takes a ParentMessage VALUE
 * (or a constructor like `toSidebarTooltipMessage`), never a callback — the
 * parent's `update` receives them like any other message.
 *
 * Tooltip state is parent-owned (MVU): keep a `SidebarTooltips` in your model
 * (see sidebar-shell.tooltips.ts), pass it in, and route tooltip messages back
 * with `toSidebarTooltipMessage(key, message)`. Active nav highlighting keys
 * off `currentRoute === item.routeTag`.
 */
import { Effect } from "effect"
import { Mount } from "foldkit"
import { createKeyedLazy, type Html, type HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import {
    HamburgerMenuIcon,
    IconChevronRight,
    IconPanelLeft,
} from "./icons/view.ts"
import {
    SIDEBAR_TOOLTIP_HOME_KEY,
    SIDEBAR_TOOLTIP_TOGGLE_KEY,
    type SidebarTooltips,
} from "./sidebar-shell.tooltips.ts"
import { Tooltip } from "./tooltip.view.ts"
import type { AnchorConfig } from "@foldkit/ui/tooltip"

export type PortalSidebarNavItem<ParentMessage = never> = Readonly<{
    label: string
    routeTag: string
    href: string
    icon: (props?: Readonly<{ class?: string }>) => Html
    onClick?: ParentMessage
    separatorBefore?: boolean
    children?: ReadonlyArray<PortalSidebarNavItem<ParentMessage>>
}>

type PortalSidebarShellProps<ParentMessage> = Readonly<{
    currentRoute: string
    title: string
    subtitle: string
    homeHref: string
    homeIcon: (props?: Readonly<{ class?: string }>) => Html
    homeOnClick?: ParentMessage
    toggleIconCollapsed: (props?: Readonly<{ class?: string }>) => Html
    toggleIconExpanded: (props?: Readonly<{ class?: string }>) => Html
    navItems: ReadonlyArray<PortalSidebarNavItem<ParentMessage>>
    topContent?: Html
    bottomContent?: Html
    sidebarTooltips: SidebarTooltips
    isCollapsed: boolean
    showHeader?: boolean
    showToggle?: boolean
    showDivider?: boolean
    onToggle: ParentMessage
    toSidebarTooltipMessage: (
        key: string,
        message: import("@foldkit/ui/tooltip").Message
    ) => ParentMessage
}>

type PortalSidebarShellMobileProps<ParentMessage> = Readonly<{
    currentRoute: string
    title: string
    subtitle: string
    homeHref: string
    homeIcon: (props?: Readonly<{ class?: string }>) => Html
    homeOnClick?: ParentMessage
    showHeader?: boolean
    showHome?: boolean
    navItems: ReadonlyArray<PortalSidebarNavItem<ParentMessage>>
    topContent?: Html
    bottomContent?: Html
    isOpen: boolean
    onToggle: ParentMessage
}>

/* Geometry and the active label's weight come from the theme rather than fixed
   utilities, so a themed shell (Brutalism, Neo-Brutalism) reaches the nav. The
   inactive link deliberately keeps no weight of its own: it has never carried
   one, and adopting --control-font-weight here would bold it in every theme. */
const navLinkClassName = (isActive: boolean): string =>
    isActive
        ? "flex items-center gap-3 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm [font-family:var(--control-font-family)] [font-weight:var(--control-font-weight)] [letter-spacing:var(--control-letter-spacing)] [text-transform:var(--control-text-transform)] text-accent-foreground"
        : "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm [font-family:var(--control-font-family)] [letter-spacing:var(--control-letter-spacing)] [text-transform:var(--control-text-transform)] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"

const navIconClassName = "size-5 shrink-0"
const sidebarTooltipAnchor: AnchorConfig = {
    placement: "right",
    gap: 8,
    padding: 8,
}

const lazySidebarHeader = createKeyedLazy()
const lazySidebarToggle = createKeyedLazy()
const lazyCollapsedNavItem = createKeyedLazy()

const isNavItemActive = <ParentMessage>(
    item: PortalSidebarNavItem<ParentMessage>,
    currentRoute: string
): boolean =>
    item.routeTag === currentRoute ||
    item.children?.some((child) => isNavItemActive(child, currentRoute)) ===
        true

const flattenedNavItems = <ParentMessage>(
    navItems: ReadonlyArray<PortalSidebarNavItem<ParentMessage>>
): ReadonlyArray<PortalSidebarNavItem<ParentMessage>> =>
    navItems.flatMap((item) => [
        item,
        ...(item.children === undefined
            ? []
            : flattenedNavItems(item.children)),
    ])

const collapsedNavItemView = <ParentMessage>(
    item: PortalSidebarNavItem<ParentMessage>,
    isActive: boolean,
    isCurrent: boolean,
    tooltipModel: SidebarTooltips["navItems"][string] | undefined,
    toSidebarTooltipMessage: (
        key: string,
        message: import("@foldkit/ui/tooltip").Message
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    if (tooltipModel === undefined) {
        const attributes = [
            h.AriaLabel(item.label),
            ...(isCurrent ? [h.AriaCurrent("page")] : []),
            h.Class(
                isActive
                    ? "flex size-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-accent text-accent-foreground"
                    : "flex size-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            ),
        ]

        return item.onClick === undefined
            ? h.a(
                  [h.Href(item.href), ...attributes],
                  [item.icon({ class: navIconClassName })]
              )
            : h.button(
                  [h.Type("button"), h.OnClick(item.onClick), ...attributes],
                  [item.icon({ class: navIconClassName })]
              )
    }

    return Tooltip(
        {
            model: tooltipModel,
            toParentMessage: (message) =>
                toSidebarTooltipMessage(item.routeTag, message),
            anchor: sidebarTooltipAnchor,
            triggerTag: item.onClick === undefined ? "a" : "button",
            triggerHref: item.onClick === undefined ? item.href : undefined,
            triggerAttributes:
                item.onClick === undefined
                    ? [
                          h.AriaLabel(item.label),
                          ...(isCurrent ? [h.AriaCurrent("page")] : []),
                      ]
                    : [h.AriaLabel(item.label), h.OnClick(item.onClick)],
            triggerContent: item.icon({ class: navIconClassName }),
            triggerClassName: isActive
                ? "flex size-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-accent text-accent-foreground"
                : "flex size-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            content: h.span([], [item.label]),
            panelClassName:
                "rounded-[var(--radius-surface)] bg-foreground px-2 py-1.5 text-sm text-background [box-shadow:var(--shadow-overlay)] z-50",
        },
        h
    )
}

const sidebarToggleView = <ParentMessage>(
    isCollapsed: boolean,
    toggleIconCollapsed: (props?: Readonly<{ class?: string }>) => Html,
    toggleIconExpanded: (props?: Readonly<{ class?: string }>) => Html,
    toggleTooltip: SidebarTooltips["toggle"],
    onToggle: ParentMessage,
    toSidebarTooltipMessage: (
        key: string,
        message: import("@foldkit/ui/tooltip").Message
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return Tooltip(
        {
            model: toggleTooltip,
            toParentMessage: (message) =>
                toSidebarTooltipMessage(SIDEBAR_TOOLTIP_TOGGLE_KEY, message),
            anchor: sidebarTooltipAnchor,
            triggerAttributes: [
                h.OnClick(onToggle),
                h.AriaLabel(
                    isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                ),
            ],
            triggerContent: isCollapsed
                ? toggleIconCollapsed({ class: "size-5" })
                : toggleIconExpanded({ class: "size-5" }),
            triggerClassName:
                "flex size-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            content: h.span(
                [],
                [isCollapsed ? "Expand sidebar" : "Collapse sidebar"]
            ),
            panelClassName:
                "rounded-[var(--radius-surface)] bg-foreground px-2 py-1.5 text-sm text-background [box-shadow:var(--shadow-overlay)] z-50",
        },
        h
    )
}

const sidebarCollapsedHomeView = <ParentMessage>(
    title: string,
    homeHref: string,
    homeIcon: (props?: Readonly<{ class?: string }>) => Html,
    homeTooltip: SidebarTooltips["home"],
    homeOnClick: ParentMessage | undefined,
    toSidebarTooltipMessage: (
        key: string,
        message: import("@foldkit/ui/tooltip").Message
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return Tooltip(
        {
            model: homeTooltip,
            toParentMessage: (message) =>
                toSidebarTooltipMessage(SIDEBAR_TOOLTIP_HOME_KEY, message),
            anchor: sidebarTooltipAnchor,
            triggerTag: homeOnClick === undefined ? "a" : "button",
            triggerHref: homeOnClick === undefined ? homeHref : undefined,
            triggerAttributes:
                homeOnClick === undefined
                    ? [h.AriaLabel(title)]
                    : [h.AriaLabel(title), h.OnClick(homeOnClick)],
            triggerContent: homeIcon({ class: "size-5" }),
            triggerClassName:
                "flex size-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background text-foreground",
            content: h.span([], [title]),
            panelClassName:
                "rounded-[var(--radius-surface)] bg-foreground px-2 py-1.5 text-sm text-background [box-shadow:var(--shadow-overlay)] z-50",
        },
        h
    )
}

const sidebarExpandedHomeView = <ParentMessage>(
    title: string,
    subtitle: string,
    homeHref: string,
    homeIcon: (props?: Readonly<{ class?: string }>) => Html,
    h: HtmlBuilder<ParentMessage>,
    homeOnClick?: ParentMessage
): Html => {
    return homeOnClick === undefined
        ? h.a(
              [h.Href(homeHref), h.Class("flex flex-1 items-center gap-3")],
              [
                  h.div(
                      [
                          h.Class(
                              "flex size-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background text-foreground"
                          ),
                      ],
                      [homeIcon({ class: "size-5" })]
                  ),
                  h.div(
                      [h.Class("min-w-0")],
                      [
                          h.div(
                              [
                                  h.Class(
                                      "text-sm [font-family:var(--surface-title-font-family)] [font-weight:var(--surface-title-font-weight)] [letter-spacing:var(--surface-title-letter-spacing)] [text-transform:var(--surface-title-text-transform)] text-foreground"
                                  ),
                              ],
                              [title]
                          ),
                          h.div(
                              [h.Class("text-xs text-muted-foreground")],
                              [subtitle]
                          ),
                      ]
                  ),
              ]
          )
        : h.button(
              [
                  h.Type("button"),
                  h.OnClick(homeOnClick),
                  h.Class("flex flex-1 items-center gap-3 text-start"),
              ],
              [
                  h.div(
                      [
                          h.Class(
                              "flex size-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background text-foreground"
                          ),
                      ],
                      [homeIcon({ class: "size-5" })]
                  ),
                  h.div(
                      [h.Class("min-w-0")],
                      [
                          h.div(
                              [
                                  h.Class(
                                      "text-sm [font-family:var(--surface-title-font-family)] [font-weight:var(--surface-title-font-weight)] [letter-spacing:var(--surface-title-letter-spacing)] [text-transform:var(--surface-title-text-transform)] text-foreground"
                                  ),
                              ],
                              [title]
                          ),
                          h.div(
                              [h.Class("text-xs text-muted-foreground")],
                              [subtitle]
                          ),
                      ]
                  ),
              ]
          )
}

const sidebarHeaderView = <ParentMessage>(
    title: string,
    subtitle: string,
    homeHref: string,
    homeIcon: (props?: Readonly<{ class?: string }>) => Html,
    homeOnClick: ParentMessage | undefined,
    toggleIconCollapsed: (props?: Readonly<{ class?: string }>) => Html,
    toggleIconExpanded: (props?: Readonly<{ class?: string }>) => Html,
    toggleTooltip: SidebarTooltips["toggle"],
    homeTooltip: SidebarTooltips["home"],
    isCollapsed: boolean,
    showToggle: boolean,
    onToggle: ParentMessage,
    toSidebarTooltipMessage: (
        key: string,
        message: import("@foldkit/ui/tooltip").Message
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const home = isCollapsed
        ? sidebarCollapsedHomeView(
              title,
              homeHref,
              homeIcon,
              homeTooltip,
              homeOnClick,
              toSidebarTooltipMessage,
              h
          )
        : sidebarExpandedHomeView(
              title,
              subtitle,
              homeHref,
              homeIcon,
              h,
              homeOnClick
          )

    return h.div(
        [
            h.Class(
                isCollapsed
                    ? "flex h-[calc(4rem+var(--surface-border-width))] flex-none flex-col items-center justify-center gap-3 border-b-(length:--surface-border-width) border-transparent px-3"
                    : showToggle
                      ? "flex flex-none flex-col gap-3 p-4"
                      : "flex h-[calc(4rem+var(--surface-border-width))] flex-none items-center border-b-(length:--surface-border-width) border-transparent px-4"
            ),
        ],
        [
            ...(showToggle
                ? [
                      lazySidebarToggle(
                          isCollapsed ? "collapsed" : "expanded",
                          sidebarToggleView,
                          [
                              isCollapsed,
                              toggleIconCollapsed,
                              toggleIconExpanded,
                              toggleTooltip,
                              onToggle,
                              toSidebarTooltipMessage,
                              h,
                          ]
                      ),
                  ]
                : []),
            home,
        ]
    )
}

const sidebarNavView = <ParentMessage>(
    currentRoute: string,
    navItems: ReadonlyArray<PortalSidebarNavItem<ParentMessage>>,
    navItemTooltips: SidebarTooltips["navItems"],
    isCollapsed: boolean,
    toSidebarTooltipMessage: (
        key: string,
        message: import("@foldkit/ui/tooltip").Message
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const expandedNavItemView = (
        item: PortalSidebarNavItem<ParentMessage>,
        isChild: boolean
    ): Html => {
        const isActive = item.routeTag === currentRoute
        const isGroupActive = isNavItemActive(item, currentRoute)
        const hasChildren =
            item.children !== undefined && item.children.length > 0
        const linkClassName = [
            navLinkClassName(isActive),
            isChild ? "ms-4 mt-1 text-xs" : "",
        ]
            .filter(Boolean)
            .join(" ")
        const linkContent = [
            item.icon({ class: navIconClassName }),
            h.span([], [item.label]),
            ...(hasChildren
                ? [
                      IconChevronRight({
                          class: [
                              "ms-auto size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                              isGroupActive ? "rotate-90" : "rtl:rotate-180",
                          ]
                              .filter(Boolean)
                              .join(" "),
                      }),
                  ]
                : []),
        ]
        const link =
            item.onClick === undefined
                ? h.a(
                      [
                          h.Href(item.href),
                          h.Class(linkClassName),
                          h.AriaLabel(item.label),
                          ...(isActive ? [h.AriaCurrent("page")] : []),
                      ],
                      linkContent
                  )
                : h.button(
                      [
                          h.Type("button"),
                          h.OnClick(item.onClick),
                          h.Class(linkClassName),
                          h.AriaLabel(item.label),
                      ],
                      linkContent
                  )

        /* Keyed on href, not routeTag. routeTag says which route lights this
           item up, so several items legitimately share one — a central nav has
           Home, Privacy and Terms all tagged "Landing". Keys have to be unique
           among siblings or the diff matches the wrong element, so identity
           comes from the destination instead. */
        return h.keyed("div")(
            item.href,
            [h.Class("flex flex-col")],
            [
                link,
                ...(item.children === undefined
                    ? []
                    : [
                          h.div(
                              [
                                  h.Class(
                                      [
                                          "grid transition-[grid-template-rows,visibility] duration-200 ease-out motion-reduce:transition-none",
                                          isGroupActive
                                              ? "visible grid-rows-[1fr]"
                                              : "invisible grid-rows-[0fr]",
                                      ].join(" ")
                                  ),
                              ],
                              [
                                  h.div(
                                      [
                                          h.Class(
                                              "flex min-h-0 flex-col overflow-hidden"
                                          ),
                                      ],
                                      item.children.map((child) =>
                                          expandedNavItemView(child, true)
                                      )
                                  ),
                              ]
                          ),
                      ]),
            ]
        )
    }

    return h.nav(
        [
            h.Class(
                isCollapsed
                    ? "flex flex-1 flex-col items-center gap-2 overflow-x-visible overflow-y-auto overscroll-contain px-2 pb-3"
                    : "flex flex-1 flex-col gap-1 overflow-x-visible overflow-y-auto overscroll-contain px-4 pb-4"
            ),
        ],
        isCollapsed
            ? navItems.flatMap((item) => [
                  ...(item.separatorBefore
                      ? [h.hr([h.Class("my-2 w-full border-border")])]
                      : []),
                  // Same reason as the keyed div above: a shared routeTag would
                  // make several items collide on one memoised entry.
                  lazyCollapsedNavItem(item.href, collapsedNavItemView, [
                      item,
                      isNavItemActive(item, currentRoute),
                      item.routeTag === currentRoute,
                      navItemTooltips[item.routeTag],
                      toSidebarTooltipMessage,
                      h,
                  ]),
              ])
            : navItems.flatMap((item) => [
                  ...(item.separatorBefore
                      ? [h.hr([h.Class("my-2 border-border")])]
                      : []),
                  expandedNavItemView(item, false),
              ])
    )
}

const sidebarMobileHeaderView = <ParentMessage>(
    title: string,
    subtitle: string,
    homeHref: string,
    homeIcon: (props?: Readonly<{ class?: string }>) => Html,
    onToggle: ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    homeOnClick?: ParentMessage,
    showHome = true
): Html => {
    return h.header(
        [
            h.Class(
                showHome
                    ? "md:hidden flex items-center justify-between gap-4 border-b-(length:--surface-border-width) border-border bg-card px-4 py-3 text-card-foreground"
                    : "md:hidden flex items-center border-b-(length:--surface-border-width) border-border bg-card px-4 py-3 text-card-foreground"
            ),
        ],
        [
            ...(showHome
                ? [
                      sidebarExpandedHomeView(
                          title,
                          subtitle,
                          homeHref,
                          homeIcon,
                          h,
                          homeOnClick
                      ),
                  ]
                : []),
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(onToggle),
                    h.Class(
                        "flex size-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent hover:text-accent-foreground hover:[box-shadow:var(--shadow-control-hover)]"
                    ),
                    h.AriaLabel("Open sidebar"),
                ],
                [HamburgerMenuIcon({ class: "size-4" })]
            ),
        ]
    )
}

const MountedMobileSidebarDialog = taggedStruct("MountedMobileSidebarDialog")

const OpenMobileSidebarDialog = Mount.define("OpenMobileSidebarDialog", {
    messages: [MountedMobileSidebarDialog],
    execute: ({ element }) =>
        Effect.gen(function* () {
            if (!(element instanceof HTMLDialogElement)) {
                return MountedMobileSidebarDialog()
            }

            yield* Effect.acquireRelease(
                Effect.sync(() => {
                    const previous_focus = element.ownerDocument.activeElement
                    element.showModal()
                    return previous_focus
                }),
                (previous_focus) =>
                    Effect.sync(() => {
                        if (element.open) element.close()
                        if (
                            previous_focus instanceof HTMLElement &&
                            previous_focus.isConnected &&
                            !element.ownerDocument.querySelector("dialog[open]")
                        ) {
                            previous_focus.focus()
                        }
                    })
            )

            return yield* Effect.never
        }),
})

const sidebarMobileDrawerView = <ParentMessage>(
    props: PortalSidebarShellMobileProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.dialog(
        [
            h.AriaLabel("Navigation"),
            h.OnCancel(props.onToggle),
            h.OnMount(
                Mount.mapMessage(
                    OpenMobileSidebarDialog(),
                    () => props.onToggle
                )
            ),
            h.Class(
                "fixed inset-0 z-50 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0"
            ),
        ],
        [
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(props.onToggle),
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
                        "absolute inset-y-0 start-0 z-50 flex w-[18rem] flex-col rounded-e-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3 text-card-foreground [box-shadow:var(--shadow-overlay)]"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "flex items-center justify-between gap-4 rounded-[var(--radius-surface)] px-3 py-3"
                            ),
                        ],
                        [
                            props.topContent === undefined
                                ? sidebarExpandedHomeView(
                                      props.title,
                                      props.subtitle,
                                      props.homeHref,
                                      props.homeIcon,
                                      h,
                                      props.homeOnClick
                                  )
                                : h.div(
                                      [h.Class("min-w-0 flex-1")],
                                      [props.topContent]
                                  ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Autofocus(true),
                                    h.OnClick(props.onToggle),
                                    h.Class(
                                        "flex size-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent hover:text-accent-foreground hover:[box-shadow:var(--shadow-control-hover)]"
                                    ),
                                    h.AriaLabel("Close sidebar"),
                                ],
                                [IconPanelLeft({ class: "size-4" })]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("py-3")],
                        [h.div([h.Class("h-px bg-border")], [])]
                    ),
                    h.nav(
                        [
                            h.Class(
                                "flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-1 pb-4"
                            ),
                        ],
                        flattenedNavItems(props.navItems).flatMap((item) => {
                            const isActive =
                                item.routeTag === props.currentRoute
                            const isChild = props.navItems.some(
                                (parent) =>
                                    parent.children?.some(
                                        (child) =>
                                            child.routeTag === item.routeTag
                                    ) === true
                            )
                            const className = [
                                navLinkClassName(isActive),
                                isChild ? "ms-4 text-xs" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")

                            const link =
                                item.onClick === undefined
                                    ? h.a(
                                          [
                                              h.Href(item.href),
                                              h.OnClick(props.onToggle),
                                              h.Class(className),
                                              ...(isActive
                                                  ? [h.AriaCurrent("page")]
                                                  : []),
                                          ],
                                          [
                                              item.icon({
                                                  class: navIconClassName,
                                              }),
                                              h.span([], [item.label]),
                                          ]
                                      )
                                    : h.button(
                                          [
                                              h.Type("button"),
                                              h.OnClick(item.onClick),
                                              h.Class(className),
                                          ],
                                          [
                                              item.icon({
                                                  class: navIconClassName,
                                              }),
                                              h.span([], [item.label]),
                                          ]
                                      )
                            return [
                                ...(item.separatorBefore
                                    ? [h.hr([h.Class("my-2 border-border")])]
                                    : []),
                                link,
                            ]
                        })
                    ),
                    ...(props.bottomContent === undefined
                        ? []
                        : [
                              h.div(
                                  [
                                      h.Class(
                                          "mt-auto border-t-(length:--surface-border-width) border-border p-3"
                                      ),
                                  ],
                                  [props.bottomContent]
                              ),
                          ]),
                ]
            ),
        ]
    )
}

export const sidebarShellView = <ParentMessage>(
    props: PortalSidebarShellProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const collapsedClassName =
        "hidden md:flex w-20 shrink-0 flex-col border-e-(length:--surface-border-width) border-border bg-card text-card-foreground h-full overflow-hidden relative transition-[width] duration-200 ease-in-out motion-reduce:transition-none"
    const expandedClassName =
        "hidden md:flex w-72 shrink-0 flex-col border-e-(length:--surface-border-width) border-border bg-card text-card-foreground h-full overflow-hidden relative transition-[width] duration-200 ease-in-out motion-reduce:transition-none"
    const showHeader = props.showHeader ?? true
    const showToggle = props.showToggle ?? true
    const showDivider = props.showDivider ?? true

    return h.aside(
        [h.Class(props.isCollapsed ? collapsedClassName : expandedClassName)],
        [
            h.div(
                [
                    h.Class(
                        "relative flex h-full min-h-0 flex-col overflow-hidden"
                    ),
                ],
                [
                    ...(showHeader
                        ? [
                              lazySidebarHeader(
                                  props.isCollapsed ? "collapsed" : "expanded",
                                  sidebarHeaderView,
                                  [
                                      props.title,
                                      props.subtitle,
                                      props.homeHref,
                                      props.homeIcon,
                                      props.homeOnClick,
                                      props.toggleIconCollapsed,
                                      props.toggleIconExpanded,
                                      props.sidebarTooltips.toggle,
                                      props.sidebarTooltips.home,
                                      props.isCollapsed,
                                      showToggle,
                                      props.onToggle,
                                      props.toSidebarTooltipMessage,
                                      h,
                                  ]
                              ),
                          ]
                        : []),
                    ...(props.topContent === undefined
                        ? []
                        : [
                              h.div(
                                  [
                                      h.Class(
                                          props.isCollapsed
                                              ? "flex h-[calc(4rem+var(--surface-border-width))] items-center justify-center border-b-(length:--surface-border-width) border-transparent px-3"
                                              : "flex h-[calc(4rem+var(--surface-border-width))] items-center border-b-(length:--surface-border-width) border-transparent px-4"
                                      ),
                                  ],
                                  [props.topContent]
                              ),
                          ]),
                    h.div(
                        [h.Class("px-3 py-3")],
                        showDivider
                            ? [h.div([h.Class("h-px bg-border")], [])]
                            : []
                    ),
                    sidebarNavView(
                        props.currentRoute,
                        props.navItems,
                        props.sidebarTooltips.navItems,
                        props.isCollapsed,
                        props.toSidebarTooltipMessage,
                        h
                    ),
                    ...(props.bottomContent === undefined
                        ? []
                        : [
                              h.div(
                                  [
                                      h.Class(
                                          props.isCollapsed
                                              ? "mt-auto flex justify-center border-t-(length:--surface-border-width) border-border p-3"
                                              : "mt-auto border-t-(length:--surface-border-width) border-border p-3"
                                      ),
                                  ],
                                  [props.bottomContent]
                              ),
                          ]),
                ]
            ),
        ]
    )
}

export const sidebarShellMobileView = <ParentMessage>(
    props: PortalSidebarShellMobileProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [],
        [
            ...(props.showHeader === false
                ? []
                : [
                      sidebarMobileHeaderView(
                          props.title,
                          props.subtitle,
                          props.homeHref,
                          props.homeIcon,
                          props.onToggle,
                          h,
                          props.homeOnClick,
                          props.showHome
                      ),
                  ]),
            ...(props.isOpen ? [sidebarMobileDrawerView(props, h)] : []),
        ]
    )
}
