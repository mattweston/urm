import type { LinkSuggestion } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import { Array, Effect, Match as M, Option, Schema as S, Stream } from "effect"
import { Command, Navigation, Runtime, Subscription } from "foldkit"
import { type Document, type Html, type HtmlBuilder } from "foldkit/html"
import { modifyFields } from "foldkit/struct"
import { toString as urlToString, type Url } from "foldkit/url"
import { DragAndDrop, Tooltip } from "@foldkit/ui"
import { content_item_href } from "../content/route.ts"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import {
    sidebarShellMobileView,
    sidebarShellView,
} from "@urm/ui/foldkit/sidebar-shell.view.ts"

import { Button } from "@urm/ui/foldkit/button/button.view.ts"
import { RichTextEditor } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import { richTextEditorSubscriptions } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.subscriptions.ts"
import {
    initRichTextEditor,
    richTextEditorPlainText,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.model.ts"
import { updateRichTextEditor } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.update.ts"
import {
    GotRichTextDragAndDropMessage,
    RichTextEditorMessage,
    RichTextEditorModel as RichTextEditorModelSchema,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"
import {
    EntityTag as EntityTagSchema,
    Tag as TagSchema,
} from "@urm/domain/schemas/tags"
import {
    ContentTemplateDescription,
    ContentTemplateName,
    ContentTemplateSource,
    ContentTemplateTags,
} from "@urm/domain/schemas/content-templates"
import {
    Document as BlogDocumentSchema,
    DocumentSlug,
} from "@urm/domain/schemas/documents"
import { taggedStruct } from "foldkit/schema"

import {
    BLOG_DOCUMENT_ID,
    parseBlogDocumentContent,
    uniqueBlogTagNames,
} from "./platform/blog.document.ts"
import {
    BLOG_HOME_ICON,
    BLOG_NAV_ITEMS,
    BLOG_SIDEBAR_SUBTITLE,
    BLOG_SIDEBAR_TITLE,
} from "./blog.sidebar.ts"
import { isAppScope, routeBaseFor, urlToAppRoute } from "./platform/route.ts"
import {
    getSidebarTooltipsState,
    resetSidebarTooltipsState,
    setSidebarTooltipsState,
} from "./platform/sidebar.tooltips.state.ts"

const UpdatedBlogTitle = taggedStruct("UpdatedBlogTitle", { value: S.String })
export const UpdatedBlogSlug = taggedStruct("UpdatedBlogSlug", {
    value: S.String,
})
const UpdatedBlogAuthor = taggedStruct("UpdatedBlogAuthor", { value: S.String })
export const UpdatedBlogExcerpt = taggedStruct("UpdatedBlogExcerpt", {
    value: S.String,
})
export const UpdatedBlogSeoTitle = taggedStruct("UpdatedBlogSeoTitle", {
    value: S.String,
})
export const UpdatedBlogSeoDescription = taggedStruct(
    "UpdatedBlogSeoDescription",
    {
        value: S.String,
    }
)
const UpdatedBlogTagInput = taggedStruct("UpdatedBlogTagInput", {
    value: S.String,
})
const UpdatedBlogPublished = taggedStruct("UpdatedBlogPublished", {
    value: S.Boolean,
})
const ClickedAddBlogTag = taggedStruct("ClickedAddBlogTag")
const ClickedRemoveBlogTag = taggedStruct("ClickedRemoveBlogTag", {
    value: S.String,
})
export const ClickedSaveBlogDraft = taggedStruct("ClickedSaveBlogDraft")
export const ChangedBlogTemplateMetadata = taggedStruct(
    "ChangedBlogTemplateMetadata",
    {
        field: S.Literals(["name", "description", "tags"]),
        value: S.String,
    }
)
export const SubmittedBlogTemplate = taggedStruct("SubmittedBlogTemplate")
export const SavedBlogTemplate = taggedStruct("SavedBlogTemplate")
export const FailedSavingBlogTemplate = taggedStruct(
    "FailedSavingBlogTemplate",
    {
        reason: S.String,
    }
)
const ClickedLink = taggedStruct("ClickedLink", {
    request: Navigation.UrlRequest,
})
const GotSidebarTooltipMessage = taggedStruct("GotSidebarTooltipMessage", {
    tooltipId: S.String,
    message: S.Any,
})
const ToggledBlogSidebarIsCollapsed = taggedStruct(
    "ToggledBlogSidebarIsCollapsed"
)
const ToggledBlogSidebarMobileIsOpen = taggedStruct(
    "ToggledBlogSidebarMobileIsOpen"
)
export const ChangedUrl = taggedStruct("ChangedUrl", { pathname: S.String })
export const BlogPostMetadata = S.Struct({
    blog_post_id: S.String,
    excerpt: S.NullOr(S.String),
    seo_title: S.NullOr(S.String),
    seo_description: S.NullOr(S.String),
    template_source: S.NullOr(ContentTemplateSource),
})
export const LoadedBlogDraft = taggedStruct("LoadedBlogDraft", {
    documents: S.Array(BlogDocumentSchema),
    postMetadata: S.Array(BlogPostMetadata),
    tags: S.Array(TagSchema),
    entityTags: S.Array(EntityTagSchema),
})
export const BlogAssignment = S.Struct({
    id: S.String,
    blog_post_id: S.String,
    slug: S.String,
    publication_state: S.Literals(["draft", "published", "archived"]),
})
export const LoadedBlogAssignments = taggedStruct("LoadedBlogAssignments", {
    assignments: S.Array(BlogAssignment),
})
export const SavedBlogDraft = taggedStruct("SavedBlogDraft", {
    document: BlogDocumentSchema,
    metadata: BlogPostMetadata,
})
export const FailedLoadingBlogDraft = taggedStruct("FailedLoadingBlogDraft", {
    reason: S.String,
})
export const FailedSavingBlogDraft = taggedStruct("FailedSavingBlogDraft", {
    reason: S.String,
})
export const CompletedNavigateInternal = taggedStruct(
    "CompletedNavigateInternal"
)
export const CompletedLoadExternal = taggedStruct("CompletedLoadExternal")
export const GotBlogRichTextEditorMessage = taggedStruct(
    "GotBlogRichTextEditorMessage",
    {
        message: RichTextEditorMessage,
    }
)
const BlogStatus = S.Union([
    S.Literal("loading"),
    S.Literal("ready"),
    S.Literal("saving"),
    S.Literal("error"),
])
const BlogRouteKind = S.Union([
    S.Literal("drafts"),
    S.Literal("published"),
    S.Literal("new"),
    S.Literal("post"),
])

export const Message = S.Union([
    UpdatedBlogTitle,
    UpdatedBlogSlug,
    UpdatedBlogAuthor,
    UpdatedBlogExcerpt,
    UpdatedBlogSeoTitle,
    UpdatedBlogSeoDescription,
    UpdatedBlogTagInput,
    UpdatedBlogPublished,
    ClickedAddBlogTag,
    ClickedRemoveBlogTag,
    ClickedSaveBlogDraft,
    ChangedBlogTemplateMetadata,
    SubmittedBlogTemplate,
    SavedBlogTemplate,
    FailedSavingBlogTemplate,
    ClickedLink,
    GotSidebarTooltipMessage,
    ToggledBlogSidebarIsCollapsed,
    ToggledBlogSidebarMobileIsOpen,
    ChangedUrl,
    LoadedBlogDraft,
    LoadedBlogAssignments,
    SavedBlogDraft,
    FailedLoadingBlogDraft,
    FailedSavingBlogDraft,
    CompletedNavigateInternal,
    CompletedLoadExternal,
    GotBlogRichTextEditorMessage,
])
export type Message = typeof Message.Type

export const Model = S.Struct({
    can_write: S.optionalKey(S.Boolean),
    routeKind: BlogRouteKind,
    sidebarRouteKind: BlogRouteKind,
    routeBase: S.String,
    documentId: S.String,
    routeSlug: S.String,
    status: BlogStatus,
    maybeError: S.Option(S.String),
    documents: S.Array(BlogDocumentSchema),
    sourceDocuments: S.Array(BlogDocumentSchema),
    postMetadata: S.Array(BlogPostMetadata),
    assignments: S.Array(BlogAssignment),
    availableTags: S.Array(TagSchema),
    entityTags: S.Array(EntityTagSchema),
    published: S.Boolean,
    isSidebarCollapsed: S.Boolean,
    isSidebarMobileOpen: S.Boolean,
    sidebarTooltipsRevision: S.Number,
    title: S.String,
    slug: S.String,
    author: S.String,
    excerpt: S.String,
    seoTitle: S.String,
    seoDescription: S.String,
    tagInput: S.String,
    tags: S.Array(S.String),
    template_name: S.String,
    template_description: S.String,
    template_tags: S.String,
    template_save_status: S.Literals(["idle", "saving"]),
    template_feedback: S.String,
    editor: RichTextEditorModelSchema,
})
export type Model = typeof Model.Type

const dragAndDropSubscriptions = DragAndDrop.subscriptions

type BlogRoute = typeof BlogRouteKind.Type

const isListRouteKind = (routeKind: BlogRoute): boolean =>
    routeKind === "drafts" || routeKind === "published"

const parseBlogRoute = (pathname: string): readonly [BlogRoute, string] =>
    M.value(urlToAppRoute(pathname)).pipe(
        M.withReturnType<readonly [BlogRoute, string]>(),
        M.tagsExhaustive({
            Drafts: () => ["drafts", ""],
            Published: () => ["published", ""],
            NewPost: () => ["new", ""],
            Post: ({ slug }) => ["post", slug],
        })
    )

export const createBlogModel = (pathname: string): Model => {
    const [routeKind, routeSlug] = parseBlogRoute(pathname)

    return {
        routeKind,
        sidebarRouteKind: routeKind === "post" ? "drafts" : routeKind,
        routeBase: routeBaseFor(pathname),
        documentId: BLOG_DOCUMENT_ID,
        routeSlug,
        status: "loading",
        maybeError: Option.none(),
        documents: [],
        sourceDocuments: [],
        postMetadata: [],
        assignments: [],
        availableTags: [],
        entityTags: [],
        published: false,
        isSidebarCollapsed: false,
        isSidebarMobileOpen: false,
        sidebarTooltipsRevision: 0,
        title: "",
        slug: routeSlug,
        author: "",
        excerpt: "",
        seoTitle: "",
        seoDescription: "",
        tagInput: "",
        tags: [],
        template_name: "",
        template_description: "Reusable blog post template.",
        template_tags: "",
        template_save_status: "idle",
        template_feedback: "",
        editor: initRichTextEditor(),
    }
}

const navigateInternal = (href: string) => NavigateInternal({ href })

const loadExternal = (href: string) => LoadExternal({ href })

const LoadBlogDraft = Command.define("LoadBlogDraft", {
    messages: [LoadedBlogDraft, FailedLoadingBlogDraft],
    execute: Effect.succeed(
        LoadedBlogDraft({
            documents: [],
            postMetadata: [],
            tags: [],
            entityTags: [],
        })
    ),
})

const loadBlogDraft = () => LoadBlogDraft()

const saveBlogDraft = (model: Model) => SaveBlogDraft({ model })

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()
const SaveBlogDraft = Command.define("SaveBlogDraft", {
    args: { model: Model },
    messages: [SavedBlogDraft, FailedSavingBlogDraft],
    execute: () =>
        Effect.succeed(
            FailedSavingBlogDraft({
                reason: "Blog documents require a host persistence adapter",
            })
        ),
})
const SaveBlogTemplate = Command.define("SaveBlogTemplate", {
    args: {
        name: ContentTemplateName,
        description: ContentTemplateDescription,
        tags: ContentTemplateTags,
        model: Model,
    },
    messages: [SavedBlogTemplate, FailedSavingBlogTemplate],
    execute: () =>
        Effect.succeed(
            FailedSavingBlogTemplate({
                reason: "Blog templates require a host persistence adapter",
            })
        ),
})
const NavigateInternal = Command.define("NavigateInternal", {
    args: { href: S.String },
    messages: [CompletedNavigateInternal],
    execute: ({ href }) =>
        Navigation.pushUrl(href).pipe(Effect.as(CompletedNavigateInternal())),
})
const LoadExternal = Command.define("LoadExternal", {
    args: { href: S.String },
    messages: [CompletedLoadExternal],
    execute: ({ href }) =>
        Navigation.load(href).pipe(Effect.as(CompletedLoadExternal())),
})

const editorContainerId = "blog-rich-text-editor"

const editorClasses =
    "rounded-[var(--radius-frame)] border-(length:--surface-border-width) border-border/60 bg-card/95 p-4 text-card-foreground [box-shadow:var(--shadow-surface)] backdrop-blur-sm sm:p-6"

const panelClasses =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"

const inputClasses =
    "w-full rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"

const blogTemplateFieldView = (
    id: string,
    label: string,
    field: "name" | "description" | "tags",
    value: string,
    maxlength: number,
    disabled: boolean,
    h: HtmlBuilder<Message>,
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
                h.Disabled(disabled),
                h.OnInput((next_value) =>
                    ChangedBlogTemplateMetadata({
                        field,
                        value: next_value,
                    })
                ),
                h.Class(inputClasses),
            ]),
        ]
    )

