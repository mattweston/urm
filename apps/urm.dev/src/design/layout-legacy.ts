import * as Array from "effect/Array"
import { Effect, Option, Schema as S } from "effect"
import { Command, File, Submodel, Subscription } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import type { Url } from "foldkit/url"
import * as Ui from "@foldkit/ui"

import {
    DomainId,
    Image,
    ImageId,
    Page,
    PublicationNavigationItem,
    PublicationLayout,
    PublicationRouteModule,
    PublicationRouteModuleId,
    SubdomainId,
} from "./records.ts"
import * as Design from "@urm/features/design/submodel"
import * as SocialLinks from "@urm/features/media/social-links"
import { IconGripVertical } from "@urm/ui/foldkit/icons/view.ts"

export const Model = S.Struct({
    can_write: S.optionalKey(S.Boolean),
    editor: Design.Model,
    layout: S.Option(PublicationLayout),
    pages: S.Array(Page),
    pages_loaded: S.Boolean,
    images: S.Array(Image),
    navigation_items: S.Array(PublicationNavigationItem),
    navigation_saved_items: S.Array(PublicationNavigationItem),
    publication_modules: S.Array(PublicationRouteModule),
    navigation_loaded: S.Boolean,
    navigation_saving: S.Boolean,
    navigation_error: S.Option(S.String),
    navigation_drag_and_drop: Ui.DragAndDrop.Model,
})
export type Model = typeof Model.Type

export const GotLayoutEditorMessage = taggedStruct("GotLayoutEditorMessage", {
    message: Design.Message,
})
export const LoadedPublicationLayoutPages = taggedStruct(
    "LoadedPublicationLayoutPages",
    {
        pages: S.Array(Page),
    }
)
export const LoadedPublicationLayout = taggedStruct("LoadedPublicationLayout", {
    layout: S.NullOr(PublicationLayout),
})
export const LoadedPublicationLayoutImages = taggedStruct(
    "LoadedPublicationLayoutImages",
    {
        images: S.Array(Image),
    }
)
export const LoadedPublicationNavigation = taggedStruct(
    "LoadedPublicationNavigation",
    {
        items: S.Array(PublicationNavigationItem),
    }
)
export const LoadedPublicationRouteModules = taggedStruct(
    "LoadedPublicationRouteModules",
    { modules: S.Array(PublicationRouteModule) }
)
export const RequestedInitializePublicationNavigation = taggedStruct(
    "RequestedInitializePublicationNavigation"
)
export const RequestedTogglePublicationNavigation = taggedStruct(
    "RequestedTogglePublicationNavigation",
    { navigation_item_id: PublicationNavigationItem.fields._id }
)
export const RequestedAddBlogNavigation = taggedStruct(
    "RequestedAddBlogNavigation"
)
export const RequestedAddEventsNavigation = taggedStruct(
    "RequestedAddEventsNavigation"
)
export const GotPublicationNavigationDragAndDropMessage = taggedStruct(
    "GotPublicationNavigationDragAndDropMessage",
    { message: Ui.DragAndDrop.Message }
)
export const SavedPublicationNavigation = taggedStruct(
    "SavedPublicationNavigation",
    {
        owner_id: S.String,
        items: S.Array(PublicationNavigationItem),
    }
)
export const SynchronizedPublicationNavigation = taggedStruct(
    "SynchronizedPublicationNavigation",
    {
        owner_id: S.String,
        items: S.Array(PublicationNavigationItem),
    }
)
export const FailedPublicationNavigationSave = taggedStruct(
    "FailedPublicationNavigationSave",
    { owner_id: S.String, error: S.String }
)
const SaveMode = S.Literals([
    "appearance",
    "social_links",
    "logo_light",
    "logo_dark",
    "remove_logo_light",
    "remove_logo_dark",
    "favicon_light",
    "favicon_dark",
    "remove_favicon_light",
    "remove_favicon_dark",
])
type SaveMode = typeof SaveMode.Type
export const SavedPublicationLayout = taggedStruct("SavedPublicationLayout", {
    owner_id: S.String,
    mode: SaveMode,
    layout: PublicationLayout,
    asset_url: S.NullOr(S.String),
})
export const FailedPublicationLayoutSave = taggedStruct(
    "FailedPublicationLayoutSave",
    {
        owner_id: S.String,
        mode: SaveMode,
        error: S.String,
    }
)

export const Message = S.Union([
    GotLayoutEditorMessage,
    LoadedPublicationLayoutPages,
    LoadedPublicationLayout,
    LoadedPublicationLayoutImages,
    LoadedPublicationNavigation,
    LoadedPublicationRouteModules,
    RequestedInitializePublicationNavigation,
    RequestedTogglePublicationNavigation,
    RequestedAddBlogNavigation,
    RequestedAddEventsNavigation,
    GotPublicationNavigationDragAndDropMessage,
    SavedPublicationNavigation,
    SynchronizedPublicationNavigation,
    FailedPublicationNavigationSave,
    SavedPublicationLayout,
    FailedPublicationLayoutSave,
])
export type Message = typeof Message.Type

const Owner = S.Struct({
    domain_id: DomainId,
    subdomain_id: S.NullOr(SubdomainId),
})
type Owner = typeof Owner.Type

type PublicationSubdomain = Readonly<{
    id: string
    domain_id: string
    name: string
    slug: string
    kind: "documentation" | "prototype" | "survey"
    status: "disabled" | "draft" | "live"
    access: "link" | "password" | "public"
    updated_at: number
}>

type PublicationDomain = Readonly<{
    _id: DomainId
    name: string
    slug: string
    updated_at: number
}>

type Commands = ReadonlyArray<Command.Command<Message, never, never>>
export type UpdateReturn = readonly [Model, Commands]

const SaveSocialLinksArgs = S.Struct({
    links: S.Array(SocialLinks.SocialLink),
})
const UploadLogoArgs = S.Struct({
    owner_id: S.String,
    variant: Design.LogoVariant,
    file: File.File,
})
const RemoveLogoArgs = S.Struct({
    owner_id: S.String,
    variant: Design.LogoVariant,
})
const UploadFaviconArgs = S.Struct({
    owner_id: S.String,
    variant: Design.LogoVariant,
    file: File.File,
})
const RemoveFaviconArgs = S.Struct({
    owner_id: S.String,
    variant: Design.LogoVariant,
})

