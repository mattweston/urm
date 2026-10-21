import { Array, Option, pipe } from "effect"
import * as Ui from "@foldkit/ui"
import { Submodel } from "foldkit"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import { issueHref, issuesHref } from "./route.ts"
import type { AppMessage } from "./app.message.ts"
import {
    CancelledIssueEditing,
    ConfirmedIssueDelete,
    CreatedIssueSubmitted,
    EditingDescriptionChanged,
    EditingContentChanged,
    EditingLabelsChanged,
    EditingPriorityChanged,
    EditingStatusChanged,
    EditingTitleChanged,
    GotDeleteIssueDialogMessage,
    GotDragAndDropMessage,
    MoveIssueForward,
    NewContentChanged,
    NewDescriptionChanged,
    NewLabelsChanged,
    NewPriorityChanged,
    NewStatusChanged,
    NewTitleChanged,
    PriorityFilterChanged,
    RequestedIssueDelete,
    SavedIssueSubmitted,
    SearchQueryChanged,
    StartedIssueEditing,
    StatusFilterChanged,
    ToggledCreateIssue,
    ToggledCreateIssueDetails,
    ViewSelected,
} from "./app.message.ts"
import type { Model } from "./app.model.ts"
import type { Issue } from "@urm/domain/schemas/issues"
import type { Tag } from "@urm/domain/schemas/tags"
import {
    IconArrowRight,
    IconCheck,
    IconGripVertical,
    IconPencil,
    IconPlus,
    IconTrash,
    IconX,
} from "@urm/ui/foldkit/icons/view.ts"

export type IssueViewHrefs = Readonly<{
    issues_href: () => string
    issue_href: (issue_id: string) => string
}>

const web_hrefs: IssueViewHrefs = {
    issues_href: issuesHref,
    issue_href: issueHref,
}
const STATUS_META: Record<
    Issue["status"],
    { label: string; dot: string; pill: string }
> = {
    open: {
        label: "Open",
        dot: "bg-rose-500",
        pill: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    },
    in_progress: {
        label: "In Progress",
        dot: "bg-sky-500",
        pill: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    },
    closed: {
        label: "Closed",
        dot: "bg-success",
        pill: "bg-success/10 text-success",
    },
    on_hold: {
        label: "On Hold",
        dot: "bg-warning",
        pill: "bg-warning/10 text-warning",
    },
    archived: {
        label: "Archived",
        dot: "bg-muted-foreground",
        pill: "bg-muted/70 text-muted-foreground",
    },
}

const PRIORITY_META: Record<
    NonNullable<Issue["priority"]>,
    { label: string; pill: string }
> = {
    low: {
        label: "Low",
        pill: "bg-muted text-muted-foreground",
    },
    medium: {
        label: "Medium",
        pill: "bg-warning/10 text-warning",
    },
    high: {
        label: "High",
        pill: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    },
    urgent: {
        label: "Urgent",
        pill: "bg-destructive/10 text-destructive",
    },
}

const PRIORITY_TEXT: Record<NonNullable<Issue["priority"]>, string> = {
    low: "text-chart-2",
    medium: "text-chart-1",
    high: "text-chart-5",
    urgent: "text-destructive",
}

type BoardStatus = Exclude<Issue["status"], "archived">
const BOARD_STATUSES: ReadonlyArray<BoardStatus> = [
    "open",
    "in_progress",
    "on_hold",
    "closed",
]
const nextBoardStatus = (status: BoardStatus): BoardStatus =>
    status === "open"
        ? "in_progress"
        : status === "in_progress"
          ? "on_hold"
          : status === "on_hold"
            ? "closed"
            : "open"
const ALL_STATUSES: ReadonlyArray<Issue["status"]> = [
    "open",
    "in_progress",
    "on_hold",
    "closed",
    "archived",
]
const PRIORITY_OPTIONS: ReadonlyArray<NonNullable<Issue["priority"]>> = [
    "low",
    "medium",
    "high",
    "urgent",
]

const toStatus = (value: string): Issue["status"] =>
    value === "open"
        ? "open"
        : value === "in_progress"
          ? "in_progress"
          : value === "on_hold"
            ? "on_hold"
            : value === "closed"
              ? "closed"
              : "archived"

const toPriority = (value: string): NonNullable<Issue["priority"]> =>
    value === "low"
        ? "low"
        : value === "high"
          ? "high"
          : value === "urgent"
            ? "urgent"
            : "medium"

const toStatusFilter = (value: string): Model["statusFilter"] =>
    value === "all" ? "all" : toStatus(value)

const toPriorityFilter = (value: string): Model["priorityFilter"] =>
    value === "all" ? "all" : toPriority(value)

const parseLabels = (labels: string | undefined) => {
    if (labels == null || labels === "") {
        return []
    }

    try {
        const parsed: unknown = JSON.parse(labels)
        return Array.isArray(parsed)
            ? parsed.filter(
                  (value): value is string => typeof value === "string"
              )
            : []
    } catch {
        return []
    }
}

const decorativeTags = (issueId: string): ReadonlyArray<string> => {
    const seed = [...issueId].reduce(
        (total, character) => total + (character.codePointAt(0) ?? 0),
        0
    )

    switch (seed % 6) {
        case 0:
            return ["frontend", "accessibility"]
        case 1:
            return ["backend", "api"]
        case 2:
            return ["design", "polish"]
        case 3:
            return ["bug", "customer"]
        case 4:
            return ["performance", "infra"]
        default:
            return ["feature", "product"]
    }
}

type ResolvedIssueTag = Readonly<{
    id: string
    name: string
    color?: string
}>

const issueTags = (
    issue: Issue,
    available_tags: ReadonlyArray<Tag>,
    uses_tag_relations: boolean
): ReadonlyArray<ResolvedIssueTag> => {
    const labels = parseLabels(issue.labels)

    if (labels.length === 0) {
        return uses_tag_relations
            ? []
            : decorativeTags(issue.id).map((name) => ({ id: name, name }))
    }

    return labels.map((label) => {
        const tag = available_tags.find(
            (candidate) =>
                candidate.id === label ||
                candidate.name.toLowerCase() === label.toLowerCase()
        )

        return tag === undefined
            ? { id: label, name: label }
            : { id: tag.id, name: tag.name, color: tag.color }
    })
}

const toggledTagValue = (value: string, tag: Tag): string => {
    const selected = parseLabels(value)
    const is_selected = selected.some(
        (item) =>
            item === tag.id || item.toLowerCase() === tag.name.toLowerCase()
    )
    const next_selected = is_selected
        ? selected.filter(
              (item) =>
                  item !== tag.id &&
                  item.toLowerCase() !== tag.name.toLowerCase()
          )
        : [...selected, tag.id]

    return next_selected.length === 0
        ? ""
        : globalThis.JSON.stringify(next_selected)
}

