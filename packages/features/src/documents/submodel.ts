import { Effect, Match as M, Option, Schema as S, Stream } from "effect"
import { Command, Navigation, Submodel, Subscription } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { DragAndDrop } from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

import { RichTextContent } from "@urm/domain/schemas/rich-text"
import {
    ContentTemplateDescription,
    ContentTemplateName,
    ContentTemplateSource,
    ContentTemplateTags,
} from "@urm/domain/schemas/content-templates"
import { Button } from "@urm/ui/foldkit/button/button.view.ts"
import {
    initRichTextEditor,
    richTextEditorPlainText,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.model.ts"
import {
    GotRichTextDragAndDropMessage,
    RichTextEditorMessage,
    RichTextEditorModel,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"
import { richTextEditorSubscriptions } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.subscriptions.ts"
import { updateRichTextEditor } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.update.ts"
import {
    RichTextEditor,
    type LinkSuggestion,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import {
    content_documents_href,
    content_documents_new_href,
    content_item_href,
    content_item_route_for_path,
} from "../content/route.ts"

export const InternalDocument = S.Struct({
    id: S.String,
    title: S.String,
    content: S.String,
    content_type: S.Literals([
        "markdown",
        "html",
        "text",
        "rtf",
        "rich_text_json",
        "landing_json",
    ]),
    status: S.Literals(["draft", "active", "archived"]),
    template_source: S.NullOr(ContentTemplateSource),
    created_at: S.Number,
    updated_at: S.Number,
})
export type InternalDocumentType = typeof InternalDocument.Type

const Route = S.Literals(["Index", "New", "Document"])
const LoadStatus = S.Literals(["loading", "ready", "saving", "error"])

export const Model = S.Struct({
    can_write: S.optionalKey(S.Boolean),
    route: Route,
    document_id: S.String,
    documents: S.Array(InternalDocument),
    title: S.String,
    document_status: InternalDocument.fields.status,
    editor: RichTextEditorModel,
    is_editing: S.Boolean,
    is_dirty: S.Boolean,
    load_status: LoadStatus,
    maybe_error: S.Option(S.String),
    template_name: S.String,
    template_description: S.String,
    template_tags: S.String,
    template_save_status: S.Literals(["idle", "saving"]),
    template_feedback: S.String,
})
export type ModelType = typeof Model.Type

export const ChangedLocation = taggedStruct("ChangedLocation", {
    location: S.String,
})
export const LoadedDocuments = taggedStruct("LoadedDocuments", {
    documents: S.Array(InternalDocument),
})
export const UpdatedDocumentTitle = taggedStruct("UpdatedDocumentTitle", {
    value: S.String,
})
export const UpdatedDocumentStatus = taggedStruct("UpdatedDocumentStatus", {
    value: InternalDocument.fields.status,
})
export const ToggledDocumentEditing = taggedStruct("ToggledDocumentEditing")
export const ClickedSaveDocument = taggedStruct("ClickedSaveDocument")
export const SavedDocument = taggedStruct("SavedDocument", {
    document: InternalDocument,
})
export const FailedDocumentOperation = taggedStruct("FailedDocumentOperation", {
    error: S.String,
})
export const ChangedDocumentTemplateMetadata = taggedStruct(
    "ChangedDocumentTemplateMetadata",
    {
        field: S.Literals(["name", "description", "tags"]),
        value: S.String,
    }
)
export const SubmittedDocumentTemplate = taggedStruct(
    "SubmittedDocumentTemplate"
)
export const SavedDocumentTemplate = taggedStruct("SavedDocumentTemplate")
export const FailedSavingDocumentTemplate = taggedStruct(
    "FailedSavingDocumentTemplate",
    {
        error: S.String,
    }
)
export const CompletedDocumentNavigation = taggedStruct(
    "CompletedDocumentNavigation"
)
export const GotDocumentEditorMessage = taggedStruct(
    "GotDocumentEditorMessage",
    {
        message: RichTextEditorMessage,
    }
)

export const Message = S.Union([
    ChangedLocation,
    LoadedDocuments,
    UpdatedDocumentTitle,
    UpdatedDocumentStatus,
    ToggledDocumentEditing,
    ClickedSaveDocument,
    SavedDocument,
    FailedDocumentOperation,
    ChangedDocumentTemplateMetadata,
    SubmittedDocumentTemplate,
    SavedDocumentTemplate,
    FailedSavingDocumentTemplate,
    CompletedDocumentNavigation,
    GotDocumentEditorMessage,
])
export type MessageType = typeof Message.Type
export type ViewInputs = Readonly<{
    link_suggestions: ReadonlyArray<LinkSuggestion>
}>

const SaveDocument = Command.define("SaveDocument", {
    args: {
        document_id: S.NullOr(S.String),
        title: S.String,
        content: S.String,
        status: InternalDocument.fields.status,
    },
    messages: [SavedDocument, FailedDocumentOperation],
    execute: () =>
        Effect.succeed(
            FailedDocumentOperation({
                error: "Internal documents require a host persistence adapter",
            })
        ),
})

const SaveDocumentTemplate = Command.define("SaveDocumentTemplate", {
    args: {
        name: ContentTemplateName,
        description: ContentTemplateDescription,
        tags: ContentTemplateTags,
        title: S.String,
        content: S.String,
        content_type: InternalDocument.fields.content_type,
    },
    messages: [SavedDocumentTemplate, FailedSavingDocumentTemplate],
    execute: () =>
        Effect.succeed(
            FailedSavingDocumentTemplate({
                error: "Document templates require a host persistence adapter",
            })
        ),
})

const NavigateToDocument = Command.define("NavigateToDocument", {
    args: { href: S.String },
    messages: [CompletedDocumentNavigation],
    execute: ({ href }) =>
        Navigation.pushUrl(href).pipe(Effect.as(CompletedDocumentNavigation())),
})

type UpdateReturn = readonly [
    ModelType,
    ReadonlyArray<Command.Command<MessageType>>,
]

const parse_location = (
    location: string
): readonly [typeof Route.Type, string, boolean] => {
    const [pathname = location, search = ""] = location.split("?")
    const edit_requested = new URLSearchParams(search).get("mode") === "edit"
    if (pathname.replace(/\/$/, "") === content_documents_new_href())
        return ["New", "", true]

    const item = content_item_route_for_path(pathname)
    return item !== null && item.content_kind === "document"
        ? ["Document", item.content_id, edit_requested]
        : ["Index", "", false]
}

const editor_for_document = (document: InternalDocumentType) => {
    const editor = initRichTextEditor()
    if (document.content_type !== "rich_text_json")
        return initRichTextEditor(document.content)
    return Option.match(
        S.decodeUnknownOption(S.fromJsonString(RichTextContent))(
            document.content
        ),
        {
            onNone: () => editor,
            onSome: (content) =>
                evo(editor, { document: () => content.document }),
        }
    )
}

const hydrate = (model: ModelType): ModelType => {
    if (model.route === "Index") {
        return evo(model, {
            load_status: () => "ready",
            maybe_error: () => Option.none(),
            is_editing: () => false,
        })
    }
    if (model.route === "New") {
        if (model.is_dirty) return evo(model, { load_status: () => "ready" })
        return evo(model, {
            title: () => "",
            document_status: () => "draft",
            editor: () => initRichTextEditor(),
            is_editing: () => true,
            is_dirty: () => false,
            load_status: () => "ready",
            maybe_error: () => Option.none(),
        })
    }

    if (model.is_dirty) return evo(model, { load_status: () => "ready" })

    const document = model.documents.find(
        (candidate) => candidate.id === model.document_id
    )
    if (document === undefined) {
        return evo(model, {
            load_status: () => "error",
            maybe_error: () => Option.some("Document not found."),
        })
    }

    return evo(model, {
        title: () => document.title,
        document_status: () => document.status,
        editor: () => editor_for_document(document),
        is_dirty: () => false,
        load_status: () => "ready",
        maybe_error: () => Option.none(),
    })
}

export const init = (location: string): UpdateReturn => {
    const [route, document_id, is_editing] = parse_location(location)
    return [
        {
            route,
            document_id,
            documents: [],
            title: "",
            document_status: "draft",
            editor: initRichTextEditor(),
            is_editing,
            is_dirty: false,
            load_status: "loading",
            maybe_error: Option.none(),
            template_name: "",
            template_description: "Reusable internal document template.",
            template_tags: "",
            template_save_status: "idle",
            template_feedback: "",
        },
        [],
    ]
}

const map_editor_commands = (
    commands: ReadonlyArray<Command.Command<RichTextEditorMessage>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map(
                (message): MessageType => GotDocumentEditorMessage({ message })
            )
        )
    )

const upsert_document = (
    documents: ReadonlyArray<InternalDocumentType>,
    document: InternalDocumentType
): ReadonlyArray<InternalDocumentType> => [
    document,
    ...documents.filter((candidate) => candidate.id !== document.id),
]

export const update = (model: ModelType, message: MessageType): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedLocation: ({ location }) => {
                const [route, document_id, is_editing] =
                    parse_location(location)
                return [
                    hydrate(
                        evo(model, {
                            route: () => route,
                            document_id: () => document_id,
                            is_editing: () => is_editing,
                            is_dirty: () => false,
                            load_status: () => "loading",
                            maybe_error: () => Option.none(),
                        })
                    ),
                    [],
                ]
            },
            LoadedDocuments: ({ documents }) => [
                hydrate(evo(model, { documents: () => documents })),
                [],
            ],
            UpdatedDocumentTitle: ({ value }) => [
                evo(model, {
                    title: () => value,
                    is_dirty: () => true,
                    maybe_error: () => Option.none(),
                }),
                [],
            ],
            UpdatedDocumentStatus: ({ value }) => [
                evo(model, {
                    document_status: () => value,
                    is_dirty: () => true,
                    maybe_error: () => Option.none(),
                }),
                [],
            ],
            ToggledDocumentEditing: () => [
                evo(model, { is_editing: (value) => !value }),
                [],
            ],
            ClickedSaveDocument: () => {
                const title = model.title.trim() || "Untitled document"
                const saving_model = evo(model, {
                    title: () => title,
                    load_status: () => "saving",
                    maybe_error: () => Option.none(),
                })
                return [
                    saving_model,
                    [
                        SaveDocument({
                            document_id:
                                model.route === "Document"
                                    ? model.document_id
                                    : null,
                            title,
                            content: JSON.stringify({
                                schema_version: 1,
                                document: model.editor.document,
                            }),
                            status: model.document_status,
                        }),
                    ],
                ]
            },
            SavedDocument: ({ document }) => {
                const was_new = model.route === "New"
                return [
                    evo(model, {
                        route: () => "Document",
                        document_id: () => document.id,
                        documents: () =>
                            upsert_document(model.documents, document),
                        title: () => document.title,
                        document_status: () => document.status,
                        is_editing: () => false,
                        is_dirty: () => false,
                        load_status: () => "ready",
                        maybe_error: () => Option.none(),
                    }),
                    was_new
                        ? [
                              NavigateToDocument({
                                  href: content_item_href(
                                      "document",
                                      document.id
                                  ),
                              }),
                          ]
                        : [],
                ]
            },
            FailedDocumentOperation: ({ error }) => [
                evo(model, {
                    load_status: () => "error",
                    maybe_error: () => Option.some(error),
                }),
                [],
            ],
            ChangedDocumentTemplateMetadata: ({ field, value }) => [
                evo(model, {
                    template_name: (current) =>
                        field === "name" ? value : current,
                    template_description: (current) =>
                        field === "description" ? value : current,
                    template_tags: (current) =>
                        field === "tags" ? value : current,
                    template_save_status: () => "idle",
                    template_feedback: () => "",
                }),
                [],
            ],
            SubmittedDocumentTemplate: () => {
                if (model.template_save_status === "saving") return [model, []]

                const name = S.decodeUnknownOption(ContentTemplateName)(
                    model.template_name.trim()
                )
                const description = S.decodeUnknownOption(
                    ContentTemplateDescription
                )(model.template_description.trim())
                const tags = S.decodeUnknownOption(ContentTemplateTags)(
                    globalThis.Array.from(
                        new Set(
                            model.template_tags
                                .split(",")
                                .map((tag) => tag.trim().toLowerCase())
                                .filter((tag) => tag !== "")
                        )
                    )
                )
                if (
                    Option.isNone(name) ||
                    Option.isNone(description) ||
                    Option.isNone(tags)
                ) {
                    return [
                        evo(model, {
                            template_feedback: () =>
                                "Enter a template name, with no more than 12 tags of 40 characters each.",
                        }),
                        [],
                    ]
                }
                return [
                    evo(model, {
                        template_save_status: () => "saving",
                        template_feedback: () => "",
                    }),
                    [
                        SaveDocumentTemplate({
                            name: name.value,
                            description: description.value,
                            tags: tags.value,
                            title: model.title.trim() || "Untitled document",
                            content: JSON.stringify({
                                schema_version: 1,
                                document: model.editor.document,
                            }),
                            content_type: "rich_text_json",
                        }),
                    ],
                ]
            },
            SavedDocumentTemplate: () => [
                evo(model, {
                    template_name: () => "",
                    template_description: () =>
                        "Reusable internal document template.",
                    template_tags: () => "",
                    template_save_status: () => "idle",
                    template_feedback: () => "Template saved.",
                }),
                [],
            ],
            FailedSavingDocumentTemplate: ({ error }) => [
                evo(model, {
                    template_save_status: () => "idle",
                    template_feedback: () =>
                        `Could not save template: ${error}`,
                }),
                [],
            ],
            CompletedDocumentNavigation: () => [model, []],
            GotDocumentEditorMessage: ({ message }) => {
                const [editor, commands] = updateRichTextEditor(
                    model.editor,
                    message
                )
                return [
                    evo(model, {
                        editor: () => editor,
                        is_dirty: () => true,
                        maybe_error: () => Option.none(),
                    }),
                    map_editor_commands(commands),
                ]
            },
        })
    )

