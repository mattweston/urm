import { PublicationState } from "@urm/domain/schemas/publications"
import {
    ConfigurationLibrary,
    ConfigurationSummary,
    PublicationConfiguration,
    ChangePublicationConfiguration,
} from "@urm/contracts/publication-config"
import { content_item_href } from "@urm/features/content"
import { Effect, Option, Schema as S, Struct } from "effect"
import { Command, File, Navigation, Submodel, Subscription } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { taggedStruct } from "foldkit/schema"
import type { Url } from "foldkit/url"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import { DomainId, PublicationRouteModule } from "./records.ts"
import {
    PagesLibrary,
    PagesLibrarySummary,
    PublicationPages,
    ChangePages,
    PageAction,
    PageFields,
} from "@urm/contracts/pages"
import { ContentTemplateSource } from "@urm/domain/schemas/content-templates"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"
import {
    RichTextEditorMessage,
    UploadedImage,
    FailedUploadImage,
    ResolvedRichTextImageUrls,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"
import * as Pages from "./pages-legacy.ts"
export {
    Page,
    ChangedUrl,
    RequestedSaveLandingContent,
    content_page_id_for_path,
    has_homepage_conflict,
} from "./pages-legacy.ts"

const ui_schema = S.Struct(
    Struct.omit(Pages.Model.fields, [
        "pages",
        "publication_modules",
        "can_write",
        "can_configure_modules",
    ])
)
const ui_only = (model: Pages.Model) =>
    Struct.omit(model, [
        "pages",
        "publication_modules",
        "can_write",
        "can_configure_modules",
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
})
export type Model = typeof Model.Type
const Loaded = taggedStruct("PagesLoaded", {
    epoch: S.Number,
    editor_epoch: S.Number,
    remote: Remote.Model,
    saved: S.Boolean,
    created_template_id: S.NullOr(S.String),
})
const Saved = taggedStruct("PagesSaved", {
    ...Struct.omit(Loaded.fields, ["_tag", "remote"]),
    settlement: taggedStruct(
        "MutationSucceeded",
        Remote.messages.MutationSucceeded
    ),
})
const Failed = taggedStruct("PagesFailed", {
    epoch: S.Number,
    editor_epoch: S.Number,
    error: S.String,
})
const ImageResult = taggedStruct("PagesImageResult", {
    epoch: S.Number,
    editor_epoch: S.Number,
    message: RichTextEditorMessage,
})
export const Refreshed = taggedStruct("PagesRefreshed")
export const SelectedHomepage = taggedStruct("PagesSelectedHomepage", {
    id: S.String,
})
export const ChangedHomepagePublication = taggedStruct(
    "PagesChangedHomepagePublication",
    { publication_state: PublicationState }
)
export const RequestedPagePublication = taggedStruct(
    "PagesRequestedPublication",
    {
        id: S.String,
        publication_state: PublicationState,
    }
)
export const CreateFromTemplate = taggedStruct("PagesCreateFromTemplate", {
    ...PageFields.fields,
    template_source: ContentTemplateSource,
})
const CompletedNavigatePage = taggedStruct("CompletedNavigatePage")
export const Message = S.Union([
    CompletedNavigatePage,
    SelectedHomepage,
    ChangedHomepagePublication,
    RequestedPagePublication,
    Pages.Message,
    Loaded,
    Saved,
    Failed,
    ImageResult,
    Refreshed,
    CreateFromTemplate,
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
    entities: [PagesLibrary, ConfigurationLibrary],
    queries: [PublicationPages, PublicationConfiguration],
    mutations: [ChangePages, ChangePublicationConfiguration],
})
const query = (model: Pick<Model, "domain_id" | "subdomain_slug">) =>
    Data.query(
        PublicationPages,
        { domain_id: model.domain_id, subdomain_slug: model.subdomain_slug },
        { select: PagesLibrarySummary, first: 1 }
    )
const configuration_query = (
    model: Pick<Model, "domain_id" | "subdomain_slug">
) =>
    Data.query(
        PublicationConfiguration,
        { domain_id: model.domain_id, subdomain_slug: model.subdomain_slug },
        { select: ConfigurationSummary, first: 1 }
    )
const configuration = (model: Model) => {
    const result = configuration_query(model).read(model)
    return result._tag === "Ready" ? result.value.items[0] : undefined
}
export const library = (model: Model) => {
    const result = query(model).read({ remote: model.remote })
    return result._tag === "Ready" ? result.value.items[0] : undefined
}
export const project = (model: Model): Pages.Model => ({
    ...model.ui,
    pages: (library(model)?.pages ?? []).flatMap((page) =>
        Option.match(S.decodeUnknownOption(Pages.Page)(page), {
            onNone: () => [],
            onSome: (value) => [value],
        })
    ),
    publication_modules: [
        {
            module_id: "blog",
            included: configuration(model)?.blog_included ?? true,
        },
        {
            module_id: "events",
            included: configuration(model)?.events_included ?? false,
        },
    ].flatMap((item) =>
        Option.toArray(
            S.decodeUnknownOption(PublicationRouteModule)({
                ...item,
                _id: `${model.domain_id}:${item.module_id}`,
                domain_id: model.domain_id,
                _creationTime: 0,
                created_at: 0,
                updated_at: 0,
            })
        )
    ),
    can_configure_modules: configuration(model) !== undefined,
    is_busy: model.pending,
    can_write: model.can_write && !model.pending && !model.ui.is_loading,
})
export const init = (url: Url): Model => ({
    ui: ui_only(Pages.init(url)),
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    subdomain_slug: Option.getOrNull(Pages.init(url).requested_subdomain_slug),
    can_write: false,
    epoch: 0,
    editor_epoch: 0,
    pending: false,
})
export const clear = (model: Model): Model => ({
    ...model,
    ui: { ...ui_only(Pages.clear(project(model))), new_page_title: "" },
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    can_write: false,
    epoch: model.epoch + 1,
    editor_epoch: model.editor_epoch + 1,
    pending: false,
})
const NavigateCreatedPage = Command.define("NavigateCreatedPage", {
    args: { id: S.String, subdomain_slug: S.NullOr(S.String) },
    messages: [CompletedNavigatePage],
    execute: ({ id, subdomain_slug }) =>
        Navigation.pushUrl(
            `${content_item_href("web", id)}?mode=edit${subdomain_slug === null ? "" : `&subdomain=${encodeURIComponent(subdomain_slug)}`}`
        ).pipe(Effect.as(CompletedNavigatePage())),
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
const check_session = Effect.fn("Pages.checkSession")(function* (
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
                message: "Page access changed",
            })
        )
    return api
})
const read_library = Effect.fn("Pages.read")(function* (
    scope: Pick<Model, "domain_id" | "subdomain_slug">
) {
    const api = yield* ContactsApi
    const loaded = yield* Data.prefetch(
        { remote: Remote.initial },
        query(scope)
    ).pipe(Effect.provide(api.remote(scope.domain_id)))
    if (query(scope).read(loaded)._tag !== "Ready")
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message: "Pages unavailable",
            })
        )
    const configured = yield* Data.prefetch(
        loaded,
        configuration_query(scope)
    ).pipe(Effect.provide(api.remote(scope.domain_id)))
    return configured.remote
})
const LoadPagesLibrary = Command.define("LoadPagesLibrary", {
    args: scope_fields,
    messages: [Loaded, Failed],
    execute: (args) =>
        Effect.gen(function* () {
            yield* check_session(args.account_id, args.domain_id, false)
            return Loaded({
                ...args,
                remote: yield* read_library(args),
                saved: false,
                created_template_id: null,
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Failed({
                        ...args,
                        error: "Pages could not be loaded. Check publication access and refresh.",
                    })
                )
            )
        ),
})
const ChangePagesLibrary = Command.define("ChangePagesLibrary", {
    args: { ...scope_fields, action: PageAction },
    messages: [Saved, Failed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const action =
                args.action._tag === "create" && args.action.id === ""
                    ? { ...args.action, id: crypto.randomUUID() }
                    : args.action
            const request_id = crypto.randomUUID()
            const outcome = yield* Remote.mutate(
                ChangePages,
                {
                    domain_id: args.domain_id,
                    account_id: args.account_id,
                    subdomain_slug: args.subdomain_slug,
                    action,
                },
                request_id
            ).pipe(Effect.provide(api.remote(args.domain_id)))
            return Saved({
                ...args,
                settlement: {
                    _tag: "MutationSucceeded",
                    requestId: request_id,
                    entities: outcome.entities,
                    connections: outcome.connections,
                },
                saved: true,
                created_template_id:
                    action._tag === "create" &&
                    action.template_source?.provenance === "organization"
                        ? action.id
                        : null,
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Failed({
                        ...args,
                        error: "Page could not be saved. Check the one landing page limit, homepage, slug and access, or refresh before retrying.",
                    })
                )
            )
        ),
})
const ChangePublicationModule = Command.define("ChangePublicationModule", {
    args: {
        ...scope_fields,
        module_id: S.Literals(["blog", "events"]),
        included: S.Boolean,
    },
    messages: [Saved, Failed],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const request_id = crypto.randomUUID()
            const outcome = yield* Remote.mutate(
                ChangePublicationConfiguration,
                {
                    domain_id: args.domain_id,
                    account_id: args.account_id,
                    subdomain_slug: args.subdomain_slug,
                    action: {
                        _tag: "save_module",
                        module_id: args.module_id,
                        included: args.included,
                    },
                },
                request_id
            ).pipe(Effect.provide(api.remote(args.domain_id)))
            return Saved({
                ...args,
                settlement: {
                    _tag: "MutationSucceeded",
                    requestId: request_id,
                    entities: outcome.entities,
                    connections: outcome.connections,
                },
                saved: false,
                created_template_id: null,
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    Failed({
                        ...args,
                        error: "Publication module could not be saved.",
                    })
                )
            )
        ),
})
const UploadPageImage = Command.define("UploadPageImage", {
    args: { ...scope_fields, file: File.File },
    messages: [ImageResult],
    execute: (args) =>
        Effect.gen(function* () {
            const api = yield* check_session(
                args.account_id,
                args.domain_id,
                true
            )
            const src = yield* api.upload_image(
                args.domain_id,
                args.file,
                "Pages"
            )
            return ImageResult({
                ...args,
                message: UploadedImage({
                    src,
                    resolved_src: src,
                    alt: args.file.name || "Image",
                }),
            })
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    ImageResult({
                        ...args,
                        message: FailedUploadImage({
                            error: "Page image upload failed. Check access and try again.",
                        }),
                    })
                )
            )
        ),
})
const ResolvePageImages = Command.define("ResolvePageImages", {
    args: { ...scope_fields, urls: S.Array(S.String) },
    messages: [ImageResult],
    execute: (args) =>
        Effect.succeed(
            ImageResult({
                ...args,
                message: ResolvedRichTextImageUrls({
                    images: args.urls.map((url) => ({ stored_url: url, url })),
                }),
            })
        ),
})
const RejectPageChange = Command.define("RejectPageChange", {
    args: scope_fields,
    messages: [Failed],
    execute: (args) =>
        Effect.succeed(
            Failed({ ...args, error: "Check page fields before saving." })
        ),
})
const CreateArgs = S.Struct({
    ...PageFields.fields,
    template_source: S.optional(ContentTemplateSource),
})
const UpdateArgs = S.Struct({ ...PageFields.fields, page_id: S.String })
const ReorderArgs = S.Struct({
    positions: S.Array(
        S.Struct({ page_id: S.String, order_position: S.Number })
    ),
})
const RemoveArgs = S.Struct({ page_id: S.String })
const UploadArgs = S.Struct({ file: File.File })
const ResolveArgs = S.Struct({ urls: S.Array(S.String) })
const translate = (
    model: Model,
    command: Pages.UpdateReturn[1][number]
): UpdateReturn[1] => {
    let action: PageAction | undefined
    if (
        command.name === "CreatePublicationPage" &&
        S.is(CreateArgs)(command.args)
    )
        action = {
            _tag: "create",
            id: "",
            ...command.args,
            template_source: command.args.template_source ?? null,
        }
    else if (
        command.name === "UpdatePublicationPage" &&
        S.is(UpdateArgs)(command.args)
    )
        action = { _tag: "update", id: command.args.page_id, ...command.args }
    else if (
        command.name === "RemovePublicationPage" &&
        S.is(RemoveArgs)(command.args)
    )
        action = { _tag: "remove", id: command.args.page_id }
    else if (
        command.name === "ReorderPublicationPages" &&
        S.is(ReorderArgs)(command.args)
    )
        action = {
            _tag: "reorder",
            positions: command.args.positions.map((p) => ({
                id: p.page_id,
                order_position: p.order_position,
            })),
        }
    else if (
        command.name === "UploadRichTextImage" &&
        S.is(UploadArgs)(command.args)
    )
        return [UploadPageImage({ ...scope(model), file: command.args.file })]
    else if (
        command.name === "ResolveRichTextImageUrls" &&
        S.is(ResolveArgs)(command.args)
    )
        return [ResolvePageImages({ ...scope(model), urls: command.args.urls })]
    else if (
        [
            "CreatePublicationPage",
            "UpdatePublicationPage",
            "RemovePublicationPage",
            "ReorderPublicationPages",
            "SavePublicationModule",
        ].includes(command.name)
    )
        return [RejectPageChange(scope(model))]
    else return [command]
    return [ChangePagesLibrary({ ...scope(model), action })]
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
    if (
        account.account_id === model.account_id &&
        account.domain_id === model.domain_id &&
        account.can_write === model.can_write
    )
        return [model, []]
    const next = { ...clear(model), ...account, pending: true }
    return [next, [LoadPagesLibrary(scope(next))]]
}
const run_ui = (model: Model, message: Pages.Message): UpdateReturn => {
    const domain_id = S.decodeUnknownOption(DomainId)(model.domain_id)
    const owner =
        model.subdomain_slug === null
            ? []
            : [
                  {
                      id: model.domain_id,
                      domain_id: model.domain_id,
                      name: model.subdomain_slug,
                      slug: model.subdomain_slug,
                  },
              ]
    const [ui, commands] = Pages.update(
        project(model),
        message,
        domain_id,
        owner
    )
    const next = {
        ...model,
        ui: ui_only(ui),
        pending: model.pending || ui.is_busy,
    }
    return [next, commands.flatMap((command) => translate(next, command))]
}
export const update = (
    model: Model,
    message: Message,
    _domain?: Option.Option<DomainId>,
    _subdomains?: ReadonlyArray<unknown>
): UpdateReturn => {
    if ("epoch" in message && message.epoch !== model.epoch) return [model, []]
    if (message._tag === "CompletedNavigatePage") return [model, []]
    if (message._tag === "PagesLoaded" || message._tag === "PagesSaved") {
        const next = {
            ...model,
            remote:
                message._tag === "PagesSaved"
                    ? Data.reduce(model, message.settlement).remote
                    : message.remote,
            pending: false,
            ui: { ...model.ui, is_loading: false },
        }
        if (message.editor_epoch !== model.editor_epoch && message.saved)
            return [next, []]
        if (message.saved) {
            const [saved, commands] = run_ui(next, Pages.SucceededPageAction())
            return [
                saved,
                message.created_template_id === null
                    ? commands
                    : [
                          ...commands,
                          NavigateCreatedPage({
                              id: message.created_template_id,
                              subdomain_slug: model.subdomain_slug,
                          }),
                      ],
            ]
        }
        if (Option.isSome(next.ui.edit_draft)) return [next, []]
        return run_ui(next, Pages.LoadedPages({ pages: project(next).pages }))
    }
    if (message._tag === "PagesFailed")
        return message.editor_epoch === model.editor_epoch
            ? run_ui(
                  { ...model, pending: false },
                  Pages.FailedPageAction({ error: message.error })
              )
            : [
                  {
                      ...model,
                      pending: false,
                      ui: {
                          ...model.ui,
                          is_loading: false,
                          error: Option.some(message.error),
                      },
                  },
                  [],
              ]
    if (message._tag === "PagesImageResult")
        return message.editor_epoch !== model.editor_epoch
            ? [model, []]
            : run_ui(
                  { ...model, pending: false },
                  Pages.GotPageRichTextEditorMessage({
                      message: message.message,
                  })
              )
    if (message._tag === "PagesRefreshed")
        return model.pending || model.domain_id === ""
            ? [model, []]
            : [{ ...model, pending: true }, [LoadPagesLibrary(scope(model))]]
    if (message._tag === "ChangedUrl") {
        const ui = Pages.changed_url(project(model), message.url)
        const slug = Option.getOrNull(ui.requested_subdomain_slug)
        const owner_changed = slug !== model.subdomain_slug
        const next = {
            ...model,
            ui: ui_only({
                ...ui,
                is_loading: owner_changed ? true : model.ui.is_loading,
            }),
            subdomain_slug: slug,
            editor_epoch: model.editor_epoch + 1,
            ...(owner_changed
                ? {
                      remote: Remote.initial,
                      epoch: model.epoch + 1,
                      pending: model.domain_id !== "",
                  }
                : {}),
        }
        return owner_changed && model.domain_id !== ""
            ? [next, [LoadPagesLibrary(scope(next))]]
            : run_ui(next, message)
    }
    if (
        [
            "LoadedPages",
            "LoadedPublicationModules",
            "SucceededPageAction",
            "FailedPageAction",
        ].includes(message._tag)
    )
        return [model, []]
    if (!model.can_write || model.pending || model.ui.is_loading)
        return [model, []]
    if (message._tag === "PagesRequestedPublication") {
        const page = library(model)?.pages.find(
            (page) => page.id === message.id
        )
        if (page?.content_type !== "landing_json" || !page.is_homepage)
            return [model, []]
        return [
            { ...model, pending: true },
            [
                ChangePagesLibrary({
                    ...scope(model),
                    action: {
                        _tag: "set_publication_state",
                        id: page.id,
                        publication_state: message.publication_state,
                    },
                }),
            ],
        ]
    }
    if (
        message._tag === "PagesSelectedHomepage" ||
        message._tag === "PagesChangedHomepagePublication"
    ) {
        const page = library(model)?.pages.find((page) =>
            message._tag === "PagesSelectedHomepage"
                ? page.id === message.id
                : page.is_homepage
        )
        if (page?.content_type !== "landing_json") return [model, []]
        const action: PageAction =
            message._tag === "PagesSelectedHomepage"
                ? { _tag: "select_homepage", id: page.id }
                : {
                      _tag: "set_publication_state",
                      id: page.id,
                      publication_state: message.publication_state,
                  }
        return [
            { ...model, pending: true },
            [ChangePagesLibrary({ ...scope(model), action })],
        ]
    }
    if (message._tag === "RequestedSetPublicationModule")
        return message.module_id === "blog" || message.module_id === "events"
            ? [
                  { ...model, pending: true },
                  [
                      ChangePublicationModule({
                          ...scope(model),
                          module_id: message.module_id,
                          included: message.included,
                      }),
                  ],
              ]
            : [model, []]
    if (message._tag === "PagesCreateFromTemplate") {
        if (
            message.content_type === "landing_json" &&
            (library(model)?.pages ?? []).some(
                (page) => page.content_type === "landing_json"
            )
        )
            return [
                {
                    ...model,
                    ui: {
                        ...model.ui,
                        error: Option.some(
                            "This publication already has a landing page. Edit or remove it before using a template."
                        ),
                    },
                },
                [],
            ]
        return [
            { ...model, pending: true },
            [
                ChangePagesLibrary({
                    ...scope(model),
                    action: { ...message, _tag: "create", id: "" },
                }),
            ],
        ]
    }
    const next =
        message._tag === "StartedEditingPage" ||
        message._tag === "CancelledPageEdit"
            ? { ...model, editor_epoch: model.editor_epoch + 1 }
            : model
    return run_ui(next, message)
}
export const subscriptions = Subscription.lift(Pages.subscriptions)<
    Model,
    Message