const tagSelector = (
    value: string,
    available_tags: ReadonlyArray<Tag>,
    on_change: (value: string) => AppMessage,
    h: HtmlBuilder<AppMessage>
): Html => {
    const selected_tags = parseLabels(value)
    const selected_count = available_tags.filter((tag) =>
        selected_tags.some(
            (item) =>
                item === tag.id || item.toLowerCase() === tag.name.toLowerCase()
        )
    ).length

    return h.div(
        [h.Class("space-y-2")],
        [
            h.p(
                [h.Class("text-xs text-muted-foreground")],
                [
                    selected_count === 0
                        ? "Select one or more tags. None selected."
                        : `${selected_count} ${selected_count === 1 ? "tag" : "tags"} selected.`,
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                available_tags.map((tag) => {
                    const selected = selected_tags.some(
                        (item) =>
                            item === tag.id ||
                            item.toLowerCase() === tag.name.toLowerCase()
                    )

                    return h.keyed("button")(
                        tag.id,
                        [
                            h.Type("button"),
                            h.AriaPressed(selected ? "true" : "false"),
                            h.Title(
                                selected
                                    ? `Remove ${tag.name}`
                                    : `Select ${tag.name}`
                            ),
                            h.OnClick(on_change(toggledTagValue(value, tag))),
                            h.Class(
                                selected
                                    ? "inline-flex items-center gap-2 rounded-full border-(length:--control-border-width) border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground ring-2 ring-primary/25 [box-shadow:var(--shadow-primary)]"
                                    : "inline-flex items-center gap-2 rounded-full border-(length:--control-outline-border-width) border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        [
                            h.span(
                                [
                                    h.Class("size-2 rounded-full"),
                                    h.Style({ backgroundColor: tag.color }),
                                ],
                                []
                            ),
                            tag.name,
                            h.span(
                                [
                                    h.Class(
                                        selected
                                            ? "ml-0.5 grid size-4 place-items-center rounded-full border border-primary-foreground/40 bg-primary-foreground/20"
                                            : "ml-0.5 size-4 rounded-full border border-current/40"
                                    ),
                                ],
                                selected ? [IconCheck({ class: "size-3" })] : []
                            ),
                        ]
                    )
                })
            ),
        ]
    )
}

const tag_selector_field = (
    value: string,
    available_tags: ReadonlyArray<Tag>,
    on_change: (value: string) => AppMessage,
    h: HtmlBuilder<AppMessage>
): Html =>
    h.div(
        [h.Class("space-y-2")],
        [
            h.div([h.Class("text-sm font-medium text-foreground")], ["Tags"]),
            tagSelector(value, available_tags, on_change, h),
        ]
    )

const tagClass = (label: string): string => {
    const seed = [...label].reduce(
        (total, character) => total + (character.codePointAt(0) ?? 0),
        0
    )

    switch (seed % 4) {
        case 0:
            return "border-primary/15 bg-primary/10 text-primary"
        case 1:
            return "border-chart-2/20 bg-chart-2/10 text-chart-2"
        case 2:
            return "border-chart-3/20 bg-chart-3/10 text-chart-3"
        default:
            return "border-chart-5/20 bg-chart-5/10 text-chart-5"
    }
}

const formatDate = (value: number) =>
    new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    }).format(new Date(value))

const issueMatches = (issue: Issue, model: Model) => {
    const search = model.searchQuery.trim().toLowerCase()
    const labels = issueTags(issue, model.availableTags, model.usesTagRelations)

    const matchesSearch =
        search === "" ||
        issue.title.toLowerCase().includes(search) ||
        (issue.description ?? "").toLowerCase().includes(search) ||
        labels.some((tag) => tag.name.toLowerCase().includes(search))

    const matchesStatus =
        model.statusFilter === "all" || issue.status === model.statusFilter
    const matchesPriority =
        model.priorityFilter === "all" ||
        issue.priority === model.priorityFilter

    return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        issue.deleted_at == null
    )
}

const filteredIssues = (model: Model) =>
    model.issues.filter((issue) => issueMatches(issue, model))

const boardColumns = (
    issues: ReadonlyArray<Issue>
): Record<BoardStatus, ReadonlyArray<Issue>> => ({
    open: issues
        .filter((issue) => issue.status === "open")
        .slice()
        .sort((a, b) => a.order_position - b.order_position),
    in_progress: issues
        .filter((issue) => issue.status === "in_progress")
        .slice()
        .sort((a, b) => a.order_position - b.order_position),
    on_hold: issues
        .filter((issue) => issue.status === "on_hold")
        .slice()
        .sort((a, b) => a.order_position - b.order_position),
    closed: issues
        .filter((issue) => issue.status === "closed")
        .slice()
        .sort((a, b) => a.order_position - b.order_position),
})

const dragGhost = (model: Model, h: HtmlBuilder<AppMessage>): Html => {
    const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop)

    return pipe(
        Ui.DragAndDrop.ghostStyle(model.dragAndDrop),
        Option.flatMap((ghostStyle) =>
            Option.flatMap(maybeItemId, (itemId) =>
                pipe(
                    model.issues,
                    Array.findFirst((issue) => issue.id === itemId),
                    Option.map((issue) => ({ ghostStyle, issue }))
                )
            )
        ),
        Option.match({
            onNone: () => h.empty,
            onSome: ({ ghostStyle, issue }) =>
                h.div(
                    [
                        h.Style(ghostStyle),
                        h.Class(
                            "w-[22rem] rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 [box-shadow:var(--shadow-overlay)]"
                        ),
                    ],
                    [
                        h.div(
                            [h.Class("text-sm font-medium text-foreground")],
                            [issue.title]
                        ),
                        h.div(
                            [h.Class("mt-2 text-xs text-muted-foreground")],
                            [issue.description ?? "No description yet."]
                        ),
                    ]
                ),
        })
    )
}