const editor_id = "internal-document-editor"

const editor_subscriptions = Subscription.make<ModelType, MessageType>()(
    (entry) => ({
        internalDocumentEditor: entry(
            {
                id: S.String,
                model: RichTextEditorModel,
                isDisabled: S.Boolean,
            },
            {
                modelToDependencies: (model) => ({
                    id: editor_id,
                    model: model.editor,
                    isDisabled: !model.is_editing,
                }),
                dependenciesToStream: ({ id, model, isDisabled }) =>
                    richTextEditorSubscriptions({
                        id,
                        model,
                        isDisabled,
                    }).pipe(
                        Stream.map((message) =>
                            GotDocumentEditorMessage({ message })
                        )
                    ),
            }
        ),
    })
)

const drag_subscriptions = Subscription.lift({
    internalDocumentDragPointer: DragAndDrop.subscriptions.documentPointer,
    internalDocumentDragEscape: DragAndDrop.subscriptions.documentEscape,
    internalDocumentDragKeyboard: DragAndDrop.subscriptions.documentKeyboard,
    internalDocumentAutoScroll: DragAndDrop.subscriptions.autoScroll,
})<ModelType, MessageType>({
    toChildModel: (model) => model.editor.dragAndDrop,
    toParentMessage: (message) =>
        GotDocumentEditorMessage({
            message: GotRichTextDragAndDropMessage({ message }),
        }),
    when: (model) => model.is_editing,
})