>({ toChildModel: project, toParentMessage: (message) => message })
export type { ViewInputs } from "./pages-legacy.ts"
export const view = Submodel.defineView<Model, Message, Pages.ViewInputs>(
    (model, inputs, h) => {
        const pages = library(model)?.pages ?? []
        const homepage = pages.find((page) => page.is_homepage)
        const disabled =
            !model.can_write || model.pending || model.ui.is_loading
        const field_class =
            "min-h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 text-base text-foreground"
        return h.div(
            [h.Class("grid gap-4")],
            [
                ...(model.ui.route === "index"
                    ? [
                          h.section(
                              [
                                  h.Class(
                                      "grid gap-3 rounded-[var(--radius-surface)] border border-border bg-card p-4"
                                  ),
                                  h.AriaLabel("Homepage selection"),
                              ],
                              [
                                  h.label(
                                      [
                                          h.Class(
                                              "grid gap-1 text-sm font-medium"
                                          ),
                                      ],
                                      [
                                          "Homepage landing page",
                                          h.select(
                                              [
                                                  h.Name(
                                                      "homepage_landing_page"
                                                  ),
                                                  h.Value(homepage?.id ?? ""),
                                                  h.Disabled(disabled),
                                                  h.Class(field_class),
                                                  h.OnChange((id) =>
                                                      SelectedHomepage({ id })
                                                  ),
                                              ],
                                              [
                                                  h.option(
                                                      [
                                                          h.Value(""),
                                                          h.Disabled(true),
                                                      ],
                                                      ["Select a landing page"]
                                                  ),
                                                  ...pages
                                                      .filter(
                                                          (page) =>
                                                              page.content_type ===
                                                              "landing_json"
                                                      )
                                                      .map((page) =>
                                                          h.option(
                                                              [
                                                                  h.Value(
                                                                      page.id
                                                                  ),
                                                              ],
                                                              [page.title]
                                                          )
                                                      ),
                                              ]
                                          ),
                                      ]
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          "The landing page serves / when selected and published. Each publication can have one landing page.",
                                      ]
                                  ),
                                  ...(homepage?.content_type === "landing_json"
                                      ? [
                                            h.label(
                                                [
                                                    h.Class(
                                                        "grid gap-1 text-sm font-medium"
                                                    ),
                                                ],
                                                [
                                                    "Homepage publication state",
                                                    h.select(
                                                        [
                                                            h.Name(
                                                                "homepage_publication_state"
                                                            ),
                                                            h.Value(
                                                                homepage.publication_state
                                                            ),
                                                            h.Disabled(
                                                                disabled
                                                            ),
                                                            h.Class(
                                                                field_class
                                                            ),
                                                            h.OnChange(
                                                                (value) =>
                                                                    ChangedHomepagePublication(
                                                                        {
                                                                            publication_state:
                                                                                Option.getOrElse(
                                                                                    S.decodeUnknownOption(
                                                                                        PublicationState
                                                                                    )(
                                                                                        value
                                                                                    ),
                                                                                    () =>
                                                                                        homepage.publication_state
                                                                                ),
                                                                        }
                                                                    )
                                                            ),
                                                        ],
                                                        PublicationState.literals.map(
                                                            (value) =>
                                                                h.option(
                                                                    [
                                                                        h.Value(
                                                                            value
                                                                        ),
                                                                    ],
                                                                    [value]
                                                                )
                                                        )
                                                    ),
                                                ]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    "Choose published to include this homepage in builds. Changes save automatically; building and deploying are separate steps.",
                                                ]
                                            ),
                                        ]
                                      : []),
                              ]
                          ),
                      ]
                    : []),
                h.submodel({
                    slotId: "pages-ui",
                    model: project(model),
                    view: Pages.view,
                    viewInputs: {
                        ...inputs,
                        can_write: !disabled,
                        can_preview: true,
                    },
                    toParentMessage: (message) => message,
                }),
            ]
        )
    }
)

