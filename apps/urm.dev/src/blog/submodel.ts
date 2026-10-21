import { Effect, Option, Schema as S, Struct } from "effect"
import { Command, File, Navigation, Submodel } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { taggedStruct } from "foldkit/schema"
import { Remote, RemoteData } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import {
    BlogLibrary,
    BlogLibrarySummary,
    PublicationBlog,
    ChangeBlog,
    BlogFields,
    BlogTemplateFields,
    BlogAction,
    type BlogPost,
    type BlogAssignment,
} from "@urm/contracts/blog"
import { BlogPostSlug } from "@urm/domain/schemas/publications"
import * as Blog from "@urm/features/blog/submodel"
import {
    content_item_id_for_path,
    is_content_creation_path,
    content_item_href,
} from "@urm/features/content"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"
import {
    RichTextEditorMessage,
    UploadedImage,
    FailedUploadImage,
    ResolvedRichTextImageUrls,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"

const ui_schema = S.Struct(
    Struct.omit(Blog.Model.fields, [
        "documents",
        "sourceDocuments",
        "postMetadata",
        "assignments",
        "availableTags",
        "entityTags",
        "can_write",
    ])
)
const ui_only = (model: Blog.ModelType) =>
    Struct.omit(model, [
        "documents",
        "sourceDocuments",
        "postMetadata",
        "assignments",
        "availableTags",
        "entityTags",
        "can_write",
    ])
export const Model = S.Struct({
    ui: ui_schema,
    remote: Remote.Model,
    account_id: S.String,
    domain_id: S.String,
    subdomain_slug: S.NullOr(S.String),
    can_write: S.Boolean,
    epoch: S.Number,
    editor_epoch: S.Number,
    pending: S.Boolean,
    dirty: S.Boolean,
})
export type Model = typeof Model.Type
const Loaded = taggedStruct("BlogLoaded", {
    epoch: S.Number,
    editor_epoch: S.Number,
    remote: Remote.Model,
    saved_id: S.NullOr(S.String),
    saved_template: S.Boolean,
    from_template: S.Boolean,
})
const Saved = taggedStruct("BlogSaved", {
    ...Struct.omit(Loaded.fields, ["_tag", "remote"]),
    settlement: taggedStruct(
        "MutationSucceeded",
        Remote.messages.MutationSucceeded
    ),
})
const Failed = taggedStruct("BlogFailed", {
    epoch: S.Number,
    editor_epoch: S.Number,
    error: S.String,
    template: S.Boolean,
})
const ImageResult = taggedStruct("BlogImageResult", {
    epoch: S.Number,
    editor_epoch: S.Number,
    message: RichTextEditorMessage,
})
export const UseTemplate = taggedStruct("UseBlogTemplate", {
    template_id: S.String,
})
export const Refreshed = taggedStruct("BlogRefreshed")
export const Message = S.Union([
    Blog.Message,
    Loaded,
    Saved,
    Failed,
    ImageResult,
    UseTemplate,
    Refreshed,
])
export type Message = typeof Message.Type
export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, ContactsApi>>,
]
const CacheModel = S.Struct({ remote: Remote.Model })
const Cache = Surface.application({
    Model: CacheModel,
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: typeof CacheModel.Type) => ({ model }),
})
export const Data = Remote.make({
    model: Cache.model.remote,
    entities: [BlogLibrary],
    queries: [PublicationBlog],
    mutations: [ChangeBlog],
})
const query = (domain_id: string, subdomain_slug: string | null) =>
    Data.query(
        PublicationBlog,
        { domain_id, subdomain_slug },
        { select: BlogLibrarySummary, first: 1 }
    )
const read = (model: Model) =>
    query(model.domain_id, model.subdomain_slug).read({
        remote: model.remote,
    })
