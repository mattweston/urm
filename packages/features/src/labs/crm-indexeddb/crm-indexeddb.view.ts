import { Array, HashMap, Option } from "effect"
import { AsyncData } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as Ui from "@foldkit/ui"

import { TAGS, type Tag } from "../crm/crm.domain.ts"
import { contactCountForDatasetSize } from "../crm/crm.generate.ts"
import type { RemoteContactsPage } from "../crm-remote/crm-remote.domain.ts"
import {
    ClickedIndexedDbCrmRebuild,
    RequestedNextIndexedDbCrmPage,
    RequestedPreviousIndexedDbCrmPage,
    SelectedIndexedDbCrmActivityRecency,
    SelectedIndexedDbCrmDatasetSize,
    ToggledIndexedDbCrmDenormalizedRead,
    ToggledIndexedDbCrmSearchDebounce,
    ToggledIndexedDbCrmTokenIndexSearch,
    ToggledIndexedDbCrmTagFacet,
    UpdatedIndexedDbCrmSearchText,
    type Message,
} from "./crm-indexeddb.message.ts"
import { SEARCH_DEBOUNCE_MS } from "./crm-indexeddb.command.ts"
import {
    IndexedContactsData,
    type ActivityRecency,
    type DatasetSize,
    type Model,
} from "./crm-indexeddb.model.ts"
import { MAX_CACHED_QUERY_PAGES } from "./crm-indexeddb.update.ts"

const sizes: ReadonlyArray<Readonly<{ value: DatasetSize; label: string }>> = [
    { value: "OneThousand", label: "1k" },
    { value: "TenThousand", label: "10k" },
    { value: "FiftyThousand", label: "50k" },
    { value: "TwoHundredFiftyThousand", label: "250k" },
]
const recency: ReadonlyArray<
    Readonly<{ value: ActivityRecency; label: string }>
> = [
    { value: "SevenDays", label: "7 days" },
    { value: "ThirtyDays", label: "30 days" },
    { value: "Any", label: "Any" },
]

const currentPage = (model: Model) =>
    Option.getOrElse(
        HashMap.get(model.pageByQueryKey, model.activeQueryKey),
        IndexedContactsData.Idle
    )
