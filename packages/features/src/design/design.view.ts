import { view as landing_view } from "../marketing/landing/view.ts"
import {
    init as landing_init,
    loaded_page_content,
} from "../marketing/landing/update.ts"
import { GotLandingPreviewMessage } from "./design.message.ts"
import * as Array from "effect/Array"
import { Option, Schema as S } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { AsyncData, Mount, Submodel } from "foldkit"
import * as Ui from "@foldkit/ui"
import * as Markdown from "@foldkit/markdown"
import * as SocialLinks from "../media/social-links/index.ts"
import { mountEventMap } from "../events/platform/map.mount.ts"
import type { EventWeather } from "../events/platform/event-weather.model.ts"
import { renderRichTextHtmlFragment } from "../documents/html/renderer.ts"
import { view as main_layout_view } from "./layouts/main-layout/index.ts"
import { THEME_FAMILIES } from "@urm/domain/schemas/settings"
import { LandingPageDocument } from "@urm/domain/schemas/landing-pages"
import { site_appearance_preview_style } from "@urm/ui/styles/site-preview.ts"

import {
    RichTextContent,
    RichTextDocument,
} from "@urm/domain/schemas/rich-text"
import {
    IconArrowDown,
    IconArrowUp,
    IconEyeOff,
    IconHome,
    IconPencil,
    IconPlus,
    IconTrash,
} from "@urm/ui/foldkit/icons/view.ts"

import {
    AssignedMainLayoutOwner,
    ChangedSiteTheme,
    ChangedSiteAppearance,
    ChangedShowSiteTitle,
    ChangedSiteTitle,
    RequestedSaveSiteAppearance,
    CancelledNavigationLabel,
    ChangedNavigationLabel,
    GotDarkFaviconDropMessage,
    GotLightFaviconDropMessage,
    GotSocialLinksMessage,
    type Message,
    RequestedAddPage,
    RequestedMovePage,
    RequestedRemoveLayoutFavicon,
    RequestedRemovePage,
    RequestedSetHomepage,
    RequestedToggleNavigation,
    RequestedPreviewEventWeather,
    FailedPreviewEventMap,
    MountedPreviewEventMap,
    SelectedPreviewEvent,
    SelectedPreviewEventsIndex,
    SelectedPreviewPage,
    SelectedPreviewModule,
    SelectedOwner,
    StartedEditingNavigationLabel,
    SubmittedNavigationLabel,
    ToggledPreview,
} from "./design.message.ts"
import type {
    DesignDocument,
    DesignNavigationItem,
    DesignPage,
    DesignPreviewBlogPost,
    DesignPreviewDocument,
    DesignPreviewEvent,
    LogoVariant,
    Model,
} from "./design.model.ts"
import {
    designDocumentsHref,
    designDomainsHref,
    designFaviconsHref,
    designLogoHref,
} from "./design.route.ts"

const event_date = (value: number): string =>
    new Intl.DateTimeFormat("en", {
        dateStyle: "long",
        timeZone: "UTC",
    }).format(new Date(value))

const event_time = (event: DesignPreviewEvent): string =>
    event.end_time === ""
        ? event.start_time
        : `${event.start_time}–${event.end_time}`

const safe_preview_url = (value: string): string | undefined => {
    try {
        const url = new URL(value)
        return url.protocol === "https:" || url.protocol === "http:"
            ? url.href
            : undefined
    } catch {
        return undefined
    }
}

const safe_preview_image_url = (value: string): string | undefined =>
    /^\/api\/uploads\/[^/?#\\]+\/(?:media\/|documents\/|blog\/|pages\/|events\/)?[0-9a-f-]{36}$/.test(
        value
    )
        ? value
        : safe_preview_url(value)

const event_thumbnail = (
    event: DesignPreviewEvent,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> => {
    const image_url = safe_preview_image_url(event.image_url)
    return image_url === undefined
        ? []
        : [
              h.img([
                  h.Src(image_url),
                  h.Alt(event.title),
                  h.Attribute("loading", "lazy"),
                  h.Class(
                      "mb-3 aspect-video w-32 rounded-[var(--radius-surface)] object-cover"
                  ),
              ]),
          ]
}

const preview_event_coordinates = (
    event: DesignPreviewEvent
): Readonly<{ latitude: number; longitude: number }> | undefined => {
    const latitude = globalThis.Number(event.latitude)
    const longitude = globalThis.Number(event.longitude)
    return globalThis.Number.isFinite(latitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        globalThis.Number.isFinite(longitude) &&
        longitude >= -180 &&
        longitude <= 180
        ? { latitude, longitude }
        : undefined
}

const preview_event_detail = (
    label: string,
    value: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border border-border bg-background p-3"
            ),
        ],
        [
            h.dt(
                [
                    h.Class(
                        "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    ),
                ],
                [label]
            ),
            h.dd([h.Class("mt-1 text-sm text-foreground")], [value]),
        ]
    )

const preview_event_link_detail = (
    label: string,
    url: string,
    link_label: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border border-border bg-background p-3"
            ),
        ],
        [
            h.dt(
                [
                    h.Class(
                        "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    ),
                ],
                [label]
            ),
            h.dd(
                [h.Class("mt-1 text-sm")],
                [
                    h.a(
                        [
                            h.Href(url),
                            h.Attribute("target", "_blank"),
                            h.Attribute("rel", "noreferrer"),
                            h.Class(
                                "font-medium text-primary underline underline-offset-2"
                            ),
                        ],
                        [link_label]
                    ),
                ]
            ),
        ]
    )

const preview_weather_data = (
    weather: EventWeather,
    event_id: string,
    error: string | undefined,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
            ),
        ],
        [
            h.div(
                [],
                [
                    h.p(
                        [h.Class("text-3xl font-semibold text-primary")],
                        [`${weather.temperature}°C`]
                    ),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [weather.description]
                    ),
                ]
            ),
            preview_event_detail("Humidity", `${weather.humidity}%`, h),
            preview_event_detail("Wind", `${weather.wind_speed} mph`, h),
            h.div(
                [h.Class("grid justify-items-start gap-2 sm:col-span-3")],
                [
                    ...(error === undefined
                        ? []
                        : [
                              h.p(
                                  [h.Class("text-sm text-destructive")],
                                  [error]
                              ),
                          ]),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(
                                RequestedPreviewEventWeather({ event_id })
                            ),
                            h.Class(
                                "rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                            ),
                        ],
                        ["Refresh weather"]
                    ),
                ]
            ),
        ]
    )

const preview_event_weather = (
    model: Model,
    event: DesignPreviewEvent,
    h: HtmlBuilder<Message>
): Html =>
    h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border border-border bg-card p-4"
            ),
        ],
        [
            h.h3(
                [h.Class("font-semibold text-foreground")],
                ["Weather at venue"]
            ),
            AsyncData.match(model.preview_event_weather, {
                onIdle: () =>
                    h.p(
                        [h.Class("mt-3 text-sm text-muted-foreground")],
                        ["Weather will load with the event preview."]
                    ),
                onLoading: () =>
                    h.p(
                        [h.Class("mt-3 text-sm text-muted-foreground")],
                        ["Loading current weather…"]
                    ),
                onRefreshing: (weather) =>
                    preview_weather_data(weather, event.id, undefined, h),
                onFailure: (error) =>
                    h.div(
                        [h.Class("mt-3 grid justify-items-start gap-2")],
                        [
                            h.p([h.Class("text-sm text-destructive")], [error]),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(
                                        RequestedPreviewEventWeather({
                                            event_id: event.id,
                                        })
                                    ),
                                    h.Class(
                                        "rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                                    ),
                                ],
                                ["Retry weather"]
                            ),
                        ]
                    ),
                onStale: ({ error, data }) =>
                    preview_weather_data(data, event.id, error, h),
                onSuccess: (weather) =>
                    preview_weather_data(weather, event.id, undefined, h),
            }),
        ]
    )

