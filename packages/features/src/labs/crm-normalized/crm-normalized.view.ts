import { Array, HashMap, Option } from "effect"
import { AsyncData } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as Ui from "@foldkit/ui"

import { TAGS, type Tag } from "../crm/crm.domain.ts"
import { contactCountForDatasetSize } from "../crm/crm.generate.ts"
import {
    resolveRow,
    storedContactCount,
    type ContactPage,
    type ResolvedRow,
} from "./crm-normalized.domain.ts"
import {
    ClickedCancelNormalizedCrmContactEdit,
    ClickedEditNormalizedCrmContact,
    RequestedNextNormalizedCrmPage,
    RequestedPreviousNormalizedCrmPage,
    SelectedNormalizedCrmActivityRecency,
    SelectedNormalizedCrmDatasetSize,
    SelectedNormalizedCrmFilterPreset,
    SubmittedNormalizedCrmContactEdit,
    ToggledNormalizedCrmContactTag,
    ToggledNormalizedCrmTagFacet,
    UpdatedNormalizedCrmEditedName,
    UpdatedNormalizedCrmSearchText,
    type Message,
} from "./crm-normalized.message.ts"
import { MAX_CACHED_QUERY_PAGES } from "./crm-normalized.update.ts"
import {
    ContactPageAsyncData,
    type ActivityRecency,
    type DatasetSize,
    type FilterPreset,
    type Model,
} from "./crm-normalized.model.ts"

const SIZES: ReadonlyArray<Readonly<{ value: DatasetSize; label: string }>> = [
    { value: "OneThousand", label: "1k" },
    { value: "TenThousand", label: "10k" },
    { value: "FiftyThousand", label: "50k" },
    { value: "TwoHundredFiftyThousand", label: "250k" },
]
const RECENCY: ReadonlyArray<
    Readonly<{ value: ActivityRecency; label: string }>
> = [
    { value: "SevenDays", label: "7 days" },
    { value: "ThirtyDays", label: "30 days" },
    { value: "Any", label: "Any" },
]
const PRESETS: ReadonlyArray<Readonly<{ value: FilterPreset; label: string }>> =
    [
        { value: "EnterpriseTag", label: "Query A - Enterprise" },
        { value: "FounderTag", label: "Query B - Founder" },
    ]

const LIMITS: ReadonlyArray<string> = [
    "No local durability. Every cold query is a round trip, so there is no seed cost and no offline mode.",
    "No delta loading. A widened query refetches in full; knowing that one predicate subsumes another needs a predicate algebra with subsumption checking.",
    "No incremental view maintenance. An edit re-resolves the page from the store rather than recomputing a delta.",
    "No write path. Local edits are held back from later merges, so they survive a refetch here but never reach the simulated backend.",
]