const navigation_drag_and_drop = () =>
    Ui.DragAndDrop.init({
        id: "publication-navigation",
        orientation: "Vertical",
    })

const owner_id = (owner: Owner): string =>
    owner.subdomain_id === null ? owner.domain_id : owner.subdomain_id

export const selected_owner = (
    model: Model,
    active_domain_id: Option.Option<DomainId>,
    subdomains: ReadonlyArray<PublicationSubdomain>
): Option.Option<Owner> =>
    Option.flatMap(active_domain_id, (domain_id) =>
        Option.flatMap(model.editor.selected_owner_id, (selected_id) =>
            selected_id === domain_id
                ? Option.some<Owner>({ domain_id, subdomain_id: null })
                : Option.flatMap(
                      Array.findFirst(
                          subdomains,
                          (subdomain) => subdomain.id === selected_id
                      ),
                      (subdomain) =>
                          Option.map(
                              S.decodeUnknownOption(SubdomainId)(subdomain.id),
                              (subdomain_id): Owner => ({
                                  domain_id,
                                  subdomain_id,
                              })
                          )
                  )
        )
    )

export const owner_args = (
    model: Model,
    active_domain_id: Option.Option<DomainId>,
    subdomains: ReadonlyArray<PublicationSubdomain>
) => selected_owner(model, active_domain_id, subdomains)

const publication_sites = (
    domain: PublicationDomain,
    subdomains: ReadonlyArray<PublicationSubdomain>
): ReadonlyArray<Design.DesignSite> => [
    {
        id: domain._id,
        domain_id: domain._id,
        name: domain.name,
        slug: domain.slug,
        purpose: "production",
        status: "live",
        access: "public",
        updated_at: domain.updated_at,
    },
    ...Array.map(
        subdomains,
        (subdomain): Design.DesignSite => ({
            id: subdomain.id,
            domain_id: subdomain.domain_id,
            name: subdomain.name,
            slug: subdomain.slug,
            purpose:
                subdomain.kind === "documentation"
                    ? "document"
                    : subdomain.kind,
            status: subdomain.status,
            access: subdomain.access,
            updated_at: subdomain.updated_at,
        })
    ),
]

export const with_publications = (
    model: Model,
    domain: Option.Option<PublicationDomain>,
    subdomains: ReadonlyArray<PublicationSubdomain>
): Model =>
    Option.match(domain, {
        onNone: () => ({
            editor: Design.clear(model.editor),
            layout: Option.none(),
            pages: [],
            pages_loaded: false,
            images: [],
            navigation_items: [],
            navigation_saved_items: [],
            publication_modules: [],
            navigation_loaded: false,
            navigation_saving: false,
            navigation_error: Option.none(),
            navigation_drag_and_drop: navigation_drag_and_drop(),
        }),
        onSome: (active_domain) => {
            const editor = Design.with_sites(
                model.editor,
                publication_sites(active_domain, subdomains)
            )
            if (Option.isSome(editor.selected_owner_id)) {
                return { ...model, editor }
            }
            return {
                editor: Design.update(
                    editor,
                    Design.AssignedMainLayoutOwner({
                        owner_id: active_domain._id,
                    })
                )[0],
                layout: Option.none(),
                pages: [],
                pages_loaded: false,
                images: [],
                navigation_items: [],
                navigation_saved_items: [],
                publication_modules: [],
                navigation_loaded: false,
                navigation_saving: false,
                navigation_error: Option.none(),
                navigation_drag_and_drop: navigation_drag_and_drop(),
            }
        },
    })

export const with_events = <Event extends Design.DesignPreviewEvent>(
    model: Model,
    events: ReadonlyArray<Event>,
    resolved_image_urls: Readonly<Record<string, string>> = {}
): Model => ({
    ...model,
    editor: Design.with_preview_events(
        model.editor,
        (publication_module_included(model, "events") ? events : []).map(
            (event) => ({
                id: event.id,
                title: event.title,
                description: event.description,
                date: event.date,
                start_time: event.start_time,
                end_time: event.end_time,
                venue_name: event.venue_name,
                venue_url: event.venue_url,
                latitude: event.latitude,
                longitude: event.longitude,
                tickets_url: event.tickets_url,
                image_url:
                    event.image_url === ""
                        ? ""
                        : (resolved_image_urls[event.image_url] ??
                          event.image_url),
                published: event.published,
            })
        )
    ),
})

export const with_blog_posts = (
    model: Model,
    posts: ReadonlyArray<Design.DesignPreviewBlogPost>
): Model => ({
    ...model,
    editor: Design.with_preview_blog_posts(
        model.editor,
        publication_module_included(model, "blog") ? posts : []
    ),
})

export const publication_module_included = (
    model: Model,
    module_id: typeof PublicationRouteModuleId.Type
): boolean =>
    model.publication_modules.find((setting) => setting.module_id === module_id)
        ?.included ?? true

type LayoutValues = Readonly<{
    social_links: ReadonlyArray<SocialLinks.SocialLinkType>
    logo_light_image_id: ImageId | null
    logo_dark_image_id: ImageId | null
    favicon_light_image_id: ImageId | null
    favicon_dark_image_id: ImageId | null
}>

const layout_values = (
    layout: Option.Option<PublicationLayout>
): LayoutValues =>
    Option.match(layout, {
        onNone: () => ({
            social_links: [],
            logo_light_image_id: null,
            logo_dark_image_id: null,
            favicon_light_image_id: null,
            favicon_dark_image_id: null,
        }),
        onSome: (layout) => ({
            social_links: layout.social_links,
            logo_light_image_id: layout.logo_light_image_id ?? null,
            logo_dark_image_id: layout.logo_dark_image_id ?? null,
            favicon_light_image_id: layout.favicon_light_image_id ?? null,
            favicon_dark_image_id: layout.favicon_dark_image_id ?? null,
        }),
    })