export const subscriptions = Subscription.aggregate<ModelType, MessageType>()(
    editor_subscriptions,
    drag_subscriptions
)

const panel_class =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
const input_class =
    "w-full rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"

const list_view = (model: ModelType, h: HtmlBuilder<MessageType>): Html =>
    h.section(
        [h.Class("mx-auto grid max-w-5xl gap-6 px-4 py-8")],
        [
            h.header(
                [h.Class("flex flex-wrap items-start justify-between gap-4")],
                [
                    h.div(
                        [],
                        [
                            h.h1(
                                [
                                    h.Class(
                                        "text-3xl font-semibold tracking-tight"
                                    ),
                                ],
                                ["Documents"]
                            ),
                            h.p(
                                [h.Class("mt-2 text-sm text-muted-foreground")],
                                [
                                    "Private documents shared within this organization.",
                                ]
                            ),
                        ]
                    ),
                    h.a(
                        [
                            ...(model.can_write === false
                                ? [h.AriaDisabled(true)]
                                : [h.Href(content_documents_new_href())]),
                            h.Class(
                                "inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]"
                            ),
                        ],
                        ["New document"]
                    ),
                ]
            ),
            model.load_status === "loading"
                ? h.p(
                      [h.Class("text-sm text-muted-foreground")],
                      ["Loading documents…"]
                  )
                : model.documents.length === 0
                  ? h.div(
                        [h.Class(panel_class)],
                        [
                            h.h2(
                                [h.Class("font-semibold")],
                                ["No documents yet"]
                            ),
                            h.p(
                                [h.Class("mt-1 text-sm text-muted-foreground")],
                                [
                                    "Create a private rich-text document to get started.",
                                ]
                            ),
                        ]
                    )
                  : h.ul(
                        [h.Class("grid gap-3")],
                        model.documents.map((document) =>
                            h.li(
                                [h.Key(document.id), h.Class(panel_class)],
                                [
                                    h.a(
                                        [
                                            h.Href(
                                                content_item_href(
                                                    "document",
                                                    document.id
                                                )
                                            ),
                                            h.Class(
                                                "font-semibold underline-offset-4 hover:underline focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]"
                                            ),
                                        ],
                                        [document.title || "Untitled document"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            `${document.status} · Updated ${new Date(document.updated_at).toLocaleDateString()}`,
                                        ]
                                    ),
                                ]
                            )
                        )
                    ),
        ]
    )

