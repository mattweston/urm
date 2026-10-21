import { Match as M, Option } from "effect"
import * as Ui from "@foldkit/ui"
import { type CalendarDate } from "foldkit/calendar"
import { type Html, inertHtml as h } from "foldkit/html"

import { fullDate } from "./format.ts"
import { chevronDown } from "./icon.ts"

export const triggerClassName =
    "w-full rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-sm text-left text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring [box-shadow:var(--shadow-control)]"

export const panelClassName =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-overlay)] z-10 outline-none"

export const backdropClassName = "fixed inset-0"

export const triggerContent = (
    maybeDate: Option.Option<CalendarDate>,
    placeholder: string
): Html => {
    return h.div(
        [h.Class("flex w-full items-center justify-between gap-2")],
        [
            Option.match(maybeDate, {
                onNone: () =>
                    h.span([h.Class("text-muted-foreground")], [placeholder]),
                onSome: (date) => h.span([], [fullDate(date)]),
            }),
            h.span(
                [h.Class("text-muted-foreground shrink-0")],
                [chevronDown()]
            ),
        ]
    )
}

const calendarWrapperClassName =
    "flex flex-col gap-3 select-none min-w-[248px] min-h-[260px]"

const navButtonClassName =
    "inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const headingButtonClassName =
    "inline-flex items-center gap-2 text-sm font-semibold text-foreground tabular-nums px-2 py-1 rounded-[var(--radius-control)] cursor-pointer hover:bg-accent hover:text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const headingTextClassName =
    "text-sm font-semibold text-foreground tabular-nums"

const dayButtonClassName =
    "flex h-8 w-8 items-center justify-center rounded-full text-sm text-foreground tabular-nums cursor-pointer hover:bg-accent hover:text-accent-foreground group-data-[today]:ring-1 group-data-[today]:ring-border group-data-[selected]:bg-primary group-data-[selected]:text-primary-foreground group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-ring group-data-[outside-month]:text-muted-foreground group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40"

const monthYearGridClassName =
    "grid grid-cols-3 grid-rows-4 gap-1 outline-none flex-1"

const monthYearButtonClassName =
    "flex h-full w-full items-center justify-center rounded-md text-sm text-foreground tabular-nums cursor-pointer hover:bg-accent hover:text-accent-foreground group-data-[today]:ring-1 group-data-[today]:ring-border group-data-[selected]:bg-primary group-data-[selected]:text-primary-foreground group-data-[selected]:hover:bg-primary group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-ring group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40"

export const calendarView = (
    attributes: Ui.Calendar.CalendarAttributes
): Html => {
    return M.value(attributes).pipe(
        M.tagsExhaustive({
            Days: (days) =>
                h.div(
                    [...days.root, h.Class(calendarWrapperClassName)],
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
                                        h.Class(navButtonClassName),
                                    ],
                                    ["‹"]
                                ),
                                h.button(
                                    [
                                        h.Id(days.heading.id),
                                        ...days.headingButton,
                                        h.Class(headingButtonClassName),
                                    ],
                                    [days.heading.text, chevronDown("w-3 h-3")]
                                ),
                                h.button(
                                    [
                                        ...days.nextMonthButton,
                                        h.Class(navButtonClassName),
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
                                                    "text-center text-xs font-medium uppercase tracking-wide text-muted-foreground py-1"
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
                                                                dayButtonClassName
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
                    [...months.root, h.Class(calendarWrapperClassName)],
                    [
                        h.div(
                            [h.Class("flex items-center justify-center gap-2")],
                            [
                                h.button(
                                    [
                                        h.Id(months.heading.id),
                                        ...months.headingButton,
                                        h.Class(headingButtonClassName),
                                    ],
                                    [
                                        months.heading.text,
                                        chevronDown("w-3 h-3"),
                                    ]
                                ),
                            ]
                        ),
                        h.div(
                            [...months.grid, h.Class(monthYearGridClassName)],
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
                                                    monthYearButtonClassName
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
                    [...years.root, h.Class(calendarWrapperClassName)],
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
                                        h.Class(navButtonClassName),
                                    ],
                                    ["‹"]
                                ),
                                h.h2(
                                    [
                                        h.Id(years.heading.id),
                                        h.Class(headingTextClassName),
                                    ],
                                    [years.heading.text]
                                ),
                                h.button(
                                    [
                                        ...years.nextPageButton,
                                        h.Class(navButtonClassName),
                                    ],
                                    ["›"]
                                ),
                            ]
                        ),
                        h.div(
                            [...years.grid, h.Class(monthYearGridClassName)],
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
                                                    monthYearButtonClassName
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
}
