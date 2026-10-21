import * as Ui from "@foldkit/ui"
import { type Html, type HtmlBuilder } from "foldkit/html"

import * as Entry from "../step/workHistory/entry.ts"
import {
    backdropClassName,
    calendarView,
    panelClassName,
    triggerClassName,
    triggerContent,
} from "./datePicker.ts"
import { inputField, textareaField } from "./field.ts"

const ANCHOR: Ui.DatePicker.ViewInputs["anchor"] = {
    placement: "bottom-start",
    gap: 4,
    padding: 8,
}

export const workEntryView = <ParentMessage>(
    model: Entry.Model,
    toParentMessage: (message: Entry.Message) => ParentMessage,
    onRemove: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const showEndDate = !model.isCurrentlyEmployed

    const startDatePicker = h.keyed("div")(
        `${model.id}-start-date`,
        [h.Class("space-y-1")],
        [
            h.label(
                [h.Class("block text-sm font-medium text-foreground")],
                ["Start Date"]
            ),
            h.submodel({
                slotId: `${model.id}-start-date`,
                model: model.startDate,
                view: Ui.DatePicker.view,
                viewInputs: {
                    maybeSelectedDate: model.maybeStartDate,
                    anchor: ANCHOR,
                    triggerContent: (maybeDate) =>
                        triggerContent(maybeDate, "Select start date"),
                    toCalendarView: calendarView,
                    triggerClassName,
                    panelClassName,
                    backdropClassName,
                },
                toParentMessage: (message) =>
                    toParentMessage(Entry.GotStartDateMessage({ message })),
            }),
        ]
    )

    const endDatePicker = h.keyed("div")(
        `${model.id}-end-date`,
        [h.Class("space-y-1")],
        [
            h.label(
                [h.Class("block text-sm font-medium text-foreground")],
                ["End Date"]
            ),
            h.submodel({
                slotId: `${model.id}-end-date`,
                model: model.endDate,
                view: Ui.DatePicker.view,
                viewInputs: {
                    maybeSelectedDate: model.maybeEndDate,
                    anchor: ANCHOR,
                    triggerContent: (maybeDate) =>
                        triggerContent(maybeDate, "Select end date"),
                    toCalendarView: calendarView,
                    triggerClassName,
                    panelClassName,
                    backdropClassName,
                },
                toParentMessage: (message) =>
                    toParentMessage(Entry.GotEndDateMessage({ message })),
            }),
        ]
    )

    return h.keyed("div")(
        model.id,
        [h.Class("py-6 space-y-4 first:pt-0")],
        [
            h.div(
                [h.Class("grid grid-cols-2 gap-3")],
                [
                    inputField<ParentMessage>(
                        {
                            id: `${model.id}-company`,
                            label: "Company",
                            field: model.company,
                            onInput: (value) =>
                                toParentMessage(
                                    Entry.UpdatedCompany({ value })
                                ),
                            placeholder: "e.g. Acme Corp",
                        },
                        h
                    ),
                    inputField<ParentMessage>(
                        {
                            id: `${model.id}-title`,
                            label: "Job Title",
                            field: model.title,
                            onInput: (value) =>
                                toParentMessage(Entry.UpdatedTitle({ value })),
                            placeholder: "e.g. Senior Engineer",
                        },
                        h
                    ),
                ]
            ),
            h.div(
                [h.Class("grid grid-cols-2 gap-3")],
                [startDatePicker, ...(showEndDate ? [endDatePicker] : [])]
            ),
            Ui.Checkbox.view(
                {
                    id: `${model.id}-current`,
                    isChecked: model.isCurrentlyEmployed,
                    onToggle: (isChecked) =>
                        toParentMessage(
                            Entry.ToggledIsCurrentlyEmployed({ isChecked })
                        ),
                    toView: (attributes) =>
                        h.div(
                            [h.Class("flex items-center gap-2")],
                            [
                                h.div(
                                    [
                                        ...attributes.checkbox,
                                        h.Class(
                                            `flex h-4 w-4 items-center justify-center rounded border transition cursor-pointer ${
                                                model.isCurrentlyEmployed
                                                    ? "border-primary bg-primary"
                                                    : "border-border"
                                            }`
                                        ),
                                    ],
                                    model.isCurrentlyEmployed
                                        ? [
                                              h.span(
                                                  [
                                                      h.Class(
                                                          "text-primary-foreground text-xs"
                                                      ),
                                                  ],
                                                  ["✓"]
                                              ),
                                          ]
                                        : []
                                ),
                                h.label(
                                    [
                                        ...attributes.label,
                                        h.Class(
                                            "text-sm text-foreground select-none cursor-pointer"
                                        ),
                                    ],
                                    ["I currently work here"]
                                ),
                            ]
                        ),
                },
                h
            ),
            textareaField<ParentMessage>(
                {
                    id: `${model.id}-description`,
                    label: "Description",
                    value: model.description,
                    onInput: (value) =>
                        toParentMessage(Entry.UpdatedDescription({ value })),
                    rows: 3,
                    placeholder:
                        "Describe your role and key accomplishments...",
                },
                h
            ),
            h.div(
                [h.Class("flex justify-end")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(onRemove),
                            h.Class(
                                "text-sm text-muted-foreground hover:text-destructive transition cursor-pointer"
                            ),
                        ],
                        ["Remove position"]
                    ),
                ]
            ),
        ]
    )
}
