import { Array, Match as M, Option, pipe } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Dinosaur } from "./query-sync-table.data.ts"
import { dinosaurs } from "./query-sync-table.data.ts"
import {
    ChangedSearchInput,
    ClickedColumnHeader,
    SelectedDietFilter,
    SelectedPeriodFilter,
    type Message,
} from "./query-sync-table.message.ts"
import type { Model } from "./query-sync-table.model.ts"
import {
    querySyncTableBrowseFieldsFromRoute,
    querySyncTableHref,
    type SortColumn,
    type Sorting,
} from "./query-sync-table.route.ts"

const SORT_INDICATOR_WIDTH = "w-3 text-center"

const headerButtonBaseClass =
    "flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none"

const headerButtonLeftClass = `${headerButtonBaseClass} justify-start`
const headerButtonRightClass = `${headerButtonBaseClass} justify-end`

const bodyCellClass = "px-4 py-3 text-sm text-foreground"

const cardClass =
    "min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"

const controlClass =
    "min-w-0 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"

const selectWrapperClass = "relative"

const selectClass = `${controlClass} appearance-none pe-9 cursor-pointer`

const chevronClass =
    "pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"

const filterWhenSome =
    <A, B>(
        maybeValue: Option.Option<A>,
        predicate: (value: A, item: B) => boolean
    ) =>
    (items: ReadonlyArray<B>): ReadonlyArray<B> =>
        Option.match(maybeValue, {
            onNone: () => items,
            onSome: (value) =>
                Array.filter(items, (item) => predicate(value, item)),
        })

const compareStrings = (left: string, right: string) =>
    left.localeCompare(right)

const compareNumbers = (left: number, right: number) => left - right

const columnComparators: Record<
    SortColumn,
    (left: Dinosaur, right: Dinosaur) => number
> = {
    Name: (left, right) => compareStrings(left.name, right.name),
    Period: (left, right) => compareStrings(left.period, right.period),
    Diet: (left, right) => compareStrings(left.diet, right.diet),
    Length: (left, right) =>
        compareNumbers(left.lengthMeters, right.lengthMeters),
    Weight: (left, right) => compareNumbers(left.weightKg, right.weightKg),
}

const sortDinosaurs =
    (sorting: Sorting) =>
    (items: ReadonlyArray<Dinosaur>): ReadonlyArray<Dinosaur> =>
        M.value(sorting).pipe(
            M.withReturnType<ReadonlyArray<Dinosaur>>(),
            M.tagsExhaustive({
                Unsorted: () => items,
                Ascending: ({ column }) =>
                    [...items].sort(columnComparators[column]),
                Descending: ({ column }) =>
                    [...items].sort((left, right) =>
                        columnComparators[column](right, left)
                    ),
            })
        )

const sortStateForColumn = (sorting: Sorting, column: SortColumn) =>
    M.value(sorting).pipe(
        M.withReturnType<"none" | "ascending" | "descending">(),
        M.tagsExhaustive({
            Unsorted: () => "none",
            Ascending: ({ column: sortedColumn }) =>
                sortedColumn === column ? "ascending" : "none",
            Descending: ({ column: sortedColumn }) =>
                sortedColumn === column ? "descending" : "none",
        })
    )

const sortIndicator = (sorting: Sorting, column: SortColumn) =>
    M.value(sortStateForColumn(sorting, column)).pipe(
        M.withReturnType<string>(),
        M.when("none", () => ""),
        M.when("ascending", () => "^"),
        M.when("descending", () => "v"),
        M.exhaustive
    )

const sortAriaLabel = (sorting: Sorting, column: SortColumn, label: string) =>
    M.value(sortStateForColumn(sorting, column)).pipe(
        M.withReturnType<string>(),
        M.when("none", () => `Sort by ${label}`),
        M.when("ascending", () => `Sort by ${label}, currently ascending`),
        M.when("descending", () => `Sort by ${label}, currently descending`),
        M.exhaustive
    )