const blogTemplateView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const saving = model.template_save_status === "saving"

    return h.form(
        [
            h.OnSubmit(SubmittedBlogTemplate()),
            h.Class(`${panelClasses} mx-auto mt-6 grid max-w-7xl gap-4`),
        ],
        [
            h.div(
                [],
                [
                    h.h2(
                        [
                            h.Id("blog-save-template"),
                            h.Class("text-lg font-semibold"),
                        ],
                        ["Save as template"]
                    ),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [
                            "Includes the title, body, excerpt, author, content tags, and SEO fields. Slug and publishing settings stay with the post.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-4 sm:grid-cols-3")],
                [
                    blogTemplateFieldView(
                        "blog-template-name",
                        "Template name",
                        "name",
                        model.template_name,
                        160,
                        saving || model.can_write === false,
                        h,
                        true
                    ),
                    blogTemplateFieldView(
                        "blog-template-description",
                        "Description",
                        "description",
                        model.template_description,
                        500,
                        saving || model.can_write === false,
                        h
                    ),
                    blogTemplateFieldView(
                        "blog-template-tags",
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
                            isDisabled: saving || model.can_write === false,
                            children: [saving ? "Saving…" : "Save as template"],
                        },
                        h
                    ),
                ]
            ),
        ]
    )
}

