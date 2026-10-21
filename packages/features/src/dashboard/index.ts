import { type ModuleId, is_module_enabled } from "@urm/domain/schemas/modules"
import { type Html, type HtmlBuilder } from "foldkit/html"

import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"

export type DashboardProject = Readonly<{
    id: string
    name: string
    href: string
    status: "backlog" | "active" | "done"
    updated_at: number
}>

export type DashboardIssue = Readonly<{
    id: string
    title: string
    href: string
    status: "open" | "in_progress" | "closed" | "archived" | "on_hold"
    updated_at: number
}>

export type DashboardEvent = Readonly<{
    id: string
    title: string
    href: string
    published: boolean
    updated_at: number
}>

export type DashboardMediaItem = Readonly<{
    id: string
    title: string
    href: string
    kind: "image" | "video"
    updated_at: number
}>

export type DashboardSite = Readonly<{
    id: string
    name: string
    href: string
    status: "draft" | "live" | "disabled"
    updated_at: number
}>

export type DashboardInput = Readonly<{
    enabled_modules?: ReadonlyArray<ModuleId>
    domain_name: string | undefined
    domains_href: string
    projects_href: string
    issues_href: string
    events_href: string
    media_href: string
    projects: ReadonlyArray<DashboardProject>
    issues: ReadonlyArray<DashboardIssue>
    events: ReadonlyArray<DashboardEvent>
    media: ReadonlyArray<DashboardMediaItem>
    sites: ReadonlyArray<DashboardSite>
}>

type StatusSegment = Readonly<{
    label: string
    count: number
    color_class: string
}>

type Activity = Readonly<{
    id: string
    kind: string
    title: string
    href: string
    updated_at: number
}>

type Icon = (props?: Readonly<{ class?: string }>) => Html

const count_where = <Item>(
    items: ReadonlyArray<Item>,
    predicate: (item: Item) => boolean
): number => items.filter(predicate).length

const plural = (
    count: number,
    singular: string,
    plural_label: string
): string => `${count} ${count === 1 ? singular : plural_label}`

const metric_card = <Message>(
    label: string,
    value: number,
    detail: string,
    href: string,
    icon: Icon,
    h: HtmlBuilder<Message>
): Html =>
    h.a(
        [
            h.Href(href),
            h.Class(
                "group rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)] transition-colors hover:bg-accent/50"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-start justify-between gap-3")],
                [
                    h.div(
                        [h.Class("min-w-0")],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-medium uppercase tracking-wide text-muted-foreground"
                                    ),
                                ],
                                [label]
                            ),
                            h.p(
                                [h.Class("mt-1 text-2xl font-semibold")],
                                [`${value}`]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-muted text-muted-foreground transition-colors group-hover:text-foreground"
                            ),
                        ],
                        [icon({ class: "size-4" })]
                    ),
                ]
            ),
            h.p([h.Class("mt-2 text-xs text-muted-foreground")], [detail]),
        ]
    )

const status_chart = <Message>(
    title: string,
    description: string,
    segments: ReadonlyArray<StatusSegment>,
    h: HtmlBuilder<Message>
): Html => {
    const total = segments.reduce((sum, segment) => sum + segment.count, 0)
    const aria_label = segments
        .map((segment) => `${segment.label}: ${segment.count}`)
        .join(", ")

    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-start justify-between gap-4")],
                [
                    h.div(
                        [h.Class("space-y-1")],
                        [
                            h.h2([h.Class("font-semibold")], [title]),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [description]
                            ),
                        ]
                    ),
                    h.span(
                        [h.Class("text-xl font-semibold tabular-nums")],
                        [`${total}`]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "mt-5 flex h-3 overflow-hidden rounded-full bg-muted"
                    ),
                    h.Role("img"),
                    h.AriaLabel(aria_label === "" ? "No items" : aria_label),
                ],
                segments.map((segment) =>
                    h.div(
                        [
                            h.Class(segment.color_class),
                            h.Style({
                                width: `${total === 0 ? 0 : (segment.count / total) * 100}%`,
                            }),
                        ],
                        []
                    )
                )
            ),
            h.div(
                [h.Class("mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2")],
                segments.map((segment) =>
                    h.div(
                        [h.Class("flex items-center gap-2 text-sm")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        `size-2.5 shrink-0 rounded-full ${segment.color_class}`
                                    ),
                                ],
                                []
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "min-w-0 truncate text-muted-foreground"
                                    ),
                                ],
                                [segment.label]
                            ),
                            h.span(
                                [h.Class("ms-auto shrink-0 font-medium tabular-nums")],
                                [`${segment.count}`]
                            ),
                        ]
                    )
                )
            ),
        ]
    )
}