const updated_status_message = (
    value: string,
    fallback: typeof InternalDocument.fields.status.Type
): MessageType =>
    UpdatedDocumentStatus({
        value: Option.getOrElse(
            S.decodeUnknownOption(InternalDocument.fields.status)(value),
            () => fallback
        ),
    })

const document_template_field = (
    id: string,
    label: string,
    field: "name" | "description" | "tags",
    value: string,
    maxlength: number,
    saving: boolean,
    h: HtmlBuilder<MessageType>,
    required = false
): Html =>
    h.label(
        [h.For(id), h.Class("grid gap-1 text-sm font-medium")],
        [
            h.span([], [required ? `${label} (required)` : label]),
            h.input([
                h.Id(id),
                h.Name(field),
                h.Type("text"),
                h.Value(value),
                h.Maxlength(maxlength),
                h.Required(required),
                h.Disabled(saving),
                h.Class(input_class),
                h.OnInput((next_value) =>
                    ChangedDocumentTemplateMetadata({
                        field,
                        value: next_value,
                    })
                ),
            ]),
        ]
    )

const document_template_view = (
    model: ModelType,
    h: HtmlBuilder<MessageType>
): Html => {
    const saving = model.template_save_status === "saving"
    return h.form(
        [
            h.OnSubmit(SubmittedDocumentTemplate()),
            h.Class(`${panel_class} grid gap-4`),
        ],
        [
            h.div(
                [],
                [
                    h.h2(
                        [h.Class("text-lg font-semibold")],
                        ["Save as template"]
                    ),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [
                            "Includes the current title and document body. Status and organization context stay with the document.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-4 sm:grid-cols-3")],
                [
                    document_template_field(
                        "document-template-name",
                        "Template name",
                        "name",
                        model.template_name,
                        160,
                        saving || model.can_write === false,
                        h,
                        true
                    ),
                    document_template_field(
                        "document-template-description",
                        "Description",
                        "description",
                        model.template_description,
                        500,
                        saving || model.can_write === false,
                        h
                    ),
                    document_template_field(
                        "document-template-tags",
                        "Catalog tags (comma-separated)",
                        "tags",
                        model.template_tags,
                        500,
                        saving || model.can_write === false,
                        h
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap items-center justify-between gap-3")],
                [
                    h.p(
                        [
                            h.AriaLive("polite"),
                            h.Class("min-h-5 text-sm text-muted-foreground"),
                        ],
                        [model.template_feedback]
                    ),
                    Button(
                        {
                            type: "submit",
                            variant: "secondary",
                            disabled: saving || model.can_write === false,
                            children: [saving ? "Saving…" : "Save as template"],
                        },
                        h
                    ),
                ]
            ),
        ]
    )
}

const detail_view = (
    model: ModelType,
    inputs: ViewInputs,
    h: HtmlBuilder<MessageType>
): Html => {
    const error = Option.getOrElse(model.maybe_error, () => "")
    if (model.load_status === "error" && model.route === "Document") {
        return h.section(
            [h.Class("mx-auto max-w-3xl px-4 py-8")],
            [
                h.div(
                    [h.Class(panel_class)],
                    [
                        h.h1(
                            [h.Class("text-2xl font-semibold")],
                            ["Document unavailable"]
                        ),
                        h.p(
                            [h.Class("mt-2 text-sm text-destructive")],
                            [error]
                        ),
                        h.a(
                            [h.Href(content_documents_href())],
                            ["Back to documents"]
                        ),
                    ]
                ),
            ]
        )
    }

    return h.main(
        [h.Class("mx-auto grid max-w-5xl gap-6 px-4 py-8")],
        [
            h.header(
                [h.Class("flex flex-wrap items-start justify-between gap-4")],
                [
                    h.div(
                        [],
                        [
                            h.a(
                                [h.Href(content_documents_href())],
                                ["Documents"]
                            ),
                            h.h1(
                                [
                                    h.Class(
                                        "mt-2 text-3xl font-semibold tracking-tight"
                                    ),
                                ],
                                [
                                    model.route === "New"
                                        ? "New document"
                                        : model.title || "Untitled document",
                                ]
                            ),
                        ]
                    ),
                    model.route === "Document"
                        ? Button(
                              {
                                  variant: "outline",
                                  disabled: model.can_write === false,
                                  onClick: ToggledDocumentEditing(),
                                  children: [
                                      model.is_editing
                                          ? "Preview"
                                          : "Edit document",
                                  ],
                              },
                              h
                          )
                        : h.span([], []),
                ]
            ),
            model.is_editing
                ? h.form(
                      [
                          h.Class("grid gap-6"),
                          h.OnSubmit(ClickedSaveDocument()),
                      ],
                      [
                          h.section(
                              [h.Class(`${panel_class} grid gap-4`)],
                              [
                                  h.label(
                                      [h.For("internal-document-title")],
                                      ["Title"]
                                  ),
                                  h.input([
                                      h.Id("internal-document-title"),
                                      h.Name("title"),
                                      h.Disabled(model.can_write === false),
                                      h.Value(model.title),
                                      h.Class(input_class),
                                      h.OnInput((value) =>
                                          UpdatedDocumentTitle({ value })
                                      ),
                                  ]),
                                  h.label(
                                      [h.For("internal-document-status")],
                                      ["Status"]
                                  ),
                                  h.select(
                                      [
                                          h.Id("internal-document-status"),
                                          h.Name("status"),
                                          h.Disabled(model.can_write === false),
                                          h.Value(model.document_status),
                                          h.Class(input_class),
                                          h.OnInput((value) =>
                                              updated_status_message(
                                                  value,
                                                  model.document_status
                                              )
                                          ),
                                      ],
                                      [
                                          h.option(
                                              [h.Value("draft")],
                                              ["Draft"]
                                          ),
                                          h.option(
                                              [h.Value("active")],
                                              ["Active"]
                                          ),
                                          h.option(
                                              [h.Value("archived")],
                                              ["Archived"]
                                          ),
                                      ]
                                  ),
                              ]
                          ),
                          h.section(
                              [h.Class(panel_class)],
                              [
                                  RichTextEditor<MessageType>(
                                      {
                                          id: editor_id,
                                          model: model.editor,
                                          isDisabled: model.can_write === false,
                                          toParentMessage: (message) =>
                                              GotDocumentEditorMessage({
                                                  message,
                                              }),
                                          label: "Document body",
                                          description:
                                              "Write the private document body. Use the block controls to structure and reorder content.",
                                          placeholder: "Start writing…",
                                          linkSuggestions:
                                              inputs.link_suggestions,
                                      },
                                      h
                                  ),
                              ]
                          ),
                          h.div(
                              [h.Class("flex items-center gap-3")],
                              [
                                  Button(
                                      {
                                          type: "submit",
                                          disabled:
                                              model.can_write === false ||
                                              model.load_status === "saving",
                                          children: [
                                              model.load_status === "saving"
                                                  ? "Saving…"
                                                  : "Save document",
                                          ],
                                      },
                                      h
                                  ),
                                  h.p(
                                      [
                                          h.AriaLive("polite"),
                                          h.Class(
                                              "text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          error ||
                                              (model.is_dirty
                                                  ? "Unsaved changes"
                                                  : "Saved"),
                                      ]
                                  ),
                              ]
                          ),
                      ]
                  )
                : h.article(
                      [h.Class(`${panel_class} grid gap-4`)],
                      [
                          h.p(
                              [h.Class("text-sm text-muted-foreground")],
                              [`Status: ${model.document_status}`]
                          ),
                          h.div(
                              [h.Class("max-w-[80ch] whitespace-pre-wrap")],
                              [
                                  richTextEditorPlainText(model.editor) ||
                                      "This document is empty.",
                              ]
                          ),
                      ]
                  ),
            ...(model.is_editing ? [document_template_view(model, h)] : []),
        ]
    )
}

export const view = Submodel.defineView<ModelType, MessageType, ViewInputs>(
    (model, inputs, h) =>
        model.route === "Index"
            ? list_view(model, h)
            : detail_view(model, inputs, h)
)

export const title_for_route = (model: ModelType): string =>
    model.route === "Index"
        ? "Documents"
        : model.route === "New"
          ? "New document"
          : model.title || "Document"

export const is_document_location = (pathname: string): boolean => {
    const path = pathname.replace(/\/$/, "")
    const item = content_item_route_for_path(path)
    return (
        path === content_documents_href() ||
        path === content_documents_new_href() ||
        (item !== null && item.content_kind === "document")
    )
}