const event_detail_preview = (
    model: Model,
    event: DesignPreviewEvent,
    h: HtmlBuilder<Message>
): Html => {
    const coordinates = preview_event_coordinates(event)
    const image_url = safe_preview_image_url(event.image_url)
    const venue_url = safe_preview_url(event.venue_url)
    const tickets_url = safe_preview_url(event.tickets_url)
    return h.div(
        [h.Class("grid gap-4 px-6 py-5 text-left")],
        [
            h.article(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border border-border bg-card p-4"
                    ),
                ],
                [
                    h.header(
                        [],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "text-xl font-semibold tracking-tight text-foreground"
                                    ),
                                ],
                                [event.title]
                            ),
                            h.p(
                                [h.Class("mt-1 text-sm text-muted-foreground")],
                                [
                                    h.time(
                                        [
                                            h.Attribute(
                                                "datetime",
                                                new Date(event.date)
                                                    .toISOString()
                                                    .slice(0, 10)
                                            ),
                                        ],
                                        [event_date(event.date)]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    ...(image_url === undefined
                        ? []
                        : [
                              h.img([
                                  h.Src(image_url),
                                  h.Alt(event.title),
                                  h.Attribute("fetchpriority", "high"),
                                  h.Class(
                                      "mt-4 aspect-video w-full rounded-[var(--radius-surface)] object-cover"
                                  ),
                              ]),
                          ]),
                    h.dl(
                        [h.Class("mt-4 grid gap-3 sm:grid-cols-2")],
                        [
                            preview_event_detail("Venue", event.venue_name, h),
                            preview_event_detail("Time", event_time(event), h),
                            ...(coordinates === undefined
                                ? []
                                : [
                                      preview_event_detail(
                                          "Location",
                                          `${coordinates.latitude}, ${coordinates.longitude}`,
                                          h
                                      ),
                                  ]),
                            ...(venue_url === undefined
                                ? []
                                : [
                                      preview_event_link_detail(
                                          "Venue URL",
                                          venue_url,
                                          "Visit venue website",
                                          h
                                      ),
                                  ]),
                            ...(tickets_url === undefined
                                ? []
                                : [
                                      preview_event_link_detail(
                                          "Tickets URL",
                                          tickets_url,
                                          "View ticket information",
                                          h
                                      ),
                                  ]),
                        ]
                    ),
                    h.section(
                        [
                            h.Class(
                                "mt-4 rounded-[var(--radius-surface)] border border-border bg-background p-3"
                            ),
                        ],
                        [
                            h.h3(
                                [
                                    h.Class(
                                        "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                    ),
                                ],
                                ["Description"]
                            ),
                            ...(event.description.trim() === ""
                                ? [
                                      h.p(
                                          [h.Class("mt-2 text-sm")],
                                          ["No description available."]
                                      ),
                                  ]
                                : event.description
                                      .split(/\r?\n\s*\r?\n/)
                                      .map((paragraph) =>
                                          h.p(
                                              [h.Class("mt-2 text-sm")],
                                              [paragraph]
                                          )
                                      )),
                        ]
                    ),
                    h.div(
                        [h.Class("mt-4 flex flex-wrap gap-2")],
                        [
                            ...(tickets_url === undefined
                                ? []
                                : [
                                      h.a(
                                          [
                                              h.Href(tickets_url),
                                              h.Attribute("target", "_blank"),
                                              h.Attribute("rel", "noreferrer"),
                                              h.Class(
                                                  "rounded-[var(--radius-control)] bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                                              ),
                                          ],
                                          ["Get tickets"]
                                      ),
                                  ]),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(SelectedPreviewEventsIndex()),
                                    h.Class(
                                        "rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                                    ),
                                ],
                                ["Back to events"]
                            ),
                        ]
                    ),
                ]
            ),
            ...(coordinates === undefined
                ? []
                : [
                      h.section(
                          [h.Class("grid gap-3")],
                          [
                              h.h3(
                                  [h.Class("font-semibold text-foreground")],
                                  ["Location"]
                              ),
                              h.div(
                                  [
                                      h.Class(
                                          "h-64 w-full overflow-hidden rounded-[var(--radius-surface)] border border-border"
                                      ),
                                      h.AriaLabel(
                                          `Map showing ${event.venue_name}`
                                      ),
                                      h.OnMount(
                                          Mount.mapMessage(
                                              mountEventMap(
                                                  `design-preview-event-map-${event.id}`,
                                                  coordinates.longitude,
                                                  coordinates.latitude,
                                                  false
                                              ),
                                              (message) =>
                                                  message._tag ===
                                                  "SucceededMountEventMap"
                                                      ? MountedPreviewEventMap({
                                                            event_id: event.id,
                                                        })
                                                      : FailedPreviewEventMap({
                                                            event_id: event.id,
                                                            error: message.reason,
                                                        })
                                          )
                                      ),
                                  ],
                                  []
                              ),
                              ...Option.match(model.preview_event_map_error, {
                                  onNone: () => [],
                                  onSome: (error) => [
                                      h.p(
                                          [
                                              h.Role("alert"),
                                              h.Class(
                                                  "text-sm text-destructive"
                                              ),
                                          ],
                                          [error]
                                      ),
                                  ],
                              }),
                          ]
                      ),
                      preview_event_weather(model, event, h),
                  ]),
        ]
    )
}

