import * as Ui from "@foldkit/ui"
import { Match as M, Option } from "effect"
import { type CalendarDate } from "foldkit/calendar"
import { type Html, inertHtml as h } from "foldkit/html"

export const date_picker_trigger_class =
    "min-h-12 w-full rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-left text-base text-foreground transition hover:bg-accent focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)] disabled:cursor-not-allowed disabled:opacity-50 [box-shadow:var(--shadow-control)]"

export const date_picker_panel_class =
    "z-10 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground outline-none [box-shadow:var(--shadow-overlay)]"

export const date_picker_backdrop_class = "fixed inset-0"

const formatted_date = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
})

export const date_picker_trigger_content = (
    maybe_date: Option.Option<CalendarDate>,
    placeholder: string
): Html =>
    h.div(
        [h.Class("flex w-full items-center justify-between gap-2")],
        [
            Option.match(maybe_date, {
                onNone: () =>
                    h.span([h.Class("text-muted-foreground")], [placeholder]),
                onSome: (date) =>
                    h.span(
                        [h.Class("tabular-nums")],
                        [
                            formatted_date.format(
                                new Date(date.year, date.month - 1, date.day)
                            ),
                        ]
                    ),
            }),
            h.span(
                [
                    h.Attribute("aria-hidden", "true"),
                    h.Class("shrink-0 text-muted-foreground"),
                ],
                ["⌄"]
            ),
        ]
    )

const calendar_wrapper_class =
    "flex min-h-[260px] min-w-[248px] select-none flex-col gap-3"
const nav_button_class =
    "inline-flex size-8 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border-(length:--control-border-width) border-border text-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
const heading_button_class =
    "inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border-(length:--control-border-width) border-border px-2 py-1 text-sm font-semibold tabular-nums text-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
const heading_text_class = "text-sm font-semibold tabular-nums text-foreground"
const day_button_class =
    "flex size-8 cursor-pointer items-center justify-center rounded-full text-sm tabular-nums text-foreground hover:bg-accent hover:text-accent-foreground group-data-[today]:ring-1 group-data-[today]:ring-border group-data-[selected]:bg-primary group-data-[selected]:text-primary-foreground group-data-[selected]:hover:bg-primary group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-ring group-data-[outside-month]:text-muted-foreground group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40"
const month_year_grid_class =
    "grid flex-1 grid-cols-3 grid-rows-4 gap-1 outline-none"
const month_year_button_class =
    "flex h-full w-full cursor-pointer items-center justify-center rounded-[var(--radius-control)] text-sm tabular-nums text-foreground hover:bg-accent hover:text-accent-foreground group-data-[today]:ring-1 group-data-[today]:ring-border group-data-[selected]:bg-primary group-data-[selected]:text-primary-foreground group-data-[selected]:hover:bg-primary group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-ring group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40"

export const date_picker_calendar_view = (
    attributes: Ui.Calendar.CalendarAttributes
): Html =>
    M.value(attributes).pipe(
        M.tagsExhaustive({
            Days: (days) =>
                h.div(
                    [...days.root, h.Class(calendar_wrapper_class)],
                    [
                        h.div(
                            [
                                h.Class(
                                    "flex items-center justify-between gap-2"
                                ),
                            ],
                            [
                                h.button(
                                    [
                                        ...days.previousMonthButton,
                                        h.Class(nav_button_class),
                                    ],
                                    ["‹"]
                                ),
                                h.button(
                                    [
                                        h.Id(days.heading.id),
                                        ...days.headingButton,
                                        h.Class(heading_button_class),
                                    ],
                                    [days.heading.text, "⌄"]
                                ),
                                h.button(
                                    [
                                        ...days.nextMonthButton,
                                        h.Class(nav_button_class),
                                    ],
                                    ["›"]
                                ),
                            ]
                        ),
                        h.div(
                            [
                                ...days.grid,
                                h.Class("flex flex-col gap-1 outline-none"),
                            ],
                            [
                                h.div(
                                    [
                                        ...days.headerRow,
                                        h.Class("grid grid-cols-7 gap-1"),
                                    ],
                                    days.columnHeaders.map((header) =>
                                        h.div(
                                            [
                                                ...header.attributes,
                                                h.Class(
                                                    "py-1 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
                                                ),
                                            ],
                                            [header.name]
                                        )
                                    )
                                ),
                                ...days.weeks.map((week) =>
                                    h.div(
                                        [
                                            ...week.attributes,
                                            h.Class("grid grid-cols-7 gap-1"),
                                        ],
                                        week.cells.map((cell) =>
                                            h.div(
                                                [
                                                    ...cell.cellAttributes,
                                                    h.Class(
                                                        "group flex items-center justify-center"
                                                    ),
                                                ],
                                                [
                                                    h.button(
                                                        [
                                                            ...cell.buttonAttributes,
                                                            h.Class(
                                                                day_button_class
                                                            ),
                                                        ],
                                                        [cell.label]
                                                    ),
                                                ]
                                            )
                                        )
                                    )
                                ),
                            ]
                        ),
                    ]
                ),
            Months: (months) =>
                h.div(
                    [...months.root, h.Class(calendar_wrapper_class)],
                    [
                        h.div(
                            [h.Class("flex items-center justify-center gap-2")],
                            [
                                h.button(
                                    [
                                        h.Id(months.heading.id),
                                        ...months.headingButton,
                                        h.Class(heading_button_class),
                                    ],
                                    [months.heading.text, "⌄"]
                                ),
                            ]
                        ),
                        h.div(
                            [...months.grid, h.Class(month_year_grid_class)],
                            months.cells.map((cell) =>
                                h.div(
                                    [
                                        ...cell.cellAttributes,
                                        h.Class(
                                            "group flex items-center justify-center"
                                        ),
                                    ],
                                    [
                                        h.button(
                                            [
                                                ...cell.buttonAttributes,
                                                h.Class(
                                                    month_year_button_class
                                                ),
                                            ],
                                            [cell.shortLabel]
                                        ),
                                    ]
                                )
                            )
                        ),
                    ]
                ),
            Years: (years) =>
                h.div(
                    [...years.root, h.Class(calendar_wrapper_class)],
                    [
                        h.div(
                            [
                                h.Class(
                                    "flex items-center justify-between gap-2"
                                ),
                            ],
                            [
                                h.button(
                                    [
                                        ...years.previousPageButton,
                                        h.Class(nav_button_class),
                                    ],
                                    ["‹"]
                                ),
                                h.h3(
                                    [
                                        h.Id(years.heading.id),
                                        h.Class(heading_text_class),
                                    ],
                                    [years.heading.text]
                                ),
                                h.button(
                                    [
                                        ...years.nextPageButton,
                                        h.Class(nav_button_class),
                                    ],
                                    ["›"]
                                ),
                            ]
                        ),
                        h.div(
                            [...years.grid, h.Class(month_year_grid_class)],
                            years.cells.map((cell) =>
                                h.div(
                                    [
                                        ...cell.cellAttributes,
                                        h.Class(
                                            "group flex items-center justify-center"
                                        ),
                                    ],
                                    [
                                        h.button(
                                            [
                                                ...cell.buttonAttributes,
                                                h.Class(
                                                    month_year_button_class
                                                ),
                                            ],
                                            [cell.label]
                                        ),
                                    ]
                                )
                            )
                        ),
                    ]
                ),
        })
    )
