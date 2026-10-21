import { Array, Match as M, Option, pipe } from "effect"
import { createKeyedLazy } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as Ui from "@foldkit/ui"

import {
    latestActivityForContact,
    tagsForContact,
    TAGS,
    type Contact,
    type Dataset,
    type Tag,
} from "./crm.domain.ts"
import {
    ClickedClearFilters,
    GotVirtualListMessage,
    SelectedActivityRecency,
    SelectedDatasetSize,
    ToggledTagFacet,
    UpdatedSearchText,
    type Message,
} from "./crm.message.ts"
import type {
    ActivityRecency,
    DatasetSize,
    LoadState,
    Model,
} from "./crm.model.ts"
import { contactCountForDatasetSize } from "./crm.generate.ts"

const lazyContactRow = createKeyedLazy()

const DATASET_OPTIONS: ReadonlyArray<
    Readonly<{ size: DatasetSize; label: string }>
> = [
    { size: "OneThousand", label: "1k" },
    { size: "TenThousand", label: "10k" },
    { size: "FiftyThousand", label: "50k" },
    { size: "TwoHundredFiftyThousand", label: "250k" },
]

const RECENCY_OPTIONS: ReadonlyArray<
    Readonly<{ activityRecency: ActivityRecency; label: string }>
> = [
    { activityRecency: "SevenDays", label: "7 days" },
    { activityRecency: "ThirtyDays", label: "30 days" },
    { activityRecency: "Any", label: "Any" },
]

const INITIAL_PREVIEW_ROWS = 12

const datasetSizeLabel = (size: DatasetSize): string =>
    pipe(
        Array.findFirst(DATASET_OPTIONS, (option) => option.size === size),
        Option.match({
            onNone: () => "10k",
            onSome: ({ label }) => label,
        })
    )

const recencyLabel = (activityRecency: ActivityRecency): string =>
    pipe(
        Array.findFirst(
            RECENCY_OPTIONS,
            (option) => option.activityRecency === activityRecency
        ),
        Option.match({
            onNone: () => "Any",
            onSome: ({ label }) => label,
        })
    )

const loadStateText = (loadState: LoadState): string =>
    M.value(loadState).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            Generating: ({ size }) =>
                `Generating ${contactCountForDatasetSize(size).toLocaleString()} contacts`,
            Ready: ({ size }) =>
                `${contactCountForDatasetSize(size).toLocaleString()} contacts loaded`,
        })
    )