const events_preview = (model: Model, h: HtmlBuilder<Message>): Html => {
    const events = Array.filter(
        model.preview_events,
        (event) => event.published
    )
    const selected_event = Option.flatMap(model.preview_event_id, (event_id) =>
        Array.findFirst(events, (event) => event.id === event_id)
    )
    return Option.match(selected_event, {
        onSome: (event) => event_detail_preview(model, event, h),
        onNone: () =>
            h.div(
                [h.Class("px-6 py-5 text-left")],
                [
                    h.h2(
                        [
                            h.Class(
                                "text-xl font-semibold tracking-tight text-foreground"
                            ),
                        ],
                        ["Events"]
                    ),
                    ...(events.length === 0
                        ? [
                              h.p(
                                  [
                                      h.Class(
                                          "mt-3 text-sm text-muted-foreground"
                                      ),
                                  ],
                                  [
                                      model.preview_events_state === "excluded"
                                          ? "Events is excluded from this site. In Web → Pages, select Add to Pages for Events."
                                          : model.preview_events_state ===
                                              "unavailable"
                                            ? "Events could not be loaded. Reload the preview to retry."
                                            : "No published events.",
                                  ]
                              ),
                          ]
                        : [
                              h.ul(
                                  [h.Class("mt-4 grid gap-3")],
                                  events.map((event) =>
                                      h.keyed("li")(
                                          event.id,
                                          [
                                              h.Class(
                                                  "rounded-[var(--radius-surface)] border border-border bg-card p-4"
                                              ),
                                          ],
                                          [
                                              ...event_thumbnail(event, h),
                                              h.h3(
                                                  [],
                                                  [
                                                      h.button(
                                                          [
                                                              h.Type("button"),
                                                              h.OnClick(
                                                                  SelectedPreviewEvent(
                                                                      {
                                                                          event_id:
                                                                              event.id,
                                                                      }
                                                                  )
                                                              ),
                                                              h.Class(
                                                                  "font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                                                              ),
                                                          ],
                                                          [event.title]
                                                      ),
                                                  ]
                                              ),
                                              h.p(
                                                  [
                                                      h.Class(
                                                          "mt-1 text-sm text-muted-foreground"
                                                      ),
                                                  ],
                                                  [
                                                      h.time(
                                                          [
                                                              h.Attribute(
                                                                  "datetime",
                                                                  new Date(
                                                                      event.date
                                                                  )
                                                                      .toISOString()
                                                                      .slice(
                                                                          0,
                                                                          10
                                                                      )
                                                              ),
                                                          ],
                                                          [
                                                              event_date(
                                                                  event.date
                                                              ),
                                                          ]
                                                      ),
                                                      `, ${event_time(event)}`,
                                                  ]
                                              ),
                                              ...(event.venue_name === ""
                                                  ? []
                                                  : [
                                                        h.p(
                                                            [
                                                                h.Class(
                                                                    "mt-1 text-sm text-muted-foreground"
                                                                ),
                                                            ],
                                                            [event.venue_name]
                                                        ),
                                                    ]),
                                              ...(event.description === ""
                                                  ? []
                                                  : [
                                                        h.p(
                                                            [
                                                                h.Class(
                                                                    "mt-3 text-sm"
                                                                ),
                                                            ],
                                                            [event.description]
                                                        ),
                                                    ]),
                                          ]
                                      )
                                  )
                              ),
                          ]),
                ]
            ),
    })
}

const blog_preview = (model: Model, h: HtmlBuilder<Message>): Html => {
    const posts = Array.filter(
        model.preview_blog_posts,
        (post) => post.published
    )
    return h.div(
        [h.Class("px-6 py-5 text-left")],
        [
            h.h2(
                [
                    h.Class(
                        "text-xl font-semibold tracking-tight text-foreground"
                    ),
                ],
                ["Blog"]
            ),
            ...(posts.length === 0
                ? [
                      h.p(
                          [h.Class("mt-3 text-sm text-muted-foreground")],
                          ["No published posts."]
                      ),
                  ]
                : [
                      h.ul(
                          [h.Class("mt-4 grid gap-3"), h.Role("list")],
                          posts.map((post: DesignPreviewBlogPost) =>
                              h.li(
                                  [
                                      h.Class(
                                          "rounded-[var(--radius-surface)] border border-border bg-card p-4"
                                      ),
                                  ],
                                  [
                                      h.h3(
                                          [
                                              h.Class(
                                                  "font-semibold text-foreground"
                                              ),
                                          ],
                                          [post.title]
                                      ),
                                  ]
                              )
                          )
                      ),
                  ]),
        ]
    )
}

const card_class =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
const button_class =
    "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40 [box-shadow:var(--shadow-control)]"
const icon_button_class =
    "inline-flex size-8 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-30"
const field_class =
    "h-10 w-full rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring"

const document_for_page = (
    documents: ReadonlyArray<DesignDocument>,
    page: DesignPage
): Option.Option<DesignDocument> =>
    Array.findFirst(documents, (document) => document.id === page.document_id)

const document_edit_href = (document: DesignDocument): string =>
    document.kind === "blog"
        ? `/blog/${document.slug ?? document.id}/`
        : "/web/pages"

const site_select = (model: Model, h: HtmlBuilder<Message>): Html =>
    Ui.Select.view(
        {
            id: "design-site",
            value: Option.getOrElse(model.selected_owner_id, () => ""),
            onChange: (owner_id) => SelectedOwner({ owner_id }),
            toView: (attributes) =>
                h.label(
                    [h.Class("grid min-w-0 gap-1.5 sm:min-w-64")],
                    [
                        h.span(
                            [
                                ...attributes.label,
                                h.Class("text-xs font-medium text-foreground"),
                            ],
                            ["Site"]
                        ),
                        h.select(
                            [...attributes.select, h.Class(field_class)],
                            model.sites.map((site) =>
                                h.option(
                                    [h.Key(site.id), h.Value(site.id)],
                                    [
                                        site.purpose === "production"
                                            ? `${site.name} (main domain)`
                                            : site.name,
                                    ]
                                )
                            )
                        ),
                    ]
                ),
        },
        h
    )

const main_layout_site_select = (model: Model, h: HtmlBuilder<Message>): Html =>
    Ui.Select.view(
        {
            id: "design-main-layout-site",
            value: Option.getOrElse(model.selected_owner_id, () => ""),
            onChange: (owner_id) => AssignedMainLayoutOwner({ owner_id }),
            toView: (attributes) =>
                h.label(
                    [h.Class("grid min-w-0 gap-1.5 sm:min-w-64")],
                    [
                        h.span(
                            [
                                ...attributes.label,
                                h.Class("text-xs font-medium text-foreground"),
                            ],
                            ["Assign to site"]
                        ),
                        h.select(
                            [...attributes.select, h.Class(field_class)],
                            [
                                h.option(
                                    [h.Value(""), h.Disabled(true)],
                                    ["Choose a site"]
                                ),
                                ...model.sites.map((site) =>
                                    h.option(
                                        [h.Key(site.id), h.Value(site.id)],
                                        [
                                            site.purpose === "production"
                                                ? `${site.name} (main domain)`
                                                : site.name,
                                        ]
                                    )
                                ),
                            ]
                        ),
                    ]
                ),
        },
        h
    )

const page_controls = (
    model: Model,
    page: DesignPage,
    index: number,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("flex shrink-0 flex-wrap items-center justify-end gap-0.5")],
        [
            h.button(
                [
                    h.Class(icon_button_class),
                    h.Type("button"),
                    h.Title("Move up"),
                    h.AriaLabel("Move page up"),
                    h.Disabled(index === 0 || model.busy),
                    h.OnClick(
                        RequestedMovePage({
                            page_id: page.id,
                            direction: "up",
                        })
                    ),
                ],
                [IconArrowUp()]
            ),
            h.button(
                [
                    h.Class(icon_button_class),
                    h.Type("button"),
                    h.Title("Move down"),
                    h.AriaLabel("Move page down"),
                    h.Disabled(index === model.pages.length - 1 || model.busy),
                    h.OnClick(
                        RequestedMovePage({
                            page_id: page.id,
                            direction: "down",
                        })
                    ),
                ],
                [IconArrowDown()]
            ),
            h.button(
                [
                    h.Class(
                        `${icon_button_class} ${page.is_homepage ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}`
                    ),
                    h.Type("button"),
                    h.Title(
                        page.is_homepage
                            ? "This is the homepage"
                            : "Set as homepage"
                    ),
                    h.AriaLabel(
                        page.is_homepage
                            ? "Current homepage"
                            : "Set page as homepage"
                    ),
                    h.Disabled(page.is_homepage || model.busy),
                    h.OnClick(RequestedSetHomepage({ page_id: page.id })),
                ],
                [IconHome()]
            ),
            h.button(
                [
                    h.Class(
                        `${icon_button_class} ${page.show_in_navigation ? "text-foreground" : ""}`
                    ),
                    h.Type("button"),
                    h.Title(
                        page.show_in_navigation
                            ? "Hide from navigation"
                            : "Show in navigation"
                    ),
                    h.AriaLabel(
                        page.show_in_navigation
                            ? "Hide page from navigation"
                            : "Show page in navigation"
                    ),
                    h.Disabled(model.busy),
                    h.OnClick(RequestedToggleNavigation({ page_id: page.id })),
                ],
                [
                    page.show_in_navigation
                        ? h.span(
                              [h.Class("text-[10px] font-bold uppercase")],
                              ["Nav"]
                          )
                        : IconEyeOff(),
                ]
            ),
            h.button(
                [
                    h.Class(icon_button_class),
                    h.Type("button"),
                    h.Title("Edit navigation label"),
                    h.AriaLabel("Edit navigation label"),
                    h.OnClick(
                        StartedEditingNavigationLabel({ page_id: page.id })
                    ),
                ],
                [IconPencil()]
            ),
            h.button(
                [
                    h.Class(
                        `${icon_button_class} hover:bg-destructive/10 hover:text-destructive`
                    ),
                    h.Type("button"),
                    h.Title("Remove from site"),
                    h.AriaLabel("Remove page from site"),
                    h.Disabled(model.busy),
                    h.OnClick(RequestedRemovePage({ page_id: page.id })),
                ],
                [IconTrash()]
            ),
        ]
    )

