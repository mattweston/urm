import * as Array from "effect/Array"
import { Effect, Match as M, Option, Schema as S, Stream, String } from "effect"
import { Command, Submodel, Subscription } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import { Url } from "foldkit/url"
import { DragAndDrop } from "@foldkit/ui"
import {
    content_item_id_for_path,
    content_item_href,
    is_content_edit_requested,
} from "@urm/features/content"

import {
    DomainId,
    type Page as StoredPage,
    PageId,
    PublicationRouteModule,
    PublicationRouteModuleId,
    SubdomainId,
} from "./records.ts"
import {
    RichTextContent,
    RichTextDocument,
} from "@urm/domain/schemas/rich-text"
import { ContentTemplateSource } from "@urm/domain/schemas/content-templates"
import {
    blank_landing_page,
    marketing_starter_landing_page,
    urm_marketing_landing_page,
} from "@urm/domain/landing-page-presets"
import {
    GotRichTextDragAndDropMessage,
    RichTextEditorMessage,
    RichTextEditorModel,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"
import {
    RichTextEditor,
    initRichTextEditor,
    richTextEditorSubscriptions,
    resolveRichTextImageUrls,
    unmountRichTextEditorHost,
    updateRichTextEditor,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import type { LinkSuggestion } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"

import {
    designMainLayoutHref,
    documentsBlogPublishedHref,
    domainsHref,
    eventsHref,
} from "../routing/route.ts"

const PageContentType = S.Literals([
    "markdown",
    "html",
    "text",
    "rtf",
    "rich_text_json",
    "landing_json",
])
const PublicationState = S.Literals(["draft", "published", "archived"])
const LegacyRichTextContent = S.Struct({ document: RichTextDocument })
const PageRichTextContent = S.Union([RichTextContent, LegacyRichTextContent])
const editor_id = "pages-rich-text-editor"
const page_content_type = S.decodeUnknownSync(PageContentType)("rich_text_json")
const NewPageKind = S.Literals([
    "document",
    "landing_blank",
    "marketing_starter",
    "urm_marketing",
])
type NewPageKind = typeof NewPageKind.Type

const new_page_kind_for_url = (url: Url): NewPageKind => {
    const value = new URLSearchParams(
        Option.getOrElse(url.search, () => "")
    ).get("kind")
    return Option.getOrElse(S.decodeUnknownOption(NewPageKind)(value), () =>
        S.decodeUnknownSync(NewPageKind)("document")
    )
}

const template_source_for_new_page_kind = (
    kind: NewPageKind
): ContentTemplateSource => {
    switch (kind) {
        case "document":
            return {
                template_id: "web.page_blank",
                template_version: 1,
                provenance: "builtin",
            }
        case "landing_blank":
            return {
                template_id: "web.landing_blank",
                template_version: 1,
                provenance: "builtin",
            }
        case "marketing_starter":
            return {
                template_id: "web.marketing_starter",
                template_version: 1,
                provenance: "builtin",
            }
        case "urm_marketing":
            return {
                template_id: "web.urm_marketing",
                template_version: 1,
                provenance: "builtin",
            }
    }
}

export const Page = S.Struct({
    id: PageId,
    title: S.String,
    content: S.String,
    content_type: PageContentType,
    slug: S.NullOr(S.String),
    navigation_label: S.String,
    show_in_navigation: S.Boolean,
    order_position: S.Number,
    is_homepage: S.Boolean,
    publication_state: PublicationState,
    seo_title: S.NullOr(S.String),
    seo_description: S.NullOr(S.String),
    noindex: S.Boolean,
    updated_at: S.Number,
})
export type Page = typeof Page.Type

export const EditDraft = S.Struct({
    page_id: PageId,
    content: S.String,
    content_type: PageContentType,
    title: S.String,
    slug: S.String,
    navigation_label: S.String,
    show_in_navigation: S.Boolean,
    is_homepage: S.Boolean,
    publication_state: PublicationState,
    seo_title: S.String,
    seo_description: S.String,
    noindex: S.Boolean,
})
export type EditDraft = typeof EditDraft.Type

export const Model = S.Struct({
    route_base: S.Literals(["/pages", "/web/pages"]),
    requested_subdomain_slug: S.Option(S.String),
    requested_page_id: S.Option(PageId),
    requested_edit_mode: S.Boolean,
    route: S.Literals(["index", "new", "item"]),
    pages: S.Array(Page),
    publication_modules: S.Array(PublicationRouteModule),
    is_loading: S.Boolean,
    is_busy: S.Boolean,
    can_write: S.Boolean,
    can_configure_modules: S.Boolean,
    new_page_title: S.String,
    new_page_kind: NewPageKind,
    edit_draft: S.Option(EditDraft),
    editor: RichTextEditorModel,
    pending_delete_page_id: S.Option(PageId),
    error: S.Option(S.String),
})
export type Model = typeof Model.Type

export const ChangedUrl = taggedStruct("ChangedUrl", { url: Url })
export const LoadedPages = taggedStruct("LoadedPages", { pages: S.Array(Page) })
export const LoadedPublicationModules = taggedStruct(
    "LoadedPublicationModules",
    {
        modules: S.Array(PublicationRouteModule),
    }
)
export const RequestedSetPublicationModule = taggedStruct(
    "RequestedSetPublicationModule",
    {
        module_id: PublicationRouteModuleId,
        included: S.Boolean,
    }
)
export const ChangedNewPageTitle = taggedStruct("ChangedNewPageTitle", {
    value: S.String,
})
export const ChangedNewPageKind = taggedStruct("ChangedNewPageKind", {
    value: NewPageKind,
})
export const SubmittedNewPage = taggedStruct("SubmittedNewPage")
export const StartedEditingPage = taggedStruct("StartedEditingPage", {
    page_id: PageId,
})
export const ChangedPageTitle = taggedStruct("ChangedPageTitle", {
    value: S.String,
})
export const ChangedPageSlug = taggedStruct("ChangedPageSlug", {
    value: S.String,
})
export const GotPageRichTextEditorMessage = taggedStruct(
    "GotPageRichTextEditorMessage",
    {
        message: RichTextEditorMessage,
    }
)
export const ChangedPageNavigationLabel = taggedStruct(
    "ChangedPageNavigationLabel",
    {
        value: S.String,
    }
)
export const ChangedPagePublicationState = taggedStruct(
    "ChangedPagePublicationState",
    {
        value: PublicationState,
    }
)
export const ChangedPageSeoTitle = taggedStruct("ChangedPageSeoTitle", {
    value: S.String,
})
export const ChangedPageSeoDescription = taggedStruct(
    "ChangedPageSeoDescription",
    {
        value: S.String,
    }
)
export const ToggledPageHomepage = taggedStruct("ToggledPageHomepage", {
    value: S.Boolean,
})
export const ToggledPageNavigation = taggedStruct("ToggledPageNavigation", {
    value: S.Boolean,
})
export const ToggledPageNoindex = taggedStruct("ToggledPageNoindex", {
    value: S.Boolean,
})
export const SubmittedPageEdit = taggedStruct("SubmittedPageEdit")
export const RequestedSaveLandingContent = taggedStruct(
    "RequestedSaveLandingContent",
    {
        page_id: PageId,
        content: S.String,
    }
)
export const CancelledPageEdit = taggedStruct("CancelledPageEdit")
export const RequestedMovePage = taggedStruct("RequestedMovePage", {
    page_id: PageId,
    direction: S.Literals(["up", "down"]),
})
export const RequestedDeletePage = taggedStruct("RequestedDeletePage", {
    page_id: PageId,
})
export const ConfirmedDeletePage = taggedStruct("ConfirmedDeletePage")
export const CancelledDeletePage = taggedStruct("CancelledDeletePage")
export const SucceededPageAction = taggedStruct("SucceededPageAction")
export const FailedPageAction = taggedStruct("FailedPageAction", {
    error: S.String,
})

export const Message = S.Union([
    ChangedUrl,
    LoadedPages,
    LoadedPublicationModules,
    RequestedSetPublicationModule,
    ChangedNewPageTitle,
    ChangedNewPageKind,
    SubmittedNewPage,
    StartedEditingPage,
    ChangedPageTitle,
    ChangedPageSlug,
    GotPageRichTextEditorMessage,
    ChangedPageNavigationLabel,
    ChangedPagePublicationState,
    ChangedPageSeoTitle,
    ChangedPageSeoDescription,
    ToggledPageHomepage,
    ToggledPageNavigation,
    ToggledPageNoindex,
    SubmittedPageEdit,
    RequestedSaveLandingContent,
    CancelledPageEdit,
    RequestedMovePage,
    RequestedDeletePage,
    ConfirmedDeletePage,
    CancelledDeletePage,
    SucceededPageAction,
    FailedPageAction,
])
export type Message = typeof Message.Type

type Commands = ReadonlyArray<Command.Command<Message, never, never>>
export type UpdateReturn = readonly [Model, Commands]

const OwnerArgs = S.Struct({
    domain_id: DomainId,
    subdomain_id: S.NullOr(SubdomainId),
})
type OwnerArgs = typeof OwnerArgs.Type

const OwnerSubdomain = S.Struct({
    id: S.String,
    domain_id: S.String,
    name: S.String,
    slug: S.String,
})
type OwnerSubdomain = typeof OwnerSubdomain.Type

const PageWriteFields = {
    title: S.String,
    content: S.String,
    content_type: PageContentType,
    slug: S.NullOr(S.String),
    navigation_label: S.String,
    show_in_navigation: S.Boolean,
    is_homepage: S.Boolean,
    publication_state: PublicationState,
    seo_title: S.NullOr(S.String),
    seo_description: S.NullOr(S.String),
    noindex: S.Boolean,
}
const untranslated_write = () =>
    Effect.succeed(
        FailedPageAction({
            error: "Page action was not translated to PostgreSQL.",
        })
    )
const CreatePublicationPage = Command.define("CreatePublicationPage", {
    args: {
        ...OwnerArgs.fields,
        ...PageWriteFields,
        template_source: S.optional(ContentTemplateSource),
    },
    messages: [FailedPageAction],
    execute: untranslated_write,
})
const UpdatePublicationPage = Command.define("UpdatePublicationPage", {
    args: { ...OwnerArgs.fields, page_id: PageId, ...PageWriteFields },
    messages: [FailedPageAction],
    execute: untranslated_write,
})
const ReorderPublicationPages = Command.define("ReorderPublicationPages", {
    args: {
        ...OwnerArgs.fields,
        positions: S.Array(
            S.Struct({ page_id: PageId, order_position: S.Number })
        ),
    },
    messages: [FailedPageAction],
    execute: untranslated_write,
})
const RemovePublicationPage = Command.define("RemovePublicationPage", {
    args: { ...OwnerArgs.fields, page_id: PageId },
    messages: [FailedPageAction],
    execute: untranslated_write,
})
const SavePublicationModule = Command.define("SavePublicationModule", {
    args: {
        ...OwnerArgs.fields,
        module_id: PublicationRouteModuleId,
        included: S.Boolean,
    },
    messages: [FailedPageAction],
    execute: untranslated_write,
})

const path_for_url = (url: Url): string => url.pathname.replace(/\/$/, "")

const route_base_for_url = (url: Url): Model["route_base"] =>
    path_for_url(url) === "/web" ||
    path_for_url(url).startsWith("/web/") ||
    path_for_url(url).startsWith("/content/web/")
        ? "/web/pages"
        : "/pages"

export const content_page_id_for_path = (
    pathname: string
): Option.Option<PageId> => {
    const content_id = content_item_id_for_path(pathname, "web")
    return content_id === null
        ? Option.none()
        : S.decodeUnknownOption(PageId)(content_id)
}

const requested_content_page_id = (url: Url): Option.Option<PageId> =>
    content_page_id_for_path(path_for_url(url))

const requested_subdomain_slug = (url: Url): Option.Option<string> => {
    const matched =
        /^\/(?:pages|web\/pages)\/subdomains\/([a-z0-9]+(?:-[a-z0-9]+)*)/.exec(
            path_for_url(url)
        )
    const path_slug = Array.get(matched ?? [], 1)
    if (Option.isSome(path_slug)) return path_slug
    if (Option.isNone(requested_content_page_id(url))) return Option.none()
    const query_slug = new URLSearchParams(
        Option.getOrElse(url.search, () => "")
    ).get("subdomain")
    return query_slug !== null && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query_slug)
        ? Option.some(query_slug)
        : Option.none()
}

const page_route = (url: Url): Model["route"] =>
    Option.isSome(requested_content_page_id(url))
        ? "item"
        : path_for_url(url) === "/pages/new" ||
            path_for_url(url).endsWith("/new")
          ? "new"
          : "index"

const requested_edit_mode = (url: Url): boolean =>
    Option.isSome(requested_content_page_id(url)) &&
    is_content_edit_requested(Option.getOrElse(url.search, () => ""))

const slugify = (value: string): string =>
    String.trim(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

const is_landing_kind = (kind: NewPageKind): boolean => kind !== "document"

const landing_title = (kind: NewPageKind): string =>
    kind === "urm_marketing"
        ? "URM marketing landing"
        : kind === "marketing_starter"
          ? "Marketing landing"
          : "Landing page"

const empty_model = (url: Url): Model =>
    Model.make({
        route_base: route_base_for_url(url),
        requested_subdomain_slug: requested_subdomain_slug(url),
        requested_page_id: requested_content_page_id(url),
        requested_edit_mode: requested_edit_mode(url),
        route: page_route(url),
        pages: [],
        publication_modules: [],
        is_loading: true,
        is_busy: false,
        can_write: true,
        can_configure_modules: true,
        new_page_title: "",
        new_page_kind: new_page_kind_for_url(url),
        edit_draft: Option.none(),
        editor: initRichTextEditor(),
        pending_delete_page_id: Option.none(),
        error: Option.none(),
    })

export const init = (url: Url): Model => empty_model(url)

export const clear = (model: Model): Model => ({
    ...model,
    pages: [],
    publication_modules: [],
    is_loading: true,
    is_busy: false,
    edit_draft: Option.none(),
    editor: initRichTextEditor(),
    pending_delete_page_id: Option.none(),
    error: Option.none(),
})

export const changed_url = (model: Model, url: Url): Model => {
    const next_slug = requested_subdomain_slug(url)
    const next_page_id = requested_content_page_id(url)
    if (
        route_base_for_url(url) === model.route_base &&
        Option.getOrNull(next_slug) ===
            Option.getOrNull(model.requested_subdomain_slug) &&
        Option.getOrNull(next_page_id) ===
            Option.getOrNull(model.requested_page_id) &&
        requested_edit_mode(url) === model.requested_edit_mode &&
        page_route(url) === model.route
    ) {
        return model
    }
    const next_model = empty_model(url)
    const owner_is_unchanged =
        next_model.route_base === model.route_base &&
        Option.getOrNull(next_model.requested_subdomain_slug) ===
            Option.getOrNull(model.requested_subdomain_slug)

    return owner_is_unchanged
        ? {
              ...next_model,
              pages: model.pages,
              publication_modules: model.publication_modules,
              is_loading: model.is_loading,
          }
        : next_model
}

export const owner_args = (
    model: Model,
    active_domain_id: Option.Option<DomainId>,
    subdomains: ReadonlyArray<OwnerSubdomain>
): Option.Option<OwnerArgs> =>
    Option.flatMap(active_domain_id, (domain_id) =>
        Option.match(model.requested_subdomain_slug, {
            onNone: () =>
                Option.some<OwnerArgs>({ domain_id, subdomain_id: null }),
            onSome: (slug) =>
                Option.flatMap(
                    Array.findFirst(
                        subdomains,
                        (subdomain) =>
                            subdomain.domain_id ===
                                globalThis.String(domain_id) &&
                            subdomain.slug === slug
                    ),
                    (subdomain) =>
                        Option.map(
                            S.decodeUnknownOption(SubdomainId)(subdomain.id),
                            (subdomain_id): OwnerArgs => ({
                                domain_id,
                                subdomain_id,
                            })
                        )
                ),
        })
    )

const to_page = (page: StoredPage): Page => ({
    id: page._id,
    title: page.title,
    content: page.content,
    content_type: page.content_type,
    slug: page.slug ?? null,
    navigation_label: page.navigation_label,
    show_in_navigation: page.show_in_navigation,
    order_position: page.order_position,
    is_homepage: page.is_homepage,
    publication_state: page.publication_state,
    seo_title: page.seo_title ?? null,
    seo_description: page.seo_description ?? null,
    noindex: page.noindex,
    updated_at: page.updated_at,
})

export const loaded_pages = (pages: ReadonlyArray<StoredPage>): Message =>
    LoadedPages({ pages: Array.map(pages, to_page) })

export const loaded_publication_modules = (
    modules: ReadonlyArray<typeof PublicationRouteModule.Type>
): Message => LoadedPublicationModules({ modules })

export const has_homepage_conflict = (pages: ReadonlyArray<Page>): boolean =>
    pages.filter((page) => page.is_homepage).length > 1

export const failed_action = (error: string): Message =>
    FailedPageAction({ error })

const serialized_editor_content = (
    editor: typeof RichTextEditorModel.Type
): string => JSON.stringify({ schema_version: 1, document: editor.document })

const editor_for_page = (page: Page): typeof RichTextEditorModel.Type => {
    if (page.content_type !== "rich_text_json") {
        return initRichTextEditor(page.content)
    }

    try {
        const parsed: unknown = JSON.parse(page.content)
        const decoded = S.decodeUnknownOption(PageRichTextContent)(parsed)
        return Option.match(decoded, {
            onNone: () => initRichTextEditor(),
            onSome: (content) => ({
                ...initRichTextEditor(),
                document: content.document,
            }),
        })
    } catch {
        return initRichTextEditor()
    }
}

const editor_image_urls = (
    editor: typeof RichTextEditorModel.Type
): ReadonlyArray<string> =>
    editor.document.children.flatMap((block) =>
        block.type === "image" ? [block.src] : []
    )

const page_input = (
    draft: EditDraft,
    owner: OwnerArgs,
    editor: typeof RichTextEditorModel.Type
) => ({
    ...owner,
    title: String.trim(draft.title),
    content:
        draft.content_type === "landing_json"
            ? draft.content
            : serialized_editor_content(editor),
    content_type:
        draft.content_type === "landing_json"
            ? draft.content_type
            : page_content_type,
    slug:
        draft.content_type === "landing_json" || draft.is_homepage
            ? null
            : slugify(draft.slug),
    navigation_label: String.trim(draft.navigation_label),
    show_in_navigation: draft.show_in_navigation,
    is_homepage: draft.is_homepage,
    publication_state: draft.publication_state,
    seo_title: String.isEmpty(String.trim(draft.seo_title))
        ? null
        : String.trim(draft.seo_title),
    seo_description: String.isEmpty(String.trim(draft.seo_description))
        ? null
        : String.trim(draft.seo_description),
    noindex: draft.noindex,
})

const with_edit_draft = (
    model: Model,
    update_draft: (draft: EditDraft) => EditDraft
): Model => ({
    ...model,
    edit_draft: Option.map(model.edit_draft, update_draft),
})

const map_editor_commands = (
    commands: ReadonlyArray<
        Command.Command<typeof RichTextEditorMessage.Type, never, never>
    >
): Commands =>
    Command.mapMessages(commands, (message) =>
        GotPageRichTextEditorMessage({ message })
    )

const start_editing_page = (model: Model, page_id: PageId): UpdateReturn => {
    const maybe_page = Array.findFirst(
        model.pages,
        (page) => page.id === page_id
    )
    return Option.match(maybe_page, {
        onNone: () => [model, []],
        onSome: (page) => {
            const editor = editor_for_page(page)
            const image_urls = editor_image_urls(editor)
            return [
                {
                    ...model,
                    editor,
                    edit_draft: Option.some({
                        page_id: page.id,
                        content: page.content,
                        content_type: page.content_type,
                        title: page.title,
                        slug: page.slug ?? "",
                        navigation_label: page.navigation_label,
                        show_in_navigation: page.show_in_navigation,
                        is_homepage: page.is_homepage,
                        publication_state: page.publication_state,
                        seo_title: page.seo_title ?? "",
                        seo_description: page.seo_description ?? "",
                        noindex: page.noindex,
                    }),
                    error: Option.none(),
                },
                image_urls.length === 0
                    ? []
                    : map_editor_commands([
                          resolveRichTextImageUrls(image_urls),
                      ]),
            ]
        },
    })
}

const changed_url_update = (model: Model, url: Url): UpdateReturn => {
    const next_model = changed_url(model, url)
    if (next_model === model || !next_model.requested_edit_mode)
        return [next_model, []]

    return Option.match(next_model.requested_page_id, {
        onNone: () => [next_model, []],
        onSome: (page_id) => start_editing_page(next_model, page_id),
    })
}

const editor_subscriptions = Subscription.make<Model, Message>()((entry) => ({
    pageRichTextEditor: entry(
        {
            id: S.String,
            model: RichTextEditorModel,
            isDisabled: S.Boolean,
        },
        {
            modelToDependencies: (model) => ({
                id: editor_id,
                model: model.editor,
                isDisabled: model.is_busy || !model.can_write,
            }),
            dependenciesToStream: ({ id, model, isDisabled }) =>
                richTextEditorSubscriptions({
                    id,
                    model,
                    isDisabled,
                }).pipe(
                    Stream.map((message) =>
                        GotPageRichTextEditorMessage({ message })
                    )
                ),
        }
    ),
}))

const drag_and_drop_subscriptions = DragAndDrop.subscriptions
const editor_drag_and_drop_subscriptions = Subscription.lift({
    pagesRichTextDragPointer: drag_and_drop_subscriptions.documentPointer,
    pagesRichTextDragEscape: drag_and_drop_subscriptions.documentEscape,
    pagesRichTextDragKeyboard: drag_and_drop_subscriptions.documentKeyboard,
    pagesRichTextAutoScroll: drag_and_drop_subscriptions.autoScroll,
})<Model, Message>({
    read: (model) => Option.some(model.editor.dragAndDrop),
    toParentMessage: (message) =>
        GotPageRichTextEditorMessage({
            message: GotRichTextDragAndDropMessage({ message }),
        }),
})

export const subscriptions = Subscription.aggregate<Model, Message>()(
    editor_subscriptions,
    editor_drag_and_drop_subscriptions
)

export const update = (
    model: Model,
    message: Message,
    active_domain_id: Option.Option<DomainId>,
    subdomains: ReadonlyArray<OwnerSubdomain>
): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedUrl: ({ url }) => changed_url_update(model, url),
            LoadedPages: ({ pages }) => {
                const loaded_model: Model = {
                    ...model,
                    pages,
                    is_loading: false,
                    is_busy: false,
                    error: Option.none(),
                }
                return model.requested_edit_mode
                    ? Option.match(model.requested_page_id, {
                          onNone: () => [loaded_model, []],
                          onSome: (page_id) =>
                              start_editing_page(loaded_model, page_id),
                      })
                    : [loaded_model, []]
            },
            LoadedPublicationModules: ({ modules }) => [
                { ...model, publication_modules: modules },
                [],
            ],
            RequestedSetPublicationModule: ({ module_id, included }) =>
                Option.match(owner_args(model, active_domain_id, subdomains), {
                    onNone: () => [model, []],
                    onSome: (owner) =>
                        model.is_busy
                            ? [model, []]
                            : [
                                  {
                                      ...model,
                                      is_busy: true,
                                      error: Option.none(),
                                  },
                                  [
                                      SavePublicationModule({
                                          ...owner,
                                          module_id,
                                          included,
                                      }),
                                  ],
                              ],
                }),
            ChangedNewPageTitle: ({ value }) => [
                { ...model, new_page_title: value, error: Option.none() },
                [],
            ],
            ChangedNewPageKind: ({ value }) => [
                { ...model, new_page_kind: value },
                [],
            ],
            SubmittedNewPage: () =>
                Option.match(owner_args(model, active_domain_id, subdomains), {
                    onNone: () => [model, []],
                    onSome: (owner) => {
                        const landing = is_landing_kind(model.new_page_kind)
                        const title = landing
                            ? landing_title(model.new_page_kind)
                            : String.trim(model.new_page_title)
                        if (String.isEmpty(title) || model.is_busy) {
                            return [model, []]
                        }
                        if (
                            landing &&
                            model.pages.some(
                                (page) => page.content_type === "landing_json"
                            )
                        )
                            return [
                                {
                                    ...model,
                                    error: Option.some(
                                        "This publication already has a landing page. Edit or remove it before creating another."
                                    ),
                                },
                                [],
                            ]
                        const is_homepage = false
                        const proposed_slug = slugify(title)
                        const slug_exists = Array.some(
                            model.pages,
                            (page) => page.slug === proposed_slug
                        )
                        if (!landing && !is_homepage && slug_exists) {
                            return [
                                {
                                    ...model,
                                    error: Option.some(
                                        `A page already uses /${proposed_slug}/. Choose a different title or edit the existing page.`
                                    ),
                                },
                                [],
                            ]
                        }
                        const new_content =
                            model.new_page_kind === "landing_blank"
                                ? JSON.stringify(blank_landing_page)
                                : model.new_page_kind === "marketing_starter"
                                  ? JSON.stringify(
                                        marketing_starter_landing_page
                                    )
                                  : model.new_page_kind === "urm_marketing"
                                    ? JSON.stringify(urm_marketing_landing_page)
                                    : serialized_editor_content(
                                          initRichTextEditor()
                                      )
                        return [
                            {
                                ...model,
                                is_busy: true,
                                error: Option.none(),
                            },
                            [
                                CreatePublicationPage({
                                    ...owner,
                                    title,
                                    content: new_content,
                                    content_type:
                                        model.new_page_kind === "document"
                                            ? page_content_type
                                            : "landing_json",
                                    slug:
                                        landing || is_homepage
                                            ? null
                                            : proposed_slug,
                                    navigation_label: title,
                                    show_in_navigation: !landing,
                                    is_homepage,
                                    publication_state: "draft",
                                    seo_title: null,
                                    seo_description: null,
                                    noindex: true,
                                    template_source:
                                        template_source_for_new_page_kind(
                                            model.new_page_kind
                                        ),
                                }),
                            ],
                        ]
                    },
                }),
            StartedEditingPage: ({ page_id }) =>
                start_editing_page(model, page_id),
            ChangedPageTitle: ({ value }) => [
                with_edit_draft(model, (draft) => ({
                    ...draft,
                    title: value,
                })),
                [],
            ],
            ChangedPageSlug: ({ value }) => [
                with_edit_draft(model, (draft) => ({
                    ...draft,
                    slug: slugify(value),
                })),
                [],
            ],
            GotPageRichTextEditorMessage: ({ message }) => {
                const [editor, commands] = updateRichTextEditor(
                    model.editor,
                    message
                )
                return [{ ...model, editor }, map_editor_commands(commands)]
            },
            ChangedPageNavigationLabel: ({ value }) => [
                with_edit_draft(model, (draft) => ({
                    ...draft,
                    navigation_label: value,
                })),
                [],
            ],
            ChangedPagePublicationState: ({ value }) => [
                with_edit_draft(model, (draft) => ({
                    ...draft,
                    publication_state: value,
                })),
                [],
            ],
            ChangedPageSeoTitle: ({ value }) => [
                with_edit_draft(model, (draft) => ({
                    ...draft,
                    seo_title: value,
                })),
                [],
            ],
            ChangedPageSeoDescription: ({ value }) => [
                with_edit_draft(model, (draft) => ({
                    ...draft,
                    seo_description: value,
                })),
                [],
            ],
            ToggledPageHomepage: ({ value }) => [
                with_edit_draft(model, (draft) => ({
                    ...draft,
                    is_homepage: value,
                    slug: value ? "" : draft.slug,
                })),
                [],
            ],
            ToggledPageNavigation: ({ value }) => [
                with_edit_draft(model, (draft) => ({
                    ...draft,
                    show_in_navigation: value,
                })),
                [],
            ],
            ToggledPageNoindex: ({ value }) => [
                with_edit_draft(model, (draft) => ({
                    ...draft,
                    noindex: value,
                })),
                [],
            ],
            SubmittedPageEdit: () =>
                Option.match(
                    Option.all({
                        owner: owner_args(model, active_domain_id, subdomains),
                        draft: model.edit_draft,
                    }),
                    {
                        onNone: () => [model, []],
                        onSome: ({ owner, draft }) => {
                            const values = page_input(
                                draft,
                                owner,
                                model.editor
                            )
                            if (
                                String.isEmpty(values.title) ||
                                (draft.content_type !== "landing_json" &&
                                    !draft.is_homepage &&
                                    String.isEmpty(values.slug ?? "")) ||
                                model.is_busy
                            ) {
                                return [model, []]
                            }
                            return [
                                {
                                    ...model,
                                    is_busy: true,
                                    error: Option.none(),
                                },
                                [
                                    UpdatePublicationPage({
                                        ...values,
                                        page_id: draft.page_id,
                                    }),
                                ],
                            ]
                        },
                    }
                ),
            RequestedSaveLandingContent: ({ page_id, content }) => {
                const page = Array.findFirst(
                    model.pages,
                    (candidate) => candidate.id === page_id
                )
                return Option.match(
                    Option.all({
                        owner: owner_args(model, active_domain_id, subdomains),
                        page,
                    }),
                    {
                        onNone: () => [model, []],
                        onSome: ({ owner, page: landing_page }) =>
                            landing_page.content_type !== "landing_json" ||
                            model.is_busy
                                ? [model, []]
                                : [
                                      {
                                          ...model,
                                          is_busy: true,
                                          error: Option.none(),
                                      },
                                      [
                                          UpdatePublicationPage({
                                              ...owner,
                                              page_id: landing_page.id,
                                              title: landing_page.title,
                                              content,
                                              content_type: "landing_json",
                                              slug: null,
                                              navigation_label:
                                                  landing_page.navigation_label,
                                              show_in_navigation: false,
                                              is_homepage:
                                                  landing_page.is_homepage,
                                              publication_state:
                                                  landing_page.publication_state,
                                              seo_title: landing_page.seo_title,
                                              seo_description:
                                                  landing_page.seo_description,
                                              noindex: landing_page.noindex,
                                          }),
                                      ],
                                  ],
                    }
                )
            },
            CancelledPageEdit: () => [
                {
                    ...model,
                    edit_draft: Option.none(),
                    editor: unmountRichTextEditorHost(model.editor),
                },
                [],
            ],
            RequestedMovePage: ({ page_id, direction }) =>
                Option.match(owner_args(model, active_domain_id, subdomains), {
                    onNone: () => [model, []],
                    onSome: (owner) => {
                        const index = Array.findFirstIndex(
                            model.pages,
                            (page) => page.id === page_id
                        )
                        const current = Option.flatMap(index, (value) =>
                            Array.get(model.pages, value)
                        )
                        const target = Option.flatMap(index, (value) =>
                            Array.get(
                                model.pages,
                                direction === "up" ? value - 1 : value + 1
                            )
                        )
                        return Option.match(Option.all({ current, target }), {
                            onNone: () => [model, []],
                            onSome: ({ current, target }) => [
                                { ...model, is_busy: true },
                                [
                                    ReorderPublicationPages({
                                        ...owner,
                                        positions: Array.map(
                                            model.pages,
                                            (page) => ({
                                                page_id: page.id,
                                                order_position:
                                                    page.id === page_id
                                                        ? target.order_position
                                                        : page.id === target.id
                                                          ? current.order_position
                                                          : page.order_position,
                                            })
                                        ),
                                    }),
                                ],
                            ],
                        })
                    },
                }),
            RequestedDeletePage: ({ page_id }) => [
                {
                    ...model,
                    pending_delete_page_id: Option.some(page_id),
                },
                [],
            ],
            ConfirmedDeletePage: () =>
                Option.match(
                    Option.all({
                        owner: owner_args(model, active_domain_id, subdomains),
                        page_id: model.pending_delete_page_id,
                    }),
                    {
                        onNone: () => [model, []],
                        onSome: ({ owner, page_id }) => [
                            { ...model, is_busy: true, error: Option.none() },
                            [
                                RemovePublicationPage({
                                    ...owner,
                                    page_id,
                                }),
                            ],
                        ],
                    }
                ),
            CancelledDeletePage: () => [
                { ...model, pending_delete_page_id: Option.none() },
                [],
            ],
            SucceededPageAction: () => [
                {
                    ...model,
                    is_busy: false,
                    new_page_title: "",
                    edit_draft: Option.none(),
                    editor: unmountRichTextEditorHost(model.editor),
                    pending_delete_page_id: Option.none(),
                    error: Option.none(),
                },
                [],
            ],
            FailedPageAction: ({ error }) => [
                {
                    ...model,
                    is_loading: false,
                    is_busy: false,
                    error: Option.some(error),
                },
                [],
            ],
        })
    )

