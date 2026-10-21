import { Array, HashMap, Option } from "effect"
import { AsyncData } from "foldkit"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"
import * as Ui from "@foldkit/ui"

import { TAGS } from "../crm/crm.domain.ts"
import type { ActivityRecency } from "../crm/crm.model.ts"
import { SEARCH_DEBOUNCE_MS, TOTAL_CONTACTS } from "./crm-sync.command.ts"
import {
    ChangedSyncRoute,
    ClickedCancelSyncContactEdit,
    ClickedEditSyncContact,
    ClickedSyncRebuild,
    SelectedSyncActivityRecency,
    SubmittedSyncContactEdit,
    ToggledSyncTagFacet,
    UpdatedSyncEditedName,
    UpdatedSyncSearchText,
    type Message,
} from "./crm-sync.message.ts"
import {
    CrmSyncContactRoute,
    CrmSyncListRoute,
    crmSyncBrowseHref,
    crmSyncContactHref,
    recencyParamFor,
    tagsParamFor,
} from "./crm-sync.route.ts"
import {
    LIST_ID,
    MAX_CACHED_QUERY_PAGES,
    ROW_HEIGHT_PX,
    activeQueryKeyFor,
    currentPageData,
    describeFilterKey,
    detailFor,
    displayNameFor,
    isPendingWrite,
    rowAt,
    totalMatchesFor,
    visibleRowsFor,
    visibleWindowFor,
    type Model,
} from "./crm-sync.model.ts"
import { batchCount, hydrationPercent } from "./crm-sync.update.ts"

const navigationControl = <ParentMessage>(
    href: string,
    message: ParentMessage,
    attributes: ReadonlyArray<Attribute<ParentMessage>>,
    children: ReadonlyArray<Html | string>,
    internal_navigation: boolean,
    h: HtmlBuilder<ParentMessage>
) =>
    internal_navigation
        ? h.button(
              [h.Type("button"), h.OnClick(message), ...attributes],
              children
          )
        : h.a([h.Href(href), ...attributes], children)