const tagChipClasses =
    "inline-flex items-center gap-2 rounded-full border-(length:--surface-border-width) border-border bg-background px-3 py-1.5 text-sm text-foreground [box-shadow:var(--shadow-control)]"

const blogLayoutClasses =
    "mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-6"

const blogTitleClasses = "block text-sm font-medium text-foreground"

const blogStatusLabel = (status: typeof BlogStatus.Type): string =>
    status === "loading"
        ? "Loading"
        : status === "saving"
          ? "Saving"
          : status === "error"
            ? "Needs attention"
            : "Ready"

const mapRichTextCommands = (
    commands: ReadonlyArray<Command.Command<RichTextEditorMessage>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map(
                (message): Message => GotBlogRichTextEditorMessage({ message })
            )
        )
    )

const addTag = (model: Model): Model => {
    const nextTag = model.tagInput.trim()

    if (nextTag === "" || model.tags.includes(nextTag)) {
        return model
    }

    return modifyFields(model, {
        tags: () => [...model.tags, nextTag],
        tagInput: () => "",
    })
}

const removeTag = (model: Model, value: string): Model =>
    modifyFields(model, { tags: () => model.tags.filter((tag) => tag !== value) })

const markBlogDraftReady = (model: Model): Model =>
    modifyFields(model, {
        status: () => "ready",
        maybeError: () => Option.none(),
    })

const applyAssignments = (
    documents: ReadonlyArray<typeof BlogDocumentSchema.Type>,
    assignments: ReadonlyArray<typeof BlogAssignment.Type>
): ReadonlyArray<typeof BlogDocumentSchema.Type> => {
    const assignments_by_post_id = new Map(
        assignments.map((assignment) => [assignment.blog_post_id, assignment])
    )

    return documents.map((document) => {
        const assignment = assignments_by_post_id.get(document.id)
        return {
            ...document,
            ...(assignment === undefined ? {} : { slug: assignment.slug }),
            published: assignment?.publication_state === "published",
        }
    })
}

const updateLoadedBlogDraft = (
    model: Model,
    documents: ReadonlyArray<typeof BlogDocumentSchema.Type>,
    post_metadata: ReadonlyArray<typeof BlogPostMetadata.Type>,
    tags: ReadonlyArray<typeof TagSchema.Type>,
    entityTags: ReadonlyArray<typeof EntityTagSchema.Type>
): Model => {
    if (isListRouteKind(model.routeKind) || model.routeKind === "new") {
        return modifyFields(model, {
            status: () => "ready",
            maybeError: () => Option.none(),
            documents: () => documents,
            postMetadata: () => post_metadata,
            availableTags: () => tags,
            entityTags: () => entityTags,
            published: () => false,
            sidebarRouteKind: () => model.routeKind,
            title: () => "",
            slug: () => "",
            author: () => "",
            excerpt: () => "",
            seoTitle: () => "",
            seoDescription: () => "",
            tagInput: () => "",
            tags: () => [],
            editor: () => initRichTextEditor(),
            documentId: () => BLOG_DOCUMENT_ID,
        })
    }

    const maybeDocument = documents.find(
        (document) =>
            document.slug === model.routeSlug ||
            document.id === model.routeSlug ||
            document.id === model.documentId
    )

    if (maybeDocument === undefined) {
        return modifyFields(model, {
            status: () => "ready",
            maybeError: () => Option.none(),
            documents: () => documents,
            postMetadata: () => post_metadata,
            availableTags: () => tags,
            entityTags: () => entityTags,
            published: () => false,
            sidebarRouteKind: () => "drafts",
            title: () => "",
            slug: () => model.routeSlug,
            author: () => "",
            excerpt: () => "",
            seoTitle: () => "",
            seoDescription: () => "",
            tagInput: () => "",
            tags: () => [],
            editor: () => initRichTextEditor(),
            documentId: () => BLOG_DOCUMENT_ID,
        })
    }

    const maybeContent = parseBlogDocumentContent(maybeDocument.content)
    const metadata = post_metadata.find(
        (entry) => entry.blog_post_id === maybeDocument.id
    )
    const tagsById = new Map(tags.map((tag) => [tag.id, tag]))
    const relevantEntityTags = entityTags.filter(
        (entityTag) => entityTag.entity_id === maybeDocument.id
    )
    const selectedTags = uniqueBlogTagNames(
        relevantEntityTags
            .flatMap((entityTag) => {
                const maybeTag = tagsById.get(entityTag.tag_id)

                if (maybeTag === undefined) {
                    return []
                }

                return [maybeTag.name]
            })
            .concat(maybeContent?.tags ?? [])
    )

    return modifyFields(model, {
        documentId: () => maybeDocument.id,
        status: () => "ready",
        maybeError: () => Option.none(),
        documents: () => documents,
        availableTags: () => tags,
        entityTags: () => entityTags,
        published: () => maybeDocument.published,
        sidebarRouteKind: () =>
            maybeDocument.published ? "published" : "drafts",
        title: () => maybeDocument.title,
        slug: () => maybeDocument.slug ?? model.slug,
        author: () => maybeContent?.author ?? "",
        excerpt: () => metadata?.excerpt ?? "",
        seoTitle: () => metadata?.seo_title ?? "",
        seoDescription: () => metadata?.seo_description ?? "",
        tags: () => selectedTags,
        editor: () => {
            const editor = initRichTextEditor()

            if (maybeContent === null) {
                return editor
            }

            return modifyFields(editor, {
                document: () => maybeContent.document,
            })
        },
    })
}

const editorSubscriptions = Subscription.make<Model, Message>()((entry) => ({
    editor: entry(
        {
            id: S.String,
            model: RichTextEditorModelSchema,
            isDisabled: S.Boolean,
        },
        {
            modelToDependencies: (model) => ({
                id: editorContainerId,
                model: model.editor,
                isDisabled: model.can_write === false,
            }),
            dependenciesToStream: ({ id, model, isDisabled }) =>
                richTextEditorSubscriptions({
                    id,
                    model,
                    isDisabled,
                }).pipe(
                    Stream.map(
                        (message): Message =>
                            GotBlogRichTextEditorMessage({ message })
                    )
                ),
        }
    ),
}))