const actionButton = <ParentMessage>(
    label: string,
    message: ParentMessage,
    active: boolean,
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
                            active
                                ? "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-primary bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground [box-shadow:var(--shadow-primary)]"
                                : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const currentPageData = (model: Model) =>
    Option.getOrElse(
        HashMap.get(model.pageByQueryKey, model.activeQueryKey),
        ContactPageAsyncData.Idle
    )

const requestStateLabel = (model: Model): string => {
    const page = currentPageData(model)

    return AsyncData.isLoading(page)
        ? "Querying the simulated RPC backend..."
        : AsyncData.isRefreshing(page)
          ? "Refreshing; the cached id list stays on screen"
          : "Resolved from the local store"
}

const describeQueryKey = (queryKey: string): string => {
    const [size, searchText, tagIds, recency, page] = queryKey.split("|")
    const facets = [
        searchText === "" || searchText === undefined
            ? ""
            : `text "${searchText}"`,
        tagIds === "" || tagIds === undefined ? "" : `tags ${tagIds}`,
        recency === "Any" || recency === undefined ? "" : `recency ${recency}`,
    ].filter((facet) => facet !== "")

    return `${size ?? "?"} · ${facets.length === 0 ? "no facets" : facets.join(", ")} · page ${Number(page ?? 0) + 1}`
}

const entryStateLabel = (
    entry: typeof ContactPageAsyncData.schema.Type
): string =>
    AsyncData.match(entry, {
        onIdle: () => "Idle",
        onLoading: () => "Loading",
        onRefreshing: () => "Refreshing",
        onFailure: () => "Failure",
        onStale: () => "Stale",
        onSuccess: () => "Success",
    })

const editedIdsInPage = (
    entry: typeof ContactPageAsyncData.schema.Type,
    locallyEditedContactIds: ReadonlyArray<string>
): number =>
    Option.match(AsyncData.getData(entry), {
        onNone: () => 0,
        onSome: (page) =>
            Array.filter(page.contactIds, (contactId) =>
                locallyEditedContactIds.includes(contactId)
            ).length,
    })

const cacheRow = <ParentMessage>(
    model: Model,
    queryKey: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(HashMap.get(model.pageByQueryKey, queryKey), {
        onNone: () => h.empty,
        onSome: (entry) => {
            const idCount = Option.match(AsyncData.getData(entry), {
                onNone: () => 0,
                onSome: (page) => page.contactIds.length,
            })
            const editedCount = editedIdsInPage(
                entry,
                model.locallyEditedContactIds
            )
            const isActive = queryKey === model.activeQueryKey

            return h.keyed("tr")(
                queryKey,
                [h.Class(isActive ? "bg-muted/60" : "")],
                [
                    h.td(
                        [h.Class("px-3 py-2 font-mono text-xs")],
                        [describeQueryKey(queryKey)]
                    ),
                    h.td(
                        [h.Class("px-3 py-2 text-xs")],
                        [entryStateLabel(entry)]
                    ),
                    h.td(
                        [h.Class("px-3 py-2 text-right text-xs tabular-nums")],
                        [`${idCount}`]
                    ),
                    h.td(
                        [h.Class("px-3 py-2 text-right text-xs tabular-nums")],
                        [`${editedCount}`]
                    ),
                ]
            )
        },
    })

const cacheInspector = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.details(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"
            ),
        ],
        [
            h.summary(
                [
                    h.Class(
                        "cursor-pointer px-4 py-3 text-sm font-semibold [box-shadow:var(--shadow-control)]"
                    ),
                ],
                [
                    `Cache inspector: ${model.cacheKeysByRecency.length}/${MAX_CACHED_QUERY_PAGES} entries, ${storedContactCount(model.store).toLocaleString()} contacts in the store`,
                ]
            ),
            h.div(
                [
                    h.Class(
                        "overflow-x-auto border-t-(length:--surface-border-width) border-border"
                    ),
                ],
                [
                    h.table(
                        [h.Class("w-full min-w-[36rem] text-left")],
                        [
                            h.thead(
                                [
                                    h.Class(
                                        "border-b-(length:--surface-border-width) border-border text-xs uppercase text-muted-foreground"
                                    ),
                                ],
                                [
                                    h.tr(
                                        [],
                                        [
                                            h.th(
                                                [
                                                    h.Class(
                                                        "px-3 py-2 font-medium"
                                                    ),
                                                ],
                                                ["Query key"]
                                            ),
                                            h.th(
                                                [
                                                    h.Class(
                                                        "px-3 py-2 font-medium"
                                                    ),
                                                ],
                                                ["State"]
                                            ),
                                            h.th(
                                                [
                                                    h.Class(
                                                        "px-3 py-2 text-right font-medium"
                                                    ),
                                                ],
                                                ["Ids held"]
                                            ),
                                            h.th(
                                                [
                                                    h.Class(
                                                        "px-3 py-2 text-right font-medium"
                                                    ),
                                                ],
                                                ["Edited"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.tbody(
                                [h.Class("divide-y divide-border")],
                                Array.map(
                                    model.cacheKeysByRecency,
                                    (queryKey) => cacheRow(model, queryKey, h)
                                )
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const tagChip = <ParentMessage>(
    tag: Tag,
    contactId: string,
    isApplied: boolean,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: toParentMessage(
                ToggledNormalizedCrmContactTag({ contactId, tagId: tag.id })
            ),
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.AriaPressed(isApplied ? "true" : "false"),
                        h.Class(
                            isApplied
                                ? `rounded px-2 py-1 text-xs ${tag.tone}`
                                : "rounded border-(length:--surface-border-width) border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        ),
                    ],
                    [tag.label]
                ),
        },
        h
    )

const contactNameCell = <ParentMessage>(
    model: Model,
    row: ResolvedRow,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(
        Option.filter(
            model.maybeEditingContactId,
            (contactId) => contactId === row.contact.id
        ),
        {
            onNone: () =>
                h.div(
                    [h.Class("flex items-center gap-2")],
                    [
                        h.p(
                            [h.Class("truncate font-semibold text-foreground")],
                            [row.contact.name]
                        ),
                        actionButton(
                            "Rename",
                            toParentMessage(
                                ClickedEditNormalizedCrmContact({
                                    contactId: row.contact.id,
                                })
                            ),
                            false,
                            h
                        ),
                    ]
                ),
            onSome: () =>
                h.div(
                    [h.Class("flex flex-wrap items-center gap-2")],
                    [
                        Ui.Input.view(
                            {
                                id: `normalized-crm-edit-${row.contact.id}`,
                                value: model.editedName,
                                placeholder: "Contact name",
                                onInput: (value) =>
                                    toParentMessage(
                                        UpdatedNormalizedCrmEditedName({
                                            value,
                                        })
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
                        actionButton(
                            "Save",
                            toParentMessage(
                                SubmittedNormalizedCrmContactEdit()
                            ),
                            true,
                            h
                        ),
                        actionButton(
                            "Cancel",
                            toParentMessage(
                                ClickedCancelNormalizedCrmContactEdit()
                            ),
                            false,
                            h
                        ),
                    ]
                ),
        }
    )

const contactRow = <ParentMessage>(
    model: Model,
    row: ResolvedRow,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isLocallyEdited = model.locallyEditedContactIds.includes(
        row.contact.id
    )
    const appliedTagIds = Array.map(row.tags, (tag) => tag.id)

    return h.keyed("li")(
        row.contact.id,
        [h.Class("flex flex-col gap-2 px-4 py-4")],
        [
            h.div(
                [
                    h.Class(
                        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    ),
                ],
                [
                    h.div(
                        [h.Class("min-w-0")],
                        [
                            contactNameCell(model, row, toParentMessage, h),
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
                                "flex flex-col items-start gap-1 sm:items-end"
                            ),
                        ],
                        [
                            h.span(
                                [h.Class("text-xs text-muted-foreground")],
                                [
                                    `${row.latestActivity.kind}: ${row.latestActivity.summary}`,
                                ]
                            ),
                            isLocallyEdited
                                ? h.span(
                                      [
                                          h.Class(
                                              "rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900"
                                          ),
                                      ],
                                      ["Edited locally"]
                                  )
                                : h.empty,
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap items-center gap-2")],
                Array.map(TAGS, (tag) =>
                    tagChip(
                        tag,
                        row.contact.id,
                        appliedTagIds.includes(tag.id),
                        toParentMessage,
                        h
                    )
                )
            ),
        ]
    )
}

const resultsPanel = <ParentMessage>(
    model: Model,
    page: ContactPage,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const rows = Array.getSomes(
        Array.map(page.contactIds, (contactId) =>
            resolveRow(model.store, contactId)
        )
    )

    return h.div(
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
                    h.span(
                        [],
                        [
                            `${page.totalMatches.toLocaleString()} simulated matches`,
                        ]
                    ),
                    h.span(
                        [h.Class("text-muted-foreground")],
                        [`Page ${page.page + 1}`]
                    ),
                ]
            ),
            h.p(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-4 py-2 text-xs text-muted-foreground"
                    ),
                ],
                [
                    `Query plan: ${page.queryPlan} · this entry holds ${page.contactIds.length} ids, resolved through the store`,
                ]
            ),
            ...Option.match(AsyncData.getError(currentPageData(model)), {
                onNone: () => [],
                onSome: (error) => [
                    h.p(
                        [
                            h.Class(
                                "border-b-(length:--surface-border-width) border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"
                            ),
                        ],
                        [
                            `Last refresh failed: ${error}. Showing the cached ids.`,
                        ]
                    ),
                ],
            }),
            h.div(
                [h.Class("max-h-[60vh] overflow-y-auto overscroll-contain")],
                [
                    h.ul(
                        [h.Class("divide-y divide-border")],
                        Array.map(rows, (row) =>
                            contactRow(model, row, toParentMessage, h)
                        )
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex items-center justify-between border-t-(length:--surface-border-width) border-border px-4 py-3"
                    ),
                ],
                [
                    actionButton(
                        "Previous",
                        toParentMessage(RequestedPreviousNormalizedCrmPage()),
                        false,
                        h
                    ),
                    actionButton(
                        "Next",
                        toParentMessage(RequestedNextNormalizedCrmPage()),
                        false,
                        h
                    ),
                ]
            ),
        ]
    )
}

const tagControl = <ParentMessage>(
    tag: Tag,
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const selected = model.selectedTagIds.includes(tag.id)

    return actionButton(
        tag.label,
        toParentMessage(
            ToggledNormalizedCrmTagFacet({
                tagId: tag.id,
                isSelected: !selected,
            })
        ),
        selected,
        h
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
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
                        ["NORMALIZED QUERY CACHE"]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["Mini CRM: ids in the cache, rows in the store"]
                    ),
                    h.p(
                        [h.Class("max-w-3xl text-sm text-muted-foreground")],
                        [
                            "Every query is a round trip, as in the remote demo, but the response is split on arrival. Rows merge into one normalized store and the cache entry keeps only the matched ids. One contact matched by two queries is one row, so editing it once updates both pages with no invalidation.",
                        ]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "flex flex-col gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted/40 p-4"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("text-sm font-semibold text-foreground")],
                        ["Try the cross-query check"]
                    ),
                    h.ol(
                        [
                            h.Class(
                                "list-decimal space-y-1 pl-5 text-sm text-muted-foreground"
                            ),
                        ],
                        [
                            h.li(
                                [],
                                [
                                    "Run Query A and pick a contact that appears in it.",
                                ]
                            ),
                            h.li(
                                [],
                                [
                                    "Run Query B. Both queries are now cached entries.",
                                ]
                            ),
                            h.li(
                                [],
                                [
                                    "Rename that contact, or toggle one of its tags, in whichever page it appears.",
                                ]
                            ),
                            h.li(
                                [],
                                [
                                    "Switch between A and B. Neither refetches, and both show the edit.",
                                ]
                            ),
                        ]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "The remote demo fails the last step: each page holds its own copy of the row, so one of them still shows the old name.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]")],
                [
                    h.aside(
                        [
                            h.Class(
                                "flex flex-col gap-5 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
                            ),
                        ],
                        [
                            Ui.Input.view(
                                {
                                    id: "normalized-crm-search",
                                    value: model.searchText,
                                    placeholder: "Search name or email",
                                    onInput: (value) =>
                                        toParentMessage(
                                            UpdatedNormalizedCrmSearchText({
                                                value,
                                            })
                                        ),
                                    toView: (attributes) =>
                                        h.div(
                                            [h.Class("flex flex-col gap-2")],
                                            [
                                                h.label(
                                                    [
                                                        ...attributes.label,
                                                        h.Class(
                                                            "text-sm font-semibold"
                                                        ),
                                                    ],
                                                    ["Search contacts"]
                                                ),
                                                h.input([
                                                    ...attributes.input,
                                                    h.Class(
                                                        "h-10 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 text-sm"
                                                    ),
                                                ]),
                                            ]
                                        ),
                                },
                                h
                            ),
                            h.div(
                                [h.Class("flex flex-col gap-2")],
                                [
                                    h.p(
                                        [h.Class("text-sm font-semibold")],
                                        ["Saved queries"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-col gap-2")],
                                        Array.map(PRESETS, (preset) =>
                                            actionButton(
                                                preset.label,
                                                toParentMessage(
                                                    SelectedNormalizedCrmFilterPreset(
                                                        { preset: preset.value }
                                                    )
                                                ),
                                                false,
                                                h
                                            )
                                        )
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("flex flex-col gap-2")],
                                [
                                    h.p(
                                        [h.Class("text-sm font-semibold")],
                                        ["Remote dataset"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        Array.map(SIZES, (option) =>
                                            actionButton(
                                                option.label,
                                                toParentMessage(
                                                    SelectedNormalizedCrmDatasetSize(
                                                        { size: option.value }
                                                    )
                                                ),
                                                model.selectedDatasetSize ===
                                                    option.value,
                                                h
                                            )
                                        )
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("flex flex-col gap-2")],
                                [
                                    h.p(
                                        [h.Class("text-sm font-semibold")],
                                        ["Tag facets"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        Array.map(TAGS, (tag) =>
                                            tagControl(
                                                tag,
                                                model,
                                                toParentMessage,
                                                h
                                            )
                                        )
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("flex flex-col gap-2")],
                                [
                                    h.p(
                                        [h.Class("text-sm font-semibold")],
                                        ["Activity recency"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        Array.map(RECENCY, (option) =>
                                            actionButton(
                                                option.label,
                                                toParentMessage(
                                                    SelectedNormalizedCrmActivityRecency(
                                                        {
                                                            activityRecency:
                                                                option.value,
                                                        }
                                                    )
                                                ),
                                                model.activityRecency ===
                                                    option.value,
                                                h
                                            )
                                        )
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.section(
                        [h.Class("flex min-w-0 flex-col gap-4")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex items-center justify-between gap-4"
                                    ),
                                ],
                                [
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [requestStateLabel(model)]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-right text-sm font-medium text-foreground"
                                            ),
                                        ],
                                        [
                                            `Database: ${contactCountForDatasetSize(model.selectedDatasetSize).toLocaleString()} contacts · resident: ${storedContactCount(model.store).toLocaleString()}`,
                                        ]
                                    ),
                                ]
                            ),
                            cacheInspector(model, h),
                            AsyncData.matchDataSplitEmpty(
                                currentPageData(model),
                                {
                                    onIdle: () =>
                                        h.div(
                                            [
                                                h.Class(
                                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-8 text-sm text-muted-foreground"
                                                ),
                                            ],
                                            [
                                                "The client is waiting for its first page of ids.",
                                            ]
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
                                                        "Querying the simulated RPC backend...",
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
                                    onData: (page) =>
                                        resultsPanel(
                                            model,
                                            page,
                                            toParentMessage,
                                            h
                                        ),
                                }
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-col gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-4"
                                    ),
                                ],
                                [
                                    h.h2(
                                        [
                                            h.Class(
                                                "text-sm font-semibold text-foreground"
                                            ),
                                        ],
                                        ["What this does not solve"]
                                    ),
                                    h.ul(
                                        [
                                            h.Class(
                                                "list-disc space-y-1 pl-5 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        Array.map(LIMITS, (limit) =>
                                            h.li([], [limit])
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