// The one badge the write overlay puts on a row. The name itself reads through
// displayNameFor wherever it is shown; everything else on the row still comes
// from whichever source produced the page.
const writeBadge = <ParentMessage>(
    model: Model,
    contactId: string,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    isPendingWrite(model, contactId)
        ? // Not colour alone: the word carries the meaning for anyone who cannot
          // see the muted tone.
          [
              h.span(
                  [
                      h.Class(
                          "shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      ),
                  ],
                  ["saving"]
              ),
          ]
        : Object.hasOwn(model.editedNameByContactId, contactId)
          ? [
                h.span(
                    [
                        h.Class(
                            "shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        ),
                    ],
                    ["edited locally"]
                ),
            ]
          : []

// The rename lives on the detail page rather than on the row: a row is a fixed
// height the window arithmetic depends on, and a form that grows inside one
// would put the spacers and the rows into disagreement about where a row starts.
const renameForm = <ParentMessage>(
    model: Model,
    contactId: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(
        Option.filter(
            model.maybeEditingContactId,
            (editingId) => editingId === contactId
        ),
        {
            onNone: () =>
                button(
                    "Rename",
                    toParentMessage(ClickedEditSyncContact({ contactId })),
                    h
                ),
            onSome: () =>
                h.div(
                    [h.Class("flex flex-wrap items-center gap-2")],
                    [
                        Ui.Input.view(
                            {
                                id: `crm-sync-edit-${contactId}`,
                                value: model.editedName,
                                placeholder: "Contact name",
                                onInput: (value) =>
                                    toParentMessage(
                                        UpdatedSyncEditedName({ value })
                                    ),
                                toView: (attributes) =>
                                    h.div(
                                        [h.Class("flex flex-col gap-1")],
                                        [
                                            h.label(
                                                [
                                                    ...attributes.label,
                                                    h.Class("sr-only"),
                                                ],
                                                ["Contact name"]
                                            ),
                                            h.input([
                                                ...attributes.input,
                                                h.Class(
                                                    "h-9 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 text-sm"
                                                ),
                                            ]),
                                        ]
                                    ),
                            },
                            h
                        ),
                        button(
                            "Save",
                            toParentMessage(SubmittedSyncContactEdit()),
                            h
                        ),
                        button(
                            "Cancel",
                            toParentMessage(ClickedCancelSyncContactEdit()),
                            h
                        ),
                    ]
                ),
        }
    )

const button = <ParentMessage>(
    label: string,
    message: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: message,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

// What each cached entry cost is worth showing, not just that it exists: an
// entry's query plan says which source answered it, so the list makes the swap
// visible in history rather than only in the badge.
const cacheRow = <ParentMessage>(
    model: Model,
    queryKey: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const separatorIndex = queryKey.lastIndexOf("|")
    const page = queryKey.slice(separatorIndex + 1)
    const label = describeFilterKey(queryKey.slice(0, separatorIndex))
    const state = Option.match(HashMap.get(model.pageByQueryKey, queryKey), {
        onNone: () => "empty",
        onSome: (entry) =>
            AsyncData.match(entry, {
                onIdle: () => "idle",
                onLoading: () => "loading",
                onRefreshing: () => "refreshing",
                onFailure: () => "failed",
                onStale: () => "stale",
                onSuccess: (data) => data.queryPlan,
            }),
    })

    return h.keyed("li")(
        queryKey,
        [h.Class("flex items-center justify-between gap-3 px-3 py-1.5")],
        [
            h.span(
                [
                    h.Class(
                        queryKey === activeQueryKeyFor(model)
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                    ),
                ],
                [`${label} · page ${Number(page) + 1}`]
            ),
            h.span([h.Class("truncate text-muted-foreground")], [state]),
        ]
    )
}

const cacheInspector = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.details(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.summary(
                [
                    h.Class(
                        "cursor-pointer px-3 py-2 text-xs font-semibold [box-shadow:var(--shadow-control)]"
                    ),
                ],
                [
                    `Query cache: ${model.cacheKeysByRecency.length}/${MAX_CACHED_QUERY_PAGES} entries, most recently fetched first`,
                ]
            ),
            h.ul(
                [
                    h.Class(
                        "divide-y divide-border border-t-(length:--surface-border-width) border-border text-xs"
                    ),
                ],
                Array.map(model.cacheKeysByRecency, (queryKey) =>
                    cacheRow(model, queryKey, h)
                )
            ),
        ]
    )

// One chip per tag and one per recency option, with aria-pressed carrying the
// selected state rather than a class — so the styling and the accessibility
// tree cannot disagree about which facets are on.
const facetChip = <ParentMessage>(
    label: string,
    isSelected: boolean,
    tone: string,
    message: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: message,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.AriaPressed(isSelected ? "true" : "false"),
                        h.Class(
                            `rounded px-2 py-1 text-xs ${tone} ${isSelected ? "font-semibold ring-2 ring-primary" : "opacity-70 hover:opacity-100"}`
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const facetsView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-col gap-3")],
        [
            h.div(
                [h.Class("flex flex-col gap-2")],
                [
                    h.p([h.Class("text-sm font-semibold")], ["Tags"]),
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        Array.map(TAGS, (tag) =>
                            h.keyed("span")(
                                tag.id,
                                [],
                                [
                                    facetChip(
                                        tag.label,
                                        model.activeTagIds.includes(tag.id),
                                        tag.tone,
                                        toParentMessage(
                                            ToggledSyncTagFacet({
                                                tagId: tag.id,
                                            })
                                        ),
                                        h
                                    ),
                                ]
                            )
                        )
                    ),
                    h.span(
                        [h.Class("text-xs text-muted-foreground")],
                        [
                            "Every selected tag has to match, so adding one narrows — the same rule as adding a search word. After the swap this is a lookup on the tag index rather than a scan.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-col gap-2")],
                [
                    h.p([h.Class("text-sm font-semibold")], ["Last activity"]),
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        Array.map(RECENCY_OPTIONS, ({ recency, label }) =>
                            h.keyed("span")(
                                recency,
                                [],
                                [
                                    facetChip(
                                        label,
                                        model.activeRecency === recency,
                                        "border-(length:--surface-border-width) border-border",
                                        toParentMessage(
                                            SelectedSyncActivityRecency({
                                                recency,
                                            })
                                        ),
                                        h
                                    ),
                                ]
                            )
                        )
                    ),
                ]
            ),
        ]
    )

const RECENCY_OPTIONS: ReadonlyArray<{
    readonly recency: ActivityRecency
    readonly label: string
}> = [
    { recency: "SevenDays", label: "7 days" },
    { recency: "ThirtyDays", label: "30 days" },
    { recency: "Any", label: "Any time" },
]

const sourceBadge = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.span(
        [
            h.Class(
                model.source === "Local"
                    ? "rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                    : "rounded-full border-(length:--surface-border-width) border-border px-3 py-1 text-xs font-semibold text-muted-foreground"
            ),
        ],
        [
            model.source === "Local"
                ? "Serving from local IndexedDB"
                : "Serving from the network",
        ]
    )

const hydrationView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const percent = hydrationPercent(model)
    const label =
        model.hydrationState === "Hydrating"
            ? `Hydrating the local copy: ${model.hydratedContacts.toLocaleString()} of ${TOTAL_CONTACTS.toLocaleString()} contacts written, in batches of 500 across ${batchCount} transactions.`
            : model.hydrationState === "Verifying"
              ? "Hydration finished. Reading the page on screen back out of the local copy before trusting it."
              : model.hydrationState === "Failed"
                ? "Hydration failed. The list stays on the network."
                : "Local copy complete and verified. The list swapped source without re-rendering."

    return h.div(
        [
            h.Class(
                "flex flex-col gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
            ),
        ],
        [
            Ui.Input.view(
                {
                    id: "crm-sync-search",
                    value: model.searchText,
                    placeholder: "Search name or email",
                    onInput: (value) =>
                        toParentMessage(UpdatedSyncSearchText({ value })),
                    toView: (attributes) =>
                        h.div(
                            [h.Class("flex flex-col gap-2")],
                            [
                                h.label(
                                    [
                                        ...attributes.label,
                                        h.Class("text-sm font-semibold"),
                                    ],
                                    ["Search contacts"]
                                ),
                                h.input([
                                    ...attributes.input,
                                    h.Class(
                                        "h-10 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 text-sm"
                                    ),
                                ]),
                                h.span(
                                    [h.Class("text-xs text-muted-foreground")],
                                    [
                                        `Debounced by ${SEARCH_DEBOUNCE_MS}ms. Before the swap each search is a round trip; after it, a local index read. Both sides match word prefixes, so the answers are identical and only the wait changes.`,
                                    ]
                                ),
                            ]
                        ),
                },
                h
            ),
            facetsView(model, toParentMessage, h),
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    sourceBadge(model, h),
                    h.span(
                        [h.Class("text-sm text-muted-foreground")],
                        [`${percent}%`]
                    ),
                ]
            ),
            h.div(
                [h.Class("h-2 w-full overflow-hidden rounded-full bg-muted")],
                [
                    h.div([
                        h.Class(
                            model.hydrationState === "Failed"
                                ? "h-2 rounded-full bg-destructive"
                                : "h-2 rounded-full bg-primary"
                        ),
                        h.Style({ width: `${percent}%` }),
                    ]),
                ]
            ),
            h.p([h.Class("text-sm text-muted-foreground")], [label]),
            ...Option.match(model.maybeMismatch, {
                onNone: () => [],
                onSome: (mismatch) => [
                    h.p(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground"
                            ),
                        ],
                        [mismatch]
                    ),
                ],
            }),
            ...Option.match(model.maybeError, {
                onNone: () => [],
                onSome: (error) => [
                    h.p(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive px-3 py-2 text-sm text-destructive bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                            ),
                        ],
                        [error]
                    ),
                ],
            }),
            // A rejected write has already been rolled back by the time this
            // renders, so the row is showing the old name again. Announced, because
            // the row reverting is easy to miss.
            ...Option.match(model.maybeWriteError, {
                onNone: () => [],
                onSome: (error) => [
                    h.p(
                        [
                            h.Role("alert"),
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive px-3 py-2 text-sm text-destructive"
                            ),
                        ],
                        [`Write rejected: ${error} The row was restored.`]
                    ),
                ],
            }),
            h.p(
                [h.Class("text-xs text-muted-foreground")],
                [
                    `${model.remoteRequests} network responses · ${model.localRequests} local reads`,
                ]
            ),
            cacheInspector(model, h),
            button(
                "Reset local copy",
                toParentMessage(ClickedSyncRebuild()),
                h
            ),
        ]
    )
}