const richTextDragAndDropSubscriptions = Subscription.lift({
    dragPointer: dragAndDropSubscriptions.documentPointer,
    dragEscape: dragAndDropSubscriptions.documentEscape,
    dragKeyboard: dragAndDropSubscriptions.documentKeyboard,
    autoScroll: dragAndDropSubscriptions.autoScroll,
})<Model, Message>({
    toChildModel: (model) => model.editor.dragAndDrop,
    toParentMessage: (message) =>
        GotBlogRichTextEditorMessage({
            message: GotRichTextDragAndDropMessage({ message }),
        }),
})

export const subscriptions = Subscription.aggregate<Model, Message>()(
    editorSubscriptions,
    richTextDragAndDropSubscriptions
)

export const init = (pathname: string): UpdateReturn => {
    resetSidebarTooltipsState()

    return [createBlogModel(pathname), [loadBlogDraft()]]
}

const updateBlogEditor = (
    model: Model,
    message: RichTextEditorMessage
): UpdateReturn => {
    const [editor, commands] = updateRichTextEditor(model.editor, message)

    return [
        modifyFields(model, {
            editor: () => editor,
            status: () => "ready",
            maybeError: () => Option.none(),
        }),
        mapRichTextCommands(commands),
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedBlogTitle: ({ value }) => [
                modifyFields(model, {
                    title: () => value,
                    status: () => "ready",
                    maybeError: () => Option.none(),
                }),
                [],
            ],
            UpdatedBlogSlug: ({ value }) => [
                modifyFields(model, {
                    slug: () => value,
                    status: () => "ready",
                    maybeError: () => Option.none(),
                }),
                [],
            ],
            UpdatedBlogAuthor: ({ value }) => [
                modifyFields(model, {
                    author: () => value,
                    status: () => "ready",
                    maybeError: () => Option.none(),
                }),
                [],
            ],
            UpdatedBlogExcerpt: ({ value }) => [
                modifyFields(model, {
                    excerpt: () => value,
                    status: () => "ready",
                    maybeError: () => Option.none(),
                }),
                [],
            ],
            UpdatedBlogSeoTitle: ({ value }) => [
                modifyFields(model, {
                    seoTitle: () => value,
                    status: () => "ready",
                    maybeError: () => Option.none(),
                }),
                [],
            ],
            UpdatedBlogSeoDescription: ({ value }) => [
                modifyFields(model, {
                    seoDescription: () => value,
                    status: () => "ready",
                    maybeError: () => Option.none(),
                }),
                [],
            ],
            UpdatedBlogTagInput: ({ value }) => [
                modifyFields(model, {
                    tagInput: () => value,
                    status: () => "ready",
                    maybeError: () => Option.none(),
                }),
                [],
            ],
            UpdatedBlogPublished: ({ value }) => [
                modifyFields(model, {
                    published: () => value,
                    sidebarRouteKind: () => (value ? "published" : "drafts"),
                    status: () => "ready",
                    maybeError: () => Option.none(),
                }),
                [],
            ],
            ClickedAddBlogTag: () => [markBlogDraftReady(addTag(model)), []],
            ClickedRemoveBlogTag: ({ value }) => [
                markBlogDraftReady(removeTag(model, value)),
                [],
            ],
            ClickedSaveBlogDraft: () => {
                const slug = model.slug.trim().toLowerCase()
                if (slug !== "" && !S.is(DocumentSlug)(slug)) {
                    return [
                        modifyFields(model, {
                            status: () => "error",
                            maybeError: () =>
                                Option.some(
                                    "Use lowercase letters, numbers, and single hyphens for the slug."
                                ),
                        }),
                        [],
                    ]
                }
                const saving_model = modifyFields(model, {
                    slug: () => slug,
                    status: () => "saving",
                    maybeError: () => Option.none(),
                })
                return [saving_model, [saveBlogDraft(saving_model)]]
            },
            ChangedBlogTemplateMetadata: ({ field, value }) => [
                modifyFields(model, {
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
            SubmittedBlogTemplate: () => {
                if (model.template_save_status === "saving") return [model, []]

                const name = S.decodeUnknownOption(ContentTemplateName)(
                    model.template_name.trim()
                )
                const description = S.decodeUnknownOption(
                    ContentTemplateDescription
                )(model.template_description.trim())
                const tags = S.decodeUnknownOption(ContentTemplateTags)(
                    Array.dedupe(
                        model.template_tags
                            .split(",")
                            .map((tag) => tag.trim().toLowerCase())
                            .filter((tag) => tag !== "")
                    )
                )

                if (
                    Option.isNone(name) ||
                    Option.isNone(description) ||
                    Option.isNone(tags)
                ) {
                    return [
                        modifyFields(model, {
                            template_feedback: () =>
                                "Enter a template name, with no more than 12 tags of 40 characters each.",
                        }),
                        [],
                    ]
                }

                return [
                    modifyFields(model, {
                        template_save_status: () => "saving",
                        template_feedback: () => "",
                    }),
                    [
                        SaveBlogTemplate({
                            name: name.value,
                            description: description.value,
                            tags: tags.value,
                            model,
                        }),
                    ],
                ]
            },
            SavedBlogTemplate: () => [
                modifyFields(model, {
                    template_name: () => "",
                    template_description: () => "Reusable blog post template.",
                    template_tags: () => "",
                    template_save_status: () => "idle",
                    template_feedback: () => "Template saved.",
                }),
                [],
            ],
            FailedSavingBlogTemplate: ({ reason }) => [
                modifyFields(model, {
                    template_save_status: () => "idle",
                    template_feedback: () =>
                        `Could not save template: ${reason}`,
                }),
                [],
            ],
            ClickedLink: ({ request }) =>
                M.value(request).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        Internal: ({ url }) => {
                            if (isAppScope(url.pathname)) {
                                return [
                                    model,
                                    [navigateInternal(urlToString(url))],
                                ]
                            }

                            return [model, [loadExternal(urlToString(url))]]
                        },
                        External: ({ href }) => [model, [loadExternal(href)]],
                    })
                ),
            GotSidebarTooltipMessage: ({ tooltipId: key, message }) =>
                delegateSidebarTooltip(model, key, message),
            ToggledBlogSidebarIsCollapsed: () => [
                modifyFields(model, {
                    isSidebarCollapsed: (isCollapsed) => !isCollapsed,
                }),
                [],
            ],
            ToggledBlogSidebarMobileIsOpen: () => [
                modifyFields(model, {
                    isSidebarMobileOpen: (isOpen) => !isOpen,
                }),
                [],
            ],
            ChangedUrl: ({ pathname }) => {
                const [routeKind, routeSlug] = parseBlogRoute(pathname)
                const sidebarRouteKind =
                    routeKind === "post" ? "drafts" : routeKind

                return [
                    updateLoadedBlogDraft(
                        modifyFields(model, {
                            routeKind: () => routeKind,
                            sidebarRouteKind: () => sidebarRouteKind,
                            routeBase: () => routeBaseFor(pathname),
                            routeSlug: () => routeSlug,
                            status: () => "loading",
                            maybeError: () => Option.none(),
                        }),
                        model.documents,
                        model.postMetadata,
                        model.availableTags,
                        model.entityTags
                    ),
                    [],
                ]
            },
            LoadedBlogDraft: ({
                documents,
                postMetadata,
                tags,
                entityTags,
            }) => [
                updateLoadedBlogDraft(
                    modifyFields(model, {
                        sourceDocuments: () => documents,
                        postMetadata: () => postMetadata,
                        documents: () =>
                            applyAssignments(documents, model.assignments),
                        availableTags: () => tags,
                        entityTags: () => entityTags,
                    }),
                    applyAssignments(documents, model.assignments),
                    postMetadata,
                    tags,
                    entityTags
                ),
                [],
            ],
            LoadedBlogAssignments: ({ assignments }) => {
                const documents = applyAssignments(
                    model.sourceDocuments,
                    assignments
                )
                return [
                    updateLoadedBlogDraft(
                        modifyFields(model, {
                            assignments: () => assignments,
                            documents: () => documents,
                        }),
                        documents,
                        model.postMetadata,
                        model.availableTags,
                        model.entityTags
                    ),
                    [],
                ]
            },
            SavedBlogDraft: ({ document, metadata }) => [
                modifyFields(model, {
                    documentId: () => document.id,
                    sourceDocuments: () =>
                        upsertBlogDocument(model.sourceDocuments, document),
                    documents: () =>
                        upsertBlogDocument(model.documents, document),
                    postMetadata: () =>
                        upsertBlogPostMetadata(model.postMetadata, metadata),
                    published: () => document.published,
                    sidebarRouteKind: () =>
                        document.published ? "published" : "drafts",
                    status: () => "ready",
                    maybeError: () => Option.none(),
                }),
                (() => {
                    const routeSlug =
                        model.slug.trim() === ""
                            ? document.id
                            : model.slug.trim()

                    if (routeSlug === model.routeSlug) {
                        return [loadBlogDraft()]
                    }

                    return [
                        navigateInternal(
                            blogPostLink(model.routeBase, document)
                        ),
                        loadBlogDraft(),
                    ]
                })(),
            ],
            FailedLoadingBlogDraft: ({ reason }) => [
                modifyFields(model, {
                    status: () => "error",
                    maybeError: () => Option.some(reason),
                }),
                [],
            ],
            FailedSavingBlogDraft: ({ reason }) => [
                modifyFields(model, {
                    status: () => "error",
                    maybeError: () => Option.some(reason),
                }),
                [],
            ],
            CompletedNavigateInternal: () => [model, []],
            CompletedLoadExternal: () => [model, []],
            GotBlogRichTextEditorMessage: ({ message }) =>
                updateBlogEditor(model, message),
        })
    )