const workspace_message = (
    owner: string,
    pages: ReadonlyArray<Page>,
    layout: Option.Option<PublicationLayout>,
    sites: ReadonlyArray<Design.DesignSite>
): Design.Message => {
    const stored_layout = Option.getOrUndefined(layout)
    const default_site_title = Option.match(
        Array.findFirst(sites, (site) => site.id === owner),
        {
            onNone: () => "Site",
            onSome: (site) => site.name,
        }
    )
    return Design.LoadedWorkspace({
        owner_id: owner,
        documents: Array.map(pages, (page) => ({
            id: page._id,
            title: page.title,
            kind: "basic",
            slug: page.slug ?? null,
            published: page.publication_state === "published",
        })),
        pages: Array.map(pages, (page) => ({
            id: page._id,
            domain_id: page.domain_id,
            owner_id: owner,
            document_id: page._id,
            navigation_label: page.navigation_label,
            is_homepage: page.is_homepage,
            show_in_navigation: page.show_in_navigation,
            order_position: page.order_position,
            updated_at: page.updated_at,
        })),
        has_layout: Option.isSome(layout),
        social_links: stored_layout?.social_links ?? [],
        logo_light_url: null,
        logo_dark_url: null,
        favicon_light_url: null,
        favicon_dark_url: null,
        theme_id: stored_layout?.theme_id ?? "default",
        appearance: stored_layout?.appearance ?? "system",
        site_title: stored_layout?.site_title ?? default_site_title,
        show_site_title: stored_layout?.show_site_title ?? false,
    })
}

const preview_navigation_items = (
    items: ReadonlyArray<PublicationNavigationItem>
): ReadonlyArray<Design.DesignNavigationItem> =>
    items.map((item) => ({
        id: item._id,
        label: item.label,
        visible: item.visible,
        target:
            item.target._tag === "page"
                ? { _tag: "page", page_id: item.target.page_id }
                : {
                      _tag: "module",
                      module_id: item.target.module_id,
                  },
    }))

const editor_with_navigation = (
    editor: Design.Model,
    items: ReadonlyArray<PublicationNavigationItem>
): Design.Model =>
    Design.update(
        editor,
        Design.LoadedPreviewNavigation({
            items: preview_navigation_items(items),
        })
    )[0]

const untranslated_layout_save = (owner_key: string, mode: SaveMode) =>
    Effect.succeed(
        FailedPublicationLayoutSave({
            owner_id: owner_key,
            mode,
            error: "Layout action was not translated to PostgreSQL.",
        })
    )

const untranslated_navigation_save = (owner_key: string) =>
    Effect.succeed(
        FailedPublicationNavigationSave({
            owner_id: owner_key,
            error: "Navigation action was not translated to PostgreSQL.",
        })
    )

const SavePublicationLayout = Command.define("SavePublicationLayout", {
    args: {
        owner: Owner,
        owner_key: S.String,
        mode: SaveMode,
        editor: Design.Model,
        social_links: S.Array(SocialLinks.SocialLink),
        logo_light_image_id: S.NullOr(ImageId),
        logo_dark_image_id: S.NullOr(ImageId),
        asset_url: S.NullOr(S.String),
    },
    messages: [FailedPublicationLayoutSave],
    execute: ({ owner_key, mode }) => untranslated_layout_save(owner_key, mode),
})

const UploadPublicationLogo = Command.define("UploadPublicationLogo", {
    args: {
        owner: Owner,
        owner_key: S.String,
        mode: S.Literals(["logo_light", "logo_dark"]),
        file: File.File,
        editor: Design.Model,
        current_layout: S.Option(PublicationLayout),
    },
    messages: [FailedPublicationLayoutSave],
    execute: ({ owner_key, mode }) => untranslated_layout_save(owner_key, mode),
})

const InitializePublicationNavigation = Command.define(
    "InitializePublicationNavigation",
    {
        args: { owner: Owner, owner_key: S.String },
        messages: [FailedPublicationNavigationSave],
        execute: ({ owner_key }) => untranslated_navigation_save(owner_key),
    }
)

const UploadPublicationFavicon = Command.define("UploadPublicationFavicon", {
    args: {
        owner: Owner,
        owner_key: S.String,
        mode: S.Literals(["favicon_light", "favicon_dark"]),
        file: File.File,
    },
    messages: [FailedPublicationLayoutSave],
    execute: ({ owner_key, mode }) => untranslated_layout_save(owner_key, mode),
})

const RemovePublicationFavicon = Command.define("RemovePublicationFavicon", {
    args: {
        owner: Owner,
        owner_key: S.String,
        variant: Design.LogoVariant,
    },
    messages: [FailedPublicationLayoutSave],
    execute: ({ owner_key, variant }) =>
        untranslated_layout_save(
            owner_key,
            variant === "light" ? "remove_favicon_light" : "remove_favicon_dark"
        ),
})

const SavePublicationNavigationItem = Command.define(
    "SavePublicationNavigationItem",
    {
        args: {
            owner: Owner,
            owner_key: S.String,
            item: PublicationNavigationItem,
        },
        messages: [FailedPublicationNavigationSave],
        execute: ({ owner_key }) => untranslated_navigation_save(owner_key),
    }
)

const AddBlogPublicationNavigation = Command.define(
    "AddBlogPublicationNavigation",
    {
        args: { owner: Owner, owner_key: S.String, order_position: S.Number },
        messages: [FailedPublicationNavigationSave],
        execute: ({ owner_key }) => untranslated_navigation_save(owner_key),
    }
)

const AddEventsPublicationNavigation = Command.define(
    "AddEventsPublicationNavigation",
    {
        args: { owner: Owner, owner_key: S.String, order_position: S.Number },
        messages: [FailedPublicationNavigationSave],
        execute: ({ owner_key }) => untranslated_navigation_save(owner_key),
    }
)

const ReorderPublicationNavigation = Command.define(
    "ReorderPublicationNavigation",
    {
        args: {
            owner: Owner,
            owner_key: S.String,
            items: S.Array(PublicationNavigationItem),
        },
        messages: [FailedPublicationNavigationSave],
        execute: ({ owner_key }) => untranslated_navigation_save(owner_key),
    }
)