// The container is rendered whether or not there is anything to put in it: the
// scroll and resize subscriptions attach to this element by id, so a list that
// waits for a measurement before mounting it would never be measured.
const listContainer = <ParentMessage>(
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("ul")(
        LIST_ID,
        [
            h.Id(LIST_ID),
            h.Role("list"),
            h.Class("h-[60vh] min-h-80 overflow-y-auto overscroll-contain"),
        ],
        children
    )

const spacer = <ParentMessage>(
    key: string,
    height: number,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("li")(key, [
        h.Role("presentation"),
        h.Style({ height: `${height}px` }),
    ])

// A page still in flight leaves its rows unresolved, and they render at full
// height rather than collapsing. The spacers around them are already sized for
// them, so the scroll height does not change when the page lands — which is
// what stops the list jumping under a reader who is scrolling through it.
const skeletonRow = <ParentMessage>(
    rowIndex: number,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("li")(
        `crm-sync-pending-${rowIndex}`,
        [
            h.Role("listitem"),
            h.AriaHidden(true),
            h.Class(
                "flex flex-col justify-center gap-2 overflow-hidden border-b-(length:--surface-border-width) border-border px-4"
            ),
            h.Style({ height: `${ROW_HEIGHT_PX}px` }),
        ],
        [
            h.span([
                h.Class("h-4 w-48 rounded bg-muted motion-safe:animate-pulse"),
            ]),
            h.span([
                h.Class("h-3 w-64 rounded bg-muted motion-safe:animate-pulse"),
            ]),
        ]
    )

const contactRow = <ParentMessage>(
    model: Model,
    rowIndex: number,
    totalMatches: number,
    toParentMessage: (message: Message) => ParentMessage,
    internal_navigation: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(rowAt(model, rowIndex), {
        onNone: () => skeletonRow(rowIndex, h),
        onSome: (row) =>
            h.keyed("li")(
                row.contact.id,
                [
                    h.Role("listitem"),
                    h.AriaSetsize(totalMatches),
                    h.AriaPosinset(rowIndex + 1),
                    h.Class(
                        "overflow-hidden border-b-(length:--surface-border-width) border-border"
                    ),
                    h.Style({ height: `${ROW_HEIGHT_PX}px` }),
                ],
                [
                    // An anchor rather than a click handler, because a contact having
                    // its own URL is the point: middle-click, copy link address and
                    // "link" in a screen reader all follow from the href, and none of
                    // them follow from a button that navigates.
                    navigationControl(
                        crmSyncContactHref(row.contact.id),
                        toParentMessage(
                            ChangedSyncRoute({
                                route: CrmSyncContactRoute({
                                    contactId: row.contact.id,
                                }),
                            })
                        ),
                        [
                            h.Class(
                                "flex h-full items-center justify-between gap-4 px-4 no-underline hover:bg-muted"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("min-w-0")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex min-w-0 items-center gap-2"
                                            ),
                                        ],
                                        [
                                            h.p(
                                                [
                                                    h.Class(
                                                        "truncate font-semibold text-foreground"
                                                    ),
                                                ],
                                                [
                                                    displayNameFor(
                                                        model,
                                                        row.contact.id,
                                                        row.contact.name
                                                    ),
                                                ]
                                            ),
                                            ...writeBadge(
                                                model,
                                                row.contact.id,
                                                h
                                            ),
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "truncate text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            `${row.contact.email} · ${row.contact.company}`,
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs"
                                    ),
                                ],
                                [
                                    ...Array.map(row.tags, (tag) =>
                                        h.span(
                                            [
                                                h.Class(
                                                    `rounded px-2 py-1 ${tag.tone}`
                                                ),
                                            ],
                                            [tag.label]
                                        )
                                    ),
                                    h.span(
                                        [h.Class("text-muted-foreground")],
                                        [
                                            `${row.latestActivity.kind}: ${row.latestActivity.summary}`,
                                        ]
                                    ),
                                ]
                            ),
                        ],
                        internal_navigation,
                        h
                    ),
                ]
            ),
    })

// What replaces "page 3 of 40". The scrollbar carries the coarse sense of
// position; this says which rows those are, so a reader can still tell someone
// else where they are in the list.
const positionView = <ParentMessage>(
    model: Model,
    totalMatches: number,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(visibleRowsFor(model), {
        onNone: () =>
            h.span([h.Class("text-muted-foreground")], ["Measuring the list"]),
        onSome: ({ startIndex, endIndex }) =>
            h.span(
                [h.Class("text-muted-foreground")],
                [
                    `Rows ${(startIndex + 1).toLocaleString()}–${Math.min(endIndex, totalMatches).toLocaleString()}`,
                ]
            ),
    })

const virtualListView = <ParentMessage>(
    model: Model,
    totalMatches: number,
    toParentMessage: (message: Message) => ParentMessage,
    internal_navigation: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex items-center justify-between border-b-(length:--surface-border-width) border-border px-4 py-3 text-sm"
                    ),
                ],
                [
                    h.span([], [`${totalMatches.toLocaleString()} contacts`]),
                    positionView(model, totalMatches, h),
                ]
            ),
            h.p(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-4 py-2 text-xs text-muted-foreground"
                    ),
                ],
                [
                    `Query plan: ${Option.match(
                        AsyncData.getData(currentPageData(model)),
                        {
                            onNone: () => "loading",
                            onSome: (page) => page.queryPlan,
                        }
                    )}`,
                ]
            ),
            listContainer(
                Option.match(visibleWindowFor(model), {
                    // Unmeasured. The rows cannot be chosen yet, so the container
                    // goes up empty and the first ResizeObserver entry fills it.
                    onNone: (): ReadonlyArray<Html> => [],
                    onSome: ({
                        startIndex,
                        endIndex,
                        topSpacerHeight,
                        bottomSpacerHeight,
                    }) => [
                        spacer("crm-sync-top-spacer", topSpacerHeight, h),
                        ...Array.map(
                            Array.range(startIndex, endIndex - 1),
                            (rowIndex) =>
                                contactRow(
                                    model,
                                    rowIndex,
                                    totalMatches,
                                    toParentMessage,
                                    internal_navigation,
                                    h
                                )
                        ),
                        spacer("crm-sync-bottom-spacer", bottomSpacerHeight, h),
                    ],
                }),
                h
            ),
        ]
    )