export const publicationControlsView = Submodel.defineView<
    Model,
    Message,
    { page_id: string; is_editing: boolean }
>((model, inputs, h) => {
    const page = library(model)?.pages.find(
        (page) => page.id === inputs.page_id
    )
    if (page?.content_type !== "landing_json") return h.empty
    const disabled =
        !model.can_write ||
        model.pending ||
        model.ui.is_loading ||
        inputs.is_editing
    const button_class =
        "inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-background px-4 text-sm font-medium disabled:opacity-50"
    return h.section(
        [
            h.AriaLabel("Landing publication"),
            h.Class("grid gap-3 border-b border-border bg-card px-5 py-4"),
        ],
        [
            h.p(
                [h.Class("text-sm font-medium"), h.AriaLive("polite")],
                [
                    page.is_homepage
                        ? `Homepage · ${page.publication_state}`
                        : "Landing draft · not selected as homepage",
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    page.is_homepage
                        ? h.button(
                              [
                                  h.Type("button"),
                                  h.Disabled(disabled),
                                  h.Class(button_class),
                                  h.OnClick(
                                      RequestedPagePublication({
                                          id: page.id,
                                          publication_state:
                                              page.publication_state ===
                                              "published"
                                                  ? "draft"
                                                  : "published",
                                      })
                                  ),
                              ],
                              [
                                  page.publication_state === "published"
                                      ? "Return to draft"
                                      : "Publish homepage",
                              ]
                          )
                        : h.button(
                              [
                                  h.Type("button"),
                                  h.Disabled(disabled),
                                  h.Class(button_class),
                                  h.OnClick(SelectedHomepage({ id: page.id })),
                              ],
                              ["Use as homepage"]
                          ),
                ]
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    inputs.is_editing
                        ? "Save draft or cancel editing before changing publication status."
                        : page.is_homepage
                          ? "Publishing includes this saved homepage in builds. Build and deploy the site separately."
                          : "Select this landing page as the homepage to publish it. The previous homepage will return to draft.",
                ]
            ),
            ...Option.match(model.ui.error, {
                onNone: () => [],
                onSome: (error) => [
                    h.p(
                        [h.Role("alert"), h.Class("text-sm text-destructive")],
                        [error]
                    ),
                ],
            }),
        ]
    )
})
