import * as Ui from "@foldkit/ui"
import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"

import { directory, file, FileTree } from "../../../labs/file-tree/file-tree.ts"
import { SelectedFocus, type Message } from "./message.ts"
import type { Focus, Model } from "./model.ts"

const card_class =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"

const heading = (
    eyebrow: string,
    title: string,
    body: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("space-y-2")],
        [
            h.p(
                [
                    h.Class(
                        "text-xs font-semibold tracking-widest text-muted-foreground uppercase"
                    ),
                ],
                [eyebrow]
            ),
            h.h2([h.Class("text-2xl font-semibold tracking-tight")], [title]),
            h.p(
                [h.Class("max-w-3xl text-sm leading-6 text-muted-foreground")],
                [body]
            ),
        ]
    )

const focus_button = (
    focus: Focus,
    label: string,
    current: Focus,
    h: HtmlBuilder<Message>
): Html =>
    Ui.Button.view(
        {
            onClick: SelectedFocus({ focus }),
            isDisabled: focus === current,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            focus === current
                                ? "rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                                : "rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const runtime_model_entries = (focus: Focus) => [
    directory(
        "App.Model",
        [
            directory(
                "content: Content.Model",
                [
                    directory(
                        "pages: Pages.Model",
                        [
                            file("route", {
                                comment:
                                    "Route/state owned by the Pages submodel",
                            }),
                        ],
                        {
                            highlighted: focus === "ownership",
                        }
                    ),
                    directory(
                        "documents: Documents.Model",
                        [file("route"), file("editor")],
                        {
                            highlighted:
                                focus === "ownership" || focus === "sidebar",
                        }
                    ),
                    directory(
                        "blog: Blog.Model",
                        [file("route"), file("posts")],
                        {
                            highlighted:
                                focus === "ownership" || focus === "sidebar",
                        }
                    ),
                ],
                {
                    highlighted: focus === "ownership" || focus === "sidebar",
                }
            ),
            directory(
                "mail: Mail.Model",
                [file("route"), file("inbox"), file("compose")],
                {
                    highlighted: focus === "ownership",
                }
            ),
            directory(
                "settings: Settings.Model",
                [
                    directory(
                        "navigation: Navigation.Model",
                        [
                            file("sidebar_order", {
                                comment:
                                    "Controls the visible sidebar projection",
                            }),
                            file("hidden_modules"),
                            file("enabled_modules"),
                        ],
                        {
                            highlighted: focus === "sidebar",
                        }
                    ),
                ],
                {
                    highlighted: focus === "sidebar",
                }
            ),
            directory(
                "labs: Labs.Model",
                [
                    directory(
                        "landing: Landing.Model",
                        [
                            file("…", {
                                comment: "Rendered with h.submodel(...)",
                            }),
                        ],
                        {
                            highlighted: focus === "messages",
                        }
                    ),
                    directory(
                        "mailroom: Mailroom.Model",
                        [
                            file("…", {
                                comment:
                                    "Child messages are wrapped as GotMailroomMessage",
                            }),
                        ],
                        {
                            highlighted: focus === "messages",
                        }
                    ),
                ],
                {
                    highlighted: focus === "messages",
                }
            ),
        ],
        { open: true }
    ),
]

const sidebar_entries = (focus: Focus) => [
    directory(
        "Sidebar",
        [
            directory(
                "Content",
                [
                    file("Documents", {
                        comment: "Navigation projection of Documents.Model",
                        highlighted: focus === "sidebar",
                    }),
                ],
                {
                    highlighted: focus === "sidebar",
                }
            ),
            directory(
                "Web",
                [
                    file("Blog", {
                        comment: "Navigation projection of Blog.Model",
                        highlighted: focus === "sidebar",
                    }),
                ],
                {
                    highlighted: focus === "sidebar",
                }
            ),
            file("Mail", {
                comment: "Top-level feature boundary",
                highlighted: focus === "sidebar",
            }),
            file("Settings", {
                comment: "Always available in navigation",
                highlighted: focus === "sidebar",
            }),
        ],
        { open: true }
    ),
]

const ownership_explanation = (h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class(card_class)],
        [
            h.h3([h.Class("font-semibold")], ["1. The Model is a tree"]),
            h.p(
                [h.Class("mt-2 text-sm leading-6 text-muted-foreground")],
                [
                    "URM keeps feature state in nested Models. A parent owns each child Model as a field. That makes feature ownership visible in the type itself instead of hiding state behind global stores.",
                ]
            ),
            h.pre(
                [
                    h.Class(
                        "mt-4 overflow-x-auto rounded-md bg-muted p-4 text-xs leading-6"
                    ),
                ],
                [
                    `const Model = S.Struct({
    content: Content.Model,
    mail: Mail.Model,
    settings: Settings.Model,
    labs: Labs.Model,
})`,
                ]
            ),
        ]
    )

const messages_explanation = (h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class(card_class)],
        [
            h.h3(
                [h.Class("font-semibold")],
                ["2. Messages cross the same boundary"]
            ),
            h.p(
                [h.Class("mt-2 text-sm leading-6 text-muted-foreground")],
                [
                    "The parent wraps child Messages, delegates to the child update, stores the returned child Model, and maps child Commands back into the parent Message type.",
                ]
            ),
            h.pre(
                [
                    h.Class(
                        "mt-4 overflow-x-auto rounded-md bg-muted p-4 text-xs leading-6"
                    ),
                ],
                [
                    `GotMailroomMessage: ({ message }) => {
    const [mailroom, commands] =
        Mailroom.update(model.mailroom, message)

    return [
        evo(model, { mailroom: () => mailroom }),
        Command.mapMessages(commands, (message) =>
            GotMailroomMessage({ message })
        ),
    ]
}`,
                ]
            ),
            h.p(
                [h.Class("mt-4 text-sm leading-6 text-muted-foreground")],
                [
                    "Views preserve the same shape: h.submodel(...) receives the child Model and maps its Messages back to the parent.",
                ]
            ),
            h.pre(
                [
                    h.Class(
                        "mt-4 overflow-x-auto rounded-md bg-muted p-4 text-xs leading-6"
                    ),
                ],
                [
                    `h.submodel({
    slotId: "labs-mail-inbox",
    model: model.mailroom,
    view: Mailroom.view,
    toParentMessage: (message) =>
        GotMailroomMessage({ message }),
})`,
                ]
            ),
        ]
    )