const page_item = (
    model: Model,
    page: DesignPage,
    index: number,
    h: HtmlBuilder<Message>
): Html => {
    const document = document_for_page(model.documents, page)
    const is_editing = Option.contains(model.editing_page_id, page.id)

    return h.keyed("li")(
        page.id,
        [h.Class(`${card_class} p-4`)],
        [
            h.div(
                [
                    h.Class(
                        "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                    ),
                ],
                [
                    h.div(
                        [h.Class("min-w-0 flex-1")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap items-center gap-2")],
                                [
                                    h.h3(
                                        [
                                            h.Class(
                                                "truncate text-sm font-semibold"
                                            ),
                                        ],
                                        [
                                            Option.match(document, {
                                                onNone: () =>
                                                    "Missing document",
                                                onSome: (value) => value.title,
                                            }),
                                        ]
                                    ),
                                    ...(page.is_homepage
                                        ? [
                                              h.span(
                                                  [
                                                      h.Class(
                                                          "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                                                      ),
                                                  ],
                                                  ["Homepage"]
                                              ),
                                          ]
                                        : []),
                                ]
                            ),
                            is_editing
                                ? h.form(
                                      [
                                          h.Class(
                                              "mt-3 flex flex-col gap-2 sm:flex-row"
                                          ),
                                          h.OnSubmit(
                                              SubmittedNavigationLabel()
                                          ),
                                      ],
                                      [
                                          h.label(
                                              [
                                                  h.Class(
                                                      "grid min-w-0 flex-1 gap-1.5"
                                                  ),
                                              ],
                                              [
                                                  h.span(
                                                      [
                                                          h.Class(
                                                              "text-xs font-medium text-foreground"
                                                          ),
                                                      ],
                                                      ["Navigation label"]
                                                  ),
                                                  h.input([
                                                      h.Name(
                                                          "navigation_label"
                                                      ),
                                                      h.Class(field_class),
                                                      h.Value(
                                                          model.editing_navigation_label
                                                      ),
                                                      h.OnInput((value) =>
                                                          ChangedNavigationLabel(
                                                              { value }
                                                          )
                                                      ),
                                                  ]),
                                              ]
                                          ),
                                          h.div(
                                              [
                                                  h.Class(
                                                      "flex shrink-0 gap-2 sm:self-end"
                                                  ),
                                              ],
                                              [
                                                  h.button(
                                                      [
                                                          h.Class(button_class),
                                                          h.Type("submit"),
                                                          h.Disabled(
                                                              model.busy
                                                          ),
                                                      ],
                                                      ["Save"]
                                                  ),
                                                  h.button(
                                                      [
                                                          h.Class(button_class),
                                                          h.Type("button"),
                                                          h.OnClick(
                                                              CancelledNavigationLabel()
                                                          ),
                                                      ],
                                                      ["Cancel"]
                                                  ),
                                              ]
                                          ),
                                      ]
                                  )
                                : h.div(
                                      [h.Class("mt-1 grid gap-1")],
                                      [
                                          h.p(
                                              [
                                                  h.Class(
                                                      "truncate text-xs text-muted-foreground"
                                                  ),
                                              ],
                                              [
                                                  `Navigation: ${page.navigation_label} · ${Option.match(
                                                      document,
                                                      {
                                                          onNone: () =>
                                                              "unavailable",
                                                          onSome: (value) =>
                                                              value.slug ??
                                                              "slug not set",
                                                      }
                                                  )}`,
                                              ]
                                          ),
                                          ...Option.match(document, {
                                              onNone: () => [],
                                              onSome: (value) => [
                                                  h.a(
                                                      [
                                                          h.Href(
                                                              document_edit_href(
                                                                  value
                                                              )
                                                          ),
                                                          h.Class(
                                                              "w-fit text-xs font-medium text-primary underline-offset-4 hover:underline"
                                                          ),
                                                      ],
                                                      ["Edit document slug"]
                                                  ),
                                              ],
                                          }),
                                      ]
                                  ),
                        ]
                    ),
                    page_controls(model, page, index, h),
                ]
            ),
        ]
    )
}

const available_documents = (model: Model): ReadonlyArray<DesignDocument> =>
    Array.filter(
        model.documents,
        (document) =>
            !Array.some(model.pages, (page) => page.document_id === document.id)
    )

const LegacyRichTextContent = S.Struct({
    document: RichTextDocument,
})

const rich_text_document = (
    content: string
): Option.Option<typeof RichTextDocument.Type> => {
    try {
        const parsed: unknown = JSON.parse(content)
        return S.decodeUnknownOption(
            S.Union([RichTextContent, LegacyRichTextContent])
        )(parsed).pipe(Option.map((value) => value.document))
    } catch {
        return Option.none()
    }
}

const preview_content_class =
    "min-h-96 px-6 py-8 text-left text-foreground [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mb-5 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_hr]:my-8 [&_img]:my-6 [&_img]:max-w-full [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_p]:whitespace-pre-wrap [&_p]:leading-7 [&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-[var(--radius-surface-sm)] [&_pre]:bg-muted [&_pre]:p-4 [&_table]:my-5 [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"

const markdown_preview = (
    model: Model,
    document: DesignPreviewDocument,
    h: HtmlBuilder<Message>
): Html =>
    Option.match(model.preview_markdown, {
        onNone: () =>
            Option.match(model.preview_markdown_error, {
                onNone: () =>
                    h.div(
                        [
                            h.Class(
                                `${preview_content_class} text-sm text-muted-foreground`
                            ),
                        ],
                        ["Rendering Markdown…"]
                    ),
                onSome: () =>
                    h.pre(
                        [
                            h.Class(
                                `${preview_content_class} whitespace-pre-wrap text-sm text-muted-foreground`
                            ),
                        ],
                        [document.content]
                    ),
            }),
        onSome: (markdown) =>
            h.div([h.Class(preview_content_class)], [Markdown.view(markdown)]),
    })

const rich_text_preview = (
    document: DesignPreviewDocument,
    h: HtmlBuilder<Message>
): Html =>
    Option.match(rich_text_document(document.content), {
        onNone: () =>
            h.div(
                [h.Class(`${preview_content_class} text-muted-foreground`)],
                ["This document's rich-text content could not be decoded."]
            ),
        onSome: (content) =>
            h.div([
                h.Class(preview_content_class),
                h.InnerHTML(renderRichTextHtmlFragment(content)),
            ]),
    })

const landing_page_document = (
    content: string
): Option.Option<typeof LandingPageDocument.Type> => {
    try {
        const parsed: unknown = JSON.parse(content)
        return S.decodeUnknownOption(LandingPageDocument)(parsed)
    } catch {
        return Option.none()
    }
}

const landing_preview = (
    model: Model,
    document: DesignPreviewDocument,
    h: HtmlBuilder<Message>
): Html =>
    Option.match(landing_page_document(document.content), {
        onNone: () => h.p([], ["This landing page could not be decoded."]),
        onSome: () => {
            const landing = loaded_page_content(
                landing_init("blank")[0],
                document.id,
                document.content
            )
            return landing_view(
                { ...landing, open_faqs: model.preview_landing_faqs },
                (message) => GotLandingPreviewMessage({ message }),
                h,
                model.preview_landing_images,
                { theme_id: model.theme_id, appearance: model.appearance },
                true
            )
        },
    })

const document_preview = (
    model: Model,
    document: DesignPreviewDocument,
    h: HtmlBuilder<Message>
): Html => {
    switch (document.content_type) {
        case "markdown":
            return markdown_preview(model, document, h)
        case "rich_text_json":
            return rich_text_preview(document, h)
        case "landing_json":
            return landing_preview(model, document, h)
        case "html":
            return h.iframe(
                [
                    h.Srcdoc(document.content),
                    h.Sandbox(""),
                    h.Class("h-[32rem] w-full border-0 bg-white"),
                    h.AriaLabel(`Preview of ${document.title}`),
                ],
                []
            )
        case "text":
        case "rtf":
            return h.pre(
                [
                    h.Class(
                        `${preview_content_class} overflow-x-auto whitespace-pre-wrap font-sans text-sm leading-7`
                    ),
                ],
                [document.content]
            )
    }
}

const editor_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("grid min-w-0 gap-6")],
        [
            h.section(
                [h.Class("grid gap-3")],
                [
                    h.div(
                        [h.Class("flex items-end justify-between gap-4")],
                        [
                            h.div(
                                [],
                                [
                                    h.h2(
                                        [
                                            h.Class(
                                                "font-semibold text-foreground"
                                            ),
                                        ],
                                        ["Site pages"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-1 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Set the homepage, navigation labels, visibility and order.",
                                        ]
                                    ),
                                ]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "shrink-0 text-xs text-muted-foreground"
                                    ),
                                ],
                                [
                                    `${model.pages.length} page${model.pages.length === 1 ? "" : "s"}`,
                                ]
                            ),
                        ]
                    ),
                    model.pages.length === 0 && !model.is_loading
                        ? h.div(
                              [h.Class(`${card_class} p-6 text-center`)],
                              [
                                  h.p(
                                      [
                                          h.Class(
                                              "text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          "No pages assigned. Add a document below to create the homepage.",
                                      ]
                                  ),
                              ]
                          )
                        : h.ol(
                              [h.Class("grid gap-3")],
                              model.pages.map((page, index) =>
                                  page_item(model, page, index, h)
                              )
                          ),
                ]
            ),
            h.section(
                [h.Class("grid gap-3")],
                [
                    h.div(
                        [],
                        [
                            h.h2(
                                [h.Class("font-semibold text-foreground")],
                                ["Available documents"]
                            ),
                            h.p(
                                [h.Class("mt-1 text-sm text-muted-foreground")],
                                [
                                    "Basic and blog documents from the active domain can become site pages.",
                                ]
                            ),
                        ]
                    ),
                    available_documents(model).length === 0 && !model.is_loading
                        ? h.div(
                              [h.Class(`${card_class} p-6 text-center`)],
                              [
                                  h.p(
                                      [
                                          h.Class(
                                              "text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          model.documents.length === 0
                                              ? "Create a document first, then return here to add it."
                                              : "Every available document is already assigned.",
                                      ]
                                  ),
                                  ...(model.documents.length === 0
                                      ? [
                                            h.a(
                                                [
                                                    h.Class(
                                                        `${button_class} mt-4`
                                                    ),
                                                    h.Href(
                                                        designDocumentsHref()
                                                    ),
                                                ],
                                                ["Open documents"]
                                            ),
                                        ]
                                      : []),
                              ]
                          )
                        : h.ul(
                              [h.Class("grid gap-2 sm:grid-cols-2")],
                              available_documents(model).map((document) =>
                                  h.keyed("li")(
                                      document.id,
                                      [
                                          h.Class(
                                              `${card_class} flex min-w-0 items-center justify-between gap-3 p-3`
                                          ),
                                      ],
                                      [
                                          h.div(
                                              [h.Class("min-w-0")],
                                              [
                                                  h.p(
                                                      [
                                                          h.Class(
                                                              "truncate text-sm font-medium"
                                                          ),
                                                      ],
                                                      [document.title]
                                                  ),
                                                  h.p(
                                                      [
                                                          h.Class(
                                                              "text-xs capitalize text-muted-foreground"
                                                          ),
                                                      ],
                                                      [
                                                          `${document.kind} · ${document.published ? "published" : "draft"}`,
                                                      ]
                                                  ),
                                              ]
                                          ),
                                          h.button(
                                              [
                                                  h.Class(icon_button_class),
                                                  h.Type("button"),
                                                  h.Title("Add to site"),
                                                  h.AriaLabel(
                                                      `Add ${document.title} to site`
                                                  ),
                                                  h.Disabled(model.busy),
                                                  h.OnClick(
                                                      RequestedAddPage({
                                                          document_id:
                                                              document.id,
                                                      })
                                                  ),
                                              ],
                                              [IconPlus()]
                                          ),
                                      ]
                                  )
                              )
                          ),
                ]
            ),
        ]
    )

