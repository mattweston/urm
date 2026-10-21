/** # Form view */
import { Array, Match as M } from "effect"
import * as Ui from "@foldkit/ui"
import { allValid, makeRules, Rule } from "foldkit/fieldValidation"
import type { Field } from "foldkit/fieldValidation"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"
import {
    ClickedFormSubmit,
    UpdatedEmail,
    UpdatedMessage,
    UpdatedName,
    type Message,
} from "./form.message.ts"
import type { Model } from "./form.model.ts"

const LABEL_CLASS = "text-sm font-medium text-foreground"
const DESCRIPTION_CLASS = "text-sm mt-1 text-muted-foreground"

const nameRules = makeRules({
    rules: [Rule.minLength(2, "Name must be at least 2 characters")],
})

const emailRules = makeRules({
    required: "Email is required",
    rules: [Rule.email("Please enter a valid email address")],
})

const isFormValid = (model: Model): boolean =>
    allValid([
        [model.name, nameRules],
        [model.email, emailRules],
    ])

const borderClass = (field: Field<string>): string =>
    M.value(field).pipe(
        M.tagsExhaustive({
            NotValidated: () => "border-input",
            Validating: () => "border-primary",
            Valid: () => "border-primary",
            Invalid: () => "border-destructive",
        })
    )

const inputClassName = (field: Field<string>): string =>
    `w-full px-3 py-2 border-(length:--field-border-width) rounded-[var(--radius-control)] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${borderClass(field)}`

const statusIndicator = <ParentMessage>(
    field: Field<string>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return M.value(field).pipe(
        M.tagsExhaustive({
            NotValidated: () => h.empty,
            Validating: () =>
                h.span([h.Class("text-primary text-sm")], ["..."]),
            Valid: () => h.span([h.Class("text-primary text-sm")], ["OK"]),
            Invalid: () => h.empty,
        })
    )
}

const descriptionView = <ParentMessage>(
    field: Field<string>,
    descriptionAttributes: ReadonlyArray<Attribute<ParentMessage>>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return M.value(field).pipe(
        M.tagsExhaustive({
            NotValidated: () => h.empty,
            Validating: () =>
                h.span(
                    [...descriptionAttributes, h.Class(`${DESCRIPTION_CLASS}`)],
                    ["Checking..."]
                ),
            Valid: () => h.empty,
            Invalid: ({ errors }) =>
                h.span(
                    [
                        ...descriptionAttributes,
                        h.Class(`${DESCRIPTION_CLASS} text-destructive`),
                    ],
                    [Array.headNonEmpty(errors)]
                ),
        })
    )
}

const inputFieldView = <ParentMessage>(
    id: string,
    labelText: string,
    field: Field<string>,
    onUpdate: (value: string) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    type: string = "text"
): Html => {
    return Ui.Input.view(
        {
            id,
            value: field.value,
            onInput: onUpdate,
            isInvalid: field._tag === "Invalid",
            type,
            toView: (attributes) =>
                h.div(
                    [h.Class("mb-4")],
                    [
                        h.div(
                            [h.Class("flex items-center gap-2 mb-2")],
                            [
                                h.label(
                                    [...attributes.label, h.Class(LABEL_CLASS)],
                                    [labelText]
                                ),
                                statusIndicator<ParentMessage>(field, h),
                            ]
                        ),
                        h.input([
                            ...attributes.input,
                            h.Class(inputClassName(field)),
                        ]),
                        descriptionView<ParentMessage>(
                            field,
                            attributes.description,
                            h
                        ),
                    ]
                ),
        },
        h
    )
}

const textareaFieldView = <ParentMessage>(
    id: string,
    labelText: string,
    field: Field<string>,
    onUpdate: (value: string) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return Ui.Textarea.view(
        {
            id,
            value: field.value,
            onInput: onUpdate,
            isInvalid: field._tag === "Invalid",
            toView: (attributes) =>
                h.div(
                    [h.Class("mb-4")],
                    [
                        h.div(
                            [h.Class("flex items-center gap-2 mb-2")],
                            [
                                h.label(
                                    [...attributes.label, h.Class(LABEL_CLASS)],
                                    [labelText]
                                ),
                                statusIndicator<ParentMessage>(field, h),
                            ]
                        ),
                        h.textarea([
                            ...attributes.textarea,
                            h.Class(inputClassName(field)),
                        ]),
                        descriptionView<ParentMessage>(
                            field,
                            attributes.description,
                            h
                        ),
                    ]
                ),
        },
        h
    )
}

/**
 * Edit and submit the account form to see field validation, touched state, and
 * submission feedback. The model keeps raw values and validation state explicit
 * throughout the update loop.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const canSubmit =
        isFormValid(model) && model.submission._tag !== "Submitting"

    return h.div(
        [h.Class("min-h-screen bg-background py-8 text-foreground")],
        [
            h.div(
                [
                    h.Class(
                        "max-w-md mx-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-overlay)]"
                    ),
                ],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold text-foreground text-center mb-8"
                            ),
                        ],
                        ["Join Our Waitlist"]
                    ),
                    h.form(
                        [
                            h.Class("space-y-4"),
                            h.OnSubmit(toParentMessage(ClickedFormSubmit())),
                            h.Role("form"),
                        ],
                        [
                            inputFieldView<ParentMessage>(
                                "form-name",
                                "Name",
                                model.name,
                                (value) =>
                                    toParentMessage(UpdatedName({ value })),
                                h
                            ),
                            inputFieldView<ParentMessage>(
                                "form-email",
                                "Email",
                                model.email,
                                (value) =>
                                    toParentMessage(UpdatedEmail({ value })),
                                h,
                                "email"
                            ),
                            textareaFieldView<ParentMessage>(
                                "form-message",
                                "Anything you'd like to share with us?",
                                model.message,
                                (value) =>
                                    toParentMessage(UpdatedMessage({ value })),
                                h
                            ),
                            h.button(
                                [
                                    h.Type("submit"),
                                    h.Disabled(!canSubmit),
                                    h.Class(
                                        canSubmit
                                            ? "w-full py-2 px-4 rounded-[var(--radius-control)] transition bg-primary text-primary-foreground hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                            : "w-full py-2 px-4 rounded-[var(--radius-surface)] transition bg-muted text-muted-foreground cursor-not-allowed"
                                    ),
                                ],
                                [
                                    model.submission._tag === "Submitting"
                                        ? "Joining..."
                                        : "Join Waitlist",
                                ]
                            ),
                        ]
                    ),
                    M.value(model.submission).pipe(
                        M.tagsExhaustive({
                            NotSubmitted: () => h.empty,
                            Submitting: () => h.empty,
                            SubmitSuccess: ({ message }) =>
                                h.div(
                                    [
                                        h.Role("status"),
                                        h.Class(
                                            "mt-4 p-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-accent text-accent-foreground"
                                        ),
                                    ],
                                    [message]
                                ),
                            SubmitError: ({ error }) =>
                                h.div(
                                    [
                                        h.Role("alert"),
                                        h.Class(
                                            "mt-4 p-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-destructive/10 text-destructive"
                                        ),
                                    ],
                                    [error]
                                ),
                        })
                    ),
                ]
            ),
        ]
    )
}
