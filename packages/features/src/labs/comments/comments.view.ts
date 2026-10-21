import * as Ui from "@foldkit/ui"
import clsx from "clsx"
import { Array, DateTime, Match as M } from "effect"
import type { Field } from "foldkit/fieldValidation"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"

import type { Comment } from "./comment.ts"
import {
    ClickedDeleteComment,
    SubmittedCommentForm,
    UpdatedCommentAuthor,
    UpdatedCommentContent,
    type Message,
} from "./comments.message.ts"
import type { Model } from "./comments.model.ts"

const fieldClass = (field: Field<string>): string =>
    clsx("border-input focus:border-ring", {
        "border-destructive": field._tag === "Invalid",
    })

const descriptionView = <ParentMessage>(
    field: Field<string>,
    attributes: ReadonlyArray<Attribute<ParentMessage>>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    M.value(field).pipe(
        M.tagsExhaustive({
            NotValidated: () => h.span(attributes, []),
            Validating: () => h.span(attributes, []),
            Valid: () => h.span(attributes, []),
            Invalid: ({ errors }) =>
                h.span(
                    [
                        ...attributes,
                        h.Role("alert"),
                        h.Class("text-sm text-destructive"),
                    ],
                    [Array.headNonEmpty(errors)]
                ),
        })
    )

const authorFieldView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Input.view(
        {
            id: "comments-author",
            value: model.author.value,
            onInput: (value) =>
                toParentMessage(UpdatedCommentAuthor({ value })),
            isInvalid: model.author._tag === "Invalid",
            placeholder: "Your name",
            toView: (attributes) =>
                h.div(
                    [h.Class("flex flex-col gap-2")],
                    [
                        h.label(
                            [
                                ...attributes.label,
                                h.Class("text-sm font-medium text-foreground"),
                            ],
                            ["Name"]
                        ),
                        h.input([
                            ...attributes.input,
                            h.AriaRequired(true),
                            h.Class(
                                clsx(
                                    "w-full rounded-[var(--radius-control)] border-(length:--field-border-width) bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring",
                                    fieldClass(model.author)
                                )
                            ),
                        ]),
                        descriptionView(
                            model.author,
                            attributes.description,
                            h
                        ),
                    ]
                ),
        },
        h
    )

const contentFieldView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Textarea.view(
        {
            id: "comments-content",
            value: model.content.value,
            onInput: (value) =>
                toParentMessage(UpdatedCommentContent({ value })),
            isInvalid: model.content._tag === "Invalid",
            placeholder: "Your comment",
            rows: 4,
            toView: (attributes) =>
                h.div(
                    [h.Class("flex flex-col gap-2")],
                    [
                        h.label(
                            [
                                ...attributes.label,
                                h.Class("text-sm font-medium text-foreground"),
                            ],
                            ["Comment"]
                        ),
                        h.textarea([
                            ...attributes.textarea,
                            h.AriaRequired(true),
                            h.Class(
                                clsx(
                                    "w-full resize-y rounded-[var(--radius-control)] border-(length:--field-border-width) bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring",
                                    fieldClass(model.content)
                                )
                            ),
                        ]),
                        descriptionView(
                            model.content,
                            attributes.description,
                            h
                        ),
                    ]
                ),
        },
        h
    )

const commentView = <ParentMessage>(
    comment: Comment,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("li")(
        comment.id,
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border border-l-4 border-l-primary bg-card p-4 text-card-foreground"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-start justify-between gap-4")],
                [
                    h.div(
                        [h.Class("min-w-0")],
                        [
                            h.p(
                                [h.Class("whitespace-pre-wrap break-words")],
                                [comment.content]
                            ),
                            h.footer(
                                [h.Class("mt-3 flex flex-col gap-1")],
                                [
                                    h.cite(
                                        [
                                            h.Class(
                                                "font-medium not-italic text-foreground"
                                            ),
                                        ],
                                        [`— ${comment.author}`]
                                    ),
                                    h.time(
                                        [
                                            h.Class(
                                                "text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            DateTime.format(
                                                DateTime.makeUnsafe(
                                                    comment.created_at
                                                ),
                                                {
                                                    locale: "en-US",
                                                    dateStyle: "medium",
                                                    timeStyle: "short",
                                                }
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    Ui.Button.view(
                        {
                            onClick: toParentMessage(
                                ClickedDeleteComment({ id: comment.id })
                            ),
                            toView: (attributes) =>
                                h.button(
                                    [
                                        ...attributes.button,
                                        h.AriaLabel(
                                            `Delete comment by ${comment.author}`
                                        ),
                                        h.Class(
                                            "rounded-[var(--radius-control)] bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                        ),
                                    ],
                                    ["Delete"]
                                ),
                        },
                        h
                    ),
                ]
            ),
        ]
    )

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
        [h.Class("mx-auto flex w-full max-w-2xl flex-col gap-8 p-6 py-10")],
        [
            h.header(
                [h.Class("flex flex-col gap-2")],
                [
                    h.h1(
                        [h.Class("text-3xl font-bold tracking-tight")],
                        ["Comments"]
                    ),
                    h.p(
                        [h.Class("text-muted-foreground")],
                        [
                            "Add and remove comments kept in this browser session.",
                        ]
                    ),
                ]
            ),
            h.form(
                [
                    h.Class(
                        "flex flex-col gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 [box-shadow:var(--shadow-surface)]"
                    ),
                    h.OnSubmit(toParentMessage(SubmittedCommentForm())),
                    h.Role("form"),
                    h.AriaLabel("Add comment"),
                ],
                [
                    authorFieldView(model, toParentMessage, h),
                    contentFieldView(model, toParentMessage, h),
                    Ui.Button.view(
                        {
                            type: "submit",
                            isDisabled: model.submission._tag === "Creating",
                            toView: (attributes) =>
                                h.button(
                                    [
                                        ...attributes.button,
                                        h.Class(
                                            "w-fit rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground [box-shadow:var(--shadow-primary)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
                                        ),
                                    ],
                                    [
                                        model.submission._tag === "Creating"
                                            ? "Submitting..."
                                            : "Submit",
                                    ]
                                ),
                        },
                        h
                    ),
                ]
            ),
            Array.match(model.comments, {
                onEmpty: () =>
                    h.p(
                        [h.Class("text-muted-foreground")],
                        ["No comments yet."]
                    ),
                onNonEmpty: (comments) =>
                    h.ul(
                        [h.Class("flex flex-col gap-4")],
                        Array.map(comments, (comment) =>
                            commentView(comment, toParentMessage, h)
                        )
                    ),
            }),
        ]
    )