const preview_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const preview_style = site_appearance_preview_style(model)
    const fallback_navigation: ReadonlyArray<DesignNavigationItem> =
        Array.filter(model.pages, (page) => page.show_in_navigation).map(
            (page) => ({
                id: page.id,
                label: page.navigation_label,
                visible: true,
                target: { _tag: "page", page_id: page.id },
            })
        )
    const navigation = Array.filter(
        Option.getOrElse(model.preview_navigation, () => fallback_navigation),
        (item) => item.visible
    )
    const homepage = Array.findFirst(model.pages, (page) => page.is_homepage)
    const preview_page = Option.flatMap(
        model.preview_page_id,
        (preview_page_id) =>
            Array.findFirst(model.pages, (page) => page.id === preview_page_id)
    ).pipe(Option.orElse(() => homepage))
    const brand_content = [
        h.img([
            h.Src(model.logo_light_url),
            h.Alt(
                model.show_site_title
                    ? ""
                    : `${model.site_title || "Site"} logo`
            ),
            h.Class("site-preview-logo-light max-h-8 max-w-40 object-contain"),
        ]),
        h.img([
            h.Src(model.logo_dark_url),
            h.Alt(""),
            h.AriaHidden(true),
            h.Class("site-preview-logo-dark max-h-8 max-w-40 object-contain"),
        ]),
        ...(model.show_site_title
            ? [
                  h.span(
                      [
                          h.Class(
                              "truncate text-sm font-semibold text-foreground"
                          ),
                      ],
                      [model.site_title || "Site title"]
                  ),
              ]
            : []),
    ]
    const preview_brand = Option.match(homepage, {
        onNone: () =>
            h.span([h.Class("flex min-w-0 items-center gap-3")], brand_content),
        onSome: (home) =>
            h.button(
                [
                    h.Type("button"),
                    h.AriaLabel("Open homepage preview"),
                    h.OnClick(SelectedPreviewPage({ page_id: home.id })),
                    h.Class(
                        "flex min-w-0 items-center gap-3 rounded-[var(--radius-control)] text-left hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring"
                    ),
                ],
                brand_content
            ),
    })

    return h.aside(
        [
            h.Class(
                `${card_class} site-appearance-preview min-w-0 overflow-hidden lg:sticky lg:top-6`
            ),
            h.Attribute("data-site-appearance", model.appearance),
            h.Style(preview_style),
            h.AriaLabel("Site preview"),
        ],
        [
            main_layout_view(
                {
                    header: h.div(
                        [
                            h.Class(
                                "flex min-h-14 items-center justify-between gap-4 px-5"
                            ),
                        ],
                        [
                            preview_brand,
                            h.nav(
                                [
                                    h.Class(
                                        "flex min-w-0 gap-3 overflow-hidden text-xs text-muted-foreground"
                                    ),
                                ],
                                navigation.map((item) => {
                                    if (item.target._tag === "module") {
                                        const module_id = item.target.module_id
                                        if (
                                            module_id !== "blog" &&
                                            module_id !== "events"
                                        ) {
                                            return h.keyed("span")(
                                                item.id,
                                                [
                                                    h.Class("truncate"),
                                                    h.Title(
                                                        `${item.label} module route`
                                                    ),
                                                ],
                                                [item.label]
                                            )
                                        }
                                        return h.keyed("button")(
                                            item.id,
                                            [
                                                h.Type("button"),
                                                h.AriaPressed(
                                                    globalThis.String(
                                                        Option.contains(
                                                            model.preview_module_id,
                                                            module_id
                                                        )
                                                    )
                                                ),
                                                h.OnClick(
                                                    SelectedPreviewModule({
                                                        module_id,
                                                    })
                                                ),
                                                h.Class(
                                                    Option.contains(
                                                        model.preview_module_id,
                                                        module_id
                                                    )
                                                        ? "truncate font-semibold text-foreground underline underline-offset-4"
                                                        : "truncate hover:text-foreground"
                                                ),
                                            ],
                                            [item.label]
                                        )
                                    }
                                    const page_id = item.target.page_id
                                    return h.keyed("button")(
                                        item.id,
                                        [
                                            h.Class(
                                                Option.contains(
                                                    model.preview_page_id,
                                                    page_id
                                                )
                                                    ? "truncate font-semibold text-foreground underline underline-offset-4"
                                                    : "truncate hover:text-foreground"
                                            ),
                                            h.Type("button"),
                                            h.AriaPressed(
                                                globalThis.String(
                                                    Option.contains(
                                                        model.preview_page_id,
                                                        page_id
                                                    )
                                                )
                                            ),
                                            h.OnClick(
                                                SelectedPreviewPage({
                                                    page_id,
                                                })
                                            ),
                                        ],
                                        [item.label]
                                    )
                                })
                            ),
                        ]
                    ),
                    main: h.div(
                        [h.Class("min-h-96 bg-background/40")],
                        [
                            Option.isSome(model.preview_module_id)
                                ? model.preview_module_id.value === "events"
                                    ? events_preview(model, h)
                                    : blog_preview(model, h)
                                : Option.match(preview_page, {
                                      onNone: () => h.div([], []),
                                      onSome: () =>
                                          Option.match(model.preview_document, {
                                              onNone: () =>
                                                  h.p(
                                                      [
                                                          h.Class(
                                                              "text-sm text-muted-foreground"
                                                          ),
                                                      ],
                                                      [
                                                          "Loading document preview…",
                                                      ]
                                                  ),
                                              onSome: (document) =>
                                                  document.content_type ===
                                                  "landing_json"
                                                      ? document_preview(
                                                            model,
                                                            document,
                                                            h
                                                        )
                                                      : h.div(
                                                            [
                                                                h.Class(
                                                                    "text-center"
                                                                ),
                                                            ],
                                                            [
                                                                h.div(
                                                                    [
                                                                        h.Class(
                                                                            "border-b border-border px-6 py-4"
                                                                        ),
                                                                    ],
                                                                    [
                                                                        h.p(
                                                                            [
                                                                                h.Class(
                                                                                    "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                                                                                ),
                                                                            ],
                                                                            [
                                                                                document.kind,
                                                                            ]
                                                                        ),
                                                                        h.h2(
                                                                            [
                                                                                h.Class(
                                                                                    "mt-1 text-xl font-semibold tracking-tight text-foreground"
                                                                                ),
                                                                            ],
                                                                            [
                                                                                document.title,
                                                                            ]
                                                                        ),
                                                                    ]
                                                                ),
                                                                document_preview(
                                                                    model,
                                                                    document,
                                                                    h
                                                                ),
                                                            ]
                                                        ),
                                          }),
                                  }),
                        ]
                    ),
                    footer: h.div(
                        [h.Class("grid gap-4 px-5 py-4")],
                        [
                            h.p(
                                [h.Class("text-xs text-muted-foreground")],
                                [
                                    "Live publication preview. Publishing remains the next layer.",
                                ]
                            ),
                            SocialLinks.view(
                                model.social_links,
                                (message) => GotSocialLinksMessage({ message }),
                                h,
                                {
                                    can_save: Option.isSome(
                                        model.selected_owner_id
                                    ),
                                    unavailable_message:
                                        "Assign this layout to a site to save these URLs.",
                                }
                            ),
                        ]
                    ),
                },
                h
            ),
        ]
    )
}