const translate_commands = (
    model: Model,
    commands: ReadonlyArray<Command.Command<Design.Message>>,
    owner: Owner
): Commands => {
    const values = layout_values(model.layout)
    const owner_key = owner_id(owner)
    return Array.flatMap(commands, (command): Commands => {
        if (command.name === "ParseDesignMarkdown") {
            return Command.mapMessages([command], (message) =>
                GotLayoutEditorMessage({ message })
            )
        }
        if (command.name === "SaveSiteAppearance") {
            return [
                SavePublicationLayout({
                    owner,
                    owner_key,
                    mode: "appearance",
                    editor: model.editor,
                    social_links: values.social_links,
                    logo_light_image_id: values.logo_light_image_id,
                    logo_dark_image_id: values.logo_dark_image_id,
                    asset_url: null,
                }),
            ]
        }
        if (command.name === "SaveSocialLinks") {
            return Option.match(
                S.decodeUnknownOption(SaveSocialLinksArgs)(command.args),
                {
                    onNone: () => [],
                    onSome: ({ links }) => [
                        SavePublicationLayout({
                            owner,
                            owner_key,
                            mode: "social_links",
                            editor: model.editor,
                            social_links: links,
                            logo_light_image_id: values.logo_light_image_id,
                            logo_dark_image_id: values.logo_dark_image_id,
                            asset_url: null,
                        }),
                    ],
                }
            )
        }
        if (command.name === "UploadLayoutLogo") {
            if (!S.is(UploadLogoArgs)(command.args)) return []
            const { variant, file } = command.args
            return [
                UploadPublicationLogo({
                    owner,
                    owner_key,
                    mode: variant === "light" ? "logo_light" : "logo_dark",
                    file,
                    editor: model.editor,
                    current_layout: model.layout,
                }),
            ]
        }
        if (command.name === "RemoveLayoutLogo") {
            return Option.match(
                S.decodeUnknownOption(RemoveLogoArgs)(command.args),
                {
                    onNone: () => [],
                    onSome: ({ variant }) => [
                        SavePublicationLayout({
                            owner,
                            owner_key,
                            mode:
                                variant === "light"
                                    ? "remove_logo_light"
                                    : "remove_logo_dark",
                            editor: model.editor,
                            social_links: values.social_links,
                            logo_light_image_id:
                                variant === "light"
                                    ? null
                                    : values.logo_light_image_id,
                            logo_dark_image_id:
                                variant === "dark"
                                    ? null
                                    : values.logo_dark_image_id,
                            asset_url: null,
                        }),
                    ],
                }
            )
        }
        if (command.name === "UploadLayoutFavicon") {
            if (!S.is(UploadFaviconArgs)(command.args)) return []
            const { variant, file } = command.args
            return [
                UploadPublicationFavicon({
                    owner,
                    owner_key,
                    mode:
                        variant === "light" ? "favicon_light" : "favicon_dark",
                    file,
                }),
            ]
        }
        if (command.name === "RemoveLayoutFavicon") {
            if (!S.is(RemoveFaviconArgs)(command.args)) return []
            return [
                RemovePublicationFavicon({
                    owner,
                    owner_key,
                    variant: command.args.variant,
                }),
            ]
        }
        return []
    })
}

export const init = (url: Url): Model => ({
    editor: Design.init(url)[0],
    layout: Option.none(),
    pages: [],
    pages_loaded: false,
    images: [],
    navigation_items: [],
    navigation_saved_items: [],
    publication_modules: [],
    navigation_loaded: false,
    navigation_saving: false,
    navigation_error: Option.none(),
    navigation_drag_and_drop: navigation_drag_and_drop(),
})

export const clear = (model: Model): Model => ({
    editor: Design.clear(model.editor),
    layout: Option.none(),
    pages: [],
    pages_loaded: false,
    images: [],
    navigation_items: [],
    navigation_saved_items: [],
    publication_modules: [],
    navigation_loaded: false,
    navigation_saving: false,
    navigation_error: Option.none(),
    navigation_drag_and_drop: navigation_drag_and_drop(),
})

export const changed_url = (model: Model, url: Url): Model => ({
    ...model,
    editor: Design.changed_url(model.editor, url),
})

export const loaded_preview_page = (page: Page): Message =>
    GotLayoutEditorMessage({
        message: Design.LoadedPreviewDocument({
            page_id: page._id,
            document: {
                id: page._id,
                title: page.title,
                kind: "basic",
                content: page.content,
                content_type: page.content_type,
                slug: page.slug ?? null,
                published: page.publication_state === "published",
            },
        }),
    })

const navigation_requires_sync = (model: Model): boolean => {
    if (
        !model.pages_loaded ||
        !model.navigation_loaded ||
        model.navigation_saving ||
        model.navigation_items.length === 0
    ) {
        return false
    }
    const navigation_pages = model.pages.filter(
        (page) => page.content_type !== "landing_json"
    )
    const page_ids = new Set(navigation_pages.map((page) => page._id))
    const linked_page_ids = new Set(
        model.navigation_items.flatMap((item) =>
            item.target._tag === "page" ? [item.target.page_id] : []
        )
    )
    return (
        model.navigation_items.some(
            (item) =>
                item.target._tag === "page" &&
                !page_ids.has(item.target.page_id)
        ) ||
        navigation_pages.some(
            (page) => page.show_in_navigation && !linked_page_ids.has(page._id)
        )
    )
}

const navigation_sync = (
    model: Model,
    active_domain_id: Option.Option<DomainId>,
    subdomains: ReadonlyArray<PublicationSubdomain>
): UpdateReturn => {
    if (!navigation_requires_sync(model)) return [model, []]
    return Option.match(selected_owner(model, active_domain_id, subdomains), {
        onNone: () => [model, []],
        onSome: (owner) => [
            {
                ...model,
                navigation_saving: true,
                navigation_error: Option.none(),
            },
            [
                InitializePublicationNavigation({
                    owner,
                    owner_key: owner_id(owner),
                }),
            ],
        ],
    })
}

