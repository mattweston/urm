import { EventCatalog, EventSummary, DomainEvents } from "@urm/contracts/events"
import { MediaLibrary, LibrarySummary, DomainMedia } from "@urm/contracts/media"
import {
    BlogLibrary,
    BlogLibrarySummary,
    PublicationBlog,
} from "@urm/contracts/blog"
import { Effect, Option, Schema as S, Struct } from "effect"
import { Command, File, Submodel, Subscription } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { taggedStruct } from "foldkit/schema"
import type { Url } from "foldkit/url"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import {
    DomainId,
    Page,
    Image,
    PublicationLayout,
    PublicationNavigationItem,
    PublicationRouteModule,
} from "./records.ts"
import * as Design from "@urm/features/design/submodel"
import {
    PublicationLayoutFields,
    PublicationConfigurationAction,
} from "@urm/domain/publication-config"
import {
    ConfigurationLibrary,
    ConfigurationSummary,
    PublicationConfiguration,
    ChangePublicationConfiguration,
} from "@urm/contracts/publication-config"
import {
    PagesLibrary,
    PagesLibrarySummary,
    PublicationPages,
} from "@urm/contracts/pages"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"
import * as Legacy from "./layout-legacy.ts"
export { GotLayoutEditorMessage } from "./layout-legacy.ts"

const editor_fields = Struct.omit(Design.Model.fields, [
    "documents",
    "pages",
    "preview_navigation",
    "preview_blog_posts",
    "preview_blog_unavailable",
    "preview_events",
    "preview_events_state",
    "preview_document",
    "preview_landing_images",
    "can_write",
])
const ui_fields = Struct.omit(Legacy.Model.fields, [
    "editor",
    "layout",
    "pages",
    "images",
    "navigation_items",
    "navigation_saved_items",
    "publication_modules",
    "can_write",
])
const ui_only = (model: Legacy.Model) => ({
    ...Struct.omit(model, [
        "editor",
        "layout",
        "pages",
        "images",
        "navigation_items",
        "navigation_saved_items",
        "publication_modules",
        "can_write",
    ]),
    editor: Struct.omit(model.editor, [
        "documents",
        "pages",
        "preview_navigation",
        "preview_blog_posts",
        "preview_blog_unavailable",
        "preview_events",
        "preview_events_state",
        "preview_document",
        "preview_landing_images",
        "can_write",
    ]),
})
export const Model = S.Struct({
    ui: S.Struct({ ...ui_fields, editor: S.Struct(editor_fields) }),
    remote: Remote.Model,
    account_id: S.String,
    domain_id: S.String,
    subdomain_slug: S.NullOr(S.String),
    can_write: S.Boolean,
    epoch: S.Number,
    pending: S.Boolean,
})
export type Model = typeof Model.Type
const Loaded = taggedStruct("ConfigurationLoaded", {
    epoch: S.Number,
    remote: Remote.Model,
    mode: S.String,
    asset_url: S.NullOr(S.String),
})
const Saved = taggedStruct("ConfigurationSaved", {
    ...Struct.omit(Loaded.fields, ["_tag", "remote"]),
    settlement: taggedStruct(
        "MutationSucceeded",
        Remote.messages.MutationSucceeded
    ),
})
const Failed = taggedStruct("ConfigurationFailed", {
    epoch: S.Number,
    mode: S.String,
    error: S.String,
})
const GotConfigurationEditorMessage = taggedStruct(
    "GotConfigurationEditorMessage",
    {
        epoch: S.Number,
        message: Legacy.Message,
    }
)
export const Refreshed = taggedStruct("ConfigurationRefreshed")
export const Message = S.Union([
    Legacy.Message,
    Loaded,
    Saved,
    Failed,
    Refreshed,
    GotConfigurationEditorMessage,
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
    entities: [
        ConfigurationLibrary,
        PagesLibrary,
        BlogLibrary,
        MediaLibrary,
        EventCatalog,
    ],
    queries: [
        PublicationConfiguration,
        PublicationPages,
        PublicationBlog,
        DomainMedia,
        DomainEvents,
    ],
    mutations: [ChangePublicationConfiguration],
})
const scope = (model: Model) => ({
    account_id: model.account_id,
    domain_id: model.domain_id,
    subdomain_slug: model.subdomain_slug,
    epoch: model.epoch,
})
const scope_fields = {
    account_id: S.String,
    domain_id: S.String,
    subdomain_slug: S.NullOr(S.String),
    epoch: S.Number,
}
const media_query = (model: Pick<Model, "domain_id">) =>
    Data.query(
        DomainMedia,
        { domain_id: model.domain_id },
        { select: LibrarySummary, first: 1 }
    )