const logo_controls = (h: HtmlBuilder<Message>): Html =>
    h.section(
        [h.Class("grid gap-3")],
        [
            h.div(
                [],
                [
                    h.h2(
                        [h.Class("font-semibold text-foreground")],
                        ["Header logo"]
                    ),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [
                            "One inline SVG logo uses theme paint tokens and adapts with the site theme.",
                        ]
                    ),
                ]
            ),
            h.a(
                [h.Href(designLogoHref()), h.Class(button_class)],
                ["Open logo designer"]
            ),
        ]
    )

const favicon_control = (
    model: Model,
    variant: LogoVariant,
    h: HtmlBuilder<Message>
): Html => {
    const is_light = variant === "light"
    const url = is_light ? model.favicon_light_url : model.favicon_dark_url
    const is_custom = is_light
        ? model.has_custom_favicon_light
        : model.has_custom_favicon_dark
    const drop = is_light ? model.favicon_light_drop : model.favicon_dark_drop
    const uploading = Option.contains(model.favicon_uploading, variant)
    const can_upload = Option.isSome(model.selected_owner_id) && !uploading

    return h.article(
        [h.Class(`${card_class} grid gap-4 p-4 sm:grid-cols-[8rem_1fr]`)],
        [
            h.figure(
                [
                    h.Class(
                        `${is_light ? "bg-white" : "bg-neutral-950"} grid min-h-32 place-items-center rounded-[var(--radius-surface-sm)] border border-border p-5`
                    ),
                ],
                [
                    is_custom
                        ? h.img([
                              h.Src(url),
                              h.Alt(""),
                              h.Class("size-16 object-contain"),
                          ])
                        : h.div(
                              [
                                  h.Class(
                                      "grid size-16 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground"
                                  ),
                                  h.AriaHidden(true),
                              ],
                              ["32 px"]
                          ),
                ]
            ),
            h.div(
                [h.Class("grid content-center gap-3")],
                [
                    h.div(
                        [],
                        [
                            h.h2(
                                [h.Class("text-sm font-semibold")],
                                [`${is_light ? "Light" : "Dark"} favicon`]
                            ),
                            h.p(
                                [h.Class("mt-1 text-xs text-muted-foreground")],
                                [
                                    is_custom
                                        ? "Custom image assigned to this site"
                                        : "No custom image assigned",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap items-center gap-2")],
                        [
                            h.submodel({
                                slotId: drop.id,
                                model: drop,
                                view: Ui.FileDrop.view,
                                viewInputs: {
                                    multiple: false,
                                    accept: ["image/svg+xml", "image/png"],
                                    toView: (attributes) =>
                                        h.label(
                                            [
                                                ...attributes.root,
                                                h.Class(
                                                    `${button_class} ${can_upload ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`
                                                ),
                                            ],
                                            [
                                                uploading
                                                    ? "Uploading…"
                                                    : is_custom
                                                      ? "Replace"
                                                      : "Upload",
                                                ...(can_upload
                                                    ? [
                                                          h.input([
                                                              ...attributes.input,
                                                              h.Class(
                                                                  "sr-only"
                                                              ),
                                                          ]),
                                                      ]
                                                    : []),
                                            ]
                                        ),
                                },
                                toParentMessage: (message) =>
                                    is_light
                                        ? GotLightFaviconDropMessage({
                                              message,
                                          })
                                        : GotDarkFaviconDropMessage({
                                              message,
                                          }),
                            }),
                            ...(is_custom
                                ? [
                                      h.button(
                                          [
                                              h.Class(button_class),
                                              h.Type("button"),
                                              h.Disabled(uploading),
                                              h.OnClick(
                                                  RequestedRemoveLayoutFavicon({
                                                      variant,
                                                  })
                                              ),
                                          ],
                                          ["Remove"]
                                      ),
                                  ]
                                : []),
                        ]
                    ),
                ]
            ),
        ]
    )
}

export const faviconsView = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.main(
        [
            h.Class(
                "mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.header(
                [
                    h.Class(
                        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                                    ),
                                ],
                                ["Design"]
                            ),
                            h.h1(
                                [
                                    h.Class(
                                        "mt-1 text-2xl font-semibold tracking-tight text-foreground"
                                    ),
                                ],
                                ["Favicons"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 max-w-2xl text-sm text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Upload browser icons for light and dark color schemes. SVG or PNG files up to 1 MB are supported.",
                                ]
                            ),
                        ]
                    ),
                    ...(model.sites.length === 0
                        ? []
                        : [site_select(model, h)]),
                ]
            ),
            Option.match(model.error, {
                onNone: () => h.div([], []),
                onSome: (error) =>
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface-sm)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                            ),
                            h.Role("alert"),
                        ],
                        [error]
                    ),
            }),
            model.sites.length === 0
                ? h.section(
                      [h.Class(`${card_class} p-8 text-center`)],
                      [
                          h.h2(
                              [h.Class("font-semibold")],
                              ["Create a site first"]
                          ),
                          h.p(
                              [
                                  h.Class(
                                      "mx-auto mt-2 max-w-lg text-sm text-muted-foreground"
                                  ),
                              ],
                              [
                                  "Favicons are assigned through each site’s Main layout.",
                              ]
                          ),
                          h.a(
                              [
                                  h.Class(`${button_class} mt-5`),
                                  h.Href(designDomainsHref()),
                              ],
                              ["Manage domain sites"]
                          ),
                      ]
                  )
                : model.is_loading
                  ? h.div(
                        [h.Class(`${card_class} p-8 text-center`)],
                        [
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                ["Loading favicon settings…"]
                            ),
                        ]
                    )
                  : h.section(
                        [h.Class("grid gap-3 lg:grid-cols-2")],
                        [
                            favicon_control(model, "light", h),
                            favicon_control(model, "dark", h),
                        ]
                    ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "These icons are stored with the selected site’s Main layout and are included the next time the site is built.",
                ]
            ),
        ]
    )

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.main(
        [
            h.Class(
                "mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.header(
                [
                    h.Class(
                        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                                    ),
                                ],
                                ["Publishing"]
                            ),
                            h.h1(
                                [
                                    h.Class(
                                        "mt-1 text-2xl font-semibold tracking-tight text-foreground"
                                    ),
                                ],
                                ["Design"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 max-w-2xl text-sm text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Compose domain documents into a coherent site without duplicating their content.",
                                ]
                            ),
                        ]
                    ),
                    ...(model.sites.length === 0
                        ? []
                        : [
                              h.div(
                                  [
                                      h.Class(
                                          "flex flex-col gap-3 sm:flex-row sm:items-end"
                                      ),
                                  ],
                                  [
                                      site_select(model, h),
                                      h.button(
                                          [
                                              h.Class(button_class),
                                              h.Type("button"),
                                              h.OnClick(ToggledPreview()),
                                          ],
                                          [
                                              model.is_preview_open
                                                  ? "Hide preview"
                                                  : "Preview site",
                                          ]
                                      ),
                                  ]
                              ),
                          ]),
                ]
            ),
            Option.match(model.error, {
                onNone: () => h.div([], []),
                onSome: (error) =>
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface-sm)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                            ),
                            h.Role("alert"),
                        ],
                        [error]
                    ),
            }),
            model.sites.length === 0
                ? h.section(
                      [
                          h.Class(
                              `${card_class} grid justify-items-center p-8 text-center`
                          ),
                      ],
                      [
                          h.h2(
                              [h.Class("font-semibold text-foreground")],
                              ["Create a site first"]
                          ),
                          h.p(
                              [
                                  h.Class(
                                      "mt-2 max-w-lg text-sm text-muted-foreground"
                                  ),
                              ],
                              [
                                  "Sites provide the publishing target. A domain can have separate production, staging, prototype, survey and document sites.",
                              ]
                          ),
                          h.a(
                              [
                                  h.Class(`${button_class} mt-5`),
                                  h.Href(designDomainsHref()),
                              ],
                              ["Manage domain sites"]
                          ),
                      ]
                  )
                : h.div(
                      [
                          h.Class(
                              model.is_preview_open
                                  ? "grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)] lg:items-start"
                                  : "min-w-0"
                          ),
                      ],
                      [
                          model.is_loading
                              ? h.div(
                                    [h.Class(`${card_class} p-8 text-center`)],
                                    [
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-sm text-muted-foreground"
                                                ),
                                            ],
                                            ["Loading site workspace…"]
                                        ),
                                    ]
                                )
                              : editor_view(model, h),
                          ...(model.is_preview_open
                              ? [preview_view(model, h)]
                              : []),
                      ]
                  ),
        ]
    )