const resultsView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    internal_navigation: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(totalMatchesFor(model), {
        // No answered page for this search yet, so there is no row count to size
        // the scrollbar with and nothing to virtualise over.
        onNone: () =>
            AsyncData.matchDataSplitEmpty(currentPageData(model), {
                onIdle: () =>
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-8 text-sm text-muted-foreground"
                            ),
                        ],
                        ["Waiting for the first page."]
                    ),
                onLoading: () =>
                    h.div(
                        [
                            h.Role("status"),
                            h.Class(
                                "flex min-h-64 flex-col items-center justify-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-8 text-sm text-muted-foreground"
                            ),
                        ],
                        [
                            h.span([
                                h.AriaHidden(true),
                                h.Class(
                                    "size-8 rounded-full border-2 border-border border-t-primary motion-safe:animate-spin"
                                ),
                            ]),
                            h.span(
                                [],
                                [
                                    "Fetching the first page over the simulated network...",
                                ]
                            ),
                        ]
                    ),
                onFailure: (error) =>
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive p-8 text-sm text-destructive"
                            ),
                        ],
                        [error]
                    ),
                onData: () =>
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-8 text-sm text-muted-foreground"
                            ),
                        ],
                        ["Waiting for the first page."]
                    ),
            }),
        onSome: (totalMatches) =>
            totalMatches === 0
                ? h.div(
                      [
                          h.Class(
                              "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-8 text-sm text-muted-foreground"
                          ),
                      ],
                      ["No contacts match that search."]
                  )
                : virtualListView(
                      model,
                      totalMatches,
                      toParentMessage,
                      internal_navigation,
                      h
                  ),
    })