/** The row on its own, for callers that need only the value. */
export const library = (model: Model) => {
    const result = read(model)
    return result._tag === "Ready" ? result.value.items[0] : undefined
}
const feature_post = (
    post: typeof BlogPost.Type,
    assignment?: typeof BlogAssignment.Type
) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    content_type: post.content_type,
    ...(assignment === undefined ? {} : { slug: assignment.slug }),
    published: assignment?.publication_state === "published",
    created_at: post.created_at,
    updated_at: Math.max(post.updated_at, assignment?.updated_at ?? 0),
})
const metadata = (post: typeof BlogPost.Type) => ({
    blog_post_id: post.id,
    excerpt: post.excerpt,
    seo_title: post.seo_title,
    seo_description: post.seo_description,
    template_source: post.template_source,
})
export const project = (model: Model): Blog.ModelType => {
    const base = {
        ...model.ui,
        availableTags: [],
        entityTags: [],
        can_write: model.can_write && !model.pending,
    }
    const none = {
        documents: [],
        sourceDocuments: [],
        postMetadata: [],
        assignments: [],
    } as const
    return RemoteData.render(read(model), {
        loading: (): Blog.ModelType => ({
            ...base,
            ...none,
            maybeError: Option.none(),
        }),
        notFound: (): Blog.ModelType => ({
            ...base,
            ...none,
            maybeError: Option.none(),
        }),
        failed: (error): Blog.ModelType => ({
            ...base,
            ...none,
            maybeError: Option.some(error.message),
        }),
        data: (page, freshness): Blog.ModelType => {
            const data = page.items[0]
            const posts = data?.posts ?? []
            const assignments = data?.assignments ?? []
            return {
                ...base,
                documents: posts.map((post) =>
                    feature_post(
                        post,
                        assignments.find(
                            (item) => item.blog_post_id === post.id
                        )
                    )
                ),
                sourceDocuments: posts.map((post) => feature_post(post)),
                postMetadata: posts.map(metadata),
                assignments,
                maybeError:
                    freshness._tag === "Stale"
                        ? Option.some(freshness.error.message)
                        : Option.none(),
            }
        },
    })
}