export const update = (
    model: Model,
    message: Message,
    active_domain_id: Option.Option<DomainId>,
    subdomains: ReadonlyArray<PublicationSubdomain>
): UpdateReturn => {
    if (message._tag === "LoadedPublicationLayoutImages") {
        return [{ ...model, images: message.images }, []]
    }
    if (message._tag === "LoadedPublicationNavigation") {
        return navigation_sync(
            {
                ...model,
                editor: editor_with_navigation(model.editor, message.items),
                navigation_items: message.items,
                navigation_saved_items: message.items,
                navigation_loaded: true,
                navigation_saving: false,
                navigation_error: Option.none(),
            },
            active_domain_id,
            subdomains
        )
    }
    if (message._tag === "LoadedPublicationRouteModules") {
        return [{ ...model, publication_modules: message.modules }, []]
    }
    if (message._tag === "SavedPublicationNavigation") {
        if (
            !Option.contains(model.editor.selected_owner_id, message.owner_id)
        ) {
            return [model, []]
        }
        const saved_by_id = new Map(
            message.items.map((item) => [item._id, item])
        )
        const navigation_items = model.navigation_items.map(
            (item) => saved_by_id.get(item._id) ?? item
        )
        const new_items = message.items.filter(
            (item) =>
                !navigation_items.some(
                    (candidate) => candidate._id === item._id
                )
        )
        return [
            {
                ...model,
                editor: editor_with_navigation(model.editor, [
                    ...navigation_items,
                    ...new_items,
                ]),
                navigation_items: [...navigation_items, ...new_items],
                navigation_saved_items: [...navigation_items, ...new_items],
                navigation_loaded: true,
                navigation_saving: false,
                navigation_error: Option.none(),
            },
            [],
        ]
    }
    if (message._tag === "SynchronizedPublicationNavigation") {
        if (
            !Option.contains(model.editor.selected_owner_id, message.owner_id)
        ) {
            return [model, []]
        }
        return [
            {
                ...model,
                editor: editor_with_navigation(model.editor, message.items),
                navigation_items: message.items,
                navigation_saved_items: message.items,
                navigation_loaded: true,
                navigation_saving: false,
                navigation_error: Option.none(),
            },
            [],
        ]
    }
    if (message._tag === "FailedPublicationNavigationSave") {
        if (
            !Option.contains(model.editor.selected_owner_id, message.owner_id)
        ) {
            return [model, []]
        }
        return [
            {
                ...model,
                editor: editor_with_navigation(
                    model.editor,
                    model.navigation_saved_items
                ),
                navigation_items: model.navigation_saved_items,
                navigation_saving: false,
                navigation_error: Option.some(message.error),
            },
            [],
        ]
    }
    if (message._tag === "LoadedPublicationLayoutPages") {
        const current_owner_id = Option.getOrUndefined(
            model.editor.selected_owner_id
        )
        if (current_owner_id === undefined) return [model, []]
        const [editor] = Design.update(
            model.editor,
            workspace_message(
                current_owner_id,
                message.pages,
                model.layout,
                model.editor.sites
            )
        )
        return navigation_sync(
            {
                ...model,
                editor,
                pages: message.pages,
                pages_loaded: true,
            },
            active_domain_id,
            subdomains
        )
    }
    if (message._tag === "LoadedPublicationLayout") {
        const current_owner_id = Option.getOrUndefined(
            model.editor.selected_owner_id
        )
        if (current_owner_id === undefined) return [model, []]
        const layout = Option.fromNullishOr(message.layout)
        const [editor] = Design.update(
            model.editor,
            workspace_message(
                current_owner_id,
                model.pages,
                layout,
                model.editor.sites
            )
        )
        return [{ ...model, editor, layout }, []]
    }
    if (message._tag === "SavedPublicationLayout") {
        if (
            !Option.contains(model.editor.selected_owner_id, message.owner_id)
        ) {
            return [model, []]
        }
        const editor_message =
            message.mode === "appearance"
                ? Design.SavedSiteAppearance({
                      owner_id: message.owner_id,
                      theme_id: message.layout.theme_id ?? "default",
                      appearance: message.layout.appearance ?? "system",
                      site_title:
                          message.layout.site_title ?? model.editor.site_title,
                      show_site_title: message.layout.show_site_title ?? false,
                  })
                : message.mode === "social_links"
                  ? Design.GotSocialLinksMessage({
                        message: SocialLinks.SavedSocialLinks({
                            links: message.layout.social_links,
                        }),
                    })
                  : message.mode === "logo_light" ||
                      message.mode === "logo_dark"
                    ? Design.UploadedLayoutLogo({
                          variant:
                              message.mode === "logo_light" ? "light" : "dark",
                          url: message.asset_url ?? "",
                      })
                    : message.mode === "remove_logo_light" ||
                        message.mode === "remove_logo_dark"
                      ? Design.RemovedLayoutLogo({
                            variant:
                                message.mode === "remove_logo_light"
                                    ? "light"
                                    : "dark",
                        })
                      : message.mode === "favicon_light" ||
                          message.mode === "favicon_dark"
                        ? Design.UploadedLayoutFavicon({
                              variant:
                                  message.mode === "favicon_light"
                                      ? "light"
                                      : "dark",
                              url: message.asset_url ?? "",
                          })
                        : Design.RemovedLayoutFavicon({
                              variant:
                                  message.mode === "remove_favicon_light"
                                      ? "light"
                                      : "dark",
                          })
        return [
            {
                ...model,
                editor: Design.update(model.editor, editor_message)[0],
                layout: Option.some(message.layout),
            },
            [],
        ]
    }
    if (message._tag === "FailedPublicationLayoutSave") {
        const editor_message =
            message.mode === "appearance"
                ? Design.FailedSiteAppearance({
                      owner_id: message.owner_id,
                      error: message.error,
                  })
                : message.mode === "social_links"
                  ? Design.GotSocialLinksMessage({
                        message: SocialLinks.FailedSavingSocialLinks({
                            error: message.error,
                        }),
                    })
                  : Design.FailedDesignAction({ error: message.error })
        return [
            {
                ...model,
                editor: Design.update(model.editor, editor_message)[0],
            },
            [],
        ]
    }

    if (message._tag === "RequestedInitializePublicationNavigation") {
        return Option.match(
            selected_owner(model, active_domain_id, subdomains),
            {
                onNone: () => [model, []],
                onSome: (owner) => [
                    {
                        ...model,
                        navigation_saving: true,
                        navigation_error: Option.none(),
                    },
                    [
                        InitializePublicationNavigation({
                            owner,
                            owner_key: owner_id(owner),
                        }),
                    ],
                ],
            }
        )
    }
    if (message._tag === "RequestedAddBlogNavigation") {
        if (
            model.navigation_items.some(
                (item) =>
                    item.target._tag === "module" &&
                    item.target.module_id === "blog"
            )
        ) {
            return [model, []]
        }
        return Option.match(
            selected_owner(model, active_domain_id, subdomains),
            {
                onNone: () => [model, []],
                onSome: (owner) => [
                    {
                        ...model,
                        navigation_saving: true,
                        navigation_error: Option.none(),
                    },
                    [
                        AddBlogPublicationNavigation({
                            owner,
                            owner_key: owner_id(owner),
                            order_position: model.navigation_items.length,
                        }),
                    ],
                ],
            }
        )
    }
    if (message._tag === "RequestedAddEventsNavigation") {
        if (
            model.navigation_items.some(
                (item) =>
                    item.target._tag === "module" &&
                    item.target.module_id === "events"
            )
        ) {
            return [model, []]
        }
        return Option.match(
            selected_owner(model, active_domain_id, subdomains),
            {
                onNone: () => [model, []],
                onSome: (owner) => [
                    {
                        ...model,
                        navigation_saving: true,
                        navigation_error: Option.none(),
                    },
                    [
                        AddEventsPublicationNavigation({
                            owner,
                            owner_key: owner_id(owner),
                            order_position: model.navigation_items.length,
                        }),
                    ],
                ],
            }
        )
    }
    if (message._tag === "RequestedTogglePublicationNavigation") {
        const item = model.navigation_items.find(
            (candidate) => candidate._id === message.navigation_item_id
        )
        if (item === undefined) return [model, []]
        return Option.match(
            selected_owner(model, active_domain_id, subdomains),
            {
                onNone: () => [model, []],
                onSome: (owner) => {
                    const changed = { ...item, visible: !item.visible }
                    return [
                        {
                            ...model,
                            editor: editor_with_navigation(
                                model.editor,
                                model.navigation_items.map((candidate) =>
                                    candidate._id === changed._id
                                        ? changed
                                        : candidate
                                )
                            ),
                            navigation_items: model.navigation_items.map(
                                (candidate) =>
                                    candidate._id === changed._id
                                        ? changed
                                        : candidate
                            ),
                            navigation_saving: true,
                            navigation_error: Option.none(),
                        },
                        [
                            SavePublicationNavigationItem({
                                owner,
                                owner_key: owner_id(owner),
                                item: changed,
                            }),
                        ],
                    ]
                },
            }
        )
    }
    if (message._tag === "GotPublicationNavigationDragAndDropMessage") {
        const {
            model: navigation_drag_and_drop,
            commands: drag_commands = [],
            outMessage: out_message_value,
        } = Ui.DragAndDrop.update(
            model.navigation_drag_and_drop,
            message.message
        )
        const out_message = Option.fromUndefinedOr(out_message_value)

        const reordered = Option.flatMap(out_message, (out) => {
            if (out._tag !== "Reordered") return Option.none()
            const item = model.navigation_items.find(
                (candidate) => candidate._id === out.itemId
            )
            if (item === undefined) return Option.none()
            const remaining = model.navigation_items.filter(
                (candidate) => candidate._id !== out.itemId
            )
            return Option.some([
                ...remaining.slice(0, out.toIndex),
                item,
                ...remaining.slice(out.toIndex),
            ])
        })
        const mapped_drag_commands = Command.mapMessages(
            drag_commands,
            (next_message) =>
                GotPublicationNavigationDragAndDropMessage({
                    message: next_message,
                })
        )
        return Option.match(reordered, {
            onNone: () => [
                { ...model, navigation_drag_and_drop },
                mapped_drag_commands,
            ],
            onSome: (navigation_items) =>
                Option.match(
                    selected_owner(model, active_domain_id, subdomains),
                    {
                        onNone: () => [model, []],
                        onSome: (owner) => [
                            {
                                ...model,
                                editor: editor_with_navigation(
                                    model.editor,
                                    navigation_items
                                ),
                                navigation_items,
                                navigation_saving: true,
                                navigation_error: Option.none(),
                                navigation_drag_and_drop,
                            },
                            [
                                ...mapped_drag_commands,
                                ReorderPublicationNavigation({
                                    owner,
                                    owner_key: owner_id(owner),
                                    items: navigation_items,
                                }),
                            ],
                        ],
                    }
                ),
        })
    }

    const [editor, feature_commands] = Design.update(
        model.editor,
        message.message
    )
    const next_model =
        message.message._tag === "AssignedMainLayoutOwner"
            ? {
                  editor,
                  layout: Option.none<PublicationLayout>(),
                  pages: [],
                  pages_loaded: false,
                  images: model.images,
                  navigation_items: [],
                  navigation_saved_items: [],
                  publication_modules: [],
                  navigation_loaded: false,
                  navigation_saving: false,
                  navigation_error: Option.none(),
                  navigation_drag_and_drop: navigation_drag_and_drop(),
              }
            : { ...model, editor }
    return Option.match(
        selected_owner(next_model, active_domain_id, subdomains),
        {
            onNone: () => [next_model, []],
            onSome: (owner) => [
                next_model,
                translate_commands(next_model, feature_commands, owner),
            ],
        }
    )
}