const appearance_controls = (model: Model, h: HtmlBuilder<Message>): Html => {
    const disabled =
        model.is_loading ||
        model.appearance_saving ||
        Option.isNone(model.selected_owner_id)
    return h.section(
        [h.Class(`${card_class} grid gap-3 p-4`)],
        [
            h.h2([h.Class("font-medium")], ["Site appearance"]),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Independent of your app theme. Save, then Build HTML to update the published site.",
                ]
            ),
            Ui.Select.view(
                {
                    id: "design-site-theme",
                    value: model.theme_id,
                    onChange: (value) => ChangedSiteTheme({ value }),
                    toView: (attributes) =>
                        h.label(
                            [h.Class("grid gap-1")],
                            [
                                h.span(attributes.label, ["Theme"]),
                                h.select(
                                    [
                                        ...attributes.select,
                                        h.Class(field_class),
                                        h.Disabled(disabled),
                                    ],
                                    THEME_FAMILIES.map((family) =>
                                        h.option(
                                            [h.Value(family.id)],
                                            [family.label]
                                        )
                                    )
                                ),
                            ]
                        ),
                },
                h
            ),
            Ui.Select.view(
                {
                    id: "design-site-appearance",
                    value: model.appearance,
                    onChange: (value) => ChangedSiteAppearance({ value }),
                    toView: (attributes) =>
                        h.label(
                            [h.Class("grid gap-1")],
                            [
                                h.span(attributes.label, [
                                    "Default appearance",
                                ]),
                                h.select(
                                    [
                                        ...attributes.select,
                                        h.Class(field_class),
                                        h.Disabled(disabled),
                                    ],
                                    [
                                        h.option(
                                            [h.Value("system")],
                                            [
                                                "System — follows the visitor’s device",
                                            ]
                                        ),
                                        h.option([h.Value("light")], ["Light"]),
                                        h.option([h.Value("dark")], ["Dark"]),
                                    ]
                                ),
                            ]
                        ),
                },
                h
            ),
            h.label(
                [h.For("design-site-title"), h.Class("grid gap-1")],
                [
                    h.span([], ["Site title"]),
                    h.input([
                        h.Id("design-site-title"),
                        h.Type("text"),
                        h.Value(model.site_title),
                        h.Attribute("maxlength", "255"),
                        h.Disabled(disabled),
                        h.Class(field_class),
                        h.OnInput((value) => ChangedSiteTitle({ value })),
                    ]),
                    h.span(
                        [h.Class("text-xs text-muted-foreground")],
                        ["The public name can differ from the domain or URL."]
                    ),
                ]
            ),
            h.label(
                [
                    h.For("design-show-site-title"),
                    h.Class("flex min-h-11 items-center gap-2 text-sm"),
                ],
                [
                    h.input([
                        h.Id("design-show-site-title"),
                        h.Type("checkbox"),
                        h.Checked(model.show_site_title),
                        h.Disabled(disabled),
                        h.OnClick(
                            ChangedShowSiteTitle({
                                value: !model.show_site_title,
                            })
                        ),
                    ]),
                    "Show site title beside logo",
                ]
            ),
            h.button(
                [
                    h.Type("button"),
                    h.Class(button_class),
                    h.Disabled(
                        disabled ||
                            !model.appearance_dirty ||
                            model.site_title.trim() === ""
                    ),
                    h.OnClick(RequestedSaveSiteAppearance()),
                ],
                [model.appearance_saving ? "Saving…" : "Save site appearance"]
            ),
            h.p(
                [h.Role("status"), h.Class("text-sm text-muted-foreground")],
                [
                    model.appearance_saved
                        ? "Site appearance saved. Build HTML, then deploy preview to check it."
                        : model.appearance_dirty
                          ? "Unsaved site appearance"
                          : "",
                ]
            ),
        ]
    )
}