const recent_activity = (input: DashboardInput): ReadonlyArray<Activity> =>
    [
        ...input.projects.map((project) => ({
            id: `project-${project.id}`,
            kind: "Project",
            title: project.name,
            href: project.href,
            updated_at: project.updated_at,
        })),
        ...input.issues.map((issue) => ({
            id: `issue-${issue.id}`,
            kind: "Issue",
            title: issue.title,
            href: issue.href,
            updated_at: issue.updated_at,
        })),
        ...input.events.map((event) => ({
            id: `event-${event.id}`,
            kind: "Event",
            title: event.title,
            href: event.href,
            updated_at: event.updated_at,
        })),
        ...input.media.map((item) => ({
            id: `${item.kind}-${item.id}`,
            kind: item.kind === "image" ? "Image" : "Video",
            title: item.title,
            href: item.href,
            updated_at: item.updated_at,
        })),
        ...input.sites.map((site) => ({
            id: `site-${site.id}`,
            kind: "Site",
            title: site.name,
            href: site.href,
            updated_at: site.updated_at,
        })),
    ]
        .sort((left, right) => right.updated_at - left.updated_at)
        .slice(0, 6)

const formatted_date = (timestamp: number): string =>
    new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(timestamp)
    )

const activity_view = <Message>(
    input: DashboardInput,
    h: HtmlBuilder<Message>
): Html => {
    const activities = recent_activity(input)

    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.h2([h.Class("font-semibold")], ["Recent changes"]),
            h.p(
                [h.Class("mt-1 text-sm text-muted-foreground")],
                ["The latest updates across this domain."]
            ),
            ...(activities.length === 0
                ? [
                      h.p(
                          [
                              h.Class(
                                  "mt-5 rounded-[var(--radius-control)] border border-dashed border-border p-4 text-sm text-muted-foreground"
                              ),
                          ],
                          ["Changes will appear here as content is added."]
                      ),
                  ]
                : [
                      h.div(
                          [h.Class("mt-4 divide-y divide-border")],
                          activities.map((activity) =>
                              h.a(
                                  [
                                      h.Href(activity.href),
                                      h.Class(
                                          "flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                                      ),
                                  ],
                                  [
                                      h.div(
                                          [h.Class("min-w-0 flex-1")],
                                          [
                                              h.p(
                                                  [
                                                      h.Class(
                                                          "truncate text-sm font-medium"
                                                      ),
                                                  ],
                                                  [activity.title]
                                              ),
                                              h.p(
                                                  [
                                                      h.Class(
                                                          "text-xs text-muted-foreground"
                                                      ),
                                                  ],
                                                  [
                                                      `${activity.kind} · ${formatted_date(activity.updated_at)}`,
                                                  ]
                                              ),
                                          ]
                                      ),
                                      AppIcon.IconChevronRight({
                                          class: "size-4 shrink-0 text-muted-foreground rtl:rotate-180",
                                      }),
                                  ]
                              )
                          )
                      ),
                  ]),
        ]
    )
}

const empty_domain_view = <Message>(
    domains_href: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-12 text-center"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
                    ),
                ],
                [AppIcon.IconCloud({ class: "size-5" })]
            ),
            h.h1(
                [h.Class("mt-4 text-2xl font-semibold tracking-tight")],
                ["Set up a domain"]
            ),
            h.p(
                [h.Class("mt-2 text-sm text-muted-foreground")],
                [
                    "Create or select a domain to see its projects, issues, publishing, and media overview.",
                ]
            ),
            h.a(
                [
                    h.Href(domains_href),
                    h.Class(
                        "mt-5 rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground [box-shadow:var(--shadow-primary)]"
                    ),
                ],
                ["Manage domains"]
            ),
        ]
    )