const navigation_item_label = (
    item: PublicationNavigationItem,
    pages: ReadonlyArray<Page>
): string => {
    if (item.target._tag === "module") return item.label
    const page_id = item.target.page_id
    return pages.find((page) => page._id === page_id)?.title ?? item.label
}

const navigation_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const disabled =
        model.can_write === false ||
        model.navigation_saving ||
        !model.navigation_loaded
    const dragged_id = Ui.DragAndDrop.maybeDraggedItemId(
        model.navigation_drag_and_drop
    )
    const drop_target = Ui.DragAndDrop.maybeDropTarget(
        model.navigation_drag_and_drop
    )
    const ghost_style = Ui.DragAndDrop.ghostStyle(
        model.navigation_drag_and_drop
    )
    const has_blog = model.navigation_items.some(
        (item) =>
            item.target._tag === "module" && item.target.module_id === "blog"
    )
    const has_events = model.navigation_items.some(
        (item) =>
            item.target._tag === "module" && item.target.module_id === "events"
    )
    return h.div(
        [h.Class("mx-auto mt-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8")],
        [
            h.section(
                [
                    h.Class(
                        "grid gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)] sm:p-6"
                    ),
                    h.AriaLabel("Public site navigation"),
                ],
                [
                    ...(Option.isSome(ghost_style) && Option.isSome(dragged_id)
                        ? [
                              h.div(
                                  [
                                      h.Style(ghost_style.value),
                                      h.AriaHidden(true),
                                      h.Class(
                                          "z-50 flex items-center gap-2 rounded-[var(--radius-control)] border border-primary bg-card px-3 py-2 shadow-lg"
                                      ),
                                  ],
                                  [
                                      IconGripVertical({ class: "size-5" }),
                                      model.navigation_items.find(
                                          (item) =>
                                              item._id === dragged_id.value
                                      )?.label ?? "Navigation item",
                                  ]
                              ),
                          ]
                        : []),
                    h.div(
                        [h.Class("grid gap-1")],
                        [
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                ["Header navigation"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "Choose what appears in the published site header. Drag an item, or focus its handle and press Space, use arrow keys, then Space to drop.",
                                ]
                            ),
                        ]
                    ),
                    ...Option.match(model.navigation_error, {
                        onNone: () => [],
                        onSome: (error) => [
                            h.p(
                                [
                                    h.Role("alert"),
                                    h.Class("text-sm text-destructive"),
                                ],
                                [error]
                            ),
                        ],
                    }),
                    ...(!model.navigation_loaded
                        ? [
                              h.p(
                                  [
                                      h.Role("status"),
                                      h.Class("text-sm text-muted-foreground"),
                                  ],
                                  ["Loading header navigation…"]
                              ),
                          ]
                        : model.navigation_items.length === 0
                          ? [
                                h.p(
                                    [h.Class("text-sm text-muted-foreground")],
                                    [
                                        "The header currently follows the navigation settings on each Page. Set it up here to add Blog and Events and control the complete order.",
                                    ]
                                ),
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.Disabled(disabled),
                                        h.OnClick(
                                            RequestedInitializePublicationNavigation()
                                        ),
                                        h.Class(
                                            "w-fit rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
                                        ),
                                    ],
                                    ["Set up navigation"]
                                ),
                            ]
                          : [
                                h.div(
                                    [
                                        h.Id("publication-navigation"),
                                        h.Class("grid gap-2"),
                                        ...Ui.DragAndDrop.droppable(
                                            "publication-navigation-order",
                                            "Header navigation order"
                                        ),
                                    ],
                                    model.navigation_items.map((item, index) =>
                                        h.keyed("div")(
                                            item._id,
                                            [
                                                h.Class(
                                                    `flex items-center gap-3 rounded-[var(--radius-control)] border border-border bg-background p-3 ${Option.contains(dragged_id, item._id) ? "ring-2 ring-primary" : ""} ${Option.exists(drop_target, (target) => target.index === index) ? "border-t-2 border-t-primary" : ""}`
                                                ),
                                            ],
                                            [
                                                h.button(
                                                    [
                                                        h.Type("button"),
                                                        h.Disabled(disabled),
                                                        h.AriaLabel(
                                                            `Reorder ${navigation_item_label(item, model.pages)}`
                                                        ),
                                                        h.Class(
                                                            "grid size-10 shrink-0 touch-none cursor-grab place-items-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
                                                        ),
                                                        ...(disabled
                                                            ? []
                                                            : Ui.DragAndDrop.draggable(
                                                                  {
                                                                      model: model.navigation_drag_and_drop,
                                                                      itemId: item._id,
                                                                      containerId:
                                                                          "publication-navigation-order",
                                                                      index,
                                                                      toParentMessage:
                                                                          (
                                                                              message
                                                                          ) =>
                                                                              GotPublicationNavigationDragAndDropMessage(
                                                                                  {
                                                                                      message,
                                                                                  }
                                                                              ),
                                                                  },
                                                                  h
                                                              )),
                                                    ],
                                                    [
                                                        IconGripVertical({
                                                            class: "size-5",
                                                        }),
                                                    ]
                                                ),
                                                h.div(
                                                    [h.Class("min-w-0 flex-1")],
                                                    [
                                                        h.p(
                                                            [
                                                                h.Class(
                                                                    "truncate text-sm font-medium"
                                                                ),
                                                            ],
                                                            [
                                                                navigation_item_label(
                                                                    item,
                                                                    model.pages
                                                                ),
                                                            ]
                                                        ),
                                                        h.p(
                                                            [
                                                                h.Class(
                                                                    "text-xs text-muted-foreground"
                                                                ),
                                                            ],
                                                            [
                                                                item.target
                                                                    ._tag ===
                                                                "page"
                                                                    ? "Page"
                                                                    : `${item.target.module_id === "blog" ? "Blog" : "Events"} module`,
                                                            ]
                                                        ),
                                                    ]
                                                ),
                                                h.button(
                                                    [
                                                        h.Type("button"),
                                                        h.Disabled(disabled),
                                                        h.AriaPressed(
                                                            globalThis.String(
                                                                item.visible
                                                            )
                                                        ),
                                                        h.OnClick(
                                                            RequestedTogglePublicationNavigation(
                                                                {
                                                                    navigation_item_id:
                                                                        item._id,
                                                                }
                                                            )
                                                        ),
                                                        h.Class(
                                                            "min-h-10 rounded-[var(--radius-control)] border border-border px-3 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
                                                        ),
                                                    ],
                                                    [
                                                        item.visible
                                                            ? "Shown"
                                                            : "Hidden",
                                                    ]
                                                ),
                                            ]
                                        )
                                    )
                                ),
                                ...(!has_blog
                                    ? [
                                          h.button(
                                              [
                                                  h.Type("button"),
                                                  h.Disabled(disabled),
                                                  h.OnClick(
                                                      RequestedAddBlogNavigation()
                                                  ),
                                                  h.Class(
                                                      "w-fit rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
                                                  ),
                                              ],
                                              ["Add Blog"]
                                          ),
                                      ]
                                    : []),
                                ...(!has_events
                                    ? [
                                          h.button(
                                              [
                                                  h.Type("button"),
                                                  h.Disabled(disabled),
                                                  h.OnClick(
                                                      RequestedAddEventsNavigation()
                                                  ),
                                                  h.Class(
                                                      "w-fit rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
                                                  ),
                                              ],
                                              ["Add Events"]
                                          ),
                                      ]
                                    : []),
                            ]),
                    ...(model.navigation_saving
                        ? [
                              h.p(
                                  [
                                      h.Role("status"),
                                      h.AriaLive("polite"),
                                      h.Class("text-sm text-muted-foreground"),
                                  ],
                                  ["Saving navigation…"]
                              ),
                          ]
                        : []),
                ]
            ),
        ]
    )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const logo_light_url = Option.flatMap(model.layout, (layout) =>
        Option.flatMap(
            Option.fromNullishOr(layout.logo_light_image_id),
            (image_id) =>
                Option.map(
                    Array.findFirst(
                        model.images,
                        (image) => image._id === image_id
                    ),
                    (image) => image.url
                )
        )
    )
    const logo_dark_url = Option.flatMap(model.layout, (layout) =>
        Option.flatMap(
            Option.fromNullishOr(layout.logo_dark_image_id),
            (image_id) =>
                Option.map(
                    Array.findFirst(
                        model.images,
                        (image) => image._id === image_id
                    ),
                    (image) => image.url
                )
        )
    )
    const favicon_light_url = Option.flatMap(model.layout, (layout) =>
        Option.flatMap(
            Option.fromNullishOr(layout.favicon_light_image_id),
            (image_id) =>
                Option.map(
                    Array.findFirst(
                        model.images,
                        (image) => image._id === image_id
                    ),
                    (image) => image.url
                )
        )
    )
    const favicon_dark_url = Option.flatMap(model.layout, (layout) =>
        Option.flatMap(
            Option.fromNullishOr(layout.favicon_dark_image_id),
            (image_id) =>
                Option.map(
                    Array.findFirst(
                        model.images,
                        (image) => image._id === image_id
                    ),
                    (image) => image.url
                )
        )
    )
    const editor = {
        ...model.editor,
        can_write: model.can_write !== false,
        logo_light_url: Option.getOrElse(
            logo_light_url,
            () => model.editor.logo_light_url
        ),
        logo_dark_url: Option.getOrElse(
            logo_dark_url,
            () => model.editor.logo_dark_url
        ),
        has_custom_logo_light: Option.isSome(
            Option.flatMap(model.layout, (layout) =>
                Option.fromNullishOr(layout.logo_light_image_id)
            )
        ),
        has_custom_logo_dark: Option.isSome(
            Option.flatMap(model.layout, (layout) =>
                Option.fromNullishOr(layout.logo_dark_image_id)
            )
        ),
        favicon_light_url: Option.getOrElse(
            favicon_light_url,
            () => model.editor.favicon_light_url
        ),
        favicon_dark_url: Option.getOrElse(
            favicon_dark_url,
            () => model.editor.favicon_dark_url
        ),
        has_custom_favicon_light: Option.isSome(favicon_light_url),
        has_custom_favicon_dark: Option.isSome(favicon_dark_url),
    }
    return h.div(
        [],
        [
            h.submodel({
                slotId: "desktop-design-main-layout",
                model: editor,
                view: Design.mainLayoutView,
                toParentMessage: (message) =>
                    GotLayoutEditorMessage({ message }),
            }),
            navigation_view(model, h),
        ]
    )
}