const buttonView = <ParentMessage>(
    label: string,
    message: ParentMessage,
    isSelected: boolean,
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
                            isSelected
                                ? "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-primary bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground [box-shadow:var(--shadow-primary)]"
                                : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const searchInputView = <ParentMessage>(
    searchText: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Input.view(
        {
            id: "crm-search",
            value: searchText,
            placeholder: "Search name or email",
            onInput: (value) => toParentMessage(UpdatedSearchText({ value })),
            toView: (attributes) =>
                h.div(
                    [h.Class("flex flex-col gap-2")],
                    [
                        h.label(
                            [
                                ...attributes.label,
                                h.Class(
                                    "text-sm font-semibold text-foreground"
                                ),
                            ],
                            ["Search contacts"]
                        ),
                        h.input([
                            ...attributes.input,
                            h.Class(
                                "h-10 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 text-sm text-foreground [box-shadow:var(--shadow-surface)]"
                            ),
                        ]),
                        h.p(
                            [
                                ...attributes.description,
                                h.Class("text-xs text-muted-foreground"),
                            ],
                            [
                                "The filter scans contact ids, then reads joined tags and latest activity from maintained indexes.",
                            ]
                        ),
                    ]
                ),
        },
        h
    )

const datasetControlsView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-col gap-2")],
        [
            h.p(
                [h.Class("text-sm font-semibold text-foreground")],
                ["Dataset size"]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                Array.map(DATASET_OPTIONS, ({ size, label }) =>
                    buttonView(
                        label,
                        toParentMessage(SelectedDatasetSize({ size })),
                        model.selectedDatasetSize === size,
                        h
                    )
                )
            ),
        ]
    )

const tagFacetView = <ParentMessage>(
    tag: Tag,
    selectedTagIds: ReadonlyArray<string>,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isChecked = selectedTagIds.includes(tag.id)

    return Ui.Checkbox.view(
        {
            id: `crm-tag-${tag.id}`,
            isChecked,
            onToggle: (isSelected) =>
                toParentMessage(ToggledTagFacet({ tagId: tag.id, isSelected })),
            toView: (attributes) =>
                h.div(
                    [h.Class("flex items-center gap-2")],
                    [
                        h.div(
                            [
                                ...attributes.checkbox,
                                h.Class(
                                    "grid size-4 place-items-center rounded border-(length:--surface-border-width) border-border data-[checked]:border-primary data-[checked]:bg-primary"
                                ),
                            ],
                            [
                                isChecked
                                    ? h.span([
                                          h.Class(
                                              "block size-2 rounded-sm bg-primary-foreground"
                                          ),
                                      ])
                                    : h.empty,
                            ]
                        ),
                        h.span(
                            [
                                ...attributes.label,
                                h.Class("text-sm text-foreground"),
                            ],
                            [tag.label]
                        ),
                        h.span(
                            [...attributes.description, h.Class("sr-only")],
                            [`Filter by ${tag.label}`]
                        ),
                    ]
                ),
        },
        h
    )
}

const filtersView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.aside(
        [
            h.Class(
                "flex flex-col gap-5 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            searchInputView(model.searchText, toParentMessage, h),
            datasetControlsView(model, toParentMessage, h),
            h.div(
                [h.Class("flex flex-col gap-2")],
                [
                    h.p(
                        [h.Class("text-sm font-semibold text-foreground")],
                        ["Tag facets"]
                    ),
                    h.div(
                        [h.Class("grid gap-2 sm:grid-cols-2 lg:grid-cols-1")],
                        Array.map(TAGS, (tag) =>
                            tagFacetView(
                                tag,
                                model.selectedTagIds,
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
                        [h.Class("text-sm font-semibold text-foreground")],
                        ["Latest activity"]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        Array.map(
                            RECENCY_OPTIONS,
                            ({ activityRecency, label }) =>
                                buttonView(
                                    label,
                                    toParentMessage(
                                        SelectedActivityRecency({
                                            activityRecency,
                                        })
                                    ),
                                    model.activityRecency === activityRecency,
                                    h
                                )
                        )
                    ),
                ]
            ),
            buttonView(
                "Clear filters",
                toParentMessage(ClickedClearFilters()),
                false,
                h
            ),
        ]
    )

const tagPillView = <ParentMessage>(
    tag: Tag,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.span(
        [h.Class(`rounded-full px-2 py-0.5 text-xs font-semibold ${tag.tone}`)],
        [tag.label]
    )

const contactRowContentView = <ParentMessage>(
    contact: Contact,
    dataset: Dataset,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const tags = tagsForContact(contact.id, dataset)
    const maybeActivity = latestActivityForContact(contact.id, dataset)

    return h.article(
        [
            h.Class(
                "grid min-h-24 grid-cols-1 gap-3 border-b-(length:--surface-border-width) border-border bg-card px-4 py-3 md:grid-cols-[minmax(0,1.5fr)_minmax(14rem,1fr)]"
            ),
        ],
        [
            h.div(
                [h.Class("min-w-0")],
                [
                    h.h3(
                        [
                            h.Class(
                                "truncate text-base font-bold text-foreground"
                            ),
                        ],
                        [contact.name]
                    ),
                    h.p(
                        [h.Class("truncate text-sm text-muted-foreground")],
                        [contact.email]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [contact.company]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex min-w-0 flex-col gap-2")],
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-1")],
                        Array.map(tags, (tag) => tagPillView(tag, h))
                    ),
                    Option.match(maybeActivity, {
                        onNone: () =>
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                ["No activity"]
                            ),
                        onSome: (activity) =>
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    `${activity.kind}: ${activity.summary} (${activity.occurredDaysAgo}d ago)`,
                                ]
                            ),
                    }),
                ]
            ),
        ]
    )
}

const contactRowView = <ParentMessage>(
    contactId: string,
    dataset: Dataset,
    h: HtmlBuilder<ParentMessage>
): Html =>
    pipe(
        Option.fromNullishOr(dataset.contactsById[contactId]),
        Option.match({
            onNone: () => h.empty,
            onSome: (contact) =>
                lazyContactRow(contact.id, contactRowContentView, [
                    contact,
                    dataset,
                    h,
                ]),
        })
    )

const emptyResultsView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [
            h.Class(
                "grid min-h-80 place-items-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-muted/30 p-8 text-center"
            ),
        ],
        [
            h.div(
                [h.Class("max-w-sm")],
                [
                    h.h3(
                        [h.Class("text-lg font-bold text-foreground")],
                        ["No contacts match"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-2 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Try a wider recency window, fewer tags, or a shorter search.",
                        ]
                    ),
                ]
            ),
        ]
    )

const contactsListView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Array.match(model.filteredContactIds, {
        onEmpty: () => emptyResultsView(h),
        onNonEmpty: (contactIds) =>
            M.value(model.list.measurement).pipe(
                M.withReturnType<Html>(),
                M.tagsExhaustive({
                    Unmeasured: () =>
                        h.ul(
                            [
                                h.Id(model.list.id),
                                h.Role("list"),
                                h.Class(
                                    "h-[640px] overflow-auto overscroll-contain rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card [box-shadow:var(--shadow-surface)]"
                                ),
                            ],
                            Array.map(
                                Array.take(contactIds, INITIAL_PREVIEW_ROWS),
                                (contactId) =>
                                    h.keyed("li")(
                                        contactId,
                                        [h.Role("listitem")],
                                        [
                                            contactRowView(
                                                contactId,
                                                model.dataset,
                                                h
                                            ),
                                        ]
                                    )
                            )
                        ),
                    Measured: () =>
                        h.submodel({
                            slotId: model.list.id,
                            model: model.list,
                            view: Ui.VirtualList.view<string>(),
                            viewInputs: {
                                items: contactIds,
                                itemToKey: (contactId) => contactId,
                                itemToView: (contactId) =>
                                    contactRowView(contactId, model.dataset, h),
                                containerClassName:
                                    "h-[640px] overscroll-contain rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card [box-shadow:var(--shadow-surface)]",
                                overscan: 8,
                            },
                            toParentMessage: (message) =>
                                toParentMessage(
                                    GotVirtualListMessage({ message })
                                ),
                        }),
                })
            ),
    })

const statsView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("grid gap-3 sm:grid-cols-2 xl:grid-cols-4")],
        [
            statView("Status", loadStateText(model.loadState), h),
            statView(
                "Visible matches",
                model.filteredContactIds.length.toLocaleString(),
                h
            ),
            statView(
                "Selected tags",
                model.selectedTagIds.length.toLocaleString(),
                h
            ),
            statView("Recency", recencyLabel(model.activityRecency), h),
        ]
    )

