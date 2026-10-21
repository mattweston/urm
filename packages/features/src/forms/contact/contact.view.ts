import { Array, Match as M } from "effect"
import { Submodel } from "foldkit"
import type { Field } from "foldkit/fieldValidation"
import type { Html, HtmlBuilder } from "foldkit/html"
import { Button } from "@urm/ui/foldkit/button/button.view.ts"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@urm/ui/foldkit/card.view.ts"
import {
    TextField,
    TextFieldInput,
    TextFieldLabel,
    TextFieldTextArea,
} from "@urm/ui/foldkit/text-field.view.ts"
import {
    ChangedEmail,
    ChangedMessage,
    ChangedName,
    SubmittedContactForm,
    type Message,
} from "./contact.message.ts"
import type { Model } from "./contact.model.ts"

const field_error = <ParentMessage>(
    field: Field<string>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    M.value(field).pipe(
        M.tagsExhaustive({
            NotValidated: () => h.empty,
            Validating: () => h.empty,
            Valid: () => h.empty,
            Invalid: ({ errors }) =>
                h.p(
                    [h.Class("text-sm text-destructive"), h.Role("alert")],
                    [Array.headNonEmpty(errors)]
                ),
        })
    )

const contact_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.main(
        [
            h.Class(
                "min-h-full bg-background px-4 py-8 text-foreground sm:py-12"
            ),
        ],
        [
            Card({
                class: "mx-auto w-full max-w-xl",
                children: [
                    CardHeader({
                        children: [
                            CardTitle({
                                class: "text-2xl",
                                children: ["Contact Sarene Creole Cuisine"],
                            }),
                            CardDescription({
                                children: [
                                    "Send us a message and we will get back to you when our contact service is connected.",
                                ],
                            }),
                        ],
                    }),
                    CardContent({
                        children: [
                            h.form(
                                [
                                    h.Class("grid gap-5"),
                                    h.OnSubmit(SubmittedContactForm()),
                                ],
                                [
                                    TextField({
                                        class: "gap-2",
                                        children: [
                                            TextFieldLabel({
                                                for: "contact-name",
                                                children: ["Name"],
                                            }),
                                            TextFieldInput(
                                                {
                                                    id: "contact-name",
                                                    field: model.name,
                                                    onInput: (value) =>
                                                        ChangedName({ value }),
                                                    autocomplete: "name",
                                                    placeholder: "Your name",
                                                },
                                                h
                                            ),
                                            field_error(model.name, h),
                                        ],
                                    }),
                                    TextField({
                                        class: "gap-2",
                                        children: [
                                            TextFieldLabel({
                                                for: "contact-email",
                                                children: ["Email"],
                                            }),
                                            TextFieldInput(
                                                {
                                                    id: "contact-email",
                                                    field: model.email,
                                                    type: "email",
                                                    onInput: (value) =>
                                                        ChangedEmail({ value }),
                                                    autocomplete: "email",
                                                    placeholder:
                                                        "you@example.com",
                                                },
                                                h
                                            ),
                                            field_error(model.email, h),
                                        ],
                                    }),
                                    TextField({
                                        class: "gap-2",
                                        children: [
                                            TextFieldLabel({
                                                for: "contact-message",
                                                children: ["Message"],
                                            }),
                                            TextFieldTextArea(
                                                {
                                                    id: "contact-message",
                                                    value: model.message.value,
                                                    onInput: (value) =>
                                                        ChangedMessage({
                                                            value,
                                                        }),
                                                    placeholder:
                                                        "How can we help?",
                                                    class:
                                                        model.message._tag ===
                                                        "Invalid"
                                                            ? "border-destructive"
                                                            : "border-input",
                                                },
                                                h
                                            ),
                                            field_error(model.message, h),
                                        ],
                                    }),
                                    Button(
                                        {
                                            type: "submit",
                                            class: "w-full sm:w-auto",
                                            children: ["Prepare message"],
                                        },
                                        h
                                    ),
                                    model.ready_for_backend
                                        ? h.p(
                                              [
                                                  h.Class(
                                                      "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-accent p-3 text-sm text-accent-foreground"
                                                  ),
                                                  h.Role("status"),
                                              ],
                                              [
                                                  "Message is ready. Sending will be available when the backend is connected.",
                                              ]
                                          )
                                        : h.empty,
                                ]
                            ),
                        ],
                    }),
                ],
            }),
        ]
    )

export const view = Submodel.defineView<Model, Message>(contact_view)
