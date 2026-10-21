import * as Array from "effect/Array"
import { Effect, Option, Schema, String } from "effect"
import { SiteAppearance } from "@urm/domain/schemas/site-appearance"
import { ThemeFamilyId } from "@urm/domain/schemas/settings"
import { Command } from "foldkit"
import { AsyncData } from "foldkit"
import * as Ui from "@foldkit/ui"
import type { Url } from "foldkit/url"
import * as SocialLinks from "../media/social-links/index.ts"
import { LoadEventWeather } from "../events/platform/event-weather.command.ts"
import { EventWeatherAsyncData } from "../events/platform/event-weather.model.ts"

import {
    AddDesignPage,
    RemoveLayoutFavicon,
    SaveSiteAppearance,
    ParseDesignMarkdown,
    RemoveLayoutLogo,
    RemoveDesignPage,
    ReorderDesignPages,
    UpdateDesignPage,
    UploadLayoutLogo,
    UploadLayoutFavicon,
} from "./design.command.ts"
import {
    GotDarkLogoDropMessage,
    GotDarkFaviconDropMessage,
    GotLightLogoDropMessage,
    GotLightFaviconDropMessage,
    GotSocialLinksMessage,
    FailedPreviewEventWeather,
    LoadedPreviewEventWeather,
} from "./design.message.ts"
import type { Message } from "./design.message.ts"
import {
    DEFAULT_LOGO_DARK_URL,
    DEFAULT_LOGO_LIGHT_URL,
    DEFAULT_FAVICON_URL,
    Model,
    type DesignPreviewBlogPost,
    type DesignPage,
    type DesignPreviewEvent,
    type DesignSite,
    type LogoVariant,
} from "./design.model.ts"
import { isMainLayoutPath } from "./design.route.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const path_for_url = (url: Url): string => url.pathname.replace(/\/$/, "")

const empty_model = (is_main_layout_route: boolean): Model =>
    Model.make({
        theme_id: "default",
        appearance: "system",
        site_title: "",
        show_site_title: false,
        appearance_dirty: false,
        appearance_saving: false,
        appearance_saved: false,
        sites: [],
        is_main_layout_route,
        preserve_layout_draft: false,
        selected_owner_id: Option.none(),
        documents: [],
        pages: [],
        preview_navigation: Option.none(),
        preview_blog_posts: [],
        preview_blog_unavailable: false,
        preview_events: [],
        preview_module_id: Option.none(),
        preview_event_id: Option.none(),
        preview_event_weather: EventWeatherAsyncData.Idle(),
        preview_event_map_error: Option.none(),
        is_loading: false,
        busy: false,
        error: Option.none(),
        is_preview_open: false,
        preview_page_id: Option.none(),
        preview_landing_images: [],
        preview_landing_faqs: {},
        preview_document: Option.none(),
        preview_markdown: Option.none(),
        preview_markdown_error: Option.none(),
        editing_page_id: Option.none(),
        editing_navigation_label: "",
        logo_light_url: DEFAULT_LOGO_LIGHT_URL,
        logo_dark_url: DEFAULT_LOGO_DARK_URL,
        has_custom_logo_light: false,
        has_custom_logo_dark: false,
        logo_uploading: Option.none(),
        logo_light_drop: Ui.FileDrop.init({ id: "design-logo-light-drop" }),
        logo_dark_drop: Ui.FileDrop.init({ id: "design-logo-dark-drop" }),
        favicon_light_url: DEFAULT_FAVICON_URL,
        favicon_dark_url: DEFAULT_FAVICON_URL,
        has_custom_favicon_light: false,
        has_custom_favicon_dark: false,
        favicon_uploading: Option.none(),
        favicon_light_drop: Ui.FileDrop.init({
            id: "design-favicon-light-drop",
        }),
        favicon_dark_drop: Ui.FileDrop.init({
            id: "design-favicon-dark-drop",
        }),
        social_links: SocialLinks.init()[0],
    })

export const init = (url: Url): UpdateReturn => [
    empty_model(isMainLayoutPath(path_for_url(url))),
    [],
]

export const clear = (model: Model): Model =>
    empty_model(model.is_main_layout_route)

export const with_preview_events = (
    model: Model,
    events: ReadonlyArray<DesignPreviewEvent>
): Model => ({
    ...model,
    preview_events: events,
    preview_event_id: Option.filter(model.preview_event_id, (event_id) =>
        Array.some(events, (event) => event.id === event_id && event.published)
    ),
})