export const mainLayoutView = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.main(
        [
            h.Class(
                "mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.header(
                [
                    h.Class(
                        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                                    ),
                                ],
                                ["Design / Layouts"]
                            ),
                            h.h1(
                                [
                                    h.Class(
                                        "mt-1 text-2xl font-semibold tracking-tight text-foreground"
                                    ),
                                ],
                                ["Main layout"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 max-w-2xl text-sm text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Edit the shared header, page frame and footer for this site. Social profile URLs appear in the footer.",
                                ]
                            ),
                        ]
                    ),
                    ...(model.sites.length === 0
                        ? [
                              h.a(
                                  [
                                      h.Class(button_class),
                                      h.Href(designDomainsHref()),
                                  ],
                                  ["Create a site to assign"]
                              ),
                          ]
                        : [main_layout_site_select(model, h)]),
                ]
            ),
            Option.match(model.error, {
                onNone: () => h.div([], []),
                onSome: (error) =>
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface-sm)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                            ),
                            h.Role("alert"),
                        ],
                        [error]
                    ),
            }),
            ...(Option.isNone(model.selected_owner_id)
                ? [
                      h.div(
                          [
                              h.Class(
                                  "rounded-[var(--radius-surface-sm)] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
                              ),
                          ],
                          [
                              model.sites.length === 0
                                  ? "This is the default layout. You can edit its draft now and assign it after creating a site."
                                  : "This is the default layout. Edit its draft, then choose a site to assign and save it.",
                          ]
                      ),
                  ]
                : []),
            h.fieldset(
                [h.Disabled(model.can_write === false), h.Class("contents")],
                [appearance_controls(model, h)]
            ),
            h.fieldset(
                [h.Disabled(model.can_write === false), h.Class("contents")],
                [logo_controls(h)]
            ),
            h.section(
                [
                    h.Class(
                        `${card_class} flex flex-wrap items-center gap-4 p-4`
                    ),
                ],
                [
                    h.div(
                        [h.Class("min-w-0 flex-1")],
                        [
                            h.h2([h.Class("font-medium")], ["Browser favicon"]),
                            h.p(
                                [h.Class("mt-1 text-sm text-muted-foreground")],
                                [
                                    "Light and dark browser icons are stored with this Main layout.",
                                ]
                            ),
                        ]
                    ),
                    h.a(
                        [h.Class(button_class), h.Href(designFaviconsHref())],
                        ["Manage favicons"]
                    ),
                ]
            ),
            model.is_loading
                ? h.div(
                      [h.Class(`${card_class} p-8 text-center`)],
                      [
                          h.p(
                              [h.Class("text-sm text-muted-foreground")],
                              ["Loading main layout…"]
                          ),
                      ]
                  )
                : preview_view(model, h),
        ]
    )

export const submodelView = Submodel.defineView<Model, Message>(view)
export const mainLayoutSubmodelView = Submodel.defineView<Model, Message>(
    mainLayoutView
)
export const faviconsSubmodelView = Submodel.defineView<Model, Message>(
    faviconsView
)