const statView = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.p(
                [
                    h.Class(
                        "text-xs font-semibold uppercase text-muted-foreground"
                    ),
                ],
                [label]
            ),
            h.p([h.Class("mt-1 text-lg font-bold text-foreground")], [value]),
        ]
    )

const architectureNotesView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.h3(
                [h.Class("text-base font-bold text-foreground")],
                ["Maintained indexes"]
            ),
            h.ul(
                [
                    h.Class(
                        "mt-3 grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-2"
                    ),
                ],
                [
                    h.li(
                        [],
                        [
                            `${model.dataset.contactIds.length.toLocaleString()} contact ids preserve list order.`,
                        ]
                    ),
                    h.li(
                        [],
                        [
                            `${Object.keys(model.dataset.contactIdsByTag).length.toLocaleString()} tag-to-contact indexes power facets.`,
                        ]
                    ),
                    h.li(
                        [],
                        [
                            `${Object.keys(model.dataset.activityIdsByContact).length.toLocaleString()} contact-to-activity indexes avoid per-row scans.`,
                        ]
                    ),
                    h.li(
                        [],
                        [
                            "Rows dereference tags and latest activity by id; filtering recomputes ids, not joined row objects.",
                        ]
                    ),
                ]
            ),
        ]
    )

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-col gap-6")],
        [
            h.header(
                [h.Class("max-w-3xl")],
                [
                    h.p(
                        [
                            h.Class(
                                "text-sm font-semibold uppercase tracking-wide text-primary"
                            ),
                        ],
                        ["Scale demo"]
                    ),
                    h.h2(
                        [h.Class("mt-2 text-3xl font-bold text-foreground")],
                        ["Mini CRM: local derivation"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-3 text-base leading-7 text-muted-foreground"
                            ),
                        ],
                        [
                            `A normalized contact store filtered live at ${datasetSizeLabel(model.selectedDatasetSize)}, with row joins served from indexes maintained by update.`,
                        ]
                    ),
                ]
            ),
            statsView(model, h),
            h.div(
                [h.Class("grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]")],
                [
                    filtersView(model, toParentMessage, h),
                    contactsListView(model, toParentMessage, h),
                ]
            ),
            architectureNotesView(model, h),
        ]
    )
