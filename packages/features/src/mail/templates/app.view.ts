import { Array, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ClosedTemplatePreview,
    SelectedTemplateChanged,
    type Message,
} from "./app.message.ts"
import type { Model } from "./app.model.ts"
import { allTemplates, categories, templateById } from "./template-views.ts"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("min-h-screen bg-background text-foreground")],
        [
            h.main(
                [h.Class("mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-8")],
                [
                    h.div(
                        [h.Class("flex items-end justify-between gap-3")],
                        [
                            h.div(
                                [],
                                [
                                    h.h1(
                                        [
                                            h.Class(
                                                "text-3xl font-bold tracking-tight"
                                            ),
                                        ],
                                        ["Email Templates"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Browse and preview email template blocks.",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    Option.match(model.selectedTemplateId, {
                        onNone: () =>
                            templateGridView(h, model, toParentMessage),
                        onSome: (templateId) =>
                            templatePreviewView(
                                h,
                                model,
                                toParentMessage,
                                templateId
                            ),
                    }),
                ]
            ),
        ]
    )
}

const templateGridView = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>,
    _model: Model,
    toParentMessage: (message: Message) => ParentMessage
): Html => {
    return h.div(
        [h.Class("space-y-8")],
        categories.map((category) =>
            h.section(
                [],
                [
                    h.h2(
                        [h.Class("mb-4 text-lg font-semibold text-foreground")],
                        [category]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                            ),
                        ],
                        Array.filter(
                            allTemplates,
                            (template) => template.category === category
                        ).map((template) =>
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Class(
                                        "group flex flex-col items-start gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-left [box-shadow:var(--shadow-surface)] transition hover:border-primary hover:[box-shadow:var(--shadow-surface)]"
                                    ),
                                    h.OnClick(
                                        toParentMessage(
                                            SelectedTemplateChanged({
                                                templateId: template.id,
                                            })
                                        )
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "aspect-video w-full overflow-hidden rounded-[var(--radius-surface)] bg-muted"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex h-full w-full items-center justify-center text-xs text-muted-foreground opacity-60 transition group-hover:opacity-100"
                                                    ),
                                                ],
                                                [template.name]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("mt-1")],
                                        [
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-sm font-medium text-foreground"
                                                    ),
                                                ],
                                                [template.name]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                [template.category]
                                            ),
                                        ]
                                    ),
                                ]
                            )
                        )
                    ),
                ]
            )
        )
    )
}

const templatePreviewView = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>,
    _model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    templateId: string
): Html => {
    const foundTemplate = templateById(templateId)
    const maybeTemplate =
        foundTemplate !== null ? Option.some(foundTemplate) : Option.none()

    return h.div(
        [h.Class("space-y-4")],
        [
            h.div(
                [h.Class("flex items-center gap-3")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(
                                "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent [box-shadow:var(--shadow-control)]"
                            ),
                            h.OnClick(toParentMessage(ClosedTemplatePreview())),
                        ],
                        ["← Back"]
                    ),
                    Option.match(maybeTemplate, {
                        onNone: () =>
                            h.span(
                                [h.Class("text-sm text-muted-foreground")],
                                ["Template not found"]
                            ),
                        onSome: (template) =>
                            h.span(
                                [
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                [template.name]
                            ),
                    }),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                Option.match(maybeTemplate, {
                    onNone: () => [
                        h.p(
                            [h.Class("text-sm text-muted-foreground")],
                            ["Template not found."]
                        ),
                    ],
                    onSome: (template) => [template.view()],
                })
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                allTemplates.map((template) =>
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(
                                [
                                    "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border px-3 py-1.5 text-xs font-medium transition [box-shadow:var(--shadow-control)]",
                                    template.id === templateId
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border bg-card text-muted-foreground hover:bg-accent",
                                ].join(" ")
                            ),
                            h.OnClick(
                                toParentMessage(
                                    SelectedTemplateChanged({
                                        templateId: template.id,
                                    })
                                )
                            ),
                        ],
                        [template.name]
                    )
                )
            ),
        ]
    )
}
