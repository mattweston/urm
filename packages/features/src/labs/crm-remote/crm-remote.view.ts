import { Array, HashMap, Option } from "effect"
import { AsyncData } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as Ui from "@foldkit/ui"

import { TAGS, type Tag } from "../crm/crm.domain.ts"
import { contactCountForDatasetSize } from "../crm/crm.generate.ts"
import {
    RequestedNextRemoteCrmPage,
    RequestedPreviousRemoteCrmPage,
    SelectedRemoteCrmActivityRecency,
    SelectedRemoteCrmDatasetSize,
    ToggledRemoteCrmSearchDebounce,
    ToggledRemoteCrmTagFacet,
    UpdatedRemoteCrmSearchText,
    type Message,
} from "./crm-remote.message.ts"
import { SEARCH_DEBOUNCE_MS } from "./crm-remote.command.ts"
import { MAX_CACHED_QUERY_PAGES } from "./crm-remote.update.ts"
import {
    RemoteContactsAsyncData,
    type ActivityRecency,
    type DatasetSize,
    type Model,
} from "./crm-remote.model.ts"
import {
    crmRemoteBrowseFieldsFromRoute,
    selectedTagIdsFromRoute,
} from "./crm-remote.route.ts"

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
        RemoteContactsAsyncData.Idle
    )

const requestStateLabel = (model: Model): string => {
    const page = currentPageData(model)

    return AsyncData.isRefreshing(page)
        ? "Refreshing remote results; the previous page stays visible"
        : AsyncData.isLoading(page)
          ? "Querying simulated RPC backend..."
          : "Remote page loaded"
}

const tagControl = <ParentMessage>(
    tag: Tag,
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const selected = selectedTagIdsFromRoute(model.route).includes(tag.id)
    return actionButton(
        tag.label,
        toParentMessage(
            ToggledRemoteCrmTagFacet({ tagId: tag.id, isSelected: !selected })
        ),
        selected,
        h
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const fields = crmRemoteBrowseFieldsFromRoute(model.route)

    return h.main(
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
                        ["REMOTE QUERY SHAPE"]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["Mini CRM: simulated RPC backend"]
                    ),
                    h.p(
                        [h.Class("max-w-3xl text-sm text-muted-foreground")],
                        [
                            "The Foldkit Model holds query inputs and one joined response page only. The generated 1k–250k contact store is represented behind the command boundary, as it would be behind RPC and database indexes.",
                        ]
                    ),
                    h.p(
                        [h.Class("max-w-3xl text-sm text-muted-foreground")],
                        [
                            `Every control commits through the URL, so the query is whatever the address bar says. Debouncing the search box means the URL trails it by ${SEARCH_DEBOUNCE_MS}ms: each keystroke arms a timer, and update drops the ones that arrive carrying text the Model has moved on from. The comparison is against the typed draft the Model already holds, not a request counter kept alongside it. Turn the switch off to watch the query count climb once per keystroke instead.`,
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
                                    id: "remote-crm-search",
                                    value: model.searchDraft,
                                    placeholder: "Search name or email",
                                    onInput: (value) =>
                                        toParentMessage(
                                            UpdatedRemoteCrmSearchText({
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
                            Ui.Switch.view(
                                {
                                    id: "remote-crm-debounce",
                                    isChecked: model.isSearchDebounced,
                                    onToggle: (isEnabled) =>
                                        toParentMessage(
                                            ToggledRemoteCrmSearchDebounce({
                                                isEnabled,
                                            })
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
                                                                    h.AriaHidden(
                                                                        true
                                                                    ),
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
                                                        `Off, every keystroke queries the backend. On, the query waits ${SEARCH_DEBOUNCE_MS}ms for typing to stop.`,
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
                                        ["Remote dataset"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        Array.map(SIZES, (option) =>
                                            actionButton(
                                                option.label,
                                                toParentMessage(
                                                    SelectedRemoteCrmDatasetSize(
                                                        { size: option.value }
                                                    )
                                                ),
                                                fields.size === option.value,
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
                                                    SelectedRemoteCrmActivityRecency(
                                                        {
                                                            activityRecency:
                                                                option.value,
                                                        }
                                                    )
                                                ),
                                                fields.recency === option.value,
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
                                            `Database size: ${contactCountForDatasetSize(fields.size).toLocaleString()} contacts · cache ${model.cacheKeysByRecency.length}/${MAX_CACHED_QUERY_PAGES} pages · ${model.issuedQueryCount.toLocaleString()} queries issued`,
                                        ]
                                    ),
                                ]
                            ),
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
                                                "The client is waiting for its remote page.",
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
                                                        h.span(
                                                            [],
                                                            [
                                                                `${page.totalMatches.toLocaleString()} simulated matches`,
                                                            ]
                                                        ),
                                                        h.span(
                                                            [
                                                                h.Class(
                                                                    "text-muted-foreground"
                                                                ),
                                                            ],
                                                            [
                                                                `Page ${page.page + 1}`,
                                                            ]
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
                                                        `Query plan: ${page.queryPlan}`,
                                                    ]
                                                ),
                                                ...Option.match(
                                                    AsyncData.getError(
                                                        currentPageData(model)
                                                    ),
                                                    {
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
                                                    }
                                                ),
                                                // A page is 50 rows: the list scrolls on its own so the
                                                // match count, query plan and pager stay in view.
                                                h.div(
                                                    [
                                                        h.Class(
                                                            "max-h-[60vh] overflow-y-auto overscroll-contain"
                                                        ),
                                                    ],
                                                    [
                                                        h.ul(
                                                            [
                                                                h.Class(
                                                                    "divide-y divide-border"
                                                                ),
                                                            ],
                                                            Array.map(
                                                                page.rows,
                                                                (row) =>
                                                                    h.keyed(
                                                                        "li"
                                                                    )(
                                                                        row
                                                                            .contact
                                                                            .id,
                                                                        [
                                                                            h.Class(
                                                                                "flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                                                                            ),
                                                                        ],
                                                                        [
                                                                            h.div(
                                                                                [
                                                                                    h.Class(
                                                                                        "min-w-0"
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
                                                                                            row
                                                                                                .contact
                                                                                                .name,
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
                                                                                        "flex flex-wrap items-center gap-2 text-xs"
                                                                                    ),
                                                                                ],
                                                                                [
                                                                                    ...Array.map(
                                                                                        row.tags,
                                                                                        (
                                                                                            tag
                                                                                        ) =>
                                                                                            h.span(
                                                                                                [
                                                                                                    h.Class(
                                                                                                        `rounded px-2 py-1 ${tag.tone}`
                                                                                                    ),
                                                                                                ],
                                                                                                [
                                                                                                    tag.label,
                                                                                                ]
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
                                                            "flex items-center justify-between border-t-(length:--surface-border-width) border-border px-4 py-3"
                                                        ),
                                                    ],
                                                    [
                                                        actionButton(
                                                            "Previous",
                                                            toParentMessage(
                                                                RequestedPreviousRemoteCrmPage()
                                                            ),
                                                            false,
                                                            h
                                                        ),
                                                        actionButton(
                                                            "Next",
                                                            toParentMessage(
                                                                RequestedNextRemoteCrmPage()
                                                            ),
                                                            false,
                                                            h
                                                        ),
                                                    ]
                                                ),
                                            ]
                                        ),
                                }
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}
