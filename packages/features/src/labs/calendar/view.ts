/** # Calendar view */
import { Match as M } from "effect"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Icon from "../_shared/icon.ts"
import { GotCalendarMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const containerClassName =
    "inline-flex flex-col gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground p-4 [box-shadow:var(--shadow-surface)] select-none min-w-[304px] min-h-[324px]"

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

/**
 * Select a date, navigate between months, or use the heading to switch the
 * calendar into month and year selection. The example constrains navigation to
 * one year on either side of today.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Calendar"]
            ),
            h.submodel({
                slotId: model.calendar.id,
                model: model.calendar,
                view: Ui.Calendar.view,
                viewInputs: {
                    maybeSelectedDate: model.maybeSelectedDate,
                    toView: (attributes) =>
                        M.value(attributes).pipe(
                            M.tagsExhaustive({
                                Days: (days) =>
                                    h.div(
                                        [
                                            ...days.root,
                                            h.Class(containerClassName),
                                        ],
                                        [
                                            h.div(
                                                [h.Class(headerClassName)],
                                                [
                                                    h.button(
                                                        [
                                                            ...days.previousMonthButton,
                                                            h.Class(
                                                                navButtonClassName
                                                            ),
                                                        ],
                                                        [
                                                            Icon.chevronLeft(
                                                                "w-5 h-5"
                                                            ),
                                                        ]
                                                    ),
                                                    h.button(
                                                        [
                                                            h.Id(
                                                                days.heading.id
                                                            ),
                                                            ...days.headingButton,
                                                            h.Class(
                                                                headingButtonClassName
                                                            ),
                                                        ],
                                                        [
                                                            days.heading.text,
                                                            Icon.chevronDown(
                                                                "w-3 h-3"
                                                            ),
                                                        ]
                                                    ),
                                                    h.button(
                                                        [
                                                            ...days.nextMonthButton,
                                                            h.Class(
                                                                navButtonClassName
                                                            ),
                                                        ],
                                                        [
                                                            Icon.chevronRight(
                                                                "w-5 h-5"
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    ...days.grid,
                                                    h.Class(gridClassName),
                                                ],
                                                [
                                                    h.div(
                                                        [
                                                            ...days.headerRow,
                                                            h.Class(
                                                                headerRowClassName
                                                            ),
                                                        ],
                                                        days.columnHeaders.map(
                                                            (header) =>
                                                                h.div(
                                                                    [
                                                                        ...header.attributes,
                                                                        h.Class(
                                                                            columnHeaderClassName
                                                                        ),
                                                                    ],
                                                                    [
                                                                        header.name,
                                                                    ]
                                                                )
                                                        )
                                                    ),
                                                    ...days.weeks.map((week) =>
                                                        h.div(
                                                            [
                                                                ...week.attributes,
                                                                h.Class(
                                                                    weekRowClassName
                                                                ),
                                                            ],
                                                            week.cells.map(
                                                                (cell) =>
                                                                    h.div(
                                                                        [
                                                                            ...cell.cellAttributes,
                                                                            h.Class(
                                                                                cellClassName
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
                                                                                [
                                                                                    cell.label,
                                                                                ]
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
                                        [
                                            ...months.root,
                                            h.Class(containerClassName),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        `${headerClassName} justify-center`
                                                    ),
                                                ],
                                                [
                                                    h.button(
                                                        [
                                                            h.Id(
                                                                months.heading
                                                                    .id
                                                            ),
                                                            ...months.headingButton,
                                                            h.Class(
                                                                headingButtonClassName
                                                            ),
                                                        ],
                                                        [
                                                            months.heading.text,
                                                            Icon.chevronDown(
                                                                "w-3 h-3"
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    ...months.grid,
                                                    h.Class(
                                                        monthYearGridClassName
                                                    ),
                                                ],
                                                months.cells.map((cell) =>
                                                    h.div(
                                                        [
                                                            ...cell.cellAttributes,
                                                            h.Class(
                                                                monthYearCellClassName
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
                                                                [
                                                                    cell.shortLabel,
                                                                ]
                                                            ),
                                                        ]
                                                    )
                                                )
                                            ),
                                        ]
                                    ),
                                Years: (years) =>
                                    h.div(
                                        [
                                            ...years.root,
                                            h.Class(containerClassName),
                                        ],
                                        [
                                            h.div(
                                                [h.Class(headerClassName)],
                                                [
                                                    h.button(
                                                        [
                                                            ...years.previousPageButton,
                                                            h.Class(
                                                                navButtonClassName
                                                            ),
                                                        ],
                                                        [
                                                            Icon.chevronLeft(
                                                                "w-5 h-5"
                                                            ),
                                                        ]
                                                    ),
                                                    h.h2(
                                                        [
                                                            h.Id(
                                                                years.heading.id
                                                            ),
                                                            h.Class(
                                                                headingTextClassName
                                                            ),
                                                        ],
                                                        [years.heading.text]
                                                    ),
                                                    h.button(
                                                        [
                                                            ...years.nextPageButton,
                                                            h.Class(
                                                                navButtonClassName
                                                            ),
                                                        ],
                                                        [
                                                            Icon.chevronRight(
                                                                "w-5 h-5"
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    ...years.grid,
                                                    h.Class(
                                                        monthYearGridClassName
                                                    ),
                                                ],
                                                years.cells.map((cell) =>
                                                    h.div(
                                                        [
                                                            ...cell.cellAttributes,
                                                            h.Class(
                                                                monthYearCellClassName
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
                        ),
                },
                toParentMessage: (message) =>
                    toParentMessage(GotCalendarMessage({ message })),
            }),
        ]
    )
}