const events_query = (model: Pick<Model, "domain_id">) =>
    Data.query(
        DomainEvents,
        { domain_id: model.domain_id },
        { select: EventSummary, first: 1 }
    )
const blog_query = (model: Pick<Model, "domain_id" | "subdomain_slug">) =>
    Data.query(
        PublicationBlog,
        { domain_id: model.domain_id, subdomain_slug: model.subdomain_slug },
        { select: BlogLibrarySummary, first: 1 }
    )
const config_query = (model: Pick<Model, "domain_id" | "subdomain_slug">) =>
    Data.query(
        PublicationConfiguration,
        { domain_id: model.domain_id, subdomain_slug: model.subdomain_slug },
        { select: ConfigurationSummary, first: 1 }
    )
const pages_query = (model: Pick<Model, "domain_id" | "subdomain_slug">) =>
    Data.query(
        PublicationPages,
        { domain_id: model.domain_id, subdomain_slug: model.subdomain_slug },
        { select: PagesLibrarySummary, first: 1 }
    )
export const configuration = (model: Model) => {
    const result = config_query(model).read(model)
    return result._tag === "Ready" ? result.value.items[0] : undefined
}
const decoded = <A, E>(schema: S.Codec<A, E, never, never>, input: unknown) =>
    Option.toArray(S.decodeUnknownOption(schema)(input))
