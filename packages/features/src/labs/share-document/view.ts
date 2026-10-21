import { Option } from "effect"
import * as Ui from "@foldkit/ui"
import { Valid } from "foldkit/fieldValidation"
import { childAttributes, type Html, type HtmlBuilder } from "foldkit/html"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@urm/ui/foldkit/avatar.view.ts"
import { Button } from "@urm/ui/foldkit/button/button.view.ts"
import { ShareDocument } from "@urm/ui/foldkit/share-document.view.ts"
import { TextField, TextFieldInput } from "@urm/ui/foldkit/text-field.view.ts"
import { IconCheck, IconChevronDown } from "@urm/ui/foldkit/icons/view.ts"
import type { Message } from "./share-document.message.ts"
import { GotPermissionListboxMessage } from "./share-document.message.ts"
import type { Model } from "./share-document.model.ts"

const permissionOptions = ["Can edit", "Can view"]
const PermissionListbox = Ui.Listbox.create<string>()

const permissionFieldView = <ParentMessage>(
    person: Model["people"][number],
    index: number,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("flex flex-wrap items-center justify-between gap-3")],
        [
            h.div(
                [h.Class("flex min-w-0 flex-1 basis-48 items-center gap-4")],
                [
                    Avatar({
                        children: [
                            AvatarImage({
                                src: person.avatarSrc,
                                alt: person.name,
                            }),
                            AvatarFallback({
                                children: [person.avatarFallback],
                            }),
                        ],
                    }),
                    h.div(
                        [h.Class("min-w-0 space-y-1 [overflow-wrap:anywhere]")],
                        [
                            h.p(
                                [h.Class("text-sm font-medium")],
                                [person.name]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [person.email]
                            ),
                        ]
                    ),
                ]
            ),
            h.submodel({
                slotId: person.permissionListbox.id,
                model: person.permissionListbox,
                view: PermissionListbox.view,
                viewInputs: {
                    attributes: childAttributes([
                        h.Class("min-w-0 max-w-full"),
                    ]),
                    maybeSelectedValue: Option.some(person.permission),
                    items: permissionOptions,
                    anchor: { placement: "bottom-end", gap: 4, padding: 8 },
                    itemToConfig: (item, { isSelected }) => ({
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
                                h.span([], [item]),
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
                                [h.Class("min-w-0 [overflow-wrap:anywhere]")],
                                [person.permission]
                            ),
                            h.span(
                                [h.Class("text-muted-foreground shrink-0")],
                                [IconChevronDown({ class: "w-4 h-4" })]
                            ),
                        ]
                    ),
                    buttonClassName:
                        "max-w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-start text-foreground outline-none focus:ring-2 focus:ring-ring",
                    itemsClassName:
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] py-1 w-(--button-width)",
                    backdropClassName: "fixed inset-0",
                    buttonAttributes: childAttributes([
                        h.Class(
                            "max-w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-sm text-start text-foreground outline-none focus:ring-2 focus:ring-ring"
                        ),
                    ]),
                    itemsAttributes: childAttributes([
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] py-1 w-(--button-width)"
                        ),
                    ]),
                    backdropAttributes: childAttributes([
                        h.Class("fixed inset-0"),
                    ]),
                },
                toParentMessage: (message) =>
                    toParentMessage(
                        GotPermissionListboxMessage({
                            personIndexId: index,
                            message,
                        })
                    ),
            }),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const linkField = TextField({
        children: [
            TextFieldInput(
                {
                    id: "share-link",
                    field: Valid({ value: model.link }),
                    readOnly: true,
                    class: "font-mono text-sm",
                },
                h
            ),
        ],
    })

    const copyButton = Button(
        {
            variant: "secondary",
            class: "shrink-0",
            children: ["Copy Link"],
        },
        h
    )

    return ShareDocument({
        linkField,
        copyButton,
        peopleRows: model.people.map((person, index) =>
            permissionFieldView(person, index, toParentMessage, h)
        ),
    })
}