export const view = <Message>(
    input: DashboardInput,
    h: HtmlBuilder<Message>
): Html => {
    if (input.domain_name === undefined) {
        return empty_domain_view(input.domains_href, h)
    }

    const active_projects = count_where(
        input.projects,
        (project) => project.status === "active"
    )
    const open_issues = count_where(
        input.issues,
        (issue) => issue.status !== "closed" && issue.status !== "archived"
    )
    const published_events = count_where(
        input.events,
        (event) => event.published
    )
    const live_sites = count_where(
        input.sites,
        (site) => site.status === "live"
    )
    const project_segments: ReadonlyArray<StatusSegment> = [
        {
            label: "Backlog",
            count: count_where(
                input.projects,
                (project) => project.status === "backlog"
            ),
            color_class: "bg-muted-foreground/45",
        },
        {
            label: "Active",
            count: active_projects,
            color_class: "bg-primary",
        },
        {
            label: "Done",
            count: count_where(
                input.projects,
                (project) => project.status === "done"
            ),
            color_class: "bg-success",
        },
    ]
    const issue_segments: ReadonlyArray<StatusSegment> = [
        {
            label: "Open",
            count: count_where(
                input.issues,
                (issue) => issue.status === "open"
            ),
            color_class: "bg-primary",
        },
        {
            label: "In progress",
            count: count_where(
                input.issues,
                (issue) => issue.status === "in_progress"
            ),
            color_class: "bg-sky-500",
        },
        {
            label: "On hold",
            count: count_where(
                input.issues,
                (issue) => issue.status === "on_hold"
            ),
            color_class: "bg-warning",
        },
        {
            label: "Closed",
            count: count_where(
                input.issues,
                (issue) => issue.status === "closed"
            ),
            color_class: "bg-success",
        },
        {
            label: "Archived",
            count: count_where(
                input.issues,
                (issue) => issue.status === "archived"
            ),
            color_class: "bg-muted-foreground/45",
        },
    ]

    return h.div(
        [
            h.Class(
                "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-1")],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs font-medium uppercase tracking-wide text-muted-foreground"
                            ),
                        ],
                        ["Domain overview"]
                    ),
                    h.h1(
                        [h.Class("[overflow-wrap:anywhere] text-2xl font-semibold tracking-tight")],
                        [input.domain_name]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        ["Current work, publishing, and content at a glance."]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3")],
                [
                    ...(is_module_enabled(input.enabled_modules, "Projects")
                        ? [
                              metric_card(
                                  "Active projects",
                                  active_projects,
                                  plural(
                                      input.projects.length,
                                      "project",
                                      "projects"
                                  ),
                                  input.projects_href,
                                  AppIcon.IconFolderOpen,
                                  h
                              ),
                          ]
                        : []),
                    ...(is_module_enabled(input.enabled_modules, "Issues")
                        ? [
                              metric_card(
                                  "Open issues",
                                  open_issues,
                                  plural(
                                      input.issues.length,
                                      "issue",
                                      "issues"
                                  ),
                                  input.issues_href,
                                  AppIcon.IconFileText,
                                  h
                              ),
                          ]
                        : []),
                    ...(is_module_enabled(input.enabled_modules, "Events")
                        ? [
                              metric_card(
                                  "Published events",
                                  published_events,
                                  plural(
                                      input.events.length,
                                      "event",
                                      "events"
                                  ),
                                  input.events_href,
                                  AppIcon.IconCalendar,
                                  h
                              ),
                          ]
                        : []),
                    ...(is_module_enabled(input.enabled_modules, "Media")
                        ? [
                              metric_card(
                                  "Media assets",
                                  input.media.length,
                                  `${plural(live_sites, "live site", "live sites")} · ${plural(input.sites.length, "site", "sites")}`,
                                  input.media_href,
                                  AppIcon.IconImage,
                                  h
                              ),
                          ]
                        : []),
                ]
            ),
            h.div(
                [h.Class("grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-4")],
                [
                    ...(is_module_enabled(input.enabled_modules, "Projects")
                        ? [
                              status_chart(
                                  "Projects by status",
                                  "The current project pipeline.",
                                  project_segments,
                                  h
                              ),
                          ]
                        : []),
                    ...(is_module_enabled(input.enabled_modules, "Issues")
                        ? [
                              status_chart(
                                  "Issues by status",
                                  "Visible issues in the active domain.",
                                  issue_segments,
                                  h
                              ),
                          ]
                        : []),
                ]
            ),
            activity_view(input, h),
        ]
    )
}
