import { Option } from "effect"
import * as Ui from "@foldkit/ui"
import { Valid } from "foldkit/fieldValidation"
import { childAttributes, type Html, type HtmlBuilder } from "foldkit/html"
import { Label } from "@urm/ui/foldkit/label.view.ts"
import {
    TextField,
    TextFieldInput,
    TextFieldTextArea,
} from "@urm/ui/foldkit/text-field.view.ts"
import { ReportAnIssue } from "@urm/ui/foldkit/report-an-issue.view.ts"
import type { Message } from "./report-an-issue.message.ts"
import {
    GotAreaListboxMessage,
    GotSecurityLevelListboxMessage,
    UpdatedArea,
    UpdatedDescription,
    UpdatedSecurityLevel,
    UpdatedSubject,
} from "./report-an-issue.message.ts"
import type { Model } from "./report-an-issue.model.ts"
import { IconCheck, IconChevronDown } from "@urm/ui/foldkit/icons/view.ts"

const areaOptions = ["Team", "Billing", "Accounts", "Deployments"]
const securityLevelOptions = [
    "Level 1(lowest)",
    "Level 2",
    "Level 3",
    "Level 4",
    "Level 5(💀)",
]

const selectClassName =
    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-4 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
const Listbox = Ui.Listbox.create<string>()

const inputFieldView = <ParentMessage>(
    id: string,
    label: string,
    value: string,
    onInput: (value: string) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return TextField({
        class: "grid gap-2",
        children: [
            Label({ for: id, children: [label] }),
            TextFieldInput(
                {
                    id,
                    field: Valid({ value }),
                    onInput,
                    placeholder: "I need help with...",
                    class: "w-full",
                },
                h
            ),
        ],
    })
}

const listboxFieldView = <ParentMessage>(
    id: string,
    label: string,
    value: string,
    model: Ui.Listbox.Model,
    options: ReadonlyArray<string>,
    toListboxMessage: (message: Ui.Listbox.Message) => ParentMessage,
    onSelectedItem: (selected: string) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("space-y-2")],
        [
            Label({ for: id, children: [label] }),
            h.submodel({
                slotId: model.id,
                model,
                view: Listbox.view,
                viewInputs: {
                    maybeSelectedValue: Option.some(value),
                    anchor: { placement: "bottom-start", gap: 4, padding: 8 },
                    items: options,
                    itemToConfig: (option, { isSelected }) => ({
                        className:
                            "px-3 py-2 text-sm cursor-pointer hover:bg-accent data-[active]:bg-accent border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]",
                        content: h.div(
                            [h.Class("flex items-center gap-2")],
                            [
                                h.span(
                                    [
                                        h.Class(
                                            isSelected
                                                ? "visible w-4 text-primary"
                                                : "invisible w-4"
                                        ),
                                    ],
                                    [IconCheck({ class: "w-4 h-4" })]
                                ),
                                h.span([], [option]),
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
                                        value === ""
                                            ? "text-muted-foreground"
                                            : "text-foreground"
                                    ),
                                ],
                                [value || `Select ${label.toLowerCase()}`]
                            ),
                            h.span(
                                [h.Class("text-muted-foreground shrink-0")],
                                [IconChevronDown({ class: "w-4 h-4" })]
                            ),
                        ]
                    ),
                    buttonClassName: selectClassName,
                    itemsClassName:
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] py-1 max-h-64 overflow-y-auto w-(--button-width)",
                    backdropClassName: "fixed inset-0",
                    buttonAttributes: childAttributes([
                        h.Class(selectClassName),
                    ]),
                    itemsAttributes: childAttributes([
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] py-1 max-h-64 overflow-y-auto w-(--button-width)"
                        ),
                    ]),
                    backdropAttributes: childAttributes([
                        h.Class("fixed inset-0"),
                    ]),
                },
                toParentMessage: (message) =>
                    message._tag === "SelectedItem"
                        ? onSelectedItem(message.item)
                        : toListboxMessage(message),
            }),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("max-w-3xl mx-auto")],
        [
            ReportAnIssue({
                areaField: listboxFieldView<ParentMessage>(
                    "area",
                    "Area",
                    model.area,
                    model.areaListbox,
                    areaOptions,
                    (message) =>
                        toParentMessage(GotAreaListboxMessage({ message })),
                    (selected) =>
                        toParentMessage(UpdatedArea({ value: selected })),
                    h
                ),
                securityLevelField: listboxFieldView<ParentMessage>(
                    "security-level",
                    "Security Level",
                    model.securityLevel,
                    model.securityLevelListbox,
                    securityLevelOptions,
                    (message) =>
                        toParentMessage(
                            GotSecurityLevelListboxMessage({ message })
                        ),
                    (selected) =>
                        toParentMessage(
                            UpdatedSecurityLevel({ value: selected })
                        ),
                    h
                ),
                subjectField: inputFieldView<ParentMessage>(
                    "subject",
                    "Subject",
                    model.subject,
                    (value) => toParentMessage(UpdatedSubject({ value })),
                    h
                ),
                descriptionField: TextField({
                    class: "grid gap-2",
                    children: [
                        Label({
                            for: "description",
                            children: ["Description"],
                        }),
                        TextFieldTextArea(
                            {
                                id: "description",
                                value: model.description,
                                onInput: (value) =>
                                    toParentMessage(
                                        UpdatedDescription({ value })
                                    ),
                                placeholder:
                                    "Please include all information relevant to your issue.",
                            },
                            h
                        ),
                    ],
                }),
            }),
        ]
    )
}