const issueCard = (
    model: Model,
    issue: Issue,
    containerId: BoardStatus,
    index: number,
    hrefs: IssueViewHrefs,
    h: HtmlBuilder<AppMessage>
): Html => {
    const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop)
    const isDragged = Option.exists(maybeItemId, (id) => id === issue.id)
    const nextStatus = nextBoardStatus(containerId)

    return h.keyed("article")(
        issue.id,
        [
            h.Class(
                [
                    "relative rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-gradient-to-br from-card to-muted/60 p-3 text-card-foreground [box-shadow:var(--shadow-surface)] transition-all",
                    isDragged
                        ? "opacity-40"
                        : "hover:-translate-y-px hover:[box-shadow:var(--shadow-overlay)]",
                ].join(" ")
            ),
            ...(model.can_write === false
                ? []
                : Ui.DragAndDrop.draggable<AppMessage>(
                      {
                          model: model.dragAndDrop,
                          toParentMessage: (message) =>
                              GotDragAndDropMessage({ message }),
                          itemId: issue.id,
                          containerId,
                          index,
                      },
                      h
                  )),
            ...Ui.DragAndDrop.sortable(issue.id),
        ],
        [
            h.div(
                [h.Class("flex min-h-7 items-center justify-between gap-3")],
                [
                    h.span(
                        [
                            h.Class(
                                `text-[9px] font-extrabold uppercase tracking-[0.08em] ${PRIORITY_TEXT[issue.priority ?? "medium"]}`
                            ),
                        ],
                        [PRIORITY_META[issue.priority ?? "medium"].label]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.AriaLabel(`Drag ${issue.title}`),
                            h.Disabled(model.can_write === false),
                            h.Class(
                                "grid size-7 touch-none cursor-grab place-items-center rounded-[var(--radius-surface)] text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                            ),
                        ],
                        [IconGripVertical({ class: "size-4" })]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(hrefs.issue_href(issue.id)),
                    h.Class(
                        "flex min-h-[62px] flex-col items-start gap-1.5 py-1.5 pb-2 text-left text-foreground"
                    ),
                ],
                [
                    h.span(
                        [
                            h.Class(
                                "text-[10px] font-semibold tracking-[0.035em] text-muted-foreground"
                            ),
                        ],
                        [issue.id]
                    ),
                    h.span(
                        [h.Class("text-[13px] font-medium leading-[1.42]")],
                        [issue.title]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex min-h-[22px] flex-wrap gap-1")],
                issueTags(
                    issue,
                    model.availableTags,
                    model.usesTagRelations
                ).map((tag) =>
                    h.span(
                        [
                            h.Class(
                                `inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-0.5 text-[9px] font-medium ${tagClass(tag.name)}`
                            ),
                        ],
                        [
                            ...(tag.color === undefined
                                ? []
                                : [
                                      h.span(
                                          [
                                              h.Class("size-1.5 rounded-full"),
                                              h.Style({
                                                  backgroundColor: tag.color,
                                              }),
                                          ],
                                          []
                                      ),
                                  ]),
                            tag.name,
                        ]
                    )
                )
            ),
            h.div(
                [
                    h.Class(
                        "mt-3 flex items-center gap-2 border-t-(length:--surface-border-width) border-border/60 pt-2.5 text-[10px] text-muted-foreground"
                    ),
                ],
                [
                    h.span(
                        [h.Class("ml-auto")],
                        [formatDate(issue.updated_at)]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.AriaLabel(`Delete ${issue.title}`),
                            h.Disabled(model.can_write === false),
                            h.OnClick(
                                RequestedIssueDelete({ issueId: issue.id })
                            ),
                            h.Class(
                                "grid size-7 place-items-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted text-destructive hover:bg-destructive/10 focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]"
                            ),
                        ],
                        [IconTrash({ class: "size-3.5" })]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.AriaLabel(
                                `Move ${issue.title} forward to ${STATUS_META[nextStatus].label}`
                            ),
                            h.Disabled(model.can_write === false),
                            h.OnClick(MoveIssueForward({ issueId: issue.id })),
                            h.Class(
                                "grid size-7 place-items-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted text-muted-foreground hover:border-primary hover:text-primary"
                            ),
                        ],
                        [IconArrowRight({ class: "size-3.5" })]
                    ),
                ]
            ),
        ]
    )
}

const boardColumn = (
    model: Model,
    status: BoardStatus,
    issues: ReadonlyArray<Issue>,
    hrefs: IssueViewHrefs,
    h: HtmlBuilder<AppMessage>
): Html => {
    const maybeTarget = Ui.DragAndDrop.maybeDropTarget(model.dragAndDrop)
    const isDragging = Ui.DragAndDrop.isDragging(model.dragAndDrop)
    const isTargetColumn =
        isDragging &&
        Option.exists(maybeTarget, ({ containerId }) => containerId === status)
    const visibleIssues = issues

    const cardElements = visibleIssues.map((issue, index) =>
        issueCard(model, issue, status, index, hrefs, h)
    )

    const withPlaceholder: ReadonlyArray<Html> = isTargetColumn
        ? (() => {
              const targetIndex = Option.match(maybeTarget, {
                  onNone: () => visibleIssues.length,
                  onSome: ({ index }) => Math.min(index, visibleIssues.length),
              })

              const maybeItemId = Ui.DragAndDrop.maybeDraggedItemId(
                  model.dragAndDrop
              )
              const insertElement =
                  model.dragAndDrop.dragState._tag === "Dragging"
                      ? h.div(
                            [
                                h.Class(
                                    "rounded-2xl border-2 border-dashed border-primary/40 bg-primary/10 h-14"
                                ),
                            ],
                            []
                        )
                      : Option.match(maybeItemId, {
                            onNone: () =>
                                h.div(
                                    [
                                        h.Class(
                                            "rounded-2xl border-2 border-dashed border-primary/40 bg-primary/10 h-14"
                                        ),
                                    ],
                                    []
                                ),
                            onSome: (itemId) => {
                                const maybeIssue = model.issues.find(
                                    (issue) => issue.id === itemId
                                )
                                return maybeIssue == null
                                    ? h.div(
                                          [
                                              h.Class(
                                                  "rounded-2xl border-2 border-dashed border-primary/40 bg-primary/10 h-14"
                                              ),
                                          ],
                                          []
                                      )
                                    : issueCard(
                                          model,
                                          maybeIssue,
                                          status,
                                          targetIndex,
                                          hrefs,
                                          h
                                      )
                            },
                        })

              return [
                  ...cardElements.slice(0, targetIndex),
                  insertElement,
                  ...cardElements.slice(targetIndex),
              ]
          })()
        : cardElements

    return h.section(
        [
            h.Class(
                "flex min-h-[530px] min-w-[230px] flex-col rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border/60 bg-card/70 p-2.5 text-card-foreground transition-colors"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-3 px-1 pb-3")],
                [
                    h.div(
                        [h.Class("flex items-center gap-2")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        [
                                            "size-2 rounded-[3px]",
                                            STATUS_META[status].dot,
                                        ].join(" ")
                                    ),
                                ],
                                []
                            ),
                            h.h3(
                                [
                                    h.Class(
                                        "text-[13px] font-semibold text-foreground"
                                    ),
                                ],
                                [STATUS_META[status].label]
                            ),
                        ]
                    ),
                    h.span(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            ),
                        ],
                        [globalThis.String(issues.length)]
                    ),
                ]
            ),
            h.div(
                [h.Class("mt-4 space-y-3")],
                [
                    ...(status === "open" ? [createIssueCard(model, h)] : []),
                    h.div(
                        [
                            h.Class("space-y-3"),
                            ...Ui.DragAndDrop.droppable(
                                status,
                                STATUS_META[status].label
                            ),
                        ],
                        withPlaceholder.length > 0
                            ? withPlaceholder
                            : [
                                  h.div(
                                      [
                                          h.Class(
                                              "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-6 text-center text-sm text-muted-foreground"
                                          ),
                                      ],
                                      ["No issues in this column."]
                                  ),
                              ]
                    ),
                ]
            ),
        ]
    )
}