const tagListView = (
    tags: ReadonlyArray<string>,
    h: HtmlBuilder<Message>,
    disabled = false
): Html => {
    return Array.match(tags, {
        onEmpty: () =>
            h.p([h.Class("text-sm text-muted-foreground")], ["No tags yet"]),
        onNonEmpty: (nonEmptyTags) =>
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                nonEmptyTags.map((tag) =>
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ClickedRemoveBlogTag({ value: tag })),
                            h.Disabled(disabled),
                            h.Class(tagChipClasses),
                            h.AriaLabel(`Remove tag ${tag}`),
                        ],
                        [tag, h.span([h.Class("text-muted-foreground")], ["x"])]
                    )
                )
            ),
    })
}

export const blogPostLink = (
    routeBase: string,
    document: typeof BlogDocumentSchema.Type
): string => {
    const href = content_item_href("blog", document.id)
    const search = new URLSearchParams({ mode: "edit" })
    const subdomain_match = /^\/blog\/subdomains\/([^/]+)$/.exec(routeBase)
    const subdomain_slug = subdomain_match?.[1]
    if (subdomain_slug !== undefined) search.set("subdomain", subdomain_slug)
    return `${href}?${search.toString()}`
}

const blogListHeading = (routeKind: BlogRoute): string =>
    routeKind === "published" ? "Published posts" : "Drafts"

const blogListEmptyLabel = (routeKind: BlogRoute): string =>
    routeKind === "published" ? "No published posts yet." : "No drafts yet."

const blogVisibleDocuments = (
    routeKind: BlogRoute,
    documents: ReadonlyArray<typeof BlogDocumentSchema.Type>
): ReadonlyArray<typeof BlogDocumentSchema.Type> => {
    if (routeKind === "published") {
        return documents.filter((document) => document.published)
    }

    if (routeKind === "drafts") {
        return documents.filter((document) => !document.published)
    }

    return documents
}

const dedupeBlogDocuments = (
    documents: ReadonlyArray<typeof BlogDocumentSchema.Type>
): ReadonlyArray<typeof BlogDocumentSchema.Type> => {
    const documentsByKey = documents.reduce((result, document) => {
        const slug = document.slug?.trim()
        const key = slug === undefined || slug === "" ? document.id : slug
        const maybeExistingDocument = result.get(key)

        if (
            maybeExistingDocument === undefined ||
            document.updated_at > maybeExistingDocument.updated_at
        ) {
            result.set(key, document)
        }

        return result
    }, new Map<string, typeof BlogDocumentSchema.Type>())

    return [...documentsByKey.values()]
}

const upsertBlogDocument = (
    documents: ReadonlyArray<typeof BlogDocumentSchema.Type>,
    document: typeof BlogDocumentSchema.Type
): ReadonlyArray<typeof BlogDocumentSchema.Type> => {
    const nextDocuments = documents.filter(
        (currentDocument) => currentDocument.id !== document.id
    )

    return [...nextDocuments, document]
}

const upsertBlogPostMetadata = (
    metadata: ReadonlyArray<typeof BlogPostMetadata.Type>,
    entry: typeof BlogPostMetadata.Type
): ReadonlyArray<typeof BlogPostMetadata.Type> => [
    ...metadata.filter(
        (current) => current.blog_post_id !== entry.blog_post_id
    ),
    entry,
]