export const project = (model: Model): Legacy.Model => {
    const config = configuration(model)
    const data = pages_query(model).read(model)
    const media = media_query(model).read(model)
    const event_data = events_query(model).read(model)
    const blog = blog_query(model).read(model)
    const blog_library = blog._tag === "Ready" ? blog.value.items[0] : undefined
    const rows = data._tag === "Ready" ? (data.value.items[0]?.pages ?? []) : []
    const owner_id = Option.getOrElse(
        model.ui.editor.selected_owner_id,
        () => model.domain_id
    )
    const base = {
        domain_id: model.domain_id,
        ...(model.subdomain_slug === null ? {} : { subdomain_id: owner_id }),
        _creationTime: 0,
        created_at: 0,
        updated_at: 0,
    }
    const pages = rows.flatMap((page) =>
        decoded(Page, {
            ...base,
            ...page,
            _id: page.id,
            ...(page.slug === null ? { slug: undefined } : {}),
            template_source: page.template_source ?? undefined,
            seo_title: page.seo_title ?? undefined,
            seo_description: page.seo_description ?? undefined,
        })
    )
    const layout = config?.layout
    const urls = [
        layout?.logo_light_url,
        layout?.logo_dark_url,
        layout?.favicon_light_url,
        layout?.favicon_dark_url,
    ].filter((url): url is string => typeof url === "string")
    const images = urls.flatMap((url) =>
        decoded(Image, {
            ...base,
            _id: url,
            url,
            alt: "",
            text: "",
            order_position: 0,
        })
    )
    const layouts =
        layout == null
            ? []
            : decoded(PublicationLayout, {
                  ...base,
                  ...layout,
                  _id: owner_id,
                  social_links_configured: true,
                  logo_light_image_id: layout.logo_light_url ?? undefined,
                  logo_dark_image_id: layout.logo_dark_url ?? undefined,
                  favicon_light_image_id: layout.favicon_light_url ?? undefined,
                  favicon_dark_image_id: layout.favicon_dark_url ?? undefined,
              })
    const navigation = (config?.navigation ?? []).flatMap((item) =>
        decoded(PublicationNavigationItem, { ...base, ...item, _id: item.id })
    )
    const modules = [
        ...decoded(PublicationRouteModule, {
            ...base,
            _id: `${owner_id}:blog`,
            module_id: "blog",
            included: config?.blog_included ?? true,
        }),
        ...decoded(PublicationRouteModule, {
            ...base,
            _id: `${owner_id}:events`,
            module_id: "events",
            included: config?.events_included ?? false,
        }),
    ]
    const preview =
        pages.find((page) =>
            Option.contains(model.ui.editor.preview_page_id, page._id)
        ) ??
        pages.find((page) => page.is_homepage) ??
        pages[0]
    return {
        ...model.ui,
        can_write: model.can_write && !model.pending,
        layout: Option.fromNullishOr(layouts[0]),
        pages,
        images,
        navigation_items: navigation,
        navigation_saved_items: navigation,
        publication_modules: modules,
        navigation_loaded: config !== undefined,
        pages_loaded: data._tag === "Ready",
        navigation_saving: model.pending,
        editor: {
            ...model.ui.editor,
            preview_page_id: Option.fromNullishOr(preview?._id),
            documents: pages.map((page) => ({
                id: page._id,
                title: page.title,
                kind: "basic",
                slug: page.slug ?? null,
                published: page.publication_state === "published",
            })),
            pages: pages.map((page) => ({
                id: page._id,
                domain_id: page.domain_id,
                owner_id,
                document_id: page._id,
                navigation_label: page.navigation_label,
                is_homepage: page.is_homepage,
                show_in_navigation: page.show_in_navigation,
                order_position: page.order_position,
                updated_at: page.updated_at,
            })),
            preview_navigation:
                navigation.length === 0
                    ? Option.none()
                    : Option.some(
                          navigation.map((item) => ({
                              id: item._id,
                              label: item.label,
                              visible: item.visible,
                              target: item.target,
                          }))
                      ),
            preview_blog_unavailable: blog._tag !== "Ready",
            preview_blog_posts:
                config?.blog_included === false
                    ? []
                    : (blog_library?.assignments ?? []).flatMap(
                          (assignment) => {
                              const post = blog_library?.posts.find(
                                  (post) => post.id === assignment.blog_post_id
                              )
                              return post === undefined
                                  ? []
                                  : [
                                        {
                                            id: post.id,
                                            title: post.title,
                                            slug: assignment.slug,
                                            published:
                                                post.editorial_state ===
                                                    "published" &&
                                                assignment.publication_state ===
                                                    "published",
                                        },
                                    ]
                          }
                      ),
            preview_events_state:
                config?.events_included !== true
                    ? "excluded"
                    : event_data._tag !== "Ready"
                      ? "unavailable"
                      : "included",
            preview_events:
                config?.events_included === true && event_data._tag === "Ready"
                    ? (event_data.value.items[0]?.events ?? [])
                    : [],
            preview_landing_images:
                media._tag === "Ready"
                    ? (media.value.items[0]?.images ?? [])
                    : [],
            preview_document:
                preview === undefined
                    ? Option.none()
                    : Option.some({
                          id: preview._id,
                          title: preview.title,
                          kind: "basic",
                          content: preview.content,
                          content_type: preview.content_type,
                          slug: preview.slug ?? null,
                          published: preview.publication_state === "published",
                      }),
        },
    }
}
export const init = (url: Url): Model => ({
    ui: ui_only(Legacy.init(url)),
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    subdomain_slug: null,
    can_write: false,
    epoch: 0,
    pending: false,
})
export const clear = (model: Model): Model => ({
    ...model,
    ui: ui_only(Legacy.clear(project(model))),
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    subdomain_slug: null,
    can_write: false,
    epoch: model.epoch + 1,
    pending: false,
})
export const changed_url = (model: Model, url: Url): Model => ({
    ...model,
    ui: ui_only(Legacy.changed_url(project(model), url)),
})
export const with_publications = (
    model: Model,
    domain: Parameters<typeof Legacy.with_publications>[1],
    subdomains: Parameters<typeof Legacy.with_publications>[2],
    account_domain?: Readonly<{
        id: string
        name: string
        slug: string
    }>
): Model => {
    const selected_domain =
        account_domain === undefined
            ? domain
            : Option.map(
                  S.decodeUnknownOption(DomainId)(account_domain.id),
                  (_id) => ({
                      _id,
                      name: account_domain.name,
                      slug: account_domain.slug,
                      updated_at: 0,
                  })
              )
    const mapped_domain = Option.flatMap(selected_domain, (domain) =>
        Option.map(
            S.decodeUnknownOption(DomainId)(model.domain_id || domain._id),
            (_id) => ({ ...domain, _id })
        )
    )
    return {
        ...model,
        ui: ui_only(
            Legacy.with_publications(project(model), mapped_domain, subdomains)
        ),
    }
}