const boardView = (
    model: Model,
    hrefs: IssueViewHrefs,
    h: HtmlBuilder<AppMessage>
): Html => {
    const columns = boardColumns(filteredIssues(model))

    return h.div(
        [h.Class("grid grid-cols-4 gap-3 overflow-x-auto pb-3")],
        BOARD_STATUSES.map((status) =>
            boardColumn(model, status, columns[status], hrefs, h)
        )
    )
}

// The five columns need about 40rem before the flexible first one has any room
// left, so the table scrolls sideways rather than clipping on a phone. The
// header and the rows share one scroller so they stay aligned.
const issueListRow = (
    model: Model,
    issue: Issue,
    hrefs: IssueViewHrefs,
    h: HtmlBuilder<AppMessage>
): Html =>
    h.keyed("div")(
        issue.id,
        [
            h.Class(
                "grid grid-cols-[minmax(0,1.7fr)_10rem_9rem_8rem_2rem] items-center gap-4 px-4 text-left transition-colors hover:bg-accent/40 [box-shadow:var(--shadow-control)]"
            ),
        ],
        [
            h.a(
                [
                    h.Href(hrefs.issue_href(issue.id)),
                    h.Class(
                        "col-span-4 grid grid-cols-subgrid items-center py-4"
                    ),
                ],
                [
                    h.div(
                        [h.Class("min-w-0")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "truncate text-sm font-medium text-foreground"
                                    ),
                                ],
                                [issue.title]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-1 truncate text-xs text-muted-foreground"
                                    ),
                                ],
                                [issue.description ?? "No description yet."]
                            ),
                        ]
                    ),
                    h.span(
                        [
                            h.Class(
                                [
                                    "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium [box-shadow:var(--shadow-control)]",
                                    STATUS_META[issue.status].pill,
                                ].join(" ")
                            ),
                        ],
                        [STATUS_META[issue.status].label]
                    ),
                    h.span(
                        [
                            h.Class(
                                [
                                    "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium [box-shadow:var(--shadow-control)]",
                                    PRIORITY_META[issue.priority ?? "medium"]
                                        .pill,
                                ].join(" ")
                            ),
                        ],
                        [PRIORITY_META[issue.priority ?? "medium"].label]
                    ),
                    h.span(
                        [h.Class("text-sm text-muted-foreground")],
                        [formatDate(issue.updated_at)]
                    ),
                ]
            ),
            h.button(
                [
                    h.Type("button"),
                    h.AriaLabel(`Delete ${issue.title}`),
                    h.Disabled(model.can_write === false),
                    h.OnClick(RequestedIssueDelete({ issueId: issue.id })),
                    h.Class(
                        "grid size-7 place-items-center rounded-[var(--radius-surface)] text-destructive hover:bg-destructive/10 focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]"
                    ),
                ],
                [IconTrash({ class: "size-3.5" })]
            ),
        ]
    )

