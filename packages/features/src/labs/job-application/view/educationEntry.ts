import clsx from "clsx"
import { Array, Option } from "effect"
import * as Ui from "@foldkit/ui"
import { type CalendarDate } from "foldkit/calendar"
import { childAttributes, type Html, type HtmlBuilder } from "foldkit/html"

import * as Entry from "../step/education/entry.ts"
import { inputField } from "./field.ts"
import { chevronDown } from "./icon.ts"

const Listbox = Ui.Listbox.create<string>()

const GRADUATION_YEAR_WINDOW_SIZE = 30
const GRADUATION_YEAR_FORWARD_OFFSET = 6

const graduationYears = (today: CalendarDate): ReadonlyArray<string> =>
    Array.makeBy(GRADUATION_YEAR_WINDOW_SIZE, (index) =>
        String(today.year + GRADUATION_YEAR_FORWARD_OFFSET - index)
    )

export const educationEntryView = <ParentMessage>(
    model: Entry.Model,
    today: CalendarDate,
    toParentMessage: (message: Entry.Message) => ParentMessage,
    onRemove: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const showGraduationYear = !model.isCurrentlyEnrolled

    const graduationYearField = h.keyed("div")(
        `${model.id}-graduation-year`,
        [h.Class("space-y-1")],
        [
            h.label(
                [h.Class("block text-sm font-medium text-foreground")],
                ["Graduation Year"]
            ),
            h.submodel({
                slotId: `${model.id}-graduation-year`,
                model: model.graduationYearListbox,
                view: Listbox.view,
                viewInputs: {
                    // graduationYear is "" until one is chosen
                    maybeSelectedValue:
                        model.graduationYear === ""
                            ? Option.none()
                            : Option.some(model.graduationYear),
                    anchor: { placement: "bottom-start", gap: 4, padding: 8 },
                    items: graduationYears(today),
                    buttonContent: h.div(
                        [
                            h.Class(
                                "flex w-full items-center justify-between gap-2"
                            ),
                        ],
                        [
                            model.graduationYear
                                ? h.span([], [model.graduationYear])
                                : h.span(
                                      [h.Class("text-muted-foreground")],
                                      ["Select year"]
                                  ),
                            h.span(
                                [h.Class("text-muted-foreground shrink-0")],
                                [chevronDown()]
                            ),
                        ]
                    ),
                    buttonAttributes: childAttributes([
                        h.Class(
                            "w-full rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-sm text-left text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring [box-shadow:var(--shadow-control)]"
                        ),
                    ]),
                    itemsAttributes: childAttributes([
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] py-1 max-h-64 overflow-y-auto w-(--button-width)"
                        ),
                    ]),
                    itemToConfig: (year, { isActive, isSelected }) => ({
                        className: clsx(
                            "flex items-center gap-2 px-4 py-2 text-sm cursor-pointer [box-shadow:var(--shadow-control)]",
                            isActive && "bg-accent",
                            isSelected && "text-primary font-semibold"
                        ),
                        content: h.div(
                            [h.Class("flex items-center gap-2 w-full")],
                            [
                                isSelected
                                    ? h.span([], ["✓"])
                                    : h.span([h.Class("w-4")], []),
                                h.span([], [year]),
                            ]
                        ),
                    }),
                    backdropAttributes: childAttributes([
                        h.Class("fixed inset-0"),
                    ]),
                },
                toParentMessage: (message) =>
                    toParentMessage(
                        Entry.GotGraduationYearListboxMessage({ message })
                    ),
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
                            id: `${model.id}-school`,
                            label: "School",
                            field: model.school,
                            onInput: (value) =>
                                toParentMessage(Entry.UpdatedSchool({ value })),
                            placeholder: "e.g. MIT",
                        },
                        h
                    ),
                    inputField<ParentMessage>(
                        {
                            id: `${model.id}-degree`,
                            label: "Degree",
                            field: model.degree,
                            onInput: (value) =>
                                toParentMessage(Entry.UpdatedDegree({ value })),
                            placeholder: "e.g. Bachelor's, Master's",
                        },
                        h
                    ),
                ]
            ),
            inputField<ParentMessage>(
                {
                    id: `${model.id}-field`,
                    label: "Field of Study",
                    field: model.fieldOfStudy,
                    onInput: (value) =>
                        toParentMessage(Entry.UpdatedFieldOfStudy({ value })),
                    placeholder: "e.g. Computer Science",
                },
                h
            ),
            Ui.Checkbox.view(
                {
                    id: `${model.id}-enrolled`,
                    isChecked: model.isCurrentlyEnrolled,
                    onToggle: (isChecked) =>
                        toParentMessage(
                            Entry.ToggledIsCurrentlyEnrolled({ isChecked })
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
                                                model.isCurrentlyEnrolled
                                                    ? "border-primary bg-primary"
                                                    : "border-border"
                                            }`
                                        ),
                                    ],
                                    model.isCurrentlyEnrolled
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
                                    ["I’m currently enrolled"]
                                ),
                            ]
                        ),
                },
                h
            ),
            ...(showGraduationYear ? [graduationYearField] : []),
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
                        ["Remove education"]
                    ),
                ]
            ),
        ]
    )
}