export type ViewInputs = Readonly<{
    domain_name: string | undefined
    domain_slug: string | undefined
    subdomains: ReadonlyArray<OwnerSubdomain>
    link_suggestions: ReadonlyArray<LinkSuggestion>
    blog_enabled: boolean
    blog_published_count: number
    events_enabled: boolean
    events_published_count: number
    can_write?: boolean
    can_preview?: boolean
}>

const field_class =
    "min-h-11 w-full rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
const card_class =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)]"
const button_class =
    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] disabled:opacity-50"

const publication_module_added = (
    model: Model,
    module_id: typeof PublicationRouteModuleId.Type
): boolean =>
    model.publication_modules.find((setting) => setting.module_id === module_id)
        ?.included ?? true

const publication_module_card = (
    model: Model,
    module_id: typeof PublicationRouteModuleId.Type,
    name: string,
    route: string,
    manage_href: string,
    module_enabled: boolean,
    published_count: number,
    context: "inventory" | "catalog",
    h: HtmlBuilder<Message>
): Html => {
    const added = publication_module_added(model, module_id)
    const generated_route_count =
        published_count === 0 ? 0 : published_count + 1
    const status = !module_enabled
        ? "Module disabled"
        : !added
          ? "Excluded from this site"
          : generated_route_count === 0
            ? "Added; routes appear when content is published"
            : `${generated_route_count} generated ${generated_route_count === 1 ? "route" : "routes"}`
    const action_label =
        context === "inventory" && added
            ? "Remove from Pages"
            : added
              ? "Already in Pages"
              : module_enabled
                ? "Add to Pages"
                : "Module disabled"
    const action_disabled =
        model.is_busy ||
        !model.can_write ||
        !model.can_configure_modules ||
        (context === "catalog" && added) ||
        (!added && !module_enabled)

    return h.li(
        [h.Class(card_class)],
        [
            h.div(
                [h.Class("flex flex-wrap items-start justify-between gap-4")],
                [
                    h.div(
                        [h.Class("min-w-0 space-y-1")],
                        [
                            h.h3([h.Class("font-semibold")], [name]),
                            h.p(
                                [
                                    h.Class(
                                        "font-mono text-sm text-muted-foreground"
                                    ),
                                ],
                                [route]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    `${published_count} published ${module_id === "blog" ? (published_count === 1 ? "post" : "posts") : published_count === 1 ? "event" : "events"}. ${status}.`,
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        [
                            h.a(
                                [h.Href(manage_href), h.Class(button_class)],
                                [`Manage ${name}`]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Disabled(action_disabled),
                                    h.AriaPressed(globalThis.String(added)),
                                    h.OnClick(
                                        RequestedSetPublicationModule({
                                            module_id,
                                            included: !added,
                                        })
                                    ),
                                    h.Class(button_class),
                                ],
                                [action_label]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const publication_routes_view = (
    model: Model,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html => {
    const cards = [
        publication_module_card(
            model,
            "blog",
            "Blog",
            "/blog/*",
            documentsBlogPublishedHref(),
            inputs.blog_enabled,
            inputs.blog_published_count,
            "inventory",
            h
        ),
        publication_module_card(
            model,
            "events",
            "Events",
            "/events/*",
            eventsHref(),
            inputs.events_enabled,
            inputs.events_published_count,
            "inventory",
            h
        ),
    ]

    return h.section(
        [h.Class("space-y-3")],
        [
            h.div(
                [h.Class("flex flex-wrap items-end justify-between gap-4")],
                [
                    h.div(
                        [],
                        [
                            h.h2(
                                [h.Class("text-xl font-semibold")],
                                ["Generated page types"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "Generated route groups added to this publication. Header links are managed separately.",
                                ]
                            ),
                        ]
                    ),
                    h.a(
                        [
                            ...(inputs.can_preview === false
                                ? [h.AriaDisabled(true)]
                                : [h.Href(designMainLayoutHref())]),
                            h.Class(button_class),
                        ],
                        ["Manage header navigation"]
                    ),
                ]
            ),
            cards.length === 0
                ? h.div(
                      [h.Class(card_class)],
                      ["No generated page types. Add one from New page."]
                  )
                : h.ul([h.Class("grid gap-3")], cards),
        ]
    )
}

const publication_route_catalog_view = (
    model: Model,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html =>
    h.section(
        [h.Class("space-y-3")],
        [
            h.div(
                [],
                [
                    h.h2(
                        [h.Class("text-xl font-semibold")],
                        ["Generated page types"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Add a generated route group to this publication. Its header link remains optional.",
                        ]
                    ),
                ]
            ),
            h.ul(
                [h.Class("grid gap-3")],
                [
                    publication_module_card(
                        model,
                        "blog",
                        "Blog",
                        "/blog/*",
                        documentsBlogPublishedHref(),
                        inputs.blog_enabled,
                        inputs.blog_published_count,
                        "catalog",
                        h
                    ),
                    publication_module_card(
                        model,
                        "events",
                        "Events",
                        "/events/*",
                        eventsHref(),
                        inputs.events_enabled,
                        inputs.events_published_count,
                        "catalog",
                        h
                    ),
                ]
            ),
        ]
    )

const labeled_input = (
    id: string,
    label: string,
    value: string,
    on_input: (value: string) => Message,
    h: HtmlBuilder<Message>,
    required = false
): Html =>
    h.div(
        [h.Class("space-y-1")],
        [
            h.label([h.For(id), h.Class("text-sm font-medium")], [label]),
            h.input([
                h.Id(id),
                h.Name(id),
                h.Value(value),
                h.Required(required),
                h.OnInput(on_input),
                h.Class(field_class),
            ]),
        ]
    )

const edit_form = (
    model: Model,
    draft: EditDraft,
    editor: typeof RichTextEditorModel.Type,
    is_busy: boolean,
    link_suggestions: ReadonlyArray<LinkSuggestion>,
    h: HtmlBuilder<Message>
): Html => {
    const prefix = `page-${draft.page_id}`
    return h.form(
        [h.Class("space-y-5"), h.OnSubmit(SubmittedPageEdit())],
        [
            h.div(
                [h.Class("grid gap-4 md:grid-cols-2")],
                [
                    ...(draft.content_type === "landing_json"
                        ? []
                        : [
                              labeled_input(
                                  `${prefix}-title`,
                                  "Title",
                                  draft.title,
                                  (value) => ChangedPageTitle({ value }),
                                  h,
                                  true
                              ),
                              labeled_input(
                                  `${prefix}-slug`,
                                  "Path slug",
                                  draft.slug,
                                  (value) => ChangedPageSlug({ value }),
                                  h,
                                  !draft.is_homepage
                              ),
                              labeled_input(
                                  `${prefix}-navigation-label`,
                                  "Navigation label",
                                  draft.navigation_label,
                                  (value) =>
                                      ChangedPageNavigationLabel({ value }),
                                  h,
                                  true
                              ),
                          ]),
                    labeled_input(
                        `${prefix}-seo-title`,
                        "SEO title",
                        draft.seo_title,
                        (value) => ChangedPageSeoTitle({ value }),
                        h
                    ),
                ]
            ),
            draft.content_type === "landing_json"
                ? h.div(
                      [
                          h.Class(
                              "rounded-[var(--radius-surface)] border border-border bg-muted/40 p-4"
                          ),
                      ],
                      [
                          h.h3(
                              [h.Class("font-medium")],
                              ["Landing page blocks"]
                          ),
                          h.p(
                              [
                                  h.Class(
                                      "mt-1 max-w-[70ch] text-sm text-muted-foreground"
                                  ),
                              ],
                              [
                                  "This page uses the versioned landing block format. Start with an empty canvas and add only the blocks you need.",
                              ]
                          ),
                          h.a(
                              [
                                  h.Href(
                                      content_page_href(
                                          model,
                                          draft.page_id,
                                          true
                                      )
                                  ),
                                  h.Class(`${button_class} mt-3`),
                              ],
                              ["Open blank block editor"]
                          ),
                      ]
                  )
                : RichTextEditor<Message>(
                      {
                          id: editor_id,
                          model: editor,
                          toParentMessage: (message) =>
                              GotPageRichTextEditorMessage({ message }),
                          label: "Content",
                          description:
                              "Type / for blocks. Use Cmd+B or Cmd+I for inline formatting.",
                          placeholder: "Start writing…",
                          isDisabled: is_busy,
                          linkSuggestions: link_suggestions,
                      },
                      h
                  ),
            h.div(
                [h.Class("grid gap-4")],
                [
                    h.label(
                        [h.Class("space-y-1 text-sm font-medium")],
                        [
                            "Publication state",
                            h.select(
                                [
                                    h.Name("publication_state"),
                                    h.Value(draft.publication_state),
                                    h.OnChange((value) =>
                                        Option.match(
                                            S.decodeUnknownOption(
                                                PublicationState
                                            )(value),
                                            {
                                                onNone: () =>
                                                    ChangedPagePublicationState(
                                                        {
                                                            value: draft.publication_state,
                                                        }
                                                    ),
                                                onSome: (next) =>
                                                    ChangedPagePublicationState(
                                                        { value: next }
                                                    ),
                                            }
                                        )
                                    ),
                                    h.Class(field_class),
                                ],
                                Array.map(PublicationState.literals, (value) =>
                                    h.option([h.Value(value)], [value])
                                )
                            ),
                        ]
                    ),
                ]
            ),
            labeled_input(
                `${prefix}-seo-description`,
                "SEO description",
                draft.seo_description,
                (value) => ChangedPageSeoDescription({ value }),
                h
            ),
            h.fieldset(
                [h.Class("grid gap-3 sm:grid-cols-3")],
                [
                    h.legend(
                        [h.Class("mb-2 text-sm font-medium")],
                        ["Page options"]
                    ),
                    ...Array.map(
                        [
                            {
                                id: `${prefix}-navigation`,
                                label: "Show in navigation",
                                checked: draft.show_in_navigation,
                                message: ToggledPageNavigation,
                            },
                            {
                                id: `${prefix}-noindex`,
                                label: "Hide from search engines",
                                checked: draft.noindex,
                                message: ToggledPageNoindex,
                            },
                        ],
                        (option) =>
                            h.label(
                                [
                                    h.For(option.id),
                                    h.Class(
                                        "flex min-h-11 items-center gap-2 text-sm"
                                    ),
                                ],
                                [
                                    h.input([
                                        h.Id(option.id),
                                        h.Name(option.id),
                                        h.Type("checkbox"),
                                        h.Checked(option.checked),
                                        h.OnClick(
                                            option.message({
                                                value: !option.checked,
                                            })
                                        ),
                                    ]),
                                    option.label,
                                ]
                            )
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap justify-end gap-2")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(CancelledPageEdit()),
                            h.Class(button_class),
                        ],
                        ["Cancel"]
                    ),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Disabled(is_busy),
                            h.Class(button_class),
                        ],
                        [is_busy ? "Saving…" : "Save page"]
                    ),
                ]
            ),
        ]
    )
}

const content_page_href = (
    model: Model,
    page_id: PageId,
    edit = false
): string => {
    const search = new URLSearchParams()
    if (edit) search.set("mode", "edit")
    if (Option.isSome(model.requested_subdomain_slug))
        search.set("subdomain", model.requested_subdomain_slug.value)
    const query = search.toString()
    const href = content_item_href("web", globalThis.String(page_id))
    return query === "" ? href : `${href}?${query}`
}

const page_card = (
    model: Model,
    page: Page,
    index: number,
    link_suggestions: ReadonlyArray<LinkSuggestion>,
    h: HtmlBuilder<Message>
): Html =>
    h.keyed("article")(
        page.id,
        [h.Class(card_class)],
        Option.match(model.edit_draft, {
            onNone: () => {
                const confirming = Option.contains(
                    model.pending_delete_page_id,
                    page.id
                )
                return [
                    h.div(
                        [h.Class("flex items-start justify-between gap-4")],
                        [
                            h.div(
                                [h.Class("min-w-0")],
                                [
                                    h.h2(
                                        [h.Class("text-lg font-semibold")],
                                        [
                                            model.route === "item"
                                                ? page.title
                                                : h.a(
                                                      [
                                                          h.Href(
                                                              content_page_href(
                                                                  model,
                                                                  page.id
                                                              )
                                                          ),
                                                          h.Class(
                                                              "text-balance underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                                          ),
                                                      ],
                                                      [page.title]
                                                  ),
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-1 font-mono text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            page.is_homepage
                                                ? "/"
                                                : page.slug === null
                                                  ? "Landing page · no public path"
                                                  : `/${page.slug}`,
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("flex flex-wrap justify-end gap-2")],
                                Array.map(
                                    [
                                        page.is_homepage ? "homepage" : "page",
                                        page.publication_state,
                                        page.show_in_navigation
                                            ? "in navigation"
                                            : "hidden from navigation",
                                    ],
                                    (label) =>
                                        h.span(
                                            [
                                                h.Class(
                                                    "rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                                                ),
                                            ],
                                            [label]
                                        )
                                )
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("mt-4 flex flex-wrap justify-end gap-2")],
                        confirming
                            ? [
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(ConfirmedDeletePage()),
                                          h.Class(
                                              `${button_class} text-destructive`
                                          ),
                                      ],
                                      ["Confirm delete"]
                                  ),
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(CancelledDeletePage()),
                                          h.Class(button_class),
                                      ],
                                      ["Cancel"]
                                  ),
                              ]
                            : [
                                  ...(model.route === "item"
                                      ? []
                                      : [
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.Disabled(
                                                        index === 0 ||
                                                            model.is_busy
                                                    ),
                                                    h.OnClick(
                                                        RequestedMovePage({
                                                            page_id: page.id,
                                                            direction: "up",
                                                        })
                                                    ),
                                                    h.Class(button_class),
                                                ],
                                                [`Move ${page.title} up`]
                                            ),
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.Disabled(
                                                        index ===
                                                            model.pages.length -
                                                                1 ||
                                                            model.is_busy
                                                    ),
                                                    h.OnClick(
                                                        RequestedMovePage({
                                                            page_id: page.id,
                                                            direction: "down",
                                                        })
                                                    ),
                                                    h.Class(button_class),
                                                ],
                                                [`Move ${page.title} down`]
                                            ),
                                        ]),
                                  model.route === "item"
                                      ? h.button(
                                            [
                                                h.Type("button"),
                                                h.OnClick(
                                                    StartedEditingPage({
                                                        page_id: page.id,
                                                    })
                                                ),
                                                h.Class(button_class),
                                            ],
                                            [`Edit ${page.title}`]
                                        )
                                      : h.a(
                                            [
                                                h.Href(
                                                    content_page_href(
                                                        model,
                                                        page.id,
                                                        true
                                                    )
                                                ),
                                                h.Class(button_class),
                                            ],
                                            [`Edit ${page.title}`]
                                        ),
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(
                                              RequestedDeletePage({
                                                  page_id: page.id,
                                              })
                                          ),
                                          h.Class(
                                              `${button_class} text-destructive`
                                          ),
                                      ],
                                      [`Delete ${page.title}`]
                                  ),
                              ]
                    ),
                ]
            },
            onSome: (draft) =>
                draft.page_id === page.id
                    ? [
                          edit_form(
                              model,
                              draft,
                              model.editor,
                              model.is_busy,
                              link_suggestions,
                              h
                          ),
                      ]
                    : [
                          h.p(
                              [h.Class("text-sm text-muted-foreground")],
                              [page.title]
                          ),
                      ],
        })
    )

export const content_view = (
    model: Model,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html => {
    model = { ...model, can_write: inputs.can_write ?? model.can_write }
    const maybe_subdomain = Option.flatMap(
        model.requested_subdomain_slug,
        (slug) =>
            Array.findFirst(
                inputs.subdomains,
                (subdomain) => subdomain.slug === slug
            )
    )
    const owner_name = Option.match(model.requested_subdomain_slug, {
        onNone: () => inputs.domain_name ?? "Main domain",
        onSome: (slug) =>
            Option.match(maybe_subdomain, {
                onNone: () => slug,
                onSome: (subdomain) => subdomain.name,
            }),
    })
    const owner_host = Option.match(model.requested_subdomain_slug, {
        onNone: () => inputs.domain_slug ?? "domain",
        onSome: (slug) => `${slug}.${inputs.domain_slug ?? "domain"}`,
    })
    const owner_missing =
        Option.isSome(model.requested_subdomain_slug) &&
        Option.isNone(maybe_subdomain)
    const pages_href = Option.match(model.requested_subdomain_slug, {
        onNone: () => model.route_base,
        onSome: (slug) => `${model.route_base}/subdomains/${slug}`,
    })
    const new_page_href = `${pages_href}/new`
    const requested_page = Option.flatMap(model.requested_page_id, (page_id) =>
        Array.findFirst(model.pages, (page) => page.id === page_id)
    )
    const visible_pages = Option.match(model.requested_page_id, {
        onNone: () => model.pages,
        onSome: (page_id) => model.pages.filter((page) => page.id === page_id),
    })
    const homepage_conflict = has_homepage_conflict(model.pages)

    return h.main(
        [
            h.Class(
                "mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.header(
                [h.Class("space-y-1")],
                [
                    h.p(
                        [h.Class("font-mono text-sm text-muted-foreground")],
                        [owner_host]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-balance"
                            ),
                        ],
                        [
                            model.route === "item"
                                ? Option.match(requested_page, {
                                      onNone: () => "Web page",
                                      onSome: (page) => page.title,
                                  })
                                : `Pages for ${owner_name}`,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-[70ch] text-sm text-muted-foreground text-pretty"
                            ),
                        ],
                        [
                            model.route === "new"
                                ? "Add a generated page type or create a custom page for this site."
                                : model.route === "item"
                                  ? `View or edit this page for ${owner_name}.`
                                  : "Manage public pages here. Internal Documents are separate and are never published.",
                        ]
                    ),
                    h.div(
                        [h.Class("mt-3 flex flex-wrap gap-2")],
                        [
                            h.a(
                                [
                                    h.Href(
                                        model.route === "new" ||
                                            model.route === "item"
                                            ? pages_href
                                            : new_page_href
                                    ),
                                    h.Class(button_class),
                                ],
                                [
                                    model.route === "new" ||
                                    model.route === "item"
                                        ? "Back to pages"
                                        : "New page",
                                ]
                            ),
                            ...(model.route === "new"
                                ? []
                                : [
                                      h.a(
                                          [
                                              ...(inputs.can_preview === false
                                                  ? [h.AriaDisabled(true)]
                                                  : [
                                                        h.Href(
                                                            designMainLayoutHref()
                                                        ),
                                                    ]),
                                              h.Class(button_class),
                                          ],
                                          ["Preview draft site"]
                                      ),
                                  ]),
                        ]
                    ),
                ]
            ),
            Option.match(model.error, {
                onNone: () => h.empty,
                onSome: (error) =>
                    h.div(
                        [
                            h.AriaLive("polite"),
                            h.Class(
                                "rounded-[var(--radius-surface)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                            ),
                        ],
                        [error]
                    ),
            }),
            homepage_conflict
                ? h.div(
                      [
                          h.AriaLive("polite"),
                          h.Class(
                              "rounded-[var(--radius-surface)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                          ),
                      ],
                      [
                          "This publication has multiple homepages assigned to /. Choose one homepage before publishing.",
                      ]
                  )
                : h.empty,
            model.route === "index" && !owner_missing
                ? publication_routes_view(model, inputs, h)
                : h.empty,
            owner_missing
                ? h.section(
                      [h.Class(card_class)],
                      [
                          h.h2(
                              [h.Class("text-lg font-semibold")],
                              ["Subdomain not found"]
                          ),
                          h.p(
                              [h.Class("mt-2 text-sm text-muted-foreground")],
                              [
                                  "Return to Domains and choose an existing subdomain.",
                              ]
                          ),
                          h.a(
                              [
                                  h.Href(domainsHref()),
                                  h.Class(`${button_class} mt-4`),
                              ],
                              ["Open Domains"]
                          ),
                      ]
                  )
                : h.div(
                      [h.Class("contents")],
                      [
                          model.route === "new"
                              ? h.div(
                                    [h.Class("space-y-6")],
                                    [
                                        publication_route_catalog_view(
                                            model,
                                            inputs,
                                            h
                                        ),
                                        h.section(
                                            [h.Class(card_class)],
                                            [
                                                h.h2(
                                                    [
                                                        h.Class(
                                                            "text-lg font-semibold"
                                                        ),
                                                    ],
                                                    ["Custom and landing pages"]
                                                ),
                                                h.form(
                                                    [
                                                        h.Class(
                                                            "mt-3 flex flex-col gap-3 sm:flex-row"
                                                        ),
                                                        h.OnSubmit(
                                                            SubmittedNewPage()
                                                        ),
                                                    ],
                                                    [
                                                        is_landing_kind(
                                                            model.new_page_kind
                                                        )
                                                            ? h.p(
                                                                  [
                                                                      h.Class(
                                                                          "min-w-0 flex-1 self-end text-sm text-muted-foreground"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      "A publication can have one landing page. Select it as the homepage to serve it at /.",
                                                                  ]
                                                              )
                                                            : h.label(
                                                                  [
                                                                      h.Class(
                                                                          "min-w-0 flex-1 space-y-1"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      h.span(
                                                                          [
                                                                              h.Class(
                                                                                  "text-sm font-medium"
                                                                              ),
                                                                          ],
                                                                          [
                                                                              "Page title",
                                                                          ]
                                                                      ),
                                                                      h.input([
                                                                          h.Name(
                                                                              "new_page_title"
                                                                          ),
                                                                          h.Required(
                                                                              true
                                                                          ),
                                                                          h.Value(
                                                                              model.new_page_title
                                                                          ),
                                                                          h.OnInput(
                                                                              (
                                                                                  value
                                                                              ) =>
                                                                                  ChangedNewPageTitle(
                                                                                      {
                                                                                          value,
                                                                                      }
                                                                                  )
                                                                          ),
                                                                          h.Class(
                                                                              field_class
                                                                          ),
                                                                      ]),
                                                                  ]
                                                              ),
                                                        h.label(
                                                            [
                                                                h.Class(
                                                                    "space-y-1 text-sm font-medium"
                                                                ),
                                                            ],
                                                            [
                                                                "Page type",
                                                                h.select(
                                                                    [
                                                                        h.Name(
                                                                            "new_page_kind"
                                                                        ),
                                                                        h.Value(
                                                                            model.new_page_kind
                                                                        ),
                                                                        h.OnChange(
                                                                            (
                                                                                value
                                                                            ) =>
                                                                                Option.match(
                                                                                    S.decodeUnknownOption(
                                                                                        NewPageKind
                                                                                    )(
                                                                                        value
                                                                                    ),
                                                                                    {
                                                                                        onNone: () =>
                                                                                            ChangedNewPageKind(
                                                                                                {
                                                                                                    value: model.new_page_kind,
                                                                                                }
                                                                                            ),
                                                                                        onSome: (
                                                                                            next
                                                                                        ) =>
                                                                                            ChangedNewPageKind(
                                                                                                {
                                                                                                    value: next,
                                                                                                }
                                                                                            ),
                                                                                    }
                                                                                )
                                                                        ),
                                                                        h.Class(
                                                                            field_class
                                                                        ),
                                                                    ],
                                                                    [
                                                                        h.option(
                                                                            [
                                                                                h.Value(
                                                                                    "landing_blank"
                                                                                ),
                                                                            ],
                                                                            [
                                                                                "Blank landing page",
                                                                            ]
                                                                        ),
                                                                        h.option(
                                                                            [
                                                                                h.Value(
                                                                                    "document"
                                                                                ),
                                                                            ],
                                                                            [
                                                                                "Document page",
                                                                            ]
                                                                        ),
                                                                        h.option(
                                                                            [
                                                                                h.Value(
                                                                                    "marketing_starter"
                                                                                ),
                                                                            ],
                                                                            [
                                                                                "Marketing starter",
                                                                            ]
                                                                        ),
                                                                        ...(inputs.domain_slug ===
                                                                        "urm"
                                                                            ? [
                                                                                  h.option(
                                                                                      [
                                                                                          h.Value(
                                                                                              "urm_marketing"
                                                                                          ),
                                                                                      ],
                                                                                      [
                                                                                          "URM marketing",
                                                                                      ]
                                                                                  ),
                                                                              ]
                                                                            : []),
                                                                    ]
                                                                ),
                                                            ]
                                                        ),
                                                        h.button(
                                                            [
                                                                h.Type(
                                                                    "submit"
                                                                ),
                                                                h.Disabled(
                                                                    model.is_busy
                                                                ),
                                                                h.Class(
                                                                    `${button_class} self-end`
                                                                ),
                                                            ],
                                                            [
                                                                model.is_busy
                                                                    ? "Creating…"
                                                                    : "Create page",
                                                            ]
                                                        ),
                                                    ]
                                                ),
                                            ]
                                        ),
                                    ]
                                )
                              : h.section(
                                    [h.Class("space-y-3")],
                                    [
                                        h.div(
                                            [
                                                h.Class(
                                                    "flex items-end justify-between gap-4"
                                                ),
                                            ],
                                            [
                                                h.div(
                                                    [],
                                                    [
                                                        h.h2(
                                                            [
                                                                h.Class(
                                                                    "text-xl font-semibold"
                                                                ),
                                                            ],
                                                            [
                                                                model.route ===
                                                                "item"
                                                                    ? "Page"
                                                                    : "Pages",
                                                            ]
                                                        ),
                                                        h.p(
                                                            [
                                                                h.Class(
                                                                    "text-sm text-muted-foreground"
                                                                ),
                                                            ],
                                                            [
                                                                model.route ===
                                                                "item"
                                                                    ? "Editing uses the existing inline page editor."
                                                                    : "Select a landing page as the homepage. Reorder pages to control navigation order.",
                                                            ]
                                                        ),
                                                    ]
                                                ),
                                                h.span(
                                                    [
                                                        h.Class(
                                                            "text-sm tabular-nums text-muted-foreground"
                                                        ),
                                                    ],
                                                    [
                                                        model.route === "item"
                                                            ? "Web content"
                                                            : `${model.pages.length} total`,
                                                    ]
                                                ),
                                            ]
                                        ),
                                        model.is_loading
                                            ? h.div(
                                                  [h.Class(card_class)],
                                                  ["Loading pages…"]
                                              )
                                            : visible_pages.length === 0
                                              ? h.div(
                                                    [h.Class(card_class)],
                                                    [
                                                        model.route === "item"
                                                            ? "This page was not found in the selected publication."
                                                            : "No pages yet. Create the homepage from New page.",
                                                    ]
                                                )
                                              : h.div(
                                                    [h.Class("space-y-3")],
                                                    Array.map(
                                                        visible_pages,
                                                        (page, index) =>
                                                            page_card(
                                                                model,
                                                                page,
                                                                index,
                                                                inputs.link_suggestions,
                                                                h
                                                            )
                                                    )
                                                ),
                                    ]
                                ),
                      ]
                  ),
        ]
    )
}

export const view = Submodel.defineView<Model, Message, ViewInputs>(
    content_view
)

export const mainLayoutView = view