const listView = (
    model: Model,
    hrefs: IssueViewHrefs,
    h: HtmlBuilder<AppMessage>
): Html =>
    h.div(
        [
            h.Class(
                "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("overflow-x-auto")],
                [
                    h.div(
                        [h.Class("min-w-[55rem]")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "grid grid-cols-[minmax(0,1.7fr)_10rem_9rem_8rem_2rem] gap-4 border-b-(length:--surface-border-width) border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                                    ),
                                ],
                                [
                                    h.span([], ["Issue"]),
                                    h.span([], ["Status"]),
                                    h.span([], ["Priority"]),
                                    h.span([], ["Updated"]),
                                    h.span([h.Class("sr-only")], ["Actions"]),
                                ]
                            ),
                            h.div(
                                [h.Class("divide-y divide-border")],
                                filteredIssues(model).map((issue) =>
                                    issueListRow(model, issue, hrefs, h)
                                )
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const summaryCard = (
    label: string,
    value: string,
    detail: string,
    h: HtmlBuilder<AppMessage>
): Html =>
    h.div(
        [
            h.Class("inline-flex items-baseline gap-2 text-sm text-foreground"),
            h.Title(detail),
        ],
        [
            h.span([h.Class("text-muted-foreground")], [label]),
            h.span([h.Class("font-semibold tabular-nums")], [value]),
        ]
    )

function createIssueCard(model: Model, h: HtmlBuilder<AppMessage>): Html {
    if (model.can_write === false) return h.empty
    if (!model.create_issue_expanded) {
        return h.button(
            [
                h.Type("button"),
                h.OnClick(ToggledCreateIssue()),
                h.Class(
                    "flex min-h-24 w-full items-center justify-center gap-2 rounded-[var(--radius-surface)] border-2 border-dashed border-border bg-card/60 px-4 py-6 text-sm font-medium text-muted-foreground transition hover:border-primary/50 hover:bg-accent hover:text-accent-foreground"
                ),
            ],
            [IconPlus({ class: "size-4" }), "Add issue"]
        )
    }

    return h.form(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
            h.OnSubmit(CreatedIssueSubmitted()),
        ],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    h.h2(
                        [h.Class("text-lg font-semibold text-foreground")],
                        ["New issue"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Title("Cancel new issue"),
                            h.AriaLabel("Cancel new issue"),
                            h.OnClick(ToggledCreateIssue()),
                            h.Class(
                                "grid size-8 place-items-center rounded-[var(--radius-control)] border-(length:--control-border-width) border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            ),
                        ],
                        [IconX({ class: "size-4" })]
                    ),
                ]
            ),
            h.div(
                [h.Class("mt-4 space-y-3")],
                [
                    h.input([
                        h.Value(model.newTitle),
                        h.Placeholder("Issue title"),
                        h.Class(
                            "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                        ),
                        h.OnInput((value) => NewTitleChanged({ value })),
                    ]),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ToggledCreateIssueDetails()),
                            h.AriaExpanded(model.create_issue_details_expanded),
                            h.Class(
                                "text-sm font-medium text-muted-foreground hover:text-foreground"
                            ),
                        ],
                        [
                            model.create_issue_details_expanded
                                ? "Fewer details"
                                : "More details",
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                model.create_issue_details_expanded
                                    ? "space-y-3"
                                    : "hidden"
                            ),
                        ],
                        [
                            h.textarea([
                                h.Value(model.newDescription),
                                h.Placeholder("Short description"),
                                h.Class(
                                    "min-h-24 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                ),
                                h.OnInput((value) =>
                                    NewDescriptionChanged({ value })
                                ),
                            ]),
                            h.textarea([
                                h.Value(model.newContent),
                                h.Placeholder("Content"),
                                h.Class(
                                    "min-h-32 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                ),
                                h.OnInput((value) =>
                                    NewContentChanged({ value })
                                ),
                            ]),
                            h.div(
                                [h.Class("grid gap-3 sm:grid-cols-2")],
                                [
                                    h.select(
                                        [
                                            h.Value(model.newStatus),
                                            h.Class(
                                                "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                            ),
                                            h.OnInput((value) =>
                                                NewStatusChanged({
                                                    value: toStatus(value),
                                                })
                                            ),
                                        ],
                                        ALL_STATUSES.map((status) =>
                                            h.option(
                                                [h.Value(status)],
                                                [STATUS_META[status].label]
                                            )
                                        )
                                    ),
                                    h.select(
                                        [
                                            h.Value(model.newPriority),
                                            h.Class(
                                                "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                            ),
                                            h.OnInput((value) =>
                                                NewPriorityChanged({
                                                    value: toPriority(value),
                                                })
                                            ),
                                        ],
                                        PRIORITY_OPTIONS.map((priority) =>
                                            h.option(
                                                [h.Value(priority)],
                                                [PRIORITY_META[priority].label]
                                            )
                                        )
                                    ),
                                ]
                            ),
                            !model.usesTagRelations
                                ? h.input([
                                      h.Value(model.newLabels),
                                      h.Placeholder("Labels, comma separated"),
                                      h.Class(
                                          "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                      ),
                                      h.OnInput((value) =>
                                          NewLabelsChanged({ value })
                                      ),
                                  ])
                                : model.availableTags.length === 0
                                  ? h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Create a tag from the Tags page to assign it.",
                                        ]
                                    )
                                  : tag_selector_field(
                                        model.newLabels,
                                        model.availableTags,
                                        (value) => NewLabelsChanged({ value }),
                                        h
                                    ),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Class(
                                "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        ["Add issue"]
                    ),
                ]
            ),
        ]
    )
}

const issueDetailView = (
    model: Model,
    hrefs: IssueViewHrefs,
    h: HtmlBuilder<AppMessage>
): Html => {
    const currentIssue = model.issues.find(
        (issue) =>
            issue.id ===
            (model.route._tag === "Issue" ? model.route.issueId : "")
    )

    return currentIssue == null
        ? h.div(
              [
                  h.Class(
                      "mx-auto max-w-3xl rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                  ),
              ],
              [
                  h.h1(
                      [h.Class("text-2xl font-semibold text-foreground")],
                      ["Issue not found"]
                  ),
                  h.p(
                      [h.Class("mt-2 text-sm text-muted-foreground")],
                      ["The issue no longer exists."]
                  ),
                  h.a(
                      [
                          h.Href(hrefs.issues_href()),
                          h.Class(
                              "mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                          ),
                      ],
                      ["Back to issues"]
                  ),
              ]
          )
        : h.div(
              [
                  h.Class(
                      "mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]"
                  ),
              ],
              [
                  h.div(
                      [
                          h.Class(
                              "rounded-[2rem] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                          ),
                      ],
                      [
                          h.div(
                              [h.Class("flex flex-wrap items-center gap-3")],
                              [
                                  h.a(
                                      [
                                          h.Href(hrefs.issues_href()),
                                          h.Class(
                                              "text-sm text-muted-foreground hover:text-foreground"
                                          ),
                                      ],
                                      ["Back to issues"]
                                  ),
                                  h.span(
                                      [
                                          h.Class(
                                              "text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [currentIssue.id]
                                  ),
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.Disabled(model.can_write === false),
                                          h.OnClick(
                                              model.issue_detail_mode ===
                                                  "editing"
                                                  ? CancelledIssueEditing()
                                                  : StartedIssueEditing()
                                          ),
                                          h.Class(
                                              "ml-auto inline-flex items-center gap-2 rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-background px-3 py-2 text-sm font-medium text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent"
                                          ),
                                      ],
                                      model.issue_detail_mode === "editing"
                                          ? [
                                                IconX({ class: "size-4" }),
                                                "Cancel editing",
                                            ]
                                          : [
                                                IconPencil({ class: "size-4" }),
                                                "Edit issue",
                                            ]
                                  ),
                              ]
                          ),
                          h.h1(
                              [
                                  h.Class(
                                      model.issue_detail_mode === "preview"
                                          ? "mt-4 text-3xl font-semibold tracking-tight text-foreground"
                                          : "hidden"
                                  ),
                              ],
                              [currentIssue.title]
                          ),
                          h.p(
                              [
                                  h.Class(
                                      model.issue_detail_mode === "preview"
                                          ? "mt-3 max-w-3xl text-base leading-7 text-muted-foreground"
                                          : "hidden"
                                  ),
                              ],
                              [
                                  currentIssue.description ??
                                      "No description yet.",
                              ]
                          ),
                          ...(model.issue_detail_mode === "preview" &&
                          currentIssue.content !== undefined &&
                          currentIssue.content.trim() !== ""
                              ? [
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-8 whitespace-pre-wrap border-t-(length:--surface-border-width) border-border pt-6 text-base leading-7 text-foreground"
                                            ),
                                        ],
                                        [currentIssue.content]
                                    ),
                                ]
                              : []),
                          h.div(
                              [
                                  h.Class(
                                      model.issue_detail_mode === "editing"
                                          ? "mt-6 grid gap-4 sm:grid-cols-2"
                                          : "hidden"
                                  ),
                              ],
                              [
                                  h.label(
                                      [h.Class("space-y-2")],
                                      [
                                          h.span(
                                              [
                                                  h.Class(
                                                      "block text-sm font-medium text-foreground"
                                                  ),
                                              ],
                                              ["Title"]
                                          ),
                                          h.input([
                                              h.Disabled(
                                                  model.can_write === false
                                              ),
                                              h.Value(model.editingTitle),
                                              h.Class(
                                                  "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                              ),
                                              h.OnInput((value) =>
                                                  EditingTitleChanged({ value })
                                              ),
                                          ]),
                                      ]
                                  ),
                                  h.label(
                                      [h.Class("space-y-2")],
                                      [
                                          h.span(
                                              [
                                                  h.Class(
                                                      "block text-sm font-medium text-foreground"
                                                  ),
                                              ],
                                              ["Status"]
                                          ),
                                          h.select(
                                              [
                                                  h.Disabled(
                                                      model.can_write === false
                                                  ),
                                                  h.Value(model.editingStatus),
                                                  h.Class(
                                                      "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                                  ),
                                                  h.OnInput((value) =>
                                                      EditingStatusChanged({
                                                          value: toStatus(
                                                              value
                                                          ),
                                                      })
                                                  ),
                                              ],
                                              ALL_STATUSES.map((status) =>
                                                  h.option(
                                                      [h.Value(status)],
                                                      [
                                                          STATUS_META[status]
                                                              .label,
                                                      ]
                                                  )
                                              )
                                          ),
                                      ]
                                  ),
                                  h.label(
                                      [h.Class("space-y-2")],
                                      [
                                          h.span(
                                              [
                                                  h.Class(
                                                      "block text-sm font-medium text-foreground"
                                                  ),
                                              ],
                                              ["Priority"]
                                          ),
                                          h.select(
                                              [
                                                  h.Disabled(
                                                      model.can_write === false
                                                  ),
                                                  h.Value(
                                                      model.editingPriority
                                                  ),
                                                  h.Class(
                                                      "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                                  ),
                                                  h.OnInput((value) =>
                                                      EditingPriorityChanged({
                                                          value: toPriority(
                                                              value
                                                          ),
                                                      })
                                                  ),
                                              ],
                                              PRIORITY_OPTIONS.map((priority) =>
                                                  h.option(
                                                      [h.Value(priority)],
                                                      [
                                                          PRIORITY_META[
                                                              priority
                                                          ].label,
                                                      ]
                                                  )
                                              )
                                          ),
                                      ]
                                  ),
                              ]
                          ),
                          h.div(
                              [
                                  h.Class(
                                      model.issue_detail_mode === "editing"
                                          ? "mt-6 space-y-4"
                                          : "hidden"
                                  ),
                              ],
                              [
                                  !model.usesTagRelations
                                      ? h.input([
                                            h.Disabled(
                                                model.can_write === false
                                            ),
                                            h.Value(model.editingLabels),
                                            h.Placeholder(
                                                "Labels, comma separated"
                                            ),
                                            h.Class(
                                                "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                            ),
                                            h.OnInput((value) =>
                                                EditingLabelsChanged({
                                                    value,
                                                })
                                            ),
                                        ])
                                      : model.availableTags.length === 0
                                        ? h.p(
                                              [
                                                  h.Class(
                                                      "text-sm text-muted-foreground"
                                                  ),
                                              ],
                                              [
                                                  "Create a tag from the Tags page to assign it.",
                                              ]
                                          )
                                        : tag_selector_field(
                                              model.editingLabels,
                                              model.availableTags,
                                              (value) =>
                                                  EditingLabelsChanged({
                                                      value,
                                                  }),
                                              h
                                          ),
                                  h.label(
                                      [
                                          h.Class(
                                              "block text-sm font-medium text-foreground"
                                          ),
                                      ],
                                      ["Description"]
                                  ),
                                  h.textarea([
                                      h.Disabled(model.can_write === false),
                                      h.Value(model.editingDescription),
                                      h.Class(
                                          "min-h-40 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                      ),
                                      h.OnInput((value) =>
                                          EditingDescriptionChanged({
                                              value,
                                          })
                                      ),
                                  ]),
                                  h.label(
                                      [
                                          h.Class(
                                              "block text-sm font-medium text-foreground"
                                          ),
                                      ],
                                      ["Content"]
                                  ),
                                  h.textarea([
                                      h.Disabled(model.can_write === false),
                                      h.Value(model.editingContent),
                                      h.Class(
                                          "min-h-56 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                      ),
                                      h.OnInput((value) =>
                                          EditingContentChanged({ value })
                                      ),
                                  ]),
                              ]
                          ),
                          h.div(
                              [
                                  h.Class(
                                      model.issue_detail_mode === "editing"
                                          ? "mt-6 flex flex-wrap gap-2"
                                          : "hidden"
                                  ),
                              ],
                              [
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.Disabled(model.can_write === false),
                                          h.OnClick(SavedIssueSubmitted()),
                                          h.Class(
                                              "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                          ),
                                      ],
                                      ["Save changes"]
                                  ),
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(CancelledIssueEditing()),
                                          h.Class(
                                              "rounded-full border-(length:--surface-border-width) border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                                          ),
                                      ],
                                      ["Cancel"]
                                  ),
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.Disabled(model.can_write === false),
                                          h.OnClick(
                                              RequestedIssueDelete({
                                                  issueId: currentIssue.id,
                                              })
                                          ),
                                          h.Class(
                                              "rounded-full border-(length:--surface-border-width) border-border px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                                          ),
                                      ],
                                      ["Delete issue"]
                                  ),
                              ]
                          ),
                      ]
                  ),
                  h.aside(
                      [
                          h.Class(
                              "space-y-4 rounded-[2rem] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
                          ),
                      ],
                      [
                          h.div(
                              [
                                  h.Class(
                                      "text-lg font-semibold text-foreground"
                                  ),
                              ],
                              ["Details"]
                          ),
                          h.div(
                              [
                                  h.Class(
                                      "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                  ),
                              ],
                              [
                                  h.div(
                                      [h.Class("grid grid-cols-2 gap-3")],
                                      [
                                          h.div(
                                              [],
                                              [
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "text-xs uppercase tracking-[0.2em] text-muted-foreground"
                                                          ),
                                                      ],
                                                      ["Status"]
                                                  ),
                                                  h.span(
                                                      [
                                                          h.Class(
                                                              `mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_META[currentIssue.status].pill}`
                                                          ),
                                                      ],
                                                      [
                                                          STATUS_META[
                                                              currentIssue
                                                                  .status
                                                          ].label,
                                                      ]
                                                  ),
                                              ]
                                          ),
                                          h.div(
                                              [],
                                              [
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "text-xs uppercase tracking-[0.2em] text-muted-foreground"
                                                          ),
                                                      ],
                                                      ["Priority"]
                                                  ),
                                                  h.span(
                                                      [
                                                          h.Class(
                                                              `mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_META[currentIssue.priority ?? "medium"].pill}`
                                                          ),
                                                      ],
                                                      [
                                                          PRIORITY_META[
                                                              currentIssue.priority ??
                                                                  "medium"
                                                          ].label,
                                                      ]
                                                  ),
                                              ]
                                          ),
                                      ]
                                  ),
                                  h.div(
                                      [
                                          h.Class(
                                              "mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground"
                                          ),
                                      ],
                                      ["Updated"]
                                  ),
                                  h.div(
                                      [h.Class("mt-1 text-sm text-foreground")],
                                      [formatDate(currentIssue.updated_at)]
                                  ),
                                  h.div(
                                      [
                                          h.Class(
                                              "mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground"
                                          ),
                                      ],
                                      ["Tags"]
                                  ),
                                  h.div(
                                      [h.Class("mt-2 flex flex-wrap gap-2")],
                                      issueTags(
                                          currentIssue,
                                          model.availableTags,
                                          model.usesTagRelations
                                      ).length > 0
                                          ? issueTags(
                                                currentIssue,
                                                model.availableTags,
                                                model.usesTagRelations
                                            ).map((tag) =>
                                                h.span(
                                                    [
                                                        h.Class(
                                                            "inline-flex items-center gap-1.5 rounded-full border-(length:--surface-border-width) border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground"
                                                        ),
                                                    ],
                                                    [
                                                        ...(tag.color ===
                                                        undefined
                                                            ? []
                                                            : [
                                                                  h.span(
                                                                      [
                                                                          h.Class(
                                                                              "size-2 rounded-full"
                                                                          ),
                                                                          h.Style(
                                                                              {
                                                                                  backgroundColor:
                                                                                      tag.color,
                                                                              }
                                                                          ),
                                                                      ],
                                                                      []
                                                                  ),
                                                              ]),
                                                        tag.name,
                                                    ]
                                                )
                                            )
                                          : [
                                                h.span(
                                                    [
                                                        h.Class(
                                                            "text-sm text-muted-foreground"
                                                        ),
                                                    ],
                                                    ["None"]
                                                ),
                                            ]
                                  ),
                              ]
                          ),
                          h.div(
                              [
                                  h.Class(
                                      "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 text-sm text-muted-foreground"
                                  ),
                              ],
                              ["Comments are UI only for now."]
                          ),
                      ]
                  ),
              ]
          )
}

const deleteIssueConfirmationView = (
    model: Model,
    h: HtmlBuilder<AppMessage>
): Html => {
    const pending_issue = Option.flatMap(
        model.pending_delete_issue_id,
        (issue_id) =>
            Array.findFirst(model.issues, (issue) => issue.id === issue_id)
    )

    return h.submodel({
        slotId: model.delete_issue_dialog.id,
        model: model.delete_issue_dialog,
        view: Ui.Dialog.view,
        viewInputs: {
            toView: (render) =>
                h.dialog(
                    [
                        ...render.dialog,
                        h.Class(
                            "open:flex items-center justify-center bg-transparent p-0 backdrop:bg-foreground/20"
                        ),
                    ],
                    render.isVisible
                        ? [
                              h.div(
                                  [
                                      ...render.backdrop,
                                      h.Class("fixed inset-0 bg-foreground/20"),
                                  ],
                                  []
                              ),
                              h.div(
                                  [
                                      ...render.panel,
                                      h.Class(
                                          "relative z-10 w-full max-w-md rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-overlay)]"
                                      ),
                                  ],
                                  [
                                      h.h2(
                                          [
                                              h.Id(
                                                  Ui.Dialog.titleId(
                                                      model.delete_issue_dialog
                                                  )
                                              ),
                                              h.Class(
                                                  "text-xl font-semibold text-foreground"
                                              ),
                                          ],
                                          ["Delete issue"]
                                      ),
                                      h.p(
                                          [
                                              h.Class(
                                                  "mt-2 text-sm text-muted-foreground"
                                              ),
                                          ],
                                          [
                                              `Delete ${Option.match(
                                                  pending_issue,
                                                  {
                                                      onNone: () =>
                                                          "this issue",
                                                      onSome: (issue) =>
                                                          issue.title,
                                                  }
                                              )}? This cannot be undone.`,
                                          ]
                                      ),
                                      h.div(
                                          [
                                              h.Class(
                                                  "mt-6 flex justify-end gap-2"
                                              ),
                                          ],
                                          [
                                              h.button(
                                                  [
                                                      ...render.closeButton,
                                                      h.Class(
                                                          "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                                      ),
                                                  ],
                                                  ["Cancel"]
                                              ),
                                              h.button(
                                                  [
                                                      h.Type("button"),
                                                      h.Disabled(
                                                          model.can_write ===
                                                              false
                                                      ),
                                                      h.OnClick(
                                                          ConfirmedIssueDelete()
                                                      ),
                                                      h.Class(
                                                          "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:opacity-90 [box-shadow:var(--shadow-control)]"
                                                      ),
                                                  ],
                                                  ["Delete"]
                                              ),
                                          ]
                                      ),
                                  ]
                              ),
                          ]
                        : []
                ),
        },
        toParentMessage: (message) => GotDeleteIssueDialogMessage({ message }),
    })
}

const contentViewWithHrefs = (
    model: Model,
    hrefs: IssueViewHrefs,
    h: HtmlBuilder<AppMessage>
): Html => {
    const visibleIssues = filteredIssues(model)
    const openCount = visibleIssues.filter(
        (issue) => issue.status === "open"
    ).length
    const urgentCount = visibleIssues.filter(
        (issue) => issue.priority === "urgent"
    ).length

    const body =
        model.route._tag === "Issue"
            ? issueDetailView(model, hrefs, h)
            : h.div(
                  [
                      h.Class(
                          "mx-auto flex w-full max-w-[1600px] flex-col gap-6"
                      ),
                  ],
                  [
                      h.div(
                          [h.Class("space-y-5")],
                          [
                              h.div(
                                  [
                                      h.Class(
                                          "flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
                                      ),
                                  ],
                                  [
                                      h.div(
                                          [h.Class("max-w-3xl space-y-3")],
                                          [
                                              h.h1(
                                                  [
                                                      h.Class(
                                                          "text-3xl font-semibold tracking-tight text-foreground"
                                                      ),
                                                  ],
                                                  ["Issues"]
                                              ),
                                              h.p(
                                                  [
                                                      h.Class(
                                                          "max-w-2xl text-sm leading-6 text-muted-foreground"
                                                      ),
                                                  ],
                                                  [
                                                      "Track and organize issues. Open an issue to view or edit its details.",
                                                  ]
                                              ),
                                          ]
                                      ),
                                      h.div(
                                          [
                                              h.Class(
                                                  "hidden flex-wrap gap-2 xl:flex"
                                              ),
                                          ],
                                          [
                                              h.button(
                                                  [
                                                      h.Type("button"),
                                                      h.OnClick(
                                                          ViewSelected({
                                                              view: "board",
                                                          })
                                                      ),
                                                      h.Class(
                                                          [
                                                              "rounded-full border-(length:--surface-border-width) px-4 py-2 text-sm font-medium transition-colors",
                                                              model.view ===
                                                              "board"
                                                                  ? "border-primary bg-primary text-primary-foreground"
                                                                  : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
                                                          ].join(" ")
                                                      ),
                                                  ],
                                                  ["Board"]
                                              ),
                                              h.button(
                                                  [
                                                      h.Type("button"),
                                                      h.OnClick(
                                                          ViewSelected({
                                                              view: "list",
                                                          })
                                                      ),
                                                      h.Class(
                                                          [
                                                              "rounded-full border-(length:--surface-border-width) px-4 py-2 text-sm font-medium transition-colors",
                                                              model.view ===
                                                              "list"
                                                                  ? "border-primary bg-primary text-primary-foreground"
                                                                  : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
                                                          ].join(" ")
                                                      ),
                                                  ],
                                                  ["List"]
                                              ),
                                          ]
                                      ),
                                  ]
                              ),
                              h.div(
                                  [h.Class("flex flex-wrap gap-x-6 gap-y-2")],
                                  [
                                      summaryCard(
                                          "Visible issues",
                                          globalThis.String(
                                              visibleIssues.length
                                          ),
                                          "After search and filters",
                                          h
                                      ),
                                      summaryCard(
                                          "Open",
                                          globalThis.String(openCount),
                                          "Ready to pick up",
                                          h
                                      ),
                                      summaryCard(
                                          "Urgent",
                                          globalThis.String(urgentCount),
                                          "Needs attention",
                                          h
                                      ),
                                  ]
                              ),
                          ]
                      ),
                      h.div(
                          [],
                          [
                              h.div(
                                  [h.Class("text-foreground")],
                                  [
                                      h.div(
                                          [
                                              h.Class(
                                                  "grid gap-4 xl:grid-cols-[minmax(0,1fr)_14rem_14rem]"
                                              ),
                                          ],
                                          [
                                              h.div(
                                                  [h.Class("space-y-2")],
                                                  [
                                                      h.label(
                                                          [
                                                              h.For(
                                                                  "issues-search"
                                                              ),
                                                              h.Class(
                                                                  "text-sm font-medium text-foreground"
                                                              ),
                                                          ],
                                                          ["Search"]
                                                      ),
                                                      h.input([
                                                          h.Id("issues-search"),
                                                          h.Type("search"),
                                                          h.Value(
                                                              model.searchQuery
                                                          ),
                                                          h.Placeholder(
                                                              "Search issues..."
                                                          ),
                                                          h.Class(
                                                              "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                                          ),
                                                          h.OnInput((value) =>
                                                              SearchQueryChanged(
                                                                  { value }
                                                              )
                                                          ),
                                                      ]),
                                                  ]
                                              ),
                                              h.div(
                                                  [h.Class("space-y-2")],
                                                  [
                                                      h.label(
                                                          [
                                                              h.For(
                                                                  "issues-status-filter"
                                                              ),
                                                              h.Class(
                                                                  "text-sm font-medium text-foreground"
                                                              ),
                                                          ],
                                                          ["Status"]
                                                      ),
                                                      h.select(
                                                          [
                                                              h.Id(
                                                                  "issues-status-filter"
                                                              ),
                                                              h.Value(
                                                                  model.statusFilter
                                                              ),
                                                              h.Class(
                                                                  "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                                              ),
                                                              h.OnInput(
                                                                  (value) =>
                                                                      StatusFilterChanged(
                                                                          {
                                                                              value: toStatusFilter(
                                                                                  value
                                                                              ),
                                                                          }
                                                                      )
                                                              ),
                                                          ],
                                                          [
                                                              h.option(
                                                                  [
                                                                      h.Value(
                                                                          "all"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      "All statuses",
                                                                  ]
                                                              ),
                                                              ...ALL_STATUSES.map(
                                                                  (status) =>
                                                                      h.option(
                                                                          [
                                                                              h.Value(
                                                                                  status
                                                                              ),
                                                                          ],
                                                                          [
                                                                              STATUS_META[
                                                                                  status
                                                                              ]
                                                                                  .label,
                                                                          ]
                                                                      )
                                                              ),
                                                          ]
                                                      ),
                                                  ]
                                              ),
                                              h.div(
                                                  [h.Class("space-y-2")],
                                                  [
                                                      h.label(
                                                          [
                                                              h.For(
                                                                  "issues-priority-filter"
                                                              ),
                                                              h.Class(
                                                                  "text-sm font-medium text-foreground"
                                                              ),
                                                          ],
                                                          ["Priority"]
                                                      ),
                                                      h.select(
                                                          [
                                                              h.Id(
                                                                  "issues-priority-filter"
                                                              ),
                                                              h.Value(
                                                                  model.priorityFilter
                                                              ),
                                                              h.Class(
                                                                  "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                                              ),
                                                              h.OnInput(
                                                                  (value) =>
                                                                      PriorityFilterChanged(
                                                                          {
                                                                              value: toPriorityFilter(
                                                                                  value
                                                                              ),
                                                                          }
                                                                      )
                                                              ),
                                                          ],
                                                          [
                                                              h.option(
                                                                  [
                                                                      h.Value(
                                                                          "all"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      "All priorities",
                                                                  ]
                                                              ),
                                                              ...PRIORITY_OPTIONS.map(
                                                                  (priority) =>
                                                                      h.option(
                                                                          [
                                                                              h.Value(
                                                                                  priority
                                                                              ),
                                                                          ],
                                                                          [
                                                                              PRIORITY_META[
                                                                                  priority
                                                                              ]
                                                                                  .label,
                                                                          ]
                                                                      )
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
                      ),
                      h.div(
                          [h.Class("space-y-4")],
                          [
                              ...(model.view === "board" &&
                              !model.isCompactViewport
                                  ? []
                                  : [createIssueCard(model, h)]),
                              model.view === "board" && !model.isCompactViewport
                                  ? boardView(model, hrefs, h)
                                  : listView(model, hrefs, h),
                          ]
                      ),
                  ]
              )

    return h.div(
        [],
        [
            body,
            h.div(
                [h.Class("sr-only"), h.AriaLive("assertive")],
                [model.announcement]
            ),
            dragGhost(model, h),
            deleteIssueConfirmationView(model, h),
        ]
    )
}

const contentView = (model: Model, h: HtmlBuilder<AppMessage>): Html =>
    contentViewWithHrefs(model, web_hrefs, h)

export const submodelView = Submodel.defineView<Model, AppMessage>(contentView)

export const routedSubmodelView = Submodel.defineView<
    Model,
    AppMessage,
    IssueViewHrefs
>((model, hrefs, h) => contentViewWithHrefs(model, hrefs, h))

export const view = (model: Model, h: HtmlBuilder<AppMessage>): Document => ({
    title: model.route._tag === "Issue" ? "Issue" : "Issues",
    body: h.div(
        [
            h.Class(
                "min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8"
            ),
        ],
        [contentView(model, h)]
    ),
})