const preview_event_coordinates = (
    event: DesignPreviewEvent
): Option.Option<Readonly<{ latitude: number; longitude: number }>> => {
    const latitude = globalThis.Number(event.latitude)
    const longitude = globalThis.Number(event.longitude)
    return globalThis.Number.isFinite(latitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        globalThis.Number.isFinite(longitude) &&
        longitude >= -180 &&
        longitude <= 180
        ? Option.some({ latitude, longitude })
        : Option.none()
}

const request_preview_event_weather = (
    model: Model,
    event_id: string
): UpdateReturn => {
    const event = Array.findFirst(
        model.preview_events,
        (candidate) => candidate.id === event_id && candidate.published
    )
    return Option.match(event, {
        onNone: () => [model, []],
        onSome: (selected_event) =>
            Option.match(preview_event_coordinates(selected_event), {
                onNone: () => [
                    {
                        ...model,
                        preview_event_weather: EventWeatherAsyncData.Failure({
                            error: "Weather is unavailable for these coordinates.",
                        }),
                    },
                    [],
                ],
                onSome: ({ latitude, longitude }) => [
                    {
                        ...model,
                        preview_event_weather: Option.match(
                            AsyncData.getData(model.preview_event_weather),
                            {
                                onNone: () => EventWeatherAsyncData.Loading(),
                                onSome: (data) =>
                                    EventWeatherAsyncData.Refreshing({ data }),
                            }
                        ),
                    },
                    Command.mapMessages(
                        [
                            LoadEventWeather({
                                eventId: event_id,
                                latitude,
                                longitude,
                            }),
                        ],
                        (message) =>
                            message._tag === "EventWeatherLoaded"
                                ? LoadedPreviewEventWeather({
                                      event_id: message.eventId,
                                      weather: message.weather,
                                  })
                                : FailedPreviewEventWeather({
                                      event_id: message.eventId,
                                      error: message.error,
                                  })
                    ),
                ],
            }),
    })
}

export const with_preview_blog_posts = (
    model: Model,
    posts: ReadonlyArray<DesignPreviewBlogPost>
): Model => ({ ...model, preview_blog_posts: posts })

const ordered_pages = (
    pages: ReadonlyArray<DesignPage>
): ReadonlyArray<DesignPage> =>
    [...pages].sort((left, right) => left.order_position - right.order_position)

const update_page_command = (
    owner_id: string,
    page: DesignPage
): Command.Command<Message> =>
    UpdateDesignPage({
        owner_id,
        page_id: page.id,
        navigation_label: page.navigation_label,
        is_homepage: page.is_homepage,
        show_in_navigation: page.show_in_navigation,
    })

const update_logo_drop = (
    model: Model,
    variant: LogoVariant,
    drop_message: Ui.FileDrop.Message
): UpdateReturn => {
    const drop =
        variant === "light" ? model.logo_light_drop : model.logo_dark_drop
    const {
        model: next_drop,
        commands = [],
        outMessage: maybe_out_message_value,
    } = Ui.FileDrop.update(drop, drop_message)
    const maybe_out_message = Option.fromUndefinedOr(maybe_out_message_value)

    const next_model =
        variant === "light"
            ? { ...model, logo_light_drop: next_drop }
            : { ...model, logo_dark_drop: next_drop }
    const mapped_commands = commands.map(
        Command.mapEffect(
            Effect.map((next_message) =>
                variant === "light"
                    ? GotLightLogoDropMessage({ message: next_message })
                    : GotDarkLogoDropMessage({ message: next_message })
            )
        )
    )
    const file = Option.flatMap(maybe_out_message, (out_message) =>
        out_message._tag === "ReceivedFiles"
            ? Array.head(out_message.files)
            : Option.none()
    )

    return Option.match(file, {
        onNone: () => [next_model, mapped_commands],
        onSome: (value) => {
            const accepted_types = [
                "image/svg+xml",
                "image/png",
                "image/webp",
                "image/jpeg",
            ]
            if (!accepted_types.includes(value.type)) {
                return [
                    {
                        ...next_model,
                        error: Option.some(
                            "Choose an SVG, PNG, WebP or JPEG image."
                        ),
                    },
                    mapped_commands,
                ]
            }

            return Option.match(model.selected_owner_id, {
                onNone: () => [
                    {
                        ...next_model,
                        error: Option.some(
                            "Assign the layout to a site before replacing its logo."
                        ),
                    },
                    mapped_commands,
                ],
                onSome: (owner_id) => [
                    {
                        ...next_model,
                        logo_uploading: Option.some(variant),
                        error: Option.none(),
                    },
                    [
                        ...mapped_commands,
                        UploadLayoutLogo({
                            owner_id,
                            variant,
                            file: value,
                        }),
                    ],
                ],
            })
        },
    })
}

const update_favicon_drop = (
    model: Model,
    variant: LogoVariant,
    drop_message: Ui.FileDrop.Message
): UpdateReturn => {
    const drop =
        variant === "light" ? model.favicon_light_drop : model.favicon_dark_drop
    const {
        model: next_drop,
        commands = [],
        outMessage: maybe_out_message_value,
    } = Ui.FileDrop.update(drop, drop_message)
    const maybe_out_message = Option.fromUndefinedOr(maybe_out_message_value)

    const next_model =
        variant === "light"
            ? { ...model, favicon_light_drop: next_drop }
            : { ...model, favicon_dark_drop: next_drop }
    const mapped_commands = commands.map(
        Command.mapEffect(
            Effect.map((next_message) =>
                variant === "light"
                    ? GotLightFaviconDropMessage({ message: next_message })
                    : GotDarkFaviconDropMessage({ message: next_message })
            )
        )
    )
    const file = Option.flatMap(maybe_out_message, (out_message) =>
        out_message._tag === "ReceivedFiles"
            ? Array.head(out_message.files)
            : Option.none()
    )

    return Option.match(file, {
        onNone: () => [next_model, mapped_commands],
        onSome: (value) => {
            if (!["image/svg+xml", "image/png"].includes(value.type)) {
                return [
                    {
                        ...next_model,
                        error: Option.some("Choose an SVG or PNG image."),
                    },
                    mapped_commands,
                ]
            }
            if (value.size > 1_000_000) {
                return [
                    {
                        ...next_model,
                        error: Option.some(
                            "Choose a favicon smaller than 1 MB."
                        ),
                    },
                    mapped_commands,
                ]
            }

            return Option.match(model.selected_owner_id, {
                onNone: () => [
                    {
                        ...next_model,
                        error: Option.some(
                            "Choose a site before replacing its favicon."
                        ),
                    },
                    mapped_commands,
                ],
                onSome: (owner_id) => [
                    {
                        ...next_model,
                        favicon_uploading: Option.some(variant),
                        error: Option.none(),
                    },
                    [
                        ...mapped_commands,
                        UploadLayoutFavicon({
                            owner_id,
                            variant,
                            file: value,
                        }),
                    ],
                ],
            })
        },
    })
}

export const with_sites = (
    model: Model,
    sites: ReadonlyArray<DesignSite>
): Model => {
    const retained_selection = Option.filter(
        model.selected_owner_id,
        (owner_id) => Array.some(sites, (site) => site.id === owner_id)
    )
    const selected_owner_id = model.is_main_layout_route
        ? retained_selection
        : Option.orElse(retained_selection, () =>
              Option.map(Array.head(sites), (site) => site.id)
          )
    const selection_changed = Option.match(selected_owner_id, {
        onNone: () => Option.isSome(model.selected_owner_id),
        onSome: (owner_id) =>
            !Option.contains(model.selected_owner_id, owner_id),
    })

    return {
        ...model,
        sites,
        preserve_layout_draft: model.preserve_layout_draft,
        selected_owner_id,
        documents: selection_changed ? [] : model.documents,
        pages: selection_changed ? [] : model.pages,
        preview_navigation: selection_changed
            ? Option.none()
            : model.preview_navigation,
        preview_module_id: selection_changed
            ? Option.none()
            : model.preview_module_id,
        preview_event_id: selection_changed
            ? Option.none()
            : model.preview_event_id,
        preview_event_weather: selection_changed
            ? EventWeatherAsyncData.Idle()
            : model.preview_event_weather,
        preview_event_map_error: selection_changed
            ? Option.none()
            : model.preview_event_map_error,
        preview_page_id: selection_changed
            ? Option.none()
            : model.preview_page_id,
        preview_document: selection_changed
            ? Option.none()
            : model.preview_document,
        preview_markdown: selection_changed
            ? Option.none()
            : model.preview_markdown,
        preview_markdown_error: selection_changed
            ? Option.none()
            : model.preview_markdown_error,
        is_loading: Option.isSome(selected_owner_id) && selection_changed,
        appearance_dirty: selection_changed ? false : model.appearance_dirty,
        appearance_saving: selection_changed ? false : model.appearance_saving,
        appearance_saved: selection_changed ? false : model.appearance_saved,
        site_title: selection_changed ? "" : model.site_title,
        show_site_title: selection_changed ? false : model.show_site_title,
        error: Option.none(),
        editing_page_id: Option.none(),
        editing_navigation_label: "",
        social_links:
            selection_changed && !model.preserve_layout_draft
                ? SocialLinks.init([])[0]
                : model.social_links,
        logo_light_url: selection_changed
            ? DEFAULT_LOGO_LIGHT_URL
            : model.logo_light_url,
        logo_dark_url: selection_changed
            ? DEFAULT_LOGO_DARK_URL
            : model.logo_dark_url,
        has_custom_logo_light: selection_changed
            ? false
            : model.has_custom_logo_light,
        has_custom_logo_dark: selection_changed
            ? false
            : model.has_custom_logo_dark,
        logo_uploading: Option.none(),
        favicon_light_url: selection_changed
            ? DEFAULT_FAVICON_URL
            : model.favicon_light_url,
        favicon_dark_url: selection_changed
            ? DEFAULT_FAVICON_URL
            : model.favicon_dark_url,
        has_custom_favicon_light: selection_changed
            ? false
            : model.has_custom_favicon_light,
        has_custom_favicon_dark: selection_changed
            ? false
            : model.has_custom_favicon_dark,
        favicon_uploading: Option.none(),
    }
}

export const changed_url = (model: Model, url: Url): Model => {
    const is_main_layout_route = isMainLayoutPath(path_for_url(url))
    if (is_main_layout_route === model.is_main_layout_route) return model

    const selected_owner_id = is_main_layout_route
        ? Option.none<string>()
        : Option.map(Array.head(model.sites), (site) => site.id)

    return {
        ...model,
        is_main_layout_route,
        preserve_layout_draft: false,
        site_title: "",
        show_site_title: false,
        selected_owner_id,
        documents: [],
        pages: [],
        preview_navigation: Option.none(),
        preview_module_id: Option.none(),
        preview_event_id: Option.none(),
        preview_event_weather: EventWeatherAsyncData.Idle(),
        preview_event_map_error: Option.none(),
        is_loading: Option.isSome(selected_owner_id),
        preview_page_id: Option.none(),
        preview_document: Option.none(),
        preview_markdown: Option.none(),
        preview_markdown_error: Option.none(),
        social_links: SocialLinks.init([])[0],
        logo_light_url: DEFAULT_LOGO_LIGHT_URL,
        logo_dark_url: DEFAULT_LOGO_DARK_URL,
        has_custom_logo_light: false,
        has_custom_logo_dark: false,
        logo_uploading: Option.none(),
        favicon_light_url: DEFAULT_FAVICON_URL,
        favicon_dark_url: DEFAULT_FAVICON_URL,
        has_custom_favicon_light: false,
        has_custom_favicon_dark: false,
        favicon_uploading: Option.none(),
    }
}

const remove_page = (
    model: Model,
    owner_id: string,
    page_id: string
): UpdateReturn => {
    const removed = Array.findFirst(model.pages, (page) => page.id === page_id)
    const remaining = Array.filter(
        ordered_pages(model.pages),
        (page) => page.id !== page_id
    )
    const pages = Option.match(removed, {
        onNone: () => remaining,
        onSome: (page) =>
            page.is_homepage
                ? Array.map(remaining, (candidate, index) => ({
                      ...candidate,
                      is_homepage: index === 0,
                  }))
                : remaining,
    })
    const preview_page_id = Option.filter(
        model.preview_page_id,
        (preview_page_id) =>
            Array.some(pages, (page) => page.id === preview_page_id)
    ).pipe(
        Option.orElse(() =>
            Option.map(
                Option.orElse(
                    Array.findFirst(pages, (page) => page.is_homepage),
                    () => Array.head(pages)
                ),
                (page) => page.id
            )
        )
    )

    return [
        {
            ...model,
            pages,
            preview_page_id,
            preview_document: Option.none(),
            preview_markdown: Option.none(),
            preview_markdown_error: Option.none(),
            busy: true,
            error: Option.none(),
            editing_page_id: Option.none(),
        },
        [RemoveDesignPage({ owner_id, page_id })],
    ]
}

const move_page = (
    model: Model,
    owner_id: string,
    page_id: string,
    direction: "up" | "down"
): UpdateReturn => {
    const pages = [...ordered_pages(model.pages)]
    const index = pages.findIndex((page) => page.id === page_id)
    const target_index = direction === "up" ? index - 1 : index + 1

    if (index < 0 || target_index < 0 || target_index >= pages.length) {
        return [model, []]
    }

    const current = pages[index]
    const target = pages[target_index]
    if (current === undefined || target === undefined) return [model, []]

    pages[index] = target
    pages[target_index] = current
    const reordered = pages.map((page, order_position) => ({
        ...page,
        order_position,
    }))

    return [
        {
            ...model,
            pages: reordered,
            busy: true,
            error: Option.none(),
        },
        [
            ReorderDesignPages({
                owner_id,
                positions: reordered.map((page) => ({
                    page_id: page.id,
                    order_position: page.order_position,
                })),
            }),
        ],
    ]
}

const set_homepage = (
    model: Model,
    owner_id: string,
    page_id: string
): UpdateReturn => {
    const pages = Array.map(model.pages, (page) => ({
        ...page,
        is_homepage: page.id === page_id,
    }))
    return Option.match(
        Array.findFirst(pages, (page) => page.id === page_id),
        {
            onNone: () => [model, []],
            onSome: (page) => [
                {
                    ...model,
                    pages,
                    busy: true,
                    error: Option.none(),
                },
                [update_page_command(owner_id, page)],
            ],
        }
    )
}

const toggle_navigation = (
    model: Model,
    owner_id: string,
    page_id: string
): UpdateReturn =>
    Option.match(
        Array.findFirst(model.pages, (page) => page.id === page_id),
        {
            onNone: () => [model, []],
            onSome: (page) => {
                const updated_page = {
                    ...page,
                    show_in_navigation: !page.show_in_navigation,
                }
                return [
                    {
                        ...model,
                        pages: Array.map(model.pages, (candidate) =>
                            candidate.id === page_id ? updated_page : candidate
                        ),
                        busy: true,
                        error: Option.none(),
                    },
                    [update_page_command(owner_id, updated_page)],
                ]
            },
        }
    )

const submit_navigation_label = (
    model: Model,
    owner_id: string,
    page_id: string
): UpdateReturn => {
    const navigation_label = String.trim(model.editing_navigation_label)
    if (String.isEmpty(navigation_label)) return [model, []]

    return Option.match(
        Array.findFirst(model.pages, (page) => page.id === page_id),
        {
            onNone: () => [model, []],
            onSome: (page) => {
                const updated_page = { ...page, navigation_label }
                return [
                    {
                        ...model,
                        pages: Array.map(model.pages, (candidate) =>
                            candidate.id === page_id ? updated_page : candidate
                        ),
                        editing_page_id: Option.none(),
                        editing_navigation_label: "",
                        busy: true,
                        error: Option.none(),
                    },
                    [update_page_command(owner_id, updated_page)],
                ]
            },
        }
    )
}

export const update = (model: Model, message: Message): UpdateReturn => {
    switch (message._tag) {
        case "GotLandingPreviewMessage":
            return message.message._tag === "ToggledFaq"
                ? [
                      {
                          ...model,
                          preview_landing_faqs: {
                              ...model.preview_landing_faqs,
                              [message.message.key]: message.message.is_open,
                          },
                      },
                      [],
                  ]
                : [model, []]
        case "ChangedUrl":
            return [changed_url(model, message.url), []]
        case "LoadedSites":
            return [with_sites(model, message.sites), []]
        case "SelectedOwner":
            return [
                {
                    ...model,
                    selected_owner_id: Option.some(message.owner_id),
                    appearance_dirty: false,
                    appearance_saving: false,
                    appearance_saved: false,
                    site_title: "",
                    show_site_title: false,
                    documents: [],
                    pages: [],
                    preview_navigation: Option.none(),
                    preview_module_id: Option.none(),
                    preview_event_id: Option.none(),
                    preview_event_weather: EventWeatherAsyncData.Idle(),
                    preview_event_map_error: Option.none(),
                    preview_page_id: Option.none(),
                    preview_document: Option.none(),
                    preview_markdown: Option.none(),
                    preview_markdown_error: Option.none(),
                    is_loading: true,
                    error: Option.none(),
                    editing_page_id: Option.none(),
                    social_links: SocialLinks.init([])[0],
                    logo_light_url: DEFAULT_LOGO_LIGHT_URL,
                    logo_dark_url: DEFAULT_LOGO_DARK_URL,
                    has_custom_logo_light: false,
                    has_custom_logo_dark: false,
                    logo_uploading: Option.none(),
                    favicon_light_url: DEFAULT_FAVICON_URL,
                    favicon_dark_url: DEFAULT_FAVICON_URL,
                    has_custom_favicon_light: false,
                    has_custom_favicon_dark: false,
                    favicon_uploading: Option.none(),
                },
                [],
            ]
        case "AssignedMainLayoutOwner":
            return [
                {
                    ...model,
                    selected_owner_id: Option.some(message.owner_id),
                    appearance_dirty: false,
                    appearance_saving: false,
                    appearance_saved: false,
                    preserve_layout_draft:
                        model.social_links.editor_state !== "Viewing",
                    documents: [],
                    pages: [],
                    preview_navigation: Option.none(),
                    preview_module_id: Option.none(),
                    preview_event_id: Option.none(),
                    preview_event_weather: EventWeatherAsyncData.Idle(),
                    preview_event_map_error: Option.none(),
                    preview_page_id: Option.none(),
                    preview_document: Option.none(),
                    preview_markdown: Option.none(),
                    preview_markdown_error: Option.none(),
                    is_loading: true,
                    error: Option.none(),
                    editing_page_id: Option.none(),
                },
                [],
            ]
        case "LoadedWorkspace":
            if (!Option.contains(model.selected_owner_id, message.owner_id)) {
                return [model, []]
            }
            {
                const pages = ordered_pages(message.pages)
                const preview_page_id = Option.filter(
                    model.preview_page_id,
                    (page_id) =>
                        Array.some(pages, (page) => page.id === page_id)
                ).pipe(
                    Option.orElse(() =>
                        Option.map(
                            Option.orElse(
                                Array.findFirst(
                                    pages,
                                    (page) => page.is_homepage
                                ),
                                () => Array.head(pages)
                            ),
                            (page) => page.id
                        )
                    )
                )
                const preview_document = Option.match(preview_page_id, {
                    onNone: () => Option.none(),
                    onSome: (page_id) =>
                        Option.contains(model.preview_page_id, page_id)
                            ? model.preview_document
                            : Option.none(),
                })
                const retained_preview = Option.isSome(preview_document)
                return [
                    {
                        ...model,
                        documents: message.documents,
                        theme_id:
                            model.appearance_dirty || model.appearance_saving
                                ? model.theme_id
                                : (message.theme_id ?? "default"),
                        appearance:
                            model.appearance_dirty || model.appearance_saving
                                ? model.appearance
                                : (message.appearance ?? "system"),
                        site_title:
                            model.appearance_dirty || model.appearance_saving
                                ? model.site_title
                                : (message.site_title ?? ""),
                        show_site_title:
                            model.appearance_dirty || model.appearance_saving
                                ? model.show_site_title
                                : (message.show_site_title ?? false),
                        pages,
                        preview_page_id,
                        preview_document,
                        preview_markdown: retained_preview
                            ? model.preview_markdown
                            : Option.none(),
                        preview_markdown_error: retained_preview
                            ? model.preview_markdown_error
                            : Option.none(),
                        is_loading: false,
                        busy: false,
                        error: Option.none(),
                        social_links: model.preserve_layout_draft
                            ? model.social_links
                            : message.has_layout
                              ? SocialLinks.init(message.social_links)[0]
                              : SocialLinks.init()[0],
                        logo_light_url:
                            message.logo_light_url ?? DEFAULT_LOGO_LIGHT_URL,
                        logo_dark_url:
                            message.logo_dark_url ?? DEFAULT_LOGO_DARK_URL,
                        has_custom_logo_light: message.logo_light_url !== null,
                        has_custom_logo_dark: message.logo_dark_url !== null,
                        logo_uploading: Option.none(),
                        favicon_light_url:
                            message.favicon_light_url ?? DEFAULT_FAVICON_URL,
                        favicon_dark_url:
                            message.favicon_dark_url ?? DEFAULT_FAVICON_URL,
                        has_custom_favicon_light:
                            message.favicon_light_url !== null &&
                            message.favicon_light_url !== undefined,
                        has_custom_favicon_dark:
                            message.favicon_dark_url !== null &&
                            message.favicon_dark_url !== undefined,
                        favicon_uploading: Option.none(),
                    },
                    [],
                ]
            }
        case "LoadedPreviewNavigation":
            return [
                {
                    ...model,
                    preview_navigation:
                        message.items.length === 0
                            ? Option.none()
                            : Option.some(message.items),
                },
                [],
            ]
        case "GotSocialLinksMessage": {
            const [social_links, commands] = SocialLinks.update(
                model.social_links,
                message.message
            )
            return [
                {
                    ...model,
                    social_links,
                    preserve_layout_draft:
                        message.message._tag === "SavedSocialLinks"
                            ? false
                            : model.preserve_layout_draft,
                },
                Command.mapMessages(commands, (next_message) =>
                    GotSocialLinksMessage({ message: next_message })
                ),
            ]
        }
        case "GotLightLogoDropMessage":
            return update_logo_drop(model, "light", message.message)
        case "GotDarkLogoDropMessage":
            return update_logo_drop(model, "dark", message.message)
        case "UploadedLayoutLogo":
            return [
                message.variant === "light"
                    ? {
                          ...model,
                          logo_light_url: message.url,
                          has_custom_logo_light: true,
                          logo_uploading: Option.none(),
                          error: Option.none(),
                      }
                    : {
                          ...model,
                          logo_dark_url: message.url,
                          has_custom_logo_dark: true,
                          logo_uploading: Option.none(),
                          error: Option.none(),
                      },
                [],
            ]
        case "RequestedRemoveLayoutLogo":
            return Option.match(model.selected_owner_id, {
                onNone: () => [model, []],
                onSome: (owner_id) => [
                    {
                        ...model,
                        logo_uploading: Option.some(message.variant),
                        error: Option.none(),
                    },
                    [
                        RemoveLayoutLogo({
                            owner_id,
                            variant: message.variant,
                        }),
                    ],
                ],
            })
        case "RemovedLayoutLogo":
            return [
                message.variant === "light"
                    ? {
                          ...model,
                          logo_light_url: DEFAULT_LOGO_LIGHT_URL,
                          has_custom_logo_light: false,
                          logo_uploading: Option.none(),
                          error: Option.none(),
                      }
                    : {
                          ...model,
                          logo_dark_url: DEFAULT_LOGO_DARK_URL,
                          has_custom_logo_dark: false,
                          logo_uploading: Option.none(),
                          error: Option.none(),
                      },
                [],
            ]
        case "GotLightFaviconDropMessage":
            return update_favicon_drop(model, "light", message.message)
        case "GotDarkFaviconDropMessage":
            return update_favicon_drop(model, "dark", message.message)
        case "UploadedLayoutFavicon":
            return [
                message.variant === "light"
                    ? {
                          ...model,
                          favicon_light_url: message.url,
                          has_custom_favicon_light: true,
                          favicon_uploading: Option.none(),
                          error: Option.none(),
                      }
                    : {
                          ...model,
                          favicon_dark_url: message.url,
                          has_custom_favicon_dark: true,
                          favicon_uploading: Option.none(),
                          error: Option.none(),
                      },
                [],
            ]
        case "RequestedRemoveLayoutFavicon":
            return Option.match(model.selected_owner_id, {
                onNone: () => [model, []],
                onSome: (owner_id) => [
                    {
                        ...model,
                        favicon_uploading: Option.some(message.variant),
                        error: Option.none(),
                    },
                    [
                        RemoveLayoutFavicon({
                            owner_id,
                            variant: message.variant,
                        }),
                    ],
                ],
            })
        case "RemovedLayoutFavicon":
            return [
                message.variant === "light"
                    ? {
                          ...model,
                          favicon_light_url: DEFAULT_FAVICON_URL,
                          has_custom_favicon_light: false,
                          favicon_uploading: Option.none(),
                          error: Option.none(),
                      }
                    : {
                          ...model,
                          favicon_dark_url: DEFAULT_FAVICON_URL,
                          has_custom_favicon_dark: false,
                          favicon_uploading: Option.none(),
                          error: Option.none(),
                      },
                [],
            ]
        case "LoadedPreviewDocument":
            if (!Option.contains(model.preview_page_id, message.page_id)) {
                return [model, []]
            }
            return [
                {
                    ...model,
                    preview_document: Option.some(message.document),
                    preview_markdown: Option.none(),
                    preview_markdown_error: Option.none(),
                },
                message.document.content_type === "markdown"
                    ? [
                          ParseDesignMarkdown({
                              page_id: message.page_id,
                              content: message.document.content,
                          }),
                      ]
                    : [],
            ]
        case "LoadedPreviewMarkdown":
            return Option.contains(model.preview_page_id, message.page_id)
                ? [
                      {
                          ...model,
                          preview_markdown: Option.some(message.document),
                          preview_markdown_error: Option.none(),
                      },
                      [],
                  ]
                : [model, []]
        case "FailedPreviewMarkdown":
            return Option.contains(model.preview_page_id, message.page_id)
                ? [
                      {
                          ...model,
                          preview_markdown: Option.none(),
                          preview_markdown_error: Option.some(message.error),
                      },
                      [],
                  ]
                : [model, []]
        case "RequestedAddPage":
            return Option.match(model.selected_owner_id, {
                onNone: () => [model, []],
                onSome: (owner_id) => [
                    { ...model, busy: true, error: Option.none() },
                    [
                        AddDesignPage({
                            owner_id,
                            document_id: message.document_id,
                        }),
                    ],
                ],
            })
        case "RequestedRemovePage":
            return Option.match(model.selected_owner_id, {
                onNone: () => [model, []],
                onSome: (owner_id) =>
                    remove_page(model, owner_id, message.page_id),
            })
        case "RequestedMovePage":
            return Option.match(model.selected_owner_id, {
                onNone: () => [model, []],
                onSome: (owner_id) =>
                    move_page(
                        model,
                        owner_id,
                        message.page_id,
                        message.direction
                    ),
            })
        case "RequestedSetHomepage":
            return Option.match(model.selected_owner_id, {
                onNone: () => [model, []],
                onSome: (owner_id) =>
                    set_homepage(model, owner_id, message.page_id),
            })
        case "RequestedToggleNavigation":
            return Option.match(model.selected_owner_id, {
                onNone: () => [model, []],
                onSome: (owner_id) =>
                    toggle_navigation(model, owner_id, message.page_id),
            })
        case "StartedEditingNavigationLabel": {
            const page = Array.findFirst(
                model.pages,
                (candidate) => candidate.id === message.page_id
            )
            return [
                {
                    ...model,
                    editing_page_id: Option.map(page, (value) => value.id),
                    editing_navigation_label: Option.match(page, {
                        onNone: () => "",
                        onSome: (value) => value.navigation_label,
                    }),
                },
                [],
            ]
        }
        case "ChangedNavigationLabel":
            return [{ ...model, editing_navigation_label: message.value }, []]
        case "SubmittedNavigationLabel":
            return Option.match(model.selected_owner_id, {
                onNone: () => [model, []],
                onSome: (owner_id) =>
                    Option.match(model.editing_page_id, {
                        onNone: () => [model, []],
                        onSome: (page_id) =>
                            submit_navigation_label(model, owner_id, page_id),
                    }),
            })
        case "CancelledNavigationLabel":
            return [
                {
                    ...model,
                    editing_page_id: Option.none(),
                    editing_navigation_label: "",
                },
                [],
            ]
        case "ToggledPreview":
            return [{ ...model, is_preview_open: !model.is_preview_open }, []]
        case "SelectedPreviewPage":
            return Array.some(
                model.pages,
                (page) => page.id === message.page_id
            )
                ? [
                      {
                          ...model,
                          preview_page_id: Option.some(message.page_id),
                          preview_module_id: Option.none(),
                          preview_event_id: Option.none(),
                          preview_event_weather: EventWeatherAsyncData.Idle(),
                          preview_event_map_error: Option.none(),
                          preview_document: Option.none(),
                          preview_markdown: Option.none(),
                          preview_markdown_error: Option.none(),
                      },
                      [],
                  ]
                : [model, []]
        case "SelectedPreviewModule":
            return [
                {
                    ...model,
                    preview_module_id: Option.some(message.module_id),
                    preview_event_id: Option.none(),
                    preview_event_weather: EventWeatherAsyncData.Idle(),
                    preview_event_map_error: Option.none(),
                    preview_page_id: Option.none(),
                    preview_document: Option.none(),
                    preview_markdown: Option.none(),
                    preview_markdown_error: Option.none(),
                },
                [],
            ]
        case "SelectedPreviewEvent": {
            const event = Array.findFirst(
                model.preview_events,
                (candidate) =>
                    candidate.id === message.event_id && candidate.published
            )
            return Option.match(event, {
                onNone: () => [model, []],
                onSome: () =>
                    request_preview_event_weather(
                        {
                            ...model,
                            preview_module_id: Option.some("events"),
                            preview_event_id: Option.some(message.event_id),
                            preview_event_weather: EventWeatherAsyncData.Idle(),
                            preview_event_map_error: Option.none(),
                        },
                        message.event_id
                    ),
            })
        }
        case "SelectedPreviewEventsIndex":
            return [
                {
                    ...model,
                    preview_module_id: Option.some("events"),
                    preview_event_id: Option.none(),
                    preview_event_weather: EventWeatherAsyncData.Idle(),
                    preview_event_map_error: Option.none(),
                },
                [],
            ]
        case "RequestedPreviewEventWeather":
            return Option.contains(model.preview_event_id, message.event_id)
                ? request_preview_event_weather(model, message.event_id)
                : [model, []]
        case "LoadedPreviewEventWeather":
            return Option.contains(model.preview_event_id, message.event_id)
                ? [
                      {
                          ...model,
                          preview_event_weather: EventWeatherAsyncData.Success({
                              data: message.weather,
                          }),
                      },
                      [],
                  ]
                : [model, []]
        case "FailedPreviewEventWeather":
            return Option.contains(model.preview_event_id, message.event_id)
                ? [
                      {
                          ...model,
                          preview_event_weather: Option.match(
                              AsyncData.getData(model.preview_event_weather),
                              {
                                  onNone: () =>
                                      EventWeatherAsyncData.Failure({
                                          error: message.error,
                                      }),
                                  onSome: (data) =>
                                      EventWeatherAsyncData.Stale({
                                          error: message.error,
                                          data,
                                      }),
                              }
                          ),
                      },
                      [],
                  ]
                : [model, []]
        case "MountedPreviewEventMap":
            return Option.contains(model.preview_event_id, message.event_id)
                ? [{ ...model, preview_event_map_error: Option.none() }, []]
                : [model, []]
        case "FailedPreviewEventMap":
            return Option.contains(model.preview_event_id, message.event_id)
                ? [
                      {
                          ...model,
                          preview_event_map_error: Option.some(message.error),
                      },
                      [],
                  ]
                : [model, []]
        case "ChangedSiteTheme":
            return !model.is_loading &&
                !model.appearance_saving &&
                Schema.is(ThemeFamilyId)(message.value)
                ? [
                      {
                          ...model,
                          theme_id: message.value,
                          appearance_dirty: true,
                          appearance_saved: false,
                      },
                      [],
                  ]
                : [model, []]
        case "ChangedSiteAppearance":
            return !model.is_loading &&
                !model.appearance_saving &&
                Schema.is(SiteAppearance)(message.value)
                ? [
                      {
                          ...model,
                          appearance: message.value,
                          appearance_dirty: true,
                          appearance_saved: false,
                      },
                      [],
                  ]
                : [model, []]
        case "ChangedShowSiteTitle":
            return !model.is_loading && !model.appearance_saving
                ? [
                      {
                          ...model,
                          show_site_title: message.value,
                          appearance_dirty: true,
                          appearance_saved: false,
                      },
                      [],
                  ]
                : [model, []]
        case "ChangedSiteTitle":
            return !model.is_loading && !model.appearance_saving
                ? [
                      {
                          ...model,
                          site_title: message.value,
                          appearance_dirty: true,
                          appearance_saved: false,
                      },
                      [],
                  ]
                : [model, []]
        case "RequestedSaveSiteAppearance":
            if (
                model.is_loading ||
                model.appearance_saving ||
                !model.appearance_dirty ||
                model.site_title.trim() === "" ||
                Option.isNone(model.selected_owner_id)
            )
                return [model, []]
            return [
                { ...model, appearance_saving: true, error: Option.none() },
                [
                    SaveSiteAppearance({
                        owner_id: model.selected_owner_id.value,
                        theme_id: model.theme_id,
                        appearance: model.appearance,
                        site_title: model.site_title.trim(),
                        show_site_title: model.show_site_title,
                    }),
                ],
            ]
        case "SavedSiteAppearance":
            if (!Option.contains(model.selected_owner_id, message.owner_id))
                return [model, []]
            return [
                {
                    ...model,
                    theme_id: message.theme_id,
                    appearance: message.appearance,
                    site_title: message.site_title,
                    show_site_title: message.show_site_title,
                    appearance_dirty: false,
                    appearance_saving: false,
                    appearance_saved: true,
                },
                [],
            ]
        case "FailedSiteAppearance":
            if (!Option.contains(model.selected_owner_id, message.owner_id))
                return [model, []]
            return [
                {
                    ...model,
                    appearance_saving: false,
                    error: Option.some(message.error),
                },
                [],
            ]
        case "SucceededDesignAction":
            return [{ ...model, busy: false, error: Option.none() }, []]
        case "FailedDesignAction":
            return [
                {
                    ...model,
                    is_loading: false,
                    busy: false,
                    logo_uploading: Option.none(),
                    favicon_uploading: Option.none(),
                    error: Option.some(message.error),
                },
                [],
            ]
    }
}