type Tail<T extends readonly unknown[]> = T extends readonly [
    unknown,
    ...infer R,
]
    ? R
    : never
// Parent snapshots do not override the canonical Remote preview catalogs.
export const with_events = (
    model: Model,
    ..._args: Tail<Parameters<typeof Legacy.with_events>>
) => model
export const with_blog_posts = (
    model: Model,
    ..._args: Tail<Parameters<typeof Legacy.with_blog_posts>>
) => model
const check_session = Effect.fn("Configuration.checkSession")(function* (
    args: ReturnType<typeof scope>,
    write: boolean
) {
    const api = yield* ContactsApi
    const session = yield* api.session()
    if (
        session.account_id !== args.account_id ||
        !session.domains.some(
            (workspace) =>
                workspace.id === args.domain_id &&
                (!write || workspace.can_write)
        )
    )
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message: "Publication access changed",
            })
        )
    return api
})
const read = Effect.fn("Configuration.read")(function* (
    args: ReturnType<typeof scope>
) {
    const api = yield* ContactsApi
    const config = yield* Data.prefetch(
        { remote: Remote.initial },
        config_query(args)
    ).pipe(Effect.provide(api.remote(args.domain_id)))
    const result = yield* Data.prefetch(config, pages_query(args)).pipe(
        Effect.provide(api.remote(args.domain_id))
    )
    if (
        config_query(args).read(result)._tag !== "Ready" ||
        pages_query(args).read(result)._tag !== "Ready"
    )
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message: "Publication unavailable",
            })
        )
    const with_blog = yield* Data.prefetch(result, blog_query(args)).pipe(
        Effect.provide(api.remote(args.domain_id))
    )
    const with_media = yield* Data.prefetch(with_blog, media_query(args)).pipe(
        Effect.provide(api.remote(args.domain_id))
    )
    const with_events = yield* Data.prefetch(
        with_media,
        events_query(args)
    ).pipe(Effect.provide(api.remote(args.domain_id)))
    return with_events.remote
})
const LoadPublicationConfiguration = Command.define(
    "LoadPublicationConfiguration",
    {
        args: scope_fields,
        messages: [Loaded, Failed],
        execute: (args) =>
            Effect.gen(function* () {
                yield* check_session(args, false)
                return Loaded({
                    epoch: args.epoch,
                    remote: yield* read(args),
                    mode: "load",
                    asset_url: null,
                })
            }).pipe(
                Effect.catch(() =>
                    Effect.succeed(
                        Failed({
                            epoch: args.epoch,
                            mode: "load",
                            error: "Publication configuration could not be loaded. Refresh to retry.",
                        })
                    )
                )
            ),
    }
)
const SavePublicationConfiguration = Command.define(
    "SavePublicationConfiguration",
    {
        args: {
            ...scope_fields,
            action: PublicationConfigurationAction,
            mode: S.String,
            file: S.NullOr(File.File),
        },
        messages: [Saved, Failed],
        execute: (args) =>
            Effect.gen(function* () {
                const api = yield* ContactsApi
                let action = args.action
                let asset_url: string | null = null
                if (args.file !== null && action._tag === "save_layout") {
                    asset_url = yield* api.upload_image(
                        args.domain_id,
                        args.file,
                        "Pages"
                    )
                    action = {
                        ...action,
                        ...(args.mode === "logo_light"
                            ? { logo_light_url: asset_url }
                            : args.mode === "logo_dark"
                              ? { logo_dark_url: asset_url }
                              : args.mode === "favicon_light"
                                ? { favicon_light_url: asset_url }
                                : { favicon_dark_url: asset_url }),
                    }
                }
                if (action._tag === "save_navigation" && action.id === "")
                    action = { ...action, id: crypto.randomUUID() }
                const request_id = crypto.randomUUID()
                const outcome = yield* Remote.mutate(
                    ChangePublicationConfiguration,
                    {
                        domain_id: args.domain_id,
                        account_id: args.account_id,
                        subdomain_slug: args.subdomain_slug,
                        action,
                    },
                    request_id
                ).pipe(Effect.provide(api.remote(args.domain_id)))
                return Saved({
                    epoch: args.epoch,
                    settlement: {
                        _tag: "MutationSucceeded",
                        requestId: request_id,
                        entities: outcome.entities,
                        connections: outcome.connections,
                    },
                    mode: args.mode,
                    asset_url,
                })
            }).pipe(
                Effect.catch(() =>
                    Effect.succeed(
                        Failed({
                            epoch: args.epoch,
                            mode: args.mode,
                            error: "Publication configuration could not be saved. Check access and image uploads.",
                        })
                    )
                )
            ),
    }
)
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
    const next = {
        ...clear(model),
        ...account,
        pending: true,
        ui: {
            ...ui_only(Legacy.clear(project(model))),
            editor: {
                ...ui_only(Legacy.clear(project(model))).editor,
                sites: model.ui.editor.sites,
                selected_owner_id: Option.some(account.domain_id),
            },
        },
    }
    return [next, [LoadPublicationConfiguration(scope(next))]]
}
const layout_values = (model: Model): PublicationLayoutFields => ({
    theme_id: model.ui.editor.theme_id,
    appearance: model.ui.editor.appearance,
    site_title: model.ui.editor.site_title || "Site",
    show_site_title: model.ui.editor.show_site_title,
    social_links: configuration(model)?.layout?.social_links ?? [],
    logo_light_url: configuration(model)?.layout?.logo_light_url ?? null,
    logo_dark_url: configuration(model)?.layout?.logo_dark_url ?? null,
    favicon_light_url: configuration(model)?.layout?.favicon_light_url ?? null,
    favicon_dark_url: configuration(model)?.layout?.favicon_dark_url ?? null,
})
const SaveArgs = S.Struct({
    mode: S.String,
    social_links: PublicationLayoutFields.fields.social_links,
    logo_light_image_id: S.NullOr(S.String),
    logo_dark_image_id: S.NullOr(S.String),
})
const UploadArgs = S.Struct({ mode: S.String, file: File.File })
const ItemArgs = S.Struct({ item: PublicationNavigationItem })
const ReorderArgs = S.Struct({ items: S.Array(PublicationNavigationItem) })
const VariantArgs = S.Struct({ variant: S.Literals(["light", "dark"]) })
const translate = (
    model: Model,
    command: Legacy.UpdateReturn[1][number]
): UpdateReturn[1] => {
    let action: PublicationConfigurationAction | undefined
    let mode = "navigation"
    let file: File.File | null = null
    if (
        command.name === "SavePublicationLayout" &&
        S.is(SaveArgs)(command.args)
    ) {
        mode = command.args.mode
        action = {
            _tag: "save_layout",
            ...layout_values(model),
            social_links: command.args.social_links,
            logo_light_url: command.args.logo_light_image_id,
            logo_dark_url: command.args.logo_dark_image_id,
        }
    }
    if (
        (command.name === "UploadPublicationLogo" ||
            command.name === "UploadPublicationFavicon") &&
        S.is(UploadArgs)(command.args)
    ) {
        mode = command.args.mode
        file = command.args.file
        action = { _tag: "save_layout", ...layout_values(model) }
    }
    if (
        command.name === "RemovePublicationFavicon" &&
        S.is(VariantArgs)(command.args)
    ) {
        mode = `remove_favicon_${command.args.variant}`
        action = {
            _tag: "save_layout",
            ...layout_values(model),
            ...(command.args.variant === "light"
                ? { favicon_light_url: null }
                : { favicon_dark_url: null }),
        }
    }
    if (command.name === "InitializePublicationNavigation")
        action = { _tag: "initialize_navigation" }
    if (
        command.name === "AddBlogPublicationNavigation" ||
        command.name === "AddEventsPublicationNavigation"
    )
        action = {
            _tag: "save_navigation",
            id: "",
            target: {
                _tag: "module",
                module_id:
                    command.name === "AddEventsPublicationNavigation"
                        ? "events"
                        : "blog",
            },
            label:
                command.name === "AddEventsPublicationNavigation"
                    ? "Events"
                    : "Blog",
            visible: true,
            order_position: configuration(model)?.navigation.length ?? 0,
        }
    if (
        command.name === "SavePublicationNavigationItem" &&
        S.is(ItemArgs)(command.args)
    ) {
        const item = command.args.item
        const decoded_action = S.decodeUnknownOption(
            PublicationConfigurationAction
        )({ _tag: "save_navigation", ...item, id: item._id })
        action = Option.getOrUndefined(decoded_action)
    }
    if (
        command.name === "ReorderPublicationNavigation" &&
        S.is(ReorderArgs)(command.args)
    )
        action = {
            _tag: "reorder_navigation",
            ids: command.args.items.map((item) => item._id),
        }
    if (action !== undefined)
        return [
            SavePublicationConfiguration({
                ...scope(model),
                action,
                mode,
                file,
            }),
        ]
    return command.name === "ParseDesignMarkdown"
        ? Command.mapMessages([command], (message) =>
              GotConfigurationEditorMessage({ epoch: model.epoch, message })
          )
        : []
}
export const update = (
    model: Model,
    message: Message,
    active_domain_id: Parameters<typeof Legacy.update>[2],
    subdomains: Parameters<typeof Legacy.update>[3]
): UpdateReturn => {
    const domain_id = S.decodeUnknownOption(DomainId)(model.domain_id)
    if (message._tag === "GotConfigurationEditorMessage") {
        if (message.epoch !== model.epoch) return [model, []]
        const [ui] = Legacy.update(
            project(model),
            message.message,
            domain_id,
            subdomains
        )
        return [{ ...model, ui: ui_only(ui) }, []]
    }
    if (
        message._tag === "ConfigurationLoaded" ||
        message._tag === "ConfigurationSaved"
    ) {
        if (message.epoch !== model.epoch) return [model, []]
        const next = {
            ...model,
            remote:
                message._tag === "ConfigurationSaved"
                    ? Data.reduce(model, message.settlement).remote
                    : message.remote,
            pending: false,
        }
        let ui = project(next)
        if (message.mode === "load")
            ui = Legacy.update(
                ui,
                Legacy.LoadedPublicationLayout({
                    layout: Option.getOrNull(ui.layout),
                }),
                domain_id,
                subdomains
            )[0]
        else if (Option.isSome(ui.layout)) {
            const saved = S.decodeUnknownOption(Legacy.SavedPublicationLayout)({
                _tag: "SavedPublicationLayout",
                owner_id: Option.getOrElse(
                    ui.editor.selected_owner_id,
                    () => model.domain_id
                ),
                mode: message.mode,
                layout: ui.layout.value,
                asset_url: message.asset_url,
            })
            if (Option.isSome(saved))
                ui = Legacy.update(ui, saved.value, domain_id, subdomains)[0]
        }
        const projected = project({ ...next, ui: ui_only(ui) })
        const preview_page = projected.pages.find((page) =>
            Option.contains(projected.editor.preview_page_id, page._id)
        )
        const [preview_ui, preview_commands] =
            preview_page === undefined
                ? [projected, []]
                : Legacy.update(
                      projected,
                      Legacy.loaded_preview_page(preview_page),
                      domain_id,
                      subdomains
                  )
        const loaded = {
            ...next,
            ui: ui_only({
                ...preview_ui,
                navigation_saving: false,
                navigation_error: Option.none(),
                editor: {
                    ...preview_ui.editor,
                    is_loading: false,
                    busy: false,
                },
            }),
        }
        return [
            loaded,
            preview_commands.flatMap((command) => translate(loaded, command)),
        ]
    }
    if (message._tag === "ConfigurationFailed") {
        if (message.epoch !== model.epoch) return [model, []]
        const failure = S.decodeUnknownOption(
            Legacy.FailedPublicationLayoutSave
        )({
            _tag: "FailedPublicationLayoutSave",
            owner_id: Option.getOrElse(
                model.ui.editor.selected_owner_id,
                () => model.domain_id
            ),
            mode: message.mode,
            error: message.error,
        })
        const ui = Option.isSome(failure)
            ? Legacy.update(
                  project(model),
                  failure.value,
                  domain_id,
                  subdomains
              )[0]
            : project(model)
        return [
            {
                ...model,
                pending: false,
                ui: ui_only({
                    ...ui,
                    navigation_error: Option.some(message.error),
                    editor: {
                        ...ui.editor,
                        is_loading: false,
                        busy: false,
                        appearance_saving: false,
                        logo_uploading: Option.none(),
                        favicon_uploading: Option.none(),
                        error: Option.some(message.error),
                    },
                }),
            },
            [],
        ]
    }
    if (message._tag === "ConfigurationRefreshed")
        return model.domain_id === ""
            ? [model, []]
            : [
                  { ...model, pending: true },
                  [LoadPublicationConfiguration(scope(model))],
              ]
    if (
        message._tag.startsWith("LoadedPublication") ||
        message._tag.startsWith("SavedPublication") ||
        message._tag.startsWith("FailedPublication") ||
        message._tag === "SynchronizedPublicationNavigation"
    )
        return [model, []]
    if (
        message._tag === "GotLayoutEditorMessage" &&
        message.message._tag === "AssignedMainLayoutOwner"
    ) {
        const requested = message.message.owner_id
        const subdomain =
            requested === Option.getOrNull(active_domain_id) ||
            requested === model.domain_id
                ? null
                : subdomains.find((subdomain) => subdomain.id === requested)
        if (subdomain === undefined) return [model, []]
        const selected = Legacy.update(
            project(model),
            message,
            domain_id,
            subdomains
        )[0]
        const next = {
            ...model,
            ui: ui_only(selected),
            remote: Remote.initial,
            subdomain_slug: subdomain?.slug ?? null,
            epoch: model.epoch + 1,
            pending: true,
        }
        return [next, [LoadPublicationConfiguration(scope(next))]]
    }
    const browsing =
        message._tag === "GotLayoutEditorMessage" &&
        [
            "ToggledPreview",
            "SelectedPreviewPage",
            "SelectedPreviewModule",
            "SelectedPreviewEvent",
            "SelectedPreviewEventsIndex",
            "RequestedPreviewEventWeather",
            "LoadedPreviewEventWeather",
            "FailedPreviewEventWeather",
            "MountedPreviewEventMap",
            "FailedPreviewEventMap",
            "GotLandingPreviewMessage",
            "LoadedPreviewMarkdown",
            "FailedPreviewMarkdown",
            "LoadedPreviewDocument",
        ].includes(message.message._tag)
    if (
        (!model.can_write ||
            model.pending ||
            configuration(model) === undefined) &&
        !browsing
    )
        return [model, []]
    let [ui, commands] = Legacy.update(
        project(model),
        message,
        domain_id,
        subdomains
    )
    if (
        message._tag === "GotLayoutEditorMessage" &&
        message.message._tag === "SelectedPreviewPage"
    ) {
        const page = ui.pages.find((page) =>
            Option.contains(ui.editor.preview_page_id, page._id)
        )
        if (page !== undefined) {
            const preview = Legacy.update(
                ui,
                Legacy.loaded_preview_page(page),
                domain_id,
                subdomains
            )
            ui = preview[0]
            commands = [...commands, ...preview[1]]
        }
    }
    const next = { ...model, ui: ui_only(ui) }
    const translated = commands.flatMap((command) =>
        model.can_write || browsing ? translate(next, command) : []
    )
    return [
        {
            ...next,
            pending:
                model.pending ||
                translated.some(
                    (command) => command.name === "SavePublicationConfiguration"
                ),
        },
        translated,
    ]
}
export const subscriptions = Subscription.lift(Legacy.subscriptions)<
    Model,
    Message
>({ toChildModel: project, toParentMessage: (message) => message })
export const submodelView = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [h.Class("contents")],
        [
            h.submodel({
                slotId: "publication-layout-ui",
                model: project(model),
                view: Legacy.submodelView,
                toParentMessage: (message) => message,
            }),
        ]
    )
)
export const faviconsSubmodelView = Submodel.defineView<Model, Message>(
    (model, h) =>
        h.fieldset(
            [
                h.Disabled(!model.can_write || model.pending),
                h.Class("contents"),
            ],
            [
                h.submodel({
                    slotId: "publication-favicons-ui",
                    model: project(model),
                    view: Legacy.faviconsSubmodelView,
                    toParentMessage: (message) => message,
                }),
            ]
        )
)