const button = <ParentMessage>(
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

const contactsPage = <ParentMessage>(
    page: RemoteContactsPage,
    isSearching: boolean,
    staleError: Option.Option<string>,
    toParentMessage: (message: Message) => ParentMessage,
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
                        "flex justify-between border-b-(length:--surface-border-width) border-border px-4 py-3 text-sm"
                    ),
                ],
                [
                    h.span(
                        [],
                        [
                            isSearching
                                ? "Searching local contacts…"
                                : `${page.totalMatches.toLocaleString()} local matches`,
                        ]
                    ),
                    h.span([], [`Page ${page.page + 1}`]),
                ]
            ),
            ...Option.match(staleError, {
                onNone: () => [],
                onSome: (error) => [
                    h.p(
                        [
                            h.Class(
                                "border-b-(length:--surface-border-width) border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"
                            ),
                        ],
                        [
                            `Last refresh failed: ${error}. Showing cached results.`,
                        ]
                    ),
                ],
            }),
            h.div(
                [h.Class("max-h-[60vh] overflow-y-auto overscroll-contain")],
                [
                    h.ul(
                        [h.Class("divide-y divide-border")],
                        Array.map(page.rows, (row) =>
                            h.keyed("li")(
                                row.contact.id,
                                [
                                    h.Class(
                                        "flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                                    ),
                                ],
                                [
                                    h.div(
                                        [h.Class("min-w-0")],
                                        [
                                            h.p(
                                                [h.Class("font-semibold")],
                                                [row.contact.name]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-sm text-muted-foreground"
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
                                                "flex flex-wrap gap-2 text-xs"
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
                                                [
                                                    h.Class(
                                                        "text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    `${row.latestActivity.kind}: ${row.latestActivity.summary}`,
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            )
                        )
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex justify-between border-t-(length:--surface-border-width) border-border px-4 py-3"
                    ),
                ],
                [
                    button(
                        "Previous",
                        toParentMessage(RequestedPreviousIndexedDbCrmPage()),
                        false,
                        h
                    ),
                    button(
                        "Next",
                        toParentMessage(RequestedNextIndexedDbCrmPage()),
                        false,
                        h
                    ),
                ]
            ),
        ]
    )

const controls = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.aside(
        [
            h.Class(
                "flex flex-col gap-5 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
            ),
        ],
        [
            Ui.Input.view(
                {
                    id: "indexeddb-crm-search",
                    value: model.searchText,
                    placeholder: "Search name or email",
                    onInput: (value) =>
                        toParentMessage(
                            UpdatedIndexedDbCrmSearchText({ value })
                        ),
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
                            ]
                        ),
                },
                h
            ),
            Ui.Switch.view(
                {
                    id: "indexeddb-crm-token-index",
                    isChecked: model.isTokenIndexSearch,
                    onToggle: (isEnabled) =>
                        toParentMessage(
                            ToggledIndexedDbCrmTokenIndexSearch({ isEnabled })
                        ),
                    toView: (attributes) =>
                        h.div(
                            [h.Class("flex flex-col gap-1")],
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
                                                ...attributes.label,
                                                h.Class(
                                                    "cursor-pointer text-sm font-semibold"
                                                ),
                                            ],
                                            ["Token index search"]
                                        ),
                                        h.button(
                                            [
                                                ...attributes.button,
                                                h.Class(
                                                    `relative h-6 w-11 shrink-0 rounded-full transition-colors ${model.isTokenIndexSearch ? "bg-primary" : "bg-muted"}`
                                                ),
                                            ],
                                            [
                                                h.span([
                                                    h.AriaHidden(true),
                                                    h.Class(
                                                        `absolute top-0.5 left-0.5 size-5 rounded-full bg-background transition-transform ${model.isTokenIndexSearch ? "translate-x-5" : ""}`
                                                    ),
                                                ]),
                                            ]
                                        ),
                                    ]
                                ),
                                h.span(
                                    [
                                        ...attributes.description,
                                        h.Class(
                                            "text-xs text-muted-foreground"
                                        ),
                                    ],
                                    [
                                        "On, a bounded range scan of the contact_tokens index matches word prefixes. Off, a cursor walks every contact to match substrings. Prefix is what an index can answer; substring is what it cannot.",
                                    ]
                                ),
                            ]
                        ),
                },
                h
            ),
            Ui.Switch.view(
                {
                    id: "indexeddb-crm-debounce",
                    isChecked: model.isSearchDebounced,
                    onToggle: (isEnabled) =>
                        toParentMessage(
                            ToggledIndexedDbCrmSearchDebounce({ isEnabled })
                        ),
                    toView: (attributes) =>
                        h.div(
                            [h.Class("flex flex-col gap-1")],
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
                                                ...attributes.label,
                                                h.Class(
                                                    "cursor-pointer text-sm font-semibold"
                                                ),
                                            ],
                                            ["Debounce search"]
                                        ),
                                        h.button(
                                            [
                                                ...attributes.button,
                                                h.Class(
                                                    `relative h-6 w-11 shrink-0 rounded-full transition-colors ${model.isSearchDebounced ? "bg-primary" : "bg-muted"}`
                                                ),
                                            ],
                                            [
                                                h.span([
                                                    h.AriaHidden(true),
                                                    h.Class(
                                                        `absolute top-0.5 left-0.5 size-5 rounded-full bg-background transition-transform ${model.isSearchDebounced ? "translate-x-5" : ""}`
                                                    ),
                                                ]),
                                            ]
                                        ),
                                    ]
                                ),
                                h.span(
                                    [
                                        ...attributes.description,
                                        h.Class(
                                            "text-xs text-muted-foreground"
                                        ),
                                    ],
                                    [
                                        `Off, every keystroke queries the store. On, the query waits ${SEARCH_DEBOUNCE_MS}ms for typing to stop.`,
                                    ]
                                ),
                            ]
                        ),
                },
                h
            ),
            Ui.Switch.view(
                {
                    id: "indexeddb-crm-denormalized",
                    isChecked: model.isDenormalizedRead,
                    onToggle: (isEnabled) =>
                        toParentMessage(
                            ToggledIndexedDbCrmDenormalizedRead({ isEnabled })
                        ),
                    toView: (attributes) =>
                        h.div(
                            [h.Class("flex flex-col gap-1")],
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
                                                ...attributes.label,
                                                h.Class(
                                                    "cursor-pointer text-sm font-semibold"
                                                ),
                                            ],
                                            ["Denormalized read"]
                                        ),
                                        h.button(
                                            [
                                                ...attributes.button,
                                                h.Class(
                                                    `relative h-6 w-11 shrink-0 rounded-full transition-colors ${model.isDenormalizedRead ? "bg-primary" : "bg-muted"}`
                                                ),
                                            ],
                                            [
                                                h.span([
                                                    h.AriaHidden(true),
                                                    h.Class(
                                                        `absolute top-0.5 left-0.5 size-5 rounded-full bg-background transition-transform ${model.isDenormalizedRead ? "translate-x-5" : ""}`
                                                    ),
                                                ]),
                                            ]
                                        ),
                                    ]
                                ),
                                h.span(
                                    [
                                        ...attributes.description,
                                        h.Class(
                                            "text-xs text-muted-foreground"
                                        ),
                                    ],
                                    [
                                        "On, tags and latest activity are read from fields kept on the contact row. Off, they are joined from the link tables, which costs two requests per row. Watch the request count in the query plan.",
                                    ]
                                ),
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
                        ["Persisted dataset"]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        Array.map(sizes, (option) =>
                            button(
                                option.label,
                                toParentMessage(
                                    SelectedIndexedDbCrmDatasetSize({
                                        size: option.value,
                                    })
                                ),
                                model.selectedDatasetSize === option.value,
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
                        ["Tag facets (contact_tags.tagId index)"]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        Array.map(TAGS, (tag: Tag) =>
                            button(
                                tag.label,
                                toParentMessage(
                                    ToggledIndexedDbCrmTagFacet({
                                        tagId: tag.id,
                                        isSelected:
                                            !model.selectedTagIds.includes(
                                                tag.id
                                            ),
                                    })
                                ),
                                model.selectedTagIds.includes(tag.id),
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
                        [
                            "Activity recency (contact_recency.occurredDaysAgo index)",
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        Array.map(recency, (option) =>
                            button(
                                option.label,
                                toParentMessage(
                                    SelectedIndexedDbCrmActivityRecency({
                                        activityRecency: option.value,
                                    })
                                ),
                                model.activityRecency === option.value,
                                h
                            )
                        )
                    ),
                ]
            ),
            button(
                "Reset / rebuild",
                toParentMessage(ClickedIndexedDbCrmRebuild()),
                false,
                h
            ),
        ]
    )

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
                        ["LOCAL-FIRST INDEXEDDB"]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["Mini CRM: IndexedDB local-first"]
                    ),
                    h.p(
                        [h.Class("max-w-3xl text-sm text-muted-foreground")],
                        [
                            "Typed IndexedDB stores the normalized contacts, tags, contact-tag links, activities, and an activity-recency lookup. Foldkit keeps only filters and a bounded page cache.",
                        ]
                    ),
                    h.p(
                        [h.Class("max-w-3xl text-sm text-muted-foreground")],
                        [
                            "IndexedDB has no join, no multi-key get and no text index, so everything that makes this feel instant is an index built at write time. Tag ids and the latest activity are kept on the contact row beside the link tables that remain the source of truth, and a row per search token backs prefix matching. Each switch turns one of those off so the cost it removes becomes visible: the query plan under the results counts the requests every page actually made.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]")],
                [
                    controls(model, toParentMessage, h),
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
                                        [
                                            model.seedingState === "Seeding"
                                                ? `Persisting ${model.seededContacts.toLocaleString()} / ${contactCountForDatasetSize(model.selectedDatasetSize).toLocaleString()} contacts in batches…`
                                                : model.seedingState === "Ready"
                                                  ? Option.isSome(
                                                        model.pendingQueryKey
                                                    )
                                                      ? "Searching local contacts…"
                                                      : AsyncData.isRefreshing(
                                                              currentPage(model)
                                                          )
                                                        ? "Refreshing cached local result page…"
                                                        : "Local database ready"
                                                  : model.seedingState ===
                                                      "Failed"
                                                    ? "Database operation failed"
                                                    : "Opening local database…",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-right text-sm font-medium"
                                            ),
                                        ],
                                        [
                                            `cache ${model.cacheKeysByRecency.length}/${MAX_CACHED_QUERY_PAGES} pages`,
                                        ]
                                    ),
                                ]
                            ),
                            ...Option.match(model.maybeError, {
                                onNone: () => [],
                                onSome: (error) => [
                                    h.p(
                                        [
                                            h.Role("alert"),
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive p-4 text-sm text-destructive bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                                            ),
                                        ],
                                        [error]
                                    ),
                                ],
                            }),
                            model.seedingState === "Ready"
                                ? AsyncData.matchDataSplitEmpty(
                                      currentPage(model),
                                      {
                                          onIdle: () =>
                                              h.div(
                                                  [
                                                      h.Class(
                                                          "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-8 text-sm text-muted-foreground"
                                                      ),
                                                  ],
                                                  ["Waiting for a local query."]
                                              ),
                                          onLoading: () =>
                                              h.div(
                                                  [
                                                      h.Role("status"),
                                                      h.Class(
                                                          "flex min-h-64 items-center justify-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-8 text-sm text-muted-foreground"
                                                      ),
                                                  ],
                                                  ["Querying IndexedDB…"]
                                              ),
                                          onFailure: (error) =>
                                              h.div(
                                                  [
                                                      h.Role("alert"),
                                                      h.Class(
                                                          "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive p-8 text-sm text-destructive"
                                                      ),
                                                  ],
                                                  [error]
                                              ),
                                          onData: (page) =>
                                              contactsPage(
                                                  page,
                                                  Option.isSome(
                                                      model.pendingQueryKey
                                                  ),
                                                  AsyncData.getError(
                                                      currentPage(model)
                                                  ),
                                                  toParentMessage,
                                                  h
                                              ),
                                      }
                                  )
                                : h.div(
                                      [
                                          h.Class(
                                              "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-8 text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          "The IndexedDB schema is open. Seeding continues through explicit Commands so progress remains visible and the full dataset never enters the Foldkit Model.",
                                      ]
                                  ),
                        ]
                    ),
                ]
            ),
        ]
    )