// The link back carries the filter, so returning lands on the list the reader
// left rather than on the unfiltered one.
const backToListLink = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    internal_navigation: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    navigationControl(
        crmSyncBrowseHref({
            search:
                model.activeSearchText === ""
                    ? Option.none()
                    : Option.some(model.activeSearchText),
            tags: tagsParamFor(model.activeTagIds),
            recency: recencyParamFor(model.activeRecency),
        }),
        toParentMessage(
            ChangedSyncRoute({
                route: CrmSyncListRoute({
                    search:
                        model.activeSearchText === ""
                            ? Option.none()
                            : Option.some(model.activeSearchText),
                    tags: tagsParamFor(model.activeTagIds),
                    recency: recencyParamFor(model.activeRecency),
                }),
            })
        ),
        [
            h.Class("text-sm font-semibold text-primary"),
        ],
        ["← Back to the list"],
        internal_navigation,
        h
    )

const activityRow = <ParentMessage>(
    activity: {
        readonly id: string
        readonly kind: string
        readonly summary: string
        readonly occurredDaysAgo: number
    },
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("li")(
        activity.id,
        [h.Class("flex items-baseline justify-between gap-4 px-4 py-3")],
        [
            h.span(
                [h.Class("min-w-0")],
                [
                    h.span(
                        [h.Class("font-semibold text-foreground")],
                        [`${activity.kind}: `]
                    ),
                    h.span(
                        [h.Class("text-muted-foreground")],
                        [activity.summary]
                    ),
                ]
            ),
            h.span(
                [h.Class("shrink-0 text-xs text-muted-foreground")],
                [
                    activity.occurredDaysAgo === 0
                        ? "today"
                        : `${activity.occurredDaysAgo} days ago`,
                ]
            ),
        ]
    )

const contactDetailView = <ParentMessage>(
    model: Model,
    contactId: string,
    toParentMessage: (message: Message) => ParentMessage,
    internal_navigation: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
        [h.Class("mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 lg:p-8")],
        [
            backToListLink(
                model,
                toParentMessage,
                internal_navigation,
                h
            ),
            AsyncData.matchDataSplitEmpty(detailFor(model, contactId), {
                onIdle: () =>
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        ["Waiting for the contact."]
                    ),
                onLoading: () =>
                    h.div(
                        [
                            h.Role("status"),
                            h.Class(
                                "flex min-h-64 flex-col items-center justify-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-8 text-sm text-muted-foreground"
                            ),
                        ],
                        [
                            h.span([
                                h.AriaHidden(true),
                                h.Class(
                                    "size-8 rounded-full border-2 border-border border-t-primary motion-safe:animate-spin"
                                ),
                            ]),
                            h.span(
                                [],
                                [
                                    model.source === "Local"
                                        ? "Reading the contact out of the local copy..."
                                        : "Fetching the contact over the simulated network...",
                                ]
                            ),
                        ]
                    ),
                onFailure: (error) =>
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive p-8 text-sm text-destructive"
                            ),
                        ],
                        [error]
                    ),
                onData: (maybeDetail) =>
                    Option.match(maybeDetail, {
                        // An id nobody has is an answer, not a failure. Saying which id
                        // it was is what makes a mistyped or stale link diagnosable.
                        onNone: () =>
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-col gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-8"
                                    ),
                                ],
                                [
                                    h.h1(
                                        [
                                            h.Class(
                                                "text-xl font-bold text-foreground"
                                            ),
                                        ],
                                        ["No such contact"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            `Nothing in this dataset is filed under "${contactId}".`,
                                        ]
                                    ),
                                ]
                            ),
                        onSome: (detail) =>
                            h.div(
                                [h.Class("flex flex-col gap-6")],
                                [
                                    h.header(
                                        [
                                            h.Class(
                                                "flex flex-col gap-3 border-b-(length:--surface-border-width) border-border pb-5"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex flex-wrap items-center gap-3"
                                                    ),
                                                ],
                                                [
                                                    // The overlay applies here exactly as it does on the
                                                    // row: the source returned the server's name, and a
                                                    // contact renamed locally has to read the same on
                                                    // both screens.
                                                    h.h1(
                                                        [
                                                            h.Class(
                                                                "text-3xl font-bold tracking-tight text-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            displayNameFor(
                                                                model,
                                                                detail.contact
                                                                    .id,
                                                                detail.contact
                                                                    .name
                                                            ),
                                                        ]
                                                    ),
                                                    ...writeBadge(
                                                        model,
                                                        detail.contact.id,
                                                        h
                                                    ),
                                                ]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    `${detail.contact.email} · ${detail.contact.company}`,
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex flex-wrap items-center gap-2 text-xs"
                                                    ),
                                                ],
                                                Array.map(detail.tags, (tag) =>
                                                    h.keyed("span")(
                                                        tag.id,
                                                        [
                                                            h.Class(
                                                                `rounded px-2 py-1 ${tag.tone}`
                                                            ),
                                                        ],
                                                        [tag.label]
                                                    )
                                                )
                                            ),
                                            renameForm(
                                                model,
                                                detail.contact.id,
                                                toParentMessage,
                                                h
                                            ),
                                            ...Option.match(
                                                model.maybeWriteError,
                                                {
                                                    onNone: () => [],
                                                    onSome: (error) => [
                                                        h.p(
                                                            [
                                                                h.Role("alert"),
                                                                h.Class(
                                                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive px-3 py-2 text-sm text-destructive bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                                                                ),
                                                            ],
                                                            [
                                                                `Write rejected: ${error} The name was restored.`,
                                                            ]
                                                        ),
                                                    ],
                                                }
                                            ),
                                        ]
                                    ),
                                    h.section(
                                        [h.Class("flex flex-col gap-3")],
                                        [
                                            h.h2(
                                                [
                                                    h.Class(
                                                        "text-lg font-semibold text-foreground"
                                                    ),
                                                ],
                                                ["Activity"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    `Query plan: ${detail.queryPlan}`,
                                                ]
                                            ),
                                            // The history the list row cannot show. Before the swap
                                            // this is a round trip; after it, a local index read on
                                            // contactId — which is the reason the store grew a third
                                            // table and a third schema version.
                                            h.ul(
                                                [
                                                    h.Class(
                                                        "divide-y divide-border rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-sm"
                                                    ),
                                                ],
                                                Array.map(
                                                    detail.activities,
                                                    (activity) =>
                                                        activityRow(activity, h)
                                                )
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                    }),
            }),
        ]
    )

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    internal_navigation = false
): Html =>
    Option.match(model.maybeSelectedContactId, {
        onSome: (contactId) =>
            contactDetailView(
                model,
                contactId,
                toParentMessage,
                internal_navigation,
                h
            ),
        onNone: () =>
            listView(model, toParentMessage, internal_navigation, h),
    })