export const favicons_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const favicon_url = (
        image_id: ImageId | undefined
    ): Option.Option<string> =>
        Option.flatMap(Option.fromNullishOr(image_id), (id) =>
            Option.map(
                Array.findFirst(model.images, (image) => image._id === id),
                (image) => image.url
            )
        )
    const light = Option.flatMap(model.layout, (layout) =>
        favicon_url(layout.favicon_light_image_id)
    )
    const dark = Option.flatMap(model.layout, (layout) =>
        favicon_url(layout.favicon_dark_image_id)
    )
    const editor = {
        ...model.editor,
        favicon_light_url: Option.getOrElse(
            light,
            () => model.editor.favicon_light_url
        ),
        favicon_dark_url: Option.getOrElse(
            dark,
            () => model.editor.favicon_dark_url
        ),
        has_custom_favicon_light: Option.isSome(light),
        has_custom_favicon_dark: Option.isSome(dark),
    }
    return h.submodel({
        slotId: "desktop-design-favicons",
        model: editor,
        view: Design.faviconsView,
        toParentMessage: (message) => GotLayoutEditorMessage({ message }),
    })
}

const navigation_drag_subscriptions = Subscription.lift(
    Ui.DragAndDrop.subscriptions
)<Model, Message>({
    read: (model) => Option.some(model.navigation_drag_and_drop),
    toParentMessage: (message) =>
        GotPublicationNavigationDragAndDropMessage({ message }),
    when: (model) =>
        model.navigation_loaded &&
        !model.navigation_saving &&
        model.navigation_items.length > 0,
})

export const subscriptions = {
    publicationNavigationPointer: navigation_drag_subscriptions.documentPointer,
    publicationNavigationEscape: navigation_drag_subscriptions.documentEscape,
    publicationNavigationKeyboard:
        navigation_drag_subscriptions.documentKeyboard,
    publicationNavigationAutoScroll: navigation_drag_subscriptions.autoScroll,
}

export const submodelView = Submodel.defineView<Model, Message>(view)
export const faviconsSubmodelView = Submodel.defineView<Model, Message>(
    favicons_view
)