const blogListView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const visibleDocuments = blogVisibleDocuments(
        model.routeKind,
        dedupeBlogDocuments(model.documents)
    )

    return h.div(
        [h.Class("mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:px-6")],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-4")],
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
                                ["Blog"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [blogListHeading(model.routeKind)]
                            ),
                        ]
                    ),
                    h.a(
                        [
                            ...(model.can_write === false
                                ? [h.AriaDisabled(true)]
                                : [h.Href(`${model.routeBase}/new/`)]),
                            h.Class(
                                "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        ["New post"]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-4")],
                visibleDocuments.length === 0
                    ? [
                          h.div(
                              [
                                  h.Class(
                                      "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-8 text-sm text-muted-foreground"
                                  ),
                              ],
                              [blogListEmptyLabel(model.routeKind)]
                          ),
                      ]
                    : visibleDocuments.map((document) =>
                          h.keyed("article")(
                              document.id,
                              [
                                  h.Class(
                                      "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
                                  ),
                              ],
                              [
                                  h.a(
                                      [
                                          h.Href(
                                              blogPostLink(
                                                  model.routeBase,
                                                  document
                                              )
                                          ),
                                          h.Class(
                                              "block space-y-2 rounded-[var(--radius-control)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                          ),
                                      ],
                                      [
                                          h.h2(
                                              [
                                                  h.Class(
                                                      "text-lg font-semibold text-foreground"
                                                  ),
                                              ],
                                              [document.title]
                                          ),
                                          h.div(
                                              [
                                                  h.Class(
                                                      "text-sm text-muted-foreground"
                                                  ),
                                              ],
                                              [document.slug ?? document.id]
                                          ),
                                      ]
                                  ),
                              ]
                          )
                      )
            ),
        ]
    )
}

const stableToggledBlogSidebarIsCollapsed = ToggledBlogSidebarIsCollapsed()
const stableToggledBlogSidebarMobileIsOpen = ToggledBlogSidebarMobileIsOpen()

const toSidebarTooltipMessage = (
    key: string,
    message: import("@foldkit/ui/tooltip").Message
) => GotSidebarTooltipMessage({ tooltipId: key, message })

const mapSidebarTooltipCommands = (
    key: string,
    commands: ReadonlyArray<Command.Command<Tooltip.Message>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) =>
                GotSidebarTooltipMessage({ tooltipId: key, message })
            )
        )
    )

const delegateSidebarTooltip = (
    model: Model,
    key: string,
    message: Tooltip.Message
): UpdateReturn => {
    const sidebarTooltips = getSidebarTooltipsState()

    const maybeTooltip =
        key === "toggle"
            ? sidebarTooltips.toggle
            : key === "home"
              ? sidebarTooltips.home
              : sidebarTooltips.navItems[key]

    if (maybeTooltip === undefined) {
        return [model, []]
    }

    const { model: nextTooltip, commands = [] } = Tooltip.update(
        maybeTooltip,
        message
    )

    const nextSidebarTooltips =
        key === "toggle"
            ? {
                  ...sidebarTooltips,
                  toggle: nextTooltip,
              }
            : key === "home"
              ? {
                    ...sidebarTooltips,
                    home: nextTooltip,
                }
              : {
                    ...sidebarTooltips,
                    navItems: {
                        ...sidebarTooltips.navItems,
                        [key]: nextTooltip,
                    },
                }

    setSidebarTooltipsState(nextSidebarTooltips)

    return [
        {
            ...model,
            sidebarTooltipsRevision: model.sidebarTooltipsRevision + 1,
        },
        mapSidebarTooltipCommands(key, commands),
    ]
}

const blogSidebarView = (model: Model, h: HtmlBuilder<Message>) =>
    sidebarShellView<Message>(
        {
            currentRoute: model.sidebarRouteKind,
            title: BLOG_SIDEBAR_TITLE,
            subtitle: BLOG_SIDEBAR_SUBTITLE,
            homeHref: `${model.routeBase}/published/`,
            homeIcon: BLOG_HOME_ICON,
            toggleIconCollapsed: AppIcon.IconSidebarOpen,
            toggleIconExpanded: AppIcon.IconPanelLeft,
            navItems: BLOG_NAV_ITEMS.map((item) => ({
                ...item,
                href: `${model.routeBase}/${item.routeTag}/`,
            })),
            sidebarTooltips: getSidebarTooltipsState(),
            isCollapsed: model.isSidebarCollapsed,
            onToggle: stableToggledBlogSidebarIsCollapsed,
            toSidebarTooltipMessage,
        },
        h
    )

const blogSidebarMobileView = (model: Model, h: HtmlBuilder<Message>) =>
    sidebarShellMobileView<Message>(
        {
            currentRoute: model.sidebarRouteKind,
            title: BLOG_SIDEBAR_TITLE,
            subtitle: BLOG_SIDEBAR_SUBTITLE,
            homeHref: `${model.routeBase}/published/`,
            homeIcon: BLOG_HOME_ICON,
            navItems: BLOG_NAV_ITEMS.map((item) => ({
                ...item,
                href: `${model.routeBase}/${item.routeTag}/`,
            })),
            isOpen: model.isSidebarMobileOpen,
            onToggle: stableToggledBlogSidebarMobileIsOpen,
        },
        h
    )

