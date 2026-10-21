import { Equal, Option } from "effect"
import * as Ui from "@foldkit/ui"
import { type CalendarDate } from "foldkit/calendar"
import { Valid } from "foldkit/fieldValidation"
import { childAttributes, type Html, type HtmlBuilder } from "foldkit/html"

import * as PronounOption from "../domain/pronounOption.ts"
import * as PersonalInfo from "../step/personalInfo.ts"
import {
    backdropClassName,
    calendarView,
    panelClassName,
    triggerClassName,
    triggerContent,
} from "./datePicker.ts"
import { inputField } from "./field.ts"
import { chevronDown } from "./icon.ts"

const Listbox = Ui.Listbox.create<string>()

export const personalInfoView = <ParentMessage>(
    {
        firstName,
        lastName,
        email,
        phone,
        pronouns,
        maybeSelectedPronouns,
        customPronouns,
        portfolioUrl,
        availableDate,
        maybeAvailableDate,
    }: PersonalInfo.Model,
    toParentMessage: (message: PersonalInfo.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isOtherSelected = Option.exists(
        maybeSelectedPronouns,
        Equal.equals("Other")
    )

    const selectedPronounLabel = Option.getOrElse(
        maybeSelectedPronouns,
        () => "Select pronouns"
    )

    return h.div(
        [h.Class("space-y-4")],
        [
            h.div(
                [h.Class("grid grid-cols-2 gap-4")],
                [
                    inputField<ParentMessage>(
                        {
                            id: "first-name",
                            label: "First Name",
                            field: firstName,
                            onInput: (value) =>
                                toParentMessage(
                                    PersonalInfo.UpdatedFirstName({ value })
                                ),
                            placeholder: "Jane",
                        },
                        h
                    ),
                    inputField<ParentMessage>(
                        {
                            id: "last-name",
                            label: "Last Name",
                            field: lastName,
                            onInput: (value) =>
                                toParentMessage(
                                    PersonalInfo.UpdatedLastName({ value })
                                ),
                            placeholder: "Doe",
                        },
                        h
                    ),
                ]
            ),
            inputField<ParentMessage>(
                {
                    id: "email",
                    label: "Email",
                    field: email,
                    onInput: (value) =>
                        toParentMessage(PersonalInfo.UpdatedEmail({ value })),
                    type: "email",
                    placeholder: "jane@example.com",
                },
                h
            ),
            inputField<ParentMessage>(
                {
                    id: "phone",
                    label: "Phone (optional)",
                    field: phone,
                    onInput: (value) =>
                        toParentMessage(PersonalInfo.UpdatedPhone({ value })),
                    type: "tel",
                    placeholder: "+1 (555) 123-4567",
                },
                h
            ),
            h.div(
                [h.Class("space-y-1")],
                [
                    h.label(
                        [h.Class("block text-sm font-medium text-foreground")],
                        ["Pronouns (optional)"]
                    ),
                    h.submodel({
                        slotId: "pronouns",
                        model: pronouns,
                        view: Listbox.view,
                        viewInputs: {
                            maybeSelectedValue: maybeSelectedPronouns,
                            anchor: {
                                placement: "bottom-start",
                                gap: 4,
                                padding: 8,
                            },
                            items: PronounOption.all,
                            itemToConfig: (pronoun, { isSelected }) => ({
                                className:
                                    "px-3 py-2 text-sm cursor-pointer hover:bg-accent data-[active]:bg-accent border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]",
                                content: h.div(
                                    [h.Class("flex items-center gap-2")],
                                    [
                                        h.span(
                                            [
                                                h.Class(
                                                    `w-4 text-primary ${isSelected ? "visible" : "invisible"}`
                                                ),
                                            ],
                                            ["✓"]
                                        ),
                                        h.span([], [pronoun]),
                                    ]
                                ),
                            }),
                            buttonContent: h.div(
                                [
                                    h.Class(
                                        "flex w-full items-center justify-between gap-2"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                Option.isSome(
                                                    maybeSelectedPronouns
                                                )
                                                    ? "text-foreground"
                                                    : "text-muted-foreground"
                                            ),
                                        ],
                                        [selectedPronounLabel]
                                    ),
                                    h.span(
                                        [h.Class("text-muted-foreground")],
                                        [chevronDown("w-4 h-4")]
                                    ),
                                ]
                            ),
                            buttonAttributes: childAttributes([
                                h.Class(
                                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-ring"
                                ),
                            ]),
                            itemsAttributes: childAttributes([
                                h.Class(
                                    "w-(--button-width) rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card [box-shadow:var(--shadow-overlay)] overflow-hidden"
                                ),
                            ]),
                            backdropAttributes: childAttributes([
                                h.Class("fixed inset-0"),
                            ]),
                        },
                        toParentMessage: (message) =>
                            toParentMessage(
                                PersonalInfo.GotPronounsMessage({ message })
                            ),
                    }),
                ]
            ),
            ...(isOtherSelected
                ? [
                      inputField<ParentMessage>(
                          {
                              id: "custom-pronouns",
                              label: "Custom Pronouns",
                              field: Valid({ value: customPronouns }),
                              onInput: (value) =>
                                  toParentMessage(
                                      PersonalInfo.UpdatedCustomPronouns({
                                          value,
                                      })
                                  ),
                              placeholder: "Enter your pronouns",
                          },
                          h
                      ),
                  ]
                : []),
            inputField<ParentMessage>(
                {
                    id: "portfolio-url",
                    label: "Portfolio URL (optional)",
                    field: portfolioUrl,
                    onInput: (value) =>
                        toParentMessage(
                            PersonalInfo.UpdatedPortfolioUrl({ value })
                        ),
                    type: "url",
                },
                h
            ),
            availableDatePicker<ParentMessage>(
                availableDate,
                maybeAvailableDate,
                toParentMessage,
                h
            ),
        ]
    )
}

const availableDatePicker = <ParentMessage>(
    model: Ui.DatePicker.Model,
    maybeSelectedDate: Option.Option<CalendarDate>,
    toParentMessage: (message: PersonalInfo.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("space-y-1")],
        [
            h.label(
                [h.Class("block text-sm font-medium text-foreground")],
                ["Available Start Date (optional)"]
            ),
            h.submodel({
                slotId: "available-date",
                model,
                view: Ui.DatePicker.view,
                viewInputs: {
                    maybeSelectedDate,
                    anchor: { placement: "bottom-start", gap: 4, padding: 8 },
                    triggerContent: (maybeDate) =>
                        triggerContent(maybeDate, "Pick a date"),
                    triggerClassName,
                    panelClassName,
                    backdropClassName,
                    toCalendarView: calendarView,
                },
                toParentMessage: (message) =>
                    toParentMessage(
                        PersonalInfo.GotAvailableDateMessage({ message })
                    ),
            }),
        ]
    )
}