export const content_blog_path = (
    pathname: string,
    search: string
): Option.Option<string> => {
    const id = content_item_id_for_path(pathname, "blog")
    if (id === null) return Option.none()
    const slug = new URLSearchParams(search).get("subdomain")
    const base =
        slug !== null && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
            ? `/blog/subdomains/${slug}`
            : "/blog"
    if (is_content_creation_path(pathname, "blog"))
        return Option.some(`${base}/new`)
    if (
        !/^(?:[a-z0-9]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.test(
            id
        )
    )
        return Option.none()
    return Option.some(`${base}/${encodeURIComponent(id)}`)
}
const route_owner = (route_base: string) =>
    /^\/blog\/subdomains\/([^/]+)/.exec(route_base)?.[1] ?? null
const current_path = (model: Model) =>
    `${model.ui.routeBase}/${model.ui.routeKind === "new" ? "new" : model.ui.routeSlug || model.ui.routeKind}`
export const init = (pathname: string): Model => {
    const ui = ui_only(Blog.init(pathname)[0])
    return {
        ui,
        remote: Remote.initial,
        account_id: "",
        domain_id: "",
        subdomain_slug: route_owner(ui.routeBase),
        can_write: false,
        epoch: 0,
        editor_epoch: 0,
        pending: false,
        dirty: false,
    }
}
export const clear = (model: Model): Model => ({
    ...init(current_path(model)),
    epoch: model.epoch + 1,
    editor_epoch: model.editor_epoch + 1,
})
const scope_fields = {
    account_id: S.String,
    domain_id: S.String,
    subdomain_slug: S.NullOr(S.String),
    epoch: S.Number,
    editor_epoch: S.Number,
}
const scope = (model: Model) => ({
    account_id: model.account_id,
    domain_id: model.domain_id,
    subdomain_slug: model.subdomain_slug,
    epoch: model.epoch,
    editor_epoch: model.editor_epoch,
})
const check_session = Effect.fn("Blog.checkSession")(function* (
    account_id: string,
    domain_id: string,
    write: boolean
) {
    const api = yield* ContactsApi
    const session = yield* api.session()
    if (
        session.account_id !== account_id ||
        !session.domains.some(
            (workspace) =>
                workspace.id === domain_id && (!write || workspace.can_write)
        )
    )
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message: "Blog access changed. Sign in or refresh.",
            })
        )
    return api
})
const read_library = Effect.fn("Blog.read")(function* (
    domain_id: string,
    subdomain_slug: string | null
) {
    const api = yield* ContactsApi
    const loaded = yield* Data.prefetch(
        { remote: Remote.initial },
        query(domain_id, subdomain_slug)
    ).pipe(Effect.provide(api.remote(domain_id)))
    if (query(domain_id, subdomain_slug).read(loaded)._tag !== "Ready")
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message: "Blog could not be loaded.",
            })
        )
    return loaded.remote
})
const LoadBlogLibrary = Command.define("LoadBlogLibrary", {
    args: scope_fields,
    messages: [Loaded, Failed],
    execute: ({ account_id, domain_id, subdomain_slug, epoch, editor_epoch }) =>
        Effect.gen(function* () {
            yield* check_session(account_id, domain_id, false)
            return Loaded({
                epoch,
                editor_epoch,
                remote: yield* read_library(domain_id, subdomain_slug),
                saved_id: null,
                saved_template: false,
                from_template: false,
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Failed({
                        epoch,
                        editor_epoch,
                        template: false,
                        error: "Blog could not be loaded. Check publication access and refresh.",
                    })
                )
            )
        ),
})
const ChangeBlogLibrary = Command.define("ChangeBlogLibrary", {
    args: { ...scope_fields, action: BlogAction },
    messages: [Saved, Failed],
    execute: ({
        account_id,
        domain_id,
        subdomain_slug,
        epoch,
        editor_epoch,
        action: requested,
    }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const action =
                requested.id === ""
                    ? { ...requested, id: crypto.randomUUID() }
                    : requested
            const request_id = crypto.randomUUID()
            const outcome = yield* Remote.mutate(
                ChangeBlog,
                { domain_id, account_id, subdomain_slug, action },
                request_id
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Saved({
                epoch,
                editor_epoch,
                settlement: {
                    _tag: "MutationSucceeded",
                    requestId: request_id,
                    entities: outcome.entities,
                    connections: outcome.connections,
                },
                saved_id:
                    action._tag === "save" || action._tag === "from_template"
                        ? action.id
                        : null,
                saved_template: action._tag === "save_template",
                from_template: action._tag === "from_template",
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Failed({
                        epoch,
                        editor_epoch,
                        template: requested._tag === "save_template",
                        error: "Blog could not be saved. Check slug uniqueness, field limits and access, or refresh before retrying.",
                    })
                )
            )
        ),
})
const RejectBlogChange = Command.define("RejectBlogChange", {
    args: { epoch: S.Number, editor_epoch: S.Number, template: S.Boolean },
    messages: [Failed],
    execute: (args) =>
        Effect.succeed(
            Failed({
                ...args,
                error: "Check the post title, URL slug and field lengths before saving.",
            })
        ),
})
const UploadBlogImage = Command.define("UploadBlogImage", {
    args: { ...scope_fields, file: File.File },
    messages: [ImageResult],
    execute: ({ account_id, domain_id, epoch, editor_epoch, file }) =>
        Effect.gen(function* () {
            const api = yield* check_session(account_id, domain_id, true)
            const src = yield* api.upload_image(domain_id, file, "Blog")
            return ImageResult({
                epoch,
                editor_epoch,
                message: UploadedImage({
                    src,
                    alt: file.name || "Image",
                    resolved_src: src,
                }),
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    ImageResult({
                        epoch,
                        editor_epoch,
                        message: FailedUploadImage({
                            error: "Blog image upload failed. Check access and try again.",
                        }),
                    })
                )
            )
        ),
})
const ResolveBlogImages = Command.define("ResolveBlogImages", {
    args: { epoch: S.Number, editor_epoch: S.Number, urls: S.Array(S.String) },
    messages: [ImageResult],
    execute: ({ epoch, editor_epoch, urls }) =>
        Effect.succeed(
            ImageResult({
                epoch,
                editor_epoch,
                message: ResolvedRichTextImageUrls({
                    images: urls.map((url) => ({ stored_url: url, url })),
                }),
            })
        ),
})
const NavigateDesktopBlog = Command.define("NavigateDesktopBlog", {
    args: { href: S.String },
    messages: [Blog.CompletedNavigateInternal],
    execute: ({ href }) =>
        Navigation.pushUrl(href).pipe(
            Effect.as(Blog.CompletedNavigateInternal())
        ),
})
const SaveArgs = S.Struct({ model: Blog.Model })
const TemplateArgs = S.Struct({
    name: S.String,
    description: S.String,
    tags: S.Array(S.String),
    model: Blog.Model,
})
const UploadArgs = S.Struct({ file: File.File })
const ResolveArgs = S.Struct({ urls: S.Array(S.String) })
const NavigateArgs = S.Struct({ href: S.String })
const fields = (model: Blog.ModelType) => ({
    title: model.title.trim() || "Untitled post",
    content: Blog.serializeBlogDocumentContent({
        author: model.author,
        document: model.editor.document,
        tags: model.tags,
    }),
    content_type: "rich_text_json",
    excerpt: model.excerpt.trim() || null,
    seo_title: model.seoTitle.trim() || null,
    seo_description: model.seoDescription.trim() || null,
})
const translate = (
    model: Model,
    command: Command.Command<Blog.MessageType>
): UpdateReturn[1] => {
    if (command.name === "LoadBlogDraft") return []
    if (command.name === "NavigateInternal" && S.is(NavigateArgs)(command.args))
        return [NavigateDesktopBlog(command.args)]
    if (
        command.name === "UploadRichTextImage" &&
        S.is(UploadArgs)(command.args)
    )
        return [UploadBlogImage({ ...scope(model), file: command.args.file })]
    if (
        command.name === "ResolveRichTextImageUrls" &&
        S.is(ResolveArgs)(command.args)
    )
        return [
            ResolveBlogImages({
                epoch: model.epoch,
                editor_epoch: model.editor_epoch,
                urls: command.args.urls,
            }),
        ]
    if (command.name === "SaveBlogDraft" && S.is(SaveArgs)(command.args)) {
        const form = command.args.model
        const decoded = S.decodeUnknownOption(BlogFields)(fields(form))
        const slug = S.decodeUnknownOption(BlogPostSlug)(
            form.slug.trim().toLowerCase() ||
                (form.title.trim() || "Untitled post")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")
        )
        if (Option.isNone(decoded) || Option.isNone(slug))
            return [
                RejectBlogChange({
                    epoch: model.epoch,
                    editor_epoch: model.editor_epoch,
                    template: false,
                }),
            ]
        return [
            ChangeBlogLibrary({
                ...scope(model),
                action: {
                    _tag: "save",
                    id:
                        form.documentId === Blog.BLOG_DOCUMENT_ID
                            ? ""
                            : form.documentId,
                    is_new: form.documentId === Blog.BLOG_DOCUMENT_ID,
                    ...decoded.value,
                    slug: slug.value,
                    published: form.published,
                },
            }),
        ]
    }
    if (
        command.name === "SaveBlogTemplate" &&
        S.is(TemplateArgs)(command.args)
    ) {
        const decoded = S.decodeUnknownOption(BlogTemplateFields)({
            ...fields(command.args.model),
            name: command.args.name,
            description: command.args.description,
            tags: command.args.tags,
        })
        return Option.isNone(decoded)
            ? [
                  RejectBlogChange({
                      epoch: model.epoch,
                      editor_epoch: model.editor_epoch,
                      template: true,
                  }),
              ]
            : [
                  ChangeBlogLibrary({
                      ...scope(model),
                      action: {
                          _tag: "save_template",
                          id: "",
                          expected_revision: 0,
                          ...decoded.value,
                      },
                  }),
              ]
    }
    return [command]
}
export const synchronize = (
    model: Model,
    account: {
        account_id: string
        domain_id: string
        can_write: boolean
    } | null
): UpdateReturn => {
    if (account === null || account.domain_id === "")
        return [model.domain_id === "" ? model : clear(model), []]
    const subdomain_slug = route_owner(model.ui.routeBase)
    if (
        account.account_id === model.account_id &&
        account.domain_id === model.domain_id &&
        account.can_write === model.can_write &&
        subdomain_slug === model.subdomain_slug
    )
        return [model, []]
    const next = { ...clear(model), ...account, subdomain_slug, pending: true }
    return [next, [LoadBlogLibrary(scope(next))]]
}
const hydrate = (model: Model): Blog.ModelType => {
    const projected = project(model)
    const [posts] = Blog.update(
        projected,
        Blog.LoadedBlogDraft({
            documents: projected.sourceDocuments,
            postMetadata: projected.postMetadata,
            tags: [],
            entityTags: [],
        })
    )
    return Blog.update(
        posts,
        Blog.LoadedBlogAssignments({ assignments: projected.assignments })
    )[0]
}
export const update = (model: Model, message: Message): UpdateReturn => {
    if ("epoch" in message && message.epoch !== model.epoch) return [model, []]
    if (message._tag === "BlogLoaded" || message._tag === "BlogSaved") {
        const next = {
            ...model,
            remote:
                message._tag === "BlogSaved"
                    ? Data.reduce(model, message.settlement).remote
                    : message.remote,
            pending: false,
        }
        let feature = model.dirty ? project(next) : hydrate(next)
        let commands: UpdateReturn[1] = []
        if (
            message.saved_id !== null &&
            message.editor_epoch === model.editor_epoch
        ) {
            const post = library(next)?.posts.find(
                (item) => item.id === message.saved_id
            )
            if (post !== undefined) {
                const [saved] = Blog.update(
                    feature,
                    Blog.SavedBlogDraft({
                        document: feature_post(
                            post,
                            library(next)?.assignments.find(
                                (item) => item.blog_post_id === post.id
                            )
                        ),
                        metadata: metadata(post),
                    })
                )
                feature = saved
                commands = [
                    NavigateDesktopBlog({
                        href: `${content_item_href("blog", post.id)}${model.subdomain_slug === null ? "" : `?subdomain=${encodeURIComponent(model.subdomain_slug)}`}`,
                    }),
                ]
            }
        }
        if (
            message.saved_template &&
            message.editor_epoch === model.editor_epoch
        )
            feature = Blog.update(feature, Blog.SavedBlogTemplate())[0]
        return [
            {
                ...next,
                ui: ui_only(feature),
                dirty:
                    message.editor_epoch === model.editor_epoch &&
                    message.saved_id !== null
                        ? false
                        : model.dirty,
            },
            commands,
        ]
    }
    if (message._tag === "BlogFailed") {
        const next = { ...model, pending: false }
        if (message.editor_epoch !== model.editor_epoch) return [next, []]
        const feature = Blog.update(
            project(next),
            message.template
                ? Blog.FailedSavingBlogTemplate({ reason: message.error })
                : Blog.FailedSavingBlogDraft({ reason: message.error })
        )[0]
        return [{ ...next, ui: ui_only(feature) }, []]
    }
    if (message._tag === "BlogRefreshed")
        return model.pending || model.domain_id === ""
            ? [model, []]
            : [{ ...model, pending: true }, [LoadBlogLibrary(scope(model))]]
    if (message._tag === "UseBlogTemplate")
        return !model.can_write || model.pending
            ? [model, []]
            : [
                  { ...model, pending: true },
                  [
                      ChangeBlogLibrary({
                          ...scope(model),
                          action: {
                              _tag: "from_template",
                              id: "",
                              template_id: message.template_id,
                          },
                      }),
                  ],
              ]
    if (message._tag === "BlogImageResult")
        return message.editor_epoch !== model.editor_epoch
            ? [model, []]
            : apply_feature(
                  model,
                  Blog.GotBlogRichTextEditorMessage({
                      message: message.message,
                  })
              )
    if (
        message._tag === "LoadedBlogDraft" ||
        message._tag === "LoadedBlogAssignments" ||
        message._tag === "SavedBlogDraft" ||
        message._tag === "SavedBlogTemplate"
    )
        return [model, []]
    if (
        message._tag !== "ChangedUrl" &&
        message._tag !== "CompletedNavigateInternal" &&
        (!model.can_write || model.pending)
    )
        return [model, []]
    return apply_feature(model, message)
}
const apply_feature = (
    model: Model,
    message: Blog.MessageType
): UpdateReturn => {
    const [feature, commands] = Blog.update(project(model), message)
    const changed_route = message._tag === "ChangedUrl"
    const next = {
        ...model,
        ui: ui_only(feature),
        editor_epoch: model.editor_epoch + (changed_route ? 1 : 0),
        dirty: changed_route
            ? false
            : model.dirty ||
              message._tag.startsWith("UpdatedBlog") ||
              message._tag === "ClickedAddBlogTag" ||
              message._tag === "ClickedRemoveBlogTag" ||
              feature.editor.document !== model.ui.editor.document,
    }
    if (
        changed_route &&
        route_owner(feature.routeBase) !== model.subdomain_slug &&
        model.domain_id !== ""
    )
        return synchronize(next, {
            account_id: model.account_id,
            domain_id: model.domain_id,
            can_write: model.can_write,
        })
    const translated = commands.flatMap((command) => translate(next, command))
    return [
        {
            ...next,
            pending:
                model.pending ||
                translated.some(
                    (command) => command.name === "ChangeBlogLibrary"
                ),
        },
        translated,
    ]
}
export const changed_url = (model: Model, pathname: string): UpdateReturn =>
    update(model, Blog.ChangedUrl({ pathname }))
export const view = Submodel.defineView<Model, Message, Blog.ViewInputs>(
    (model, inputs, h) =>
        h.div(
            [],
            [
                ...(model.ui.status === "error"
                    ? [
                          h.button(
                              [
                                  h.Type("button"),
                                  h.OnClick(Refreshed()),
                                  h.Class(
                                      "m-4 rounded border border-border px-3 py-2 text-sm"
                                  ),
                              ],
                              ["Retry loading blog"]
                          ),
                      ]
                    : []),
                h.submodel({
                    slotId: "blog-ui",
                    model: project(model),
                    view: Blog.view,
                    viewInputs: inputs,
                    toParentMessage: (message) => message,
                }),
            ]
        )
)
export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly toChildModel: (model: ParentModel) => Model
    readonly toParentMessage: (message: Message) => ParentMessage
}) =>
    Blog.subscriptions<ParentModel, ParentMessage>({
        toChildModel: (model) => project(config.toChildModel(model)),
        toParentMessage: config.toParentMessage,
    })