const blogShellView = (
    model: Model,
    routeBody: Html,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("min-h-screen bg-background text-foreground")],
        [
            blogSidebarMobileView(model, h),
            h.div(
                [h.Class("flex h-[calc(100dvh-4rem)] overflow-hidden")],
                [
                    blogSidebarView(model, h),
                    h.main(
                        [
                            h.Class(
                                "relative z-0 flex-1 h-full min-h-0 overflow-auto bg-background p-4 md:p-8"
                            ),
                        ],
                        [
                            h.keyed("div")(
                                `${model.routeKind}:${model.routeSlug}`,
                                [],
                                [routeBody]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

export const titleForRoute = (model: Model): string =>
    model.routeKind === "drafts"
        ? "Drafts"
        : model.routeKind === "published"
          ? "Published posts"
          : model.routeKind === "new"
            ? "New post"
            : model.title || model.routeSlug || "Blog post"

export const contentView = (
    model: Model,
    h: HtmlBuilder<Message>,
    link_suggestions: ReadonlyArray<LinkSuggestion> = []
): Html => {
    if (isListRouteKind(model.routeKind)) {
        return blogListView(model, h)
    }

    const plainText = richTextEditorPlainText(model.editor)

    return h.div(
        [h.Class("min-h-screen bg-background text-foreground")],
        [
            h.form(
                [
                    h.Id("blog-post-form"),
                    h.Class("contents"),
                    h.OnSubmit(ClickedSaveBlogDraft()),
                ],
                []
            ),
            h.div(
                [h.Class(blogLayoutClasses)],
                [
                    h.section(
                        [h.Class("grid gap-6")],
                        [
                            h.div(
                                [h.Class(panelClasses)],
                                [
                                    h.div(
                                        [h.Class("grid gap-4")],
                                        [
                                            h.label(
                                                [
                                                    h.For("blog-post-title"),
                                                    h.Class("grid gap-2"),
                                                ],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                blogTitleClasses
                                                            ),
                                                        ],
                                                        ["Title"]
                                                    ),
                                                    h.input([
                                                        h.Attribute(
                                                            "form",
                                                            "blog-post-form"
                                                        ),
                                                        h.Disabled(
                                                            model.can_write ===
                                                                false
                                                        ),
                                                        h.Id("blog-post-title"),
                                                        h.Name("title"),
                                                        h.Value(model.title),
                                                        h.Placeholder(
                                                            "New post title"
                                                        ),
                                                        h.Class(
                                                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
                                                        ),
                                                        h.OnInput((value) =>
                                                            UpdatedBlogTitle({
                                                                value,
                                                            })
                                                        ),
                                                    ]),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "grid gap-4 sm:grid-cols-2"
                                                    ),
                                                ],
                                                [
                                                    h.label(
                                                        [h.Class("grid gap-2")],
                                                        [
                                                            h.span(
                                                                [
                                                                    h.Class(
                                                                        blogTitleClasses
                                                                    ),
                                                                ],
                                                                ["Slug"]
                                                            ),
                                                            h.input([
                                                                h.Attribute(
                                                                    "form",
                                                                    "blog-post-form"
                                                                ),
                                                                h.Disabled(
                                                                    model.can_write ===
                                                                        false
                                                                ),
                                                                h.Id(
                                                                    "blog-post-slug"
                                                                ),
                                                                h.Name("slug"),
                                                                h.Value(
                                                                    model.slug
                                                                ),
                                                                h.Placeholder(
                                                                    "my-post-slug"
                                                                ),
                                                                h.Class(
                                                                    inputClasses
                                                                ),
                                                                h.Pattern(
                                                                    "[a-z0-9]+(?:-[a-z0-9]+)*"
                                                                ),
                                                                h.Attribute(
                                                                    "maxlength",
                                                                    "500"
                                                                ),
                                                                h.AriaDescribedBy(
                                                                    "blog-post-slug-hint"
                                                                ),
                                                                h.OnInput(
                                                                    (value) =>
                                                                        UpdatedBlogSlug(
                                                                            {
                                                                                value,
                                                                            }
                                                                        )
                                                                ),
                                                            ]),
                                                            h.span(
                                                                [
                                                                    h.Id(
                                                                        "blog-post-slug-hint"
                                                                    ),
                                                                    h.Class(
                                                                        "text-xs text-muted-foreground"
                                                                    ),
                                                                ],
                                                                [
                                                                    "Route under /blog for the selected publication. Use lowercase letters, numbers, and single hyphens.",
                                                                ]
                                                            ),
                                                        ]
                                                    ),
                                                    h.label(
                                                        [h.Class("grid gap-2")],
                                                        [
                                                            h.span(
                                                                [
                                                                    h.Class(
                                                                        blogTitleClasses
                                                                    ),
                                                                ],
                                                                ["Author"]
                                                            ),
                                                            h.input([
                                                                h.Attribute(
                                                                    "form",
                                                                    "blog-post-form"
                                                                ),
                                                                h.Disabled(
                                                                    model.can_write ===
                                                                        false
                                                                ),
                                                                h.Id(
                                                                    "blog-post-author"
                                                                ),
                                                                h.Name(
                                                                    "author"
                                                                ),
                                                                h.Value(
                                                                    model.author
                                                                ),
                                                                h.Placeholder(
                                                                    "Author name"
                                                                ),
                                                                h.Class(
                                                                    inputClasses
                                                                ),
                                                                h.OnInput(
                                                                    (value) =>
                                                                        UpdatedBlogAuthor(
                                                                            {
                                                                                value,
                                                                            }
                                                                        )
                                                                ),
                                                            ]),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.label(
                                                [h.Class("grid gap-2")],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                blogTitleClasses
                                                            ),
                                                        ],
                                                        ["Excerpt"]
                                                    ),
                                                    h.textarea([
                                                        h.Attribute(
                                                            "form",
                                                            "blog-post-form"
                                                        ),
                                                        h.Disabled(
                                                            model.can_write ===
                                                                false
                                                        ),
                                                        h.Id(
                                                            "blog-post-excerpt"
                                                        ),
                                                        h.Name("excerpt"),
                                                        h.Value(model.excerpt),
                                                        h.Attribute(
                                                            "maxlength",
                                                            "1000"
                                                        ),
                                                        h.AriaDescribedBy(
                                                            "blog-post-excerpt-hint"
                                                        ),
                                                        h.Placeholder(
                                                            "A short summary for post lists and previews"
                                                        ),
                                                        h.Class(
                                                            `${inputClasses} min-h-24 resize-y py-3`
                                                        ),
                                                        h.OnInput((value) =>
                                                            UpdatedBlogExcerpt({
                                                                value,
                                                            })
                                                        ),
                                                    ]),
                                                    h.span(
                                                        [
                                                            h.Id(
                                                                "blog-post-excerpt-hint"
                                                            ),
                                                            h.Class(
                                                                "text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            `${model.excerpt.length}/1000 characters`,
                                                        ]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class(editorClasses)],
                                [
                                    RichTextEditor<Message>(
                                        {
                                            id: editorContainerId,
                                            model: model.editor,
                                            isDisabled:
                                                model.can_write === false,
                                            linkSuggestions: link_suggestions,
                                            toParentMessage: (message) =>
                                                GotBlogRichTextEditorMessage({
                                                    message,
                                                }),
                                            label: "Body",
                                            description:
                                                "Write the post body here. Blocks can be reordered with the left handle.",
                                            placeholder: "Start writing...",
                                        },
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.aside(
                        [h.Class("grid gap-6")],
                        [
                            h.section(
                                [h.Class(panelClasses)],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-4 flex items-start justify-between gap-3"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [],
                                                [
                                                    h.h2(
                                                        [
                                                            h.Class(
                                                                "text-lg font-semibold text-foreground"
                                                            ),
                                                        ],
                                                        ["Metadata"]
                                                    ),
                                                    h.p(
                                                        [
                                                            h.Class(
                                                                "text-sm text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            "Draft settings and organization.",
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.span(
                                                [
                                                    h.Class(
                                                        "text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                [blogStatusLabel(model.status)]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-4 flex items-center justify-between gap-3"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "text-sm font-medium text-foreground"
                                                            ),
                                                        ],
                                                        ["Published"]
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "text-sm text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            model.published
                                                                ? "Marked for publication."
                                                                : "Hidden as draft.",
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            Button(
                                                {
                                                    type: "button",
                                                    variant: "secondary",
                                                    isDisabled:
                                                        model.can_write ===
                                                        false,
                                                    onClick:
                                                        UpdatedBlogPublished({
                                                            value: !model.published,
                                                        }),
                                                    children: [
                                                        model.published
                                                            ? "Set draft"
                                                            : "Set published",
                                                    ],
                                                },
                                                h
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-4 flex items-center justify-between gap-3"
                                            ),
                                        ],
                                        [
                                            Button(
                                                {
                                                    type: "submit",
                                                    attributes: [
                                                        h.Attribute(
                                                            "form",
                                                            "blog-post-form"
                                                        ),
                                                    ],
                                                    variant: "secondary",
                                                    isDisabled:
                                                        model.can_write ===
                                                            false ||
                                                        model.status ===
                                                            "loading" ||
                                                        model.status ===
                                                            "saving",
                                                    className: "px-5 py-2.5",
                                                    children: [
                                                        model.published
                                                            ? "Save published"
                                                            : "Save draft",
                                                    ],
                                                },
                                                h
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("mb-4")],
                                        [
                                            Option.match(model.maybeError, {
                                                onNone: () => h.span([], []),
                                                onSome: (error) =>
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                                                            ),
                                                        ],
                                                        [error]
                                                    ),
                                            }),
                                        ]
                                    ),
                                    h.fieldset(
                                        [h.Class("mb-5 grid gap-4")],
                                        [
                                            h.legend(
                                                [
                                                    h.Class(
                                                        "mb-1 text-sm font-semibold text-foreground"
                                                    ),
                                                ],
                                                ["Search appearance"]
                                            ),
                                            h.label(
                                                [h.Class("grid gap-2")],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                blogTitleClasses
                                                            ),
                                                        ],
                                                        ["SEO title"]
                                                    ),
                                                    h.input([
                                                        h.Attribute(
                                                            "form",
                                                            "blog-post-form"
                                                        ),
                                                        h.Disabled(
                                                            model.can_write ===
                                                                false
                                                        ),
                                                        h.Id(
                                                            "blog-post-seo-title"
                                                        ),
                                                        h.Name("seo_title"),
                                                        h.Value(model.seoTitle),
                                                        h.Attribute(
                                                            "maxlength",
                                                            "70"
                                                        ),
                                                        h.AriaDescribedBy(
                                                            "blog-post-seo-title-hint"
                                                        ),
                                                        h.Placeholder(
                                                            "Defaults to the post title"
                                                        ),
                                                        h.Class(inputClasses),
                                                        h.OnInput((value) =>
                                                            UpdatedBlogSeoTitle(
                                                                { value }
                                                            )
                                                        ),
                                                    ]),
                                                    h.span(
                                                        [
                                                            h.Id(
                                                                "blog-post-seo-title-hint"
                                                            ),
                                                            h.Class(
                                                                "text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            `${model.seoTitle.length}/70 characters`,
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.label(
                                                [h.Class("grid gap-2")],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                blogTitleClasses
                                                            ),
                                                        ],
                                                        ["SEO description"]
                                                    ),
                                                    h.textarea([
                                                        h.Attribute(
                                                            "form",
                                                            "blog-post-form"
                                                        ),
                                                        h.Disabled(
                                                            model.can_write ===
                                                                false
                                                        ),
                                                        h.Id(
                                                            "blog-post-seo-description"
                                                        ),
                                                        h.Name(
                                                            "seo_description"
                                                        ),
                                                        h.Value(
                                                            model.seoDescription
                                                        ),
                                                        h.Attribute(
                                                            "maxlength",
                                                            "200"
                                                        ),
                                                        h.AriaDescribedBy(
                                                            "blog-post-seo-description-hint"
                                                        ),
                                                        h.Placeholder(
                                                            "Defaults to the excerpt"
                                                        ),
                                                        h.Class(
                                                            `${inputClasses} min-h-24 resize-y py-3`
                                                        ),
                                                        h.OnInput((value) =>
                                                            UpdatedBlogSeoDescription(
                                                                { value }
                                                            )
                                                        ),
                                                    ]),
                                                    h.span(
                                                        [
                                                            h.Id(
                                                                "blog-post-seo-description-hint"
                                                            ),
                                                            h.Class(
                                                                "text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            `${model.seoDescription.length}/200 characters`,
                                                        ]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.label(
                                        [h.Class("grid gap-2")],
                                        [
                                            h.span(
                                                [h.Class(blogTitleClasses)],
                                                ["Tag input"]
                                            ),
                                            h.div(
                                                [h.Class("flex gap-2")],
                                                [
                                                    h.input([
                                                        h.Attribute(
                                                            "form",
                                                            "blog-post-form"
                                                        ),
                                                        h.Disabled(
                                                            model.can_write ===
                                                                false
                                                        ),
                                                        h.Value(model.tagInput),
                                                        h.Placeholder(
                                                            "Add a tag"
                                                        ),
                                                        h.Class(inputClasses),
                                                        h.OnInput((value) =>
                                                            UpdatedBlogTagInput(
                                                                { value }
                                                            )
                                                        ),
                                                    ]),
                                                    Button(
                                                        {
                                                            type: "button",
                                                            isDisabled:
                                                                model.can_write ===
                                                                false,
                                                            onClick:
                                                                ClickedAddBlogTag(),
                                                            className:
                                                                "whitespace-nowrap",
                                                            children: ["Add"],
                                                        },
                                                        h
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("mt-4 grid gap-3")],
                                        [
                                            h.div(
                                                [h.Class(blogTitleClasses)],
                                                ["Tags"]
                                            ),
                                            tagListView(
                                                model.tags,
                                                h,
                                                model.can_write === false
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [],
                                                [
                                                    `Characters: ${plainText.length}`,
                                                ]
                                            ),
                                            h.div(
                                                [],
                                                [
                                                    `Blocks: ${model.editor.document.children.length}`,
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            blogTemplateView(model, h),
        ]
    )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: `${titleForRoute(model)} | Blog | Urm`,
    body: blogShellView(model, contentView(model, h), h),
})

export const bootstrap = (): void => {
    const container = document.getElementById("foldkit-root")
    if (!container) throw new Error("Missing #foldkit-root mount element")
    const maybeFoldkitShell = container.closest<HTMLElement>(".foldkit-shell")

    const application = Runtime.makeApplication({
        Model,
        init: (url: Url) => {
            const [next_model, commands] = init(url.pathname)
            return { model: next_model, commands }
        },
        update: (
            model: Parameters<typeof update>[0],
            message: Parameters<typeof update>[1]
        ) => {
            const [next_model, commands] = update(model, message)
            return { model: next_model, commands }
        },
        view,
        subscriptions,
        routing: {
            onUrlRequest: (request: (typeof ClickedLink.Type)["request"]) =>
                ClickedLink({ request }),
            onUrlChange: (url: Url) => ChangedUrl({ pathname: url.pathname }),
        },
        container,
    })

    Runtime.run(application)

    requestAnimationFrame(() => {
        maybeFoldkitShell?.setAttribute("data-foldkit-ready", "true")
    })
}

export { isAppScope }