const sidebar_explanation = (h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class(card_class)],
        [
            h.h3(
                [h.Class("font-semibold")],
                ["3. The sidebar mirrors the feature tree"]
            ),
            h.p(
                [h.Class("mt-2 text-sm leading-6 text-muted-foreground")],
                [
                    "The sidebar is a user-facing projection of the same module boundaries. It is not literally generated from Model fields, but the hierarchy intentionally mirrors feature ownership: Content contains Documents, Web contains Blog, while Mail and Settings are top-level modules.",
                ]
            ),
            h.div(
                [
                    h.Class(
                        "mt-4 rounded-md border border-border bg-muted/40 p-4 text-sm"
                    ),
                ],
                [
                    h.p([h.Class("font-medium")], ["Important distinction"]),
                    h.p(
                        [h.Class("mt-1 text-muted-foreground")],
                        [
                            "Model tree = runtime ownership. Sidebar tree = navigation projection. They should stay conceptually aligned even when labels or nesting differ.",
                        ]
                    ),
                ]
            ),
        ]
    )

const current_explanation = (focus: Focus, h: HtmlBuilder<Message>): Html => {
    switch (focus) {
        case "ownership":
            return ownership_explanation(h)
        case "messages":
            return messages_explanation(h)
        case "sidebar":
            return sidebar_explanation(h)
    }
}

const view_content = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [
            h.Class(
                "mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8"
            ),
        ],
        [
            heading(
                "URM architecture",
                "Model tree → Submodels → Sidebar tree",
                "A visual guide to how URM composes feature Models, routes child Messages through parent boundaries, renders children with Foldkit submodels, and mirrors those same feature boundaries in navigation.",
                h
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    focus_button(
                        "ownership",
                        "Model ownership",
                        model.focus,
                        h
                    ),
                    focus_button("messages", "Message flow", model.focus, h),
                    focus_button("sidebar", "Sidebar mirror", model.focus, h),
                ]
            ),
            h.div(
                [h.Class("grid gap-6 lg:grid-cols-2")],
                [
                    h.section(
                        [h.Class("space-y-3")],
                        [
                            h.div(
                                [h.Class("space-y-1")],
                                [
                                    h.h3(
                                        [h.Class("font-semibold")],
                                        ["Runtime Model tree"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Parent Models own child Models. Expand the tree to inspect feature boundaries.",
                                        ]
                                    ),
                                ]
                            ),
                            FileTree({
                                label: "URM runtime model tree",
                                entries: runtime_model_entries(model.focus),
                            }),
                        ]
                    ),
                    h.section(
                        [h.Class("space-y-3")],
                        [
                            h.div(
                                [h.Class("space-y-1")],
                                [
                                    h.h3(
                                        [h.Class("font-semibold")],
                                        ["Sidebar tree"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "The navigation hierarchy is the user-facing projection of those feature boundaries.",
                                        ]
                                    ),
                                ]
                            ),
                            FileTree({
                                label: "URM sidebar tree",
                                entries: sidebar_entries(model.focus),
                            }),
                        ]
                    ),
                ]
            ),
            current_explanation(model.focus, h),
            h.div(
                [h.Class("grid gap-4 md:grid-cols-3")],
                [
                    h.div(
                        [h.Class(card_class)],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-semibold tracking-widest text-muted-foreground uppercase"
                                    ),
                                ],
                                ["Model"]
                            ),
                            h.p(
                                [h.Class("mt-2 text-sm leading-6")],
                                [
                                    "Owns state. A parent Model contains child Models as normal typed fields.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class(card_class)],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-semibold tracking-widest text-muted-foreground uppercase"
                                    ),
                                ],
                                ["Submodel"]
                            ),
                            h.p(
                                [h.Class("mt-2 text-sm leading-6")],
                                [
                                    "Defines the rendering/message boundary for a child Model without giving up the single parent update loop.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class(card_class)],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-semibold tracking-widest text-muted-foreground uppercase"
                                    ),
                                ],
                                ["Sidebar"]
                            ),
                            h.p(
                                [h.Class("mt-2 text-sm leading-6")],
                                [
                                    "Mirrors the same module ownership as navigation, while allowing labels, ordering, nesting, and visibility preferences.",
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

export const view = Submodel.defineView<Model, Message>(view_content)
