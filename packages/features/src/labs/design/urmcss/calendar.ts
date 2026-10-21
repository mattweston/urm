import { Match as M } from "effect"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Icon from "../../_shared/icon.ts"
import { GotCalendarMessage, type Message } from "../../calendar/message.ts"
import type { Model } from "../../calendar/model.ts"

const container_class_name = "urmcss-calendar urmcss-preview"
const header_class_name = "urmcss-calendar-header"
const heading_button_class_name = "urmcss-calendar-heading"
const heading_text_class_name = "urmcss-calendar-title"
const nav_button_class_name = "urmcss-calendar-nav"
const grid_class_name = "urmcss-calendar-grid"
const header_row_class_name = "urmcss-calendar-week"
const column_header_class_name = "urmcss-calendar-weekday"
const week_row_class_name = "urmcss-calendar-week"
const cell_class_name = "urmcss-calendar-cell"
const day_button_class_name = "urmcss-calendar-day"
const month_year_grid_class_name = "urmcss-calendar-periods"
const month_year_cell_class_name = "urmcss-calendar-cell"
const month_year_button_class_name = "urmcss-calendar-period"

export const view = <ParentMessage>(
    model: Model,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [],
        [
            h.h3([h.Class("urmcss-calendar-title")], ["Calendar"]),
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
                                            h.Class(container_class_name),
                                        ],
                                        [
                                            h.div(
                                                [h.Class(header_class_name)],
                                                [
                                                    h.button(
                                                        [
                                                            ...days.previousMonthButton,
                                                            h.Class(
                                                                nav_button_class_name
                                                            ),
                                                        ],
                                                        [
                                                            Icon.chevronLeft(
                                                                "urmcss-calendar-icon"
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
                                                                heading_button_class_name
                                                            ),
                                                        ],
                                                        [
                                                            days.heading.text,
                                                            Icon.chevronDown(
                                                                "urmcss-calendar-icon"
                                                            ),
                                                        ]
                                                    ),
                                                    h.button(
                                                        [
                                                            ...days.nextMonthButton,
                                                            h.Class(
                                                                nav_button_class_name
                                                            ),
                                                        ],
                                                        [
                                                            Icon.chevronRight(
                                                                "urmcss-calendar-icon"
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    ...days.grid,
                                                    h.Class(grid_class_name),
                                                ],
                                                [
                                                    h.div(
                                                        [
                                                            ...days.headerRow,
                                                            h.Class(
                                                                header_row_class_name
                                                            ),
                                                        ],
                                                        days.columnHeaders.map(
                                                            (header) =>
                                                                h.div(
                                                                    [
                                                                        ...header.attributes,
                                                                        h.Class(
                                                                            column_header_class_name
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
                                                                    week_row_class_name
                                                                ),
                                                            ],
                                                            week.cells.map(
                                                                (cell) =>
                                                                    h.div(
                                                                        [
                                                                            ...cell.cellAttributes,
                                                                            h.Class(
                                                                                cell_class_name
                                                                            ),
                                                                        ],
                                                                        [
                                                                            h.button(
                                                                                [
                                                                                    ...cell.buttonAttributes,
                                                                                    h.Class(
                                                                                        day_button_class_name
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
                                            h.Class(container_class_name),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        `${header_class_name}`
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
                                                                heading_button_class_name
                                                            ),
                                                        ],
                                                        [
                                                            months.heading.text,
                                                            Icon.chevronDown(
                                                                "urmcss-calendar-icon"
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    ...months.grid,
                                                    h.Class(
                                                        month_year_grid_class_name
                                                    ),
                                                ],
                                                months.cells.map((cell) =>
                                                    h.div(
                                                        [
                                                            ...cell.cellAttributes,
                                                            h.Class(
                                                                month_year_cell_class_name
                                                            ),
                                                        ],
                                                        [
                                                            h.button(
                                                                [
                                                                    ...cell.buttonAttributes,
                                                                    h.Class(
                                                                        month_year_button_class_name
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
                                            h.Class(container_class_name),
                                        ],
                                        [
                                            h.div(
                                                [h.Class(header_class_name)],
                                                [
                                                    h.button(
                                                        [
                                                            ...years.previousPageButton,
                                                            h.Class(
                                                                nav_button_class_name
                                                            ),
                                                        ],
                                                        [
                                                            Icon.chevronLeft(
                                                                "urmcss-calendar-icon"
                                                            ),
                                                        ]
                                                    ),
                                                    h.h2(
                                                        [
                                                            h.Id(
                                                                years.heading.id
                                                            ),
                                                            h.Class(
                                                                heading_text_class_name
                                                            ),
                                                        ],
                                                        [years.heading.text]
                                                    ),
                                                    h.button(
                                                        [
                                                            ...years.nextPageButton,
                                                            h.Class(
                                                                nav_button_class_name
                                                            ),
                                                        ],
                                                        [
                                                            Icon.chevronRight(
                                                                "urmcss-calendar-icon"
                                                            ),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    ...years.grid,
                                                    h.Class(
                                                        month_year_grid_class_name
                                                    ),
                                                ],
                                                years.cells.map((cell) =>
                                                    h.div(
                                                        [
                                                            ...cell.cellAttributes,
                                                            h.Class(
                                                                month_year_cell_class_name
                                                            ),
                                                        ],
                                                        [
                                                            h.button(
                                                                [
                                                                    ...cell.buttonAttributes,
                                                                    h.Class(
                                                                        month_year_button_class_name
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
                    to_parent_message(GotCalendarMessage({ message })),
            }),
        ]
    )
}