const listView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    internal_navigation: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
        [h.Class("mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 lg:p-8")],
        [
            h.header(
                [
                    h.Class(
                        "flex flex-col gap-2 border-b-(length:--surface-border-width) border-border pb-5"
                    ),
                ],
                [
                    h.p(
                        [h.Class("text-sm font-semibold text-primary")],
                        ["LOCAL-FIRST HANDOVER"]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["Mini CRM: network first, local after"]
                    ),
                    h.p(
                        [h.Class("max-w-3xl text-sm text-muted-foreground")],
                        [
                            "The list is usable immediately from a simulated network round trip while the same dataset is written into IndexedDB in the background. When the local copy is complete it takes over, and the handover is meant to be invisible: nothing re-renders, the page you were reading stays exactly as it was.",
                        ]
                    ),
                    h.p(
                        [h.Class("max-w-3xl text-sm text-muted-foreground")],
                        [
                            "The source only swaps once hydration has finished. A half-filled store answers the first page correctly and a later page wrongly, and reports a total that is short without saying so, which is worse than being slow. Completion alone is not enough either: the page on screen is read back out of the local copy and compared row for row, and a disagreement abandons the swap instead of showing it.",
                        ]
                    ),
                    h.p(
                        [h.Class("max-w-3xl text-sm text-muted-foreground")],
                        [
                            "The list scrolls continuously, but pages are still the unit underneath: a page is what gets fetched, cached, and compared row for row on the swap. Only the window on screen is mounted, and the pages it needs are the two it can span. The filter lives in the URL — a question anyone can ask — while the scroll offset does not, because row 1,200 of your results is a different contact in someone else's.",
                        ]
                    ),
                    h.p(
                        [h.Class("max-w-3xl text-sm text-muted-foreground")],
                        [
                            "Opening a contact shows its full activity history, which means the local copy has to store activities as well as rows: three more per contact on the fill, and a third schema version to hold them. That cost is the point. Reading a contact from the network after the swap would leave the page fast in the list and slow to open, and useless offline — the handover would only have half happened.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]")],
                [
                    hydrationView(model, toParentMessage, h),
                    h.section(
                        [h.Class("flex min-w-0 flex-col gap-4")],
                        [
                            resultsView(
                                model,
                                toParentMessage,
                                internal_navigation,
                                h
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
