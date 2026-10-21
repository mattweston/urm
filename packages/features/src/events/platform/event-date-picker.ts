import { Match as M, Option, Schema as S } from "effect"
import * as Ui from "@foldkit/ui"
import {
    CalendarDateFromIsoString,
    fromDateLocal,
    type CalendarDate,
} from "foldkit/calendar"
import { type Html, inertHtml as h } from "foldkit/html"
import type { AnchorConfig } from "@foldkit/ui/popover"

const today = fromDateLocal(new Date())

export const EVENT_DATE_PICKER_ANCHOR: AnchorConfig = {
    placement: "bottom-start",
    gap: 4,
    padding: 8,
}

export const eventDatePickerTriggerClassName =
    "w-full inline-flex items-center justify-between gap-2 rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-4 py-2 text-sm text-left font-normal cursor-pointer text-foreground hover:bg-accent select-none focus:outline-none focus:ring-2 focus:ring-ring [box-shadow:var(--shadow-control)]"

export const eventDatePickerPanelClassName =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-overlay)] z-10 outline-none"

export const eventDatePickerBackdropClassName = "fixed inset-0"

export const eventDatePickerWrapperClassName = "relative inline-block w-full"

const calendarWrapperClassName =
    "flex flex-col gap-3 select-none min-w-[268px] min-h-[284px]"

const headerClassName = "flex items-center justify-between gap-2"

const headingButtonClassName =
    "inline-flex items-center gap-2 text-sm font-semibold text-foreground tabular-nums px-2 py-1 rounded-[var(--radius-control)] cursor-pointer hover:bg-accent border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const headingTextClassName =
    "text-sm font-semibold text-foreground tabular-nums"

const navButtonClassName =
    "inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-accent cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const gridClassName = "flex flex-col gap-1 outline-none"

const headerRowClassName = "grid grid-cols-7 gap-1"

const columnHeaderClassName =
    "text-center text-xs font-medium uppercase tracking-wide text-muted-foreground py-1"

const weekRowClassName = "grid grid-cols-7 gap-1"

const cellClassName = "group flex items-center justify-center"

const dayButtonClassName =
    "flex h-9 w-9 items-center justify-center rounded-full text-sm text-foreground tabular-nums cursor-pointer hover:bg-accent group-data-[today]:ring-1 group-data-[today]:ring-border group-data-[selected]:bg-primary group-data-[selected]:text-primary-foreground group-data-[selected]:hover:bg-primary group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-ring group-data-[outside-month]:text-muted-foreground group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40"

const monthYearGridClassName =
    "grid grid-cols-3 grid-rows-4 gap-1 outline-none flex-1"

const monthYearCellClassName = "group flex items-center justify-center"

const monthYearButtonClassName =
    "flex h-full w-full items-center justify-center rounded-md text-sm text-foreground tabular-nums cursor-pointer hover:bg-accent group-data-[today]:ring-1 group-data-[today]:ring-border group-data-[selected]:bg-primary group-data-[selected]:text-primary-foreground group-data-[selected]:hover:bg-primary group-data-[focused]:outline-2 group-data-[focused]:outline-offset-2 group-data-[focused]:outline-ring group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-40"

const dateToIso = (date: CalendarDate): string =>
    `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`

const formatTriggerLabel = (
    date: Readonly<{ year: number; month: number; day: number }>
): string =>
    `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`

export const blankEventDatePicker = () =>
    Ui.DatePicker.init({
        id: "events-event-date",
        today,
    })

export const eventDatePickerFromIsoDate = (
    date: string
): Ui.DatePicker.Model => {
    const picker = blankEventDatePicker()

    if (date.length === 0) {
        return picker
    }

    try {
        const parsed = S.decodeUnknownSync(CalendarDateFromIsoString)(date)
        const { model: nextPicker } = Ui.DatePicker.selectDate(picker, parsed)

        return nextPicker
    } catch {
        return picker
    }
}

// The picker no longer stores its selection, so the draft's ISO string is the
// source of truth and the view derives the Option from it.
export const eventDatePickerMaybeDate = (
    date: string
): Option.Option<CalendarDate> => {
    if (date.length === 0) {
        return Option.none()
    }

    try {
        return Option.some(S.decodeUnknownSync(CalendarDateFromIsoString)(date))
    } catch {
        return Option.none()
    }
}

export const eventDatePickerToIsoDate = (
    date: Readonly<{ year: number; month: number; day: number }>
): string => dateToIso(date)

export const eventDatePickerTriggerContent = (
    maybeDate: Option.Option<
        Readonly<{ year: number; month: number; day: number }>
    >,
    placeholder: string
): Html => {
    return h.div(
        [h.Class("flex w-full items-center justify-between gap-2")],
        [
            Option.match(maybeDate, {
                onNone: () =>
                    h.span([h.Class("text-muted-foreground")], [placeholder]),
                onSome: (date) => h.span([], [formatTriggerLabel(date)]),
            }),
            h.span([h.Class("text-muted-foreground shrink-0")], ["▾"]),
        ]
    )
}

export const eventDatePickerCalendarView = (
    attributes: Ui.Calendar.CalendarAttributes
): Html => {
    return M.value(attributes).pipe(
        M.tagsExhaustive({
            Days: (days) =>
                h.div(
                    [...days.root, h.Class(calendarWrapperClassName)],
                    [
                        h.div(
                            [h.Class(headerClassName)],
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
                                    [
                                        days.heading.text,
                                        h.span([h.Class("text-xs")], ["▾"]),
                                    ]
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
                            [...days.grid, h.Class(gridClassName)],
                            [
                                h.div(
                                    [
                                        ...days.headerRow,
                                        h.Class(headerRowClassName),
                                    ],
                                    days.columnHeaders.map((header) =>
                                        h.div(
                                            [
                                                ...header.attributes,
                                                h.Class(columnHeaderClassName),
                                            ],
                                            [header.name]
                                        )
                                    )
                                ),
                                ...days.weeks.map((week) =>
                                    h.div(
                                        [
                                            ...week.attributes,
                                            h.Class(weekRowClassName),
                                        ],
                                        week.cells.map((cell) =>
                                            h.div(
                                                [
                                                    ...cell.cellAttributes,
                                                    h.Class(cellClassName),
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
                            [h.Class(`${headerClassName} justify-center`)],
                            [
                                h.button(
                                    [
                                        h.Id(months.heading.id),
                                        ...months.headingButton,
                                        h.Class(headingButtonClassName),
                                    ],
                                    [
                                        months.heading.text,
                                        h.span([h.Class("text-xs")], ["▾"]),
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
                                        h.Class(monthYearCellClassName),
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
                            [h.Class(headerClassName)],
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
                                        h.Class(monthYearCellClassName),
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