const ariaSortValue = (sorting: Sorting, column: SortColumn) =>
    M.value(sortStateForColumn(sorting, column)).pipe(
        M.withReturnType<string>(),
        M.when("none", () => "none"),
        M.when("ascending", () => "ascending"),
        M.when("descending", () => "descending"),
        M.exhaustive
    )

const dinosaurRowView = <ParentMessage>(
    dinosaur: Dinosaur,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("tr")(
        dinosaur.name,
        [
            h.Class(
                "border-t-(length:--surface-border-width) border-border hover:bg-muted/30"
            ),
        ],
        [
            h.td([h.Class(bodyCellClass)], [dinosaur.name]),
            h.td([h.Class(bodyCellClass)], [dinosaur.period]),
            h.td([h.Class(bodyCellClass)], [dinosaur.diet]),
            h.td(
                [h.Class(`${bodyCellClass} text-end tabular-nums`)],
                [`${dinosaur.lengthMeters} m`]
            ),
            h.td(
                [h.Class(`${bodyCellClass} text-end tabular-nums`)],
                [`${dinosaur.weightKg} kg`]
            ),
        ]
    )
}

const browseView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const fields = querySyncTableBrowseFieldsFromRoute(model.route)
    const filteredDinosaurs = pipe(
        dinosaurs,
        filterWhenSome(fields.search, (query, dinosaur) =>
            dinosaur.name.toLowerCase().includes(query.toLowerCase())
        ),
        filterWhenSome(
            fields.diet,
            (dietValue, dinosaur) => dinosaur.diet === dietValue
        ),
        filterWhenSome(
            fields.period,
            (periodValue, dinosaur) => dinosaur.period === periodValue
        ),
        sortDinosaurs(fields.sorting)
    )
    const totalCount = Array.length(dinosaurs)
    const visibleCount = Array.length(filteredDinosaurs)
    const searchValue = Option.match(fields.search, {
        onNone: () => "",
        onSome: (value) => value,
    })
    const dietValue = Option.match(fields.diet, {
        onNone: () => "",
        onSome: (value) => value,
    })
    const periodValue = Option.match(fields.period, {
        onNone: () => "",
        onSome: (value) => value,
    })

    const sortableHeader = (
        column: SortColumn,
        label: string,
        isRightAligned: boolean
    ) =>
        h.th(
            [h.AriaSort(ariaSortValue(fields.sorting, column))],
            [
                h.button(
                    [
                        h.Type("button"),
                        h.OnClick(
                            toParentMessage(ClickedColumnHeader({ column }))
                        ),
                        h.AriaLabel(
                            sortAriaLabel(fields.sorting, column, label)
                        ),
                        h.Class(
                            isRightAligned
                                ? headerButtonRightClass
                                : headerButtonLeftClass
                        ),
                    ],
                    [
                        h.span([], [label]),
                        h.span(
                            [h.Class(SORT_INDICATOR_WIDTH)],
                            [sortIndicator(fields.sorting, column)]
                        ),
                    ]
                ),
            ]
        )

    return h.div(
        [h.Class("space-y-6")],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["Dinosaur Explorer"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Search, sort, and filter the dinosaurs. The current state stays in the URL.",
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.div(
                        [h.Class("min-w-0 space-y-2")],
                        [
                            h.label(
                                [
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Search"]
                            ),
                            h.input([
                                h.Type("search"),
                                h.Value(searchValue),
                                h.Placeholder("Search by name..."),
                                h.Class(controlClass),
                                h.OnInput((value) =>
                                    toParentMessage(
                                        ChangedSearchInput({ value })
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
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Diet"]
                            ),
                            h.div(
                                [h.Class(selectWrapperClass)],
                                [
                                    h.select(
                                        [
                                            h.Value(dietValue),
                                            h.Class(selectClass),
                                            h.OnInput((value) =>
                                                toParentMessage(
                                                    SelectedDietFilter({
                                                        value,
                                                    })
                                                )
                                            ),
                                        ],
                                        [
                                            h.option(
                                                [h.Value("")],
                                                ["All diets"]
                                            ),
                                            h.option(
                                                [h.Value("Carnivore")],
                                                ["Carnivore"]
                                            ),
                                            h.option(
                                                [h.Value("Herbivore")],
                                                ["Herbivore"]
                                            ),
                                            h.option(
                                                [h.Value("Omnivore")],
                                                ["Omnivore"]
                                            ),
                                        ]
                                    ),
                                    h.span([h.Class(chevronClass)], ["v"]),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("space-y-2")],
                        [
                            h.label(
                                [
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Period"]
                            ),
                            h.div(
                                [h.Class(selectWrapperClass)],
                                [
                                    h.select(
                                        [
                                            h.Value(periodValue),
                                            h.Class(selectClass),
                                            h.OnInput((value) =>
                                                toParentMessage(
                                                    SelectedPeriodFilter({
                                                        value,
                                                    })
                                                )
                                            ),
                                        ],
                                        [
                                            h.option(
                                                [h.Value("")],
                                                ["All periods"]
                                            ),
                                            h.option(
                                                [h.Value("Triassic")],
                                                ["Triassic"]
                                            ),
                                            h.option(
                                                [h.Value("Jurassic")],
                                                ["Jurassic"]
                                            ),
                                            h.option(
                                                [h.Value("Cretaceous")],
                                                ["Cretaceous"]
                                            ),
                                        ]
                                    ),
                                    h.span([h.Class(chevronClass)], ["v"]),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex items-center justify-between gap-3 text-sm text-muted-foreground"
                    ),
                ],
                [
                    h.span(
                        [],
                        [`Showing ${visibleCount} of ${totalCount} dinosaurs`]
                    ),
                ]
            ),
            Array.match(filteredDinosaurs, {
                onEmpty: () =>
                    h.div(
                        [
                            h.Class(
                                "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-card p-8 text-center text-muted-foreground"
                            ),
                        ],
                        ["No dinosaurs match these filters."]
                    ),
                onNonEmpty: (rows) =>
                    h.div(
                        [h.Class(cardClass)],
                        [
                            h.table(
                                [h.Class("w-full border-collapse")],
                                [
                                    h.thead(
                                        [
                                            h.Class(
                                                "border-b-(length:--surface-border-width) border-border bg-muted/40"
                                            ),
                                        ],
                                        [
                                            h.tr(
                                                [],
                                                [
                                                    sortableHeader(
                                                        "Name",
                                                        "Name",
                                                        false
                                                    ),
                                                    sortableHeader(
                                                        "Period",
                                                        "Period",
                                                        false
                                                    ),
                                                    sortableHeader(
                                                        "Diet",
                                                        "Diet",
                                                        false
                                                    ),
                                                    sortableHeader(
                                                        "Length",
                                                        "Length (m)",
                                                        true
                                                    ),
                                                    sortableHeader(
                                                        "Weight",
                                                        "Weight (kg)",
                                                        true
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.tbody(
                                        [],
                                        Array.map(rows, (dinosaur) =>
                                            dinosaurRowView<ParentMessage>(
                                                dinosaur,
                                                h
                                            )
                                        )
                                    ),
                                ]
                            ),
                        ]
                    ),
            }),
        ]
    )
}

const notFoundView = <ParentMessage>(
    path: string,
    h: HtmlBuilder<ParentMessage>,
    browse_href: string
): Html => {
    return h.div(
        [h.Class("flex min-h-[60vh] items-center justify-center p-4")],
        [
            h.div(
                [
                    h.Class(
                        "max-w-lg rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-8 text-center text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["404"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-3 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [`The path "${path}" was not found.`]
                    ),
                    h.a(
                        [
                            h.Href(browse_href),
                            h.Class(
                                "mt-6 inline-flex rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        ["Back to Query Sync Table"]
                    ),
                ]
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    browse_href = querySyncTableHref()
): Html =>
    M.value(model.route).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            QuerySyncTable: () => browseView(model, toParentMessage, h),
            QuerySyncTableNotFound: ({ path }) =>
                notFoundView<ParentMessage>(path, h, browse_href),
        })
    )
