import { Effect, Schema } from "effect"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import { renderToString } from "foldkit/experimental/server"
import {
    PublishedEvent,
    type PublishedEvent as PublishedEventType,
} from "@urm/domain/schemas/publications"
import type { PublishedSiteLayout } from "@urm/domain/schemas/document-site-builds"

import { renderSiteLayout } from "./site-layout.ts"

const Message = Schema.Struct({ _tag: Schema.Literal("Noop") })
type Message = typeof Message.Type

const EventIndex = Schema.Struct({
    events: Schema.Array(PublishedEvent),
})
type EventIndex = typeof EventIndex.Type

const event_date = (value: number): string =>
    new Intl.DateTimeFormat("en", {
        dateStyle: "long",
        timeZone: "UTC",
    }).format(new Date(value))

const event_date_value = (value: number): string =>
    new Date(value).toISOString().slice(0, 10)

const safe_url = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    try {
        const url = new URL(value)
        return url.protocol === "http:" || url.protocol === "https:"
            ? url.href
            : undefined
    } catch {
        return undefined
    }
}

const event_time = (event: PublishedEventType): string =>
    event.end_time === undefined
        ? event.start_time
        : `${event.start_time}–${event.end_time}`

const event_coordinates = (
    event: PublishedEventType
): Readonly<{ latitude: number; longitude: number }> | undefined => {
    const latitude = globalThis.Number(event.latitude)
    const longitude = globalThis.Number(event.longitude)
    return globalThis.Number.isFinite(latitude) &&
        globalThis.Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
        ? { latitude, longitude }
        : undefined
}

const event_detail = (
    label: string,
    value: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("site-event-detail")],
        [h.dt([], [label]), h.dd([], [value])]
    )

const event_link_detail = (
    label: string,
    url: string,
    link_label: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("site-event-detail")],
        [
            h.dt([], [label]),
            h.dd(
                [],
                [
                    h.a(
                        [
                            h.Href(url),
                            h.Attribute("target", "_blank"),
                            h.Attribute("rel", "noreferrer"),
                        ],
                        [link_label]
                    ),
                ]
            ),
        ]
    )

const event_enhancements = (
    event: PublishedEventType,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> => {
    const coordinates = event_coordinates(event)
    if (coordinates === undefined) return []
    const latitude = globalThis.String(coordinates.latitude)
    const longitude = globalThis.String(coordinates.longitude)
    return [
        h.section(
            [
                h.Class("site-event-enhancements site-event-stack"),
                h.DataAttribute("event-enhancements", ""),
                h.DataAttribute("event-latitude", latitude),
                h.DataAttribute("event-longitude", longitude),
            ],
            [
                h.section(
                    [h.Class("site-event-location")],
                    [
                        h.h2([], ["Location"]),
                        h.div(
                            [
                                h.Class("site-event-map"),
                                h.Role("region"),
                                h.DataAttribute("event-map", ""),
                                h.AriaLabel(`Map showing ${event.venue_name}`),
                            ],
                            []
                        ),
                        h.p(
                            [
                                h.Class(
                                    "site-event-status site-visually-hidden"
                                ),
                                h.DataAttribute("event-map-status", ""),
                                h.AriaLive("polite"),
                            ],
                            []
                        ),
                    ]
                ),
                h.section(
                    [h.Class("site-event-panel site-event-weather")],
                    [
                        h.h2([], ["Weather at venue"]),
                        h.button(
                            [
                                h.Type("button"),
                                h.DataAttribute("event-weather-button", ""),
                                h.Attribute("hidden", ""),
                            ],
                            ["Check current weather"]
                        ),
                        h.p(
                            [
                                h.Class("site-event-status"),
                                h.DataAttribute("event-weather-status", ""),
                                h.AriaLive("polite"),
                            ],
                            []
                        ),
                        h.dl(
                            [
                                h.Class("site-event-weather-reading"),
                                h.DataAttribute("event-weather-reading", ""),
                                h.Attribute("hidden", ""),
                            ],
                            [
                                h.div(
                                    [h.Class("site-event-weather-primary")],
                                    [
                                        h.dt(
                                            [h.Class("site-visually-hidden")],
                                            ["Temperature"]
                                        ),
                                        h.dd(
                                            [
                                                h.Class(
                                                    "site-event-temperature"
                                                ),
                                                h.DataAttribute(
                                                    "weather-temperature",
                                                    ""
                                                ),
                                            ],
                                            []
                                        ),
                                        h.dt(
                                            [h.Class("site-visually-hidden")],
                                            ["Conditions"]
                                        ),
                                        h.dd(
                                            [
                                                h.Class(
                                                    "site-event-conditions"
                                                ),
                                                h.DataAttribute(
                                                    "weather-description",
                                                    ""
                                                ),
                                            ],
                                            []
                                        ),
                                    ]
                                ),
                                h.div(
                                    [h.Class("site-event-detail")],
                                    [
                                        h.dt([], ["Humidity"]),
                                        h.dd(
                                            [
                                                h.DataAttribute(
                                                    "weather-humidity",
                                                    ""
                                                ),
                                            ],
                                            []
                                        ),
                                    ]
                                ),
                                h.div(
                                    [h.Class("site-event-detail")],
                                    [
                                        h.dt([], ["Wind"]),
                                        h.dd(
                                            [
                                                h.DataAttribute(
                                                    "weather-wind",
                                                    ""
                                                ),
                                            ],
                                            []
                                        ),
                                    ]
                                ),
                            ]
                        ),
                    ]
                ),
            ]
        ),
    ]
}

const event_summary = (
    event: PublishedEventType,
    h: HtmlBuilder<Message>
): Html =>
    h.article(
        [h.Class("site-event-card")],
        [
            h.h2([], [h.a([h.Href(event.path)], [event.title])]),
            h.p(
                [h.Class("site-event-when")],
                [
                    h.time(
                        [h.Attribute("datetime", event_date_value(event.date))],
                        [`${event_date(event.date)}, ${event_time(event)}`]
                    ),
                ]
            ),
            h.p([h.Class("site-event-venue")], [event.venue_name]),
            ...(event.description === undefined
                ? []
                : [h.p([], [event.description])]),
        ]
    )

const index_application = {
    Flags: EventIndex,
    init: (flags: EventIndex) => ({
        model: flags,
        commands: [],
    }),
    view: (flags: EventIndex, h: HtmlBuilder<Message>): Document => ({
        title: "Events",
        body: h.main(
            [h.Class("site-page site-events")],
            [
                h.h1([], ["Events"]),
                h.ul(
                    [h.Class("site-event-list")],
                    flags.events.map((event) =>
                        h.li([], [event_summary(event, h)])
                    )
                ),
            ]
        ),
    }),
}

const event_application = {
    Flags: PublishedEvent,
    init: (event: PublishedEventType) => ({
        model: event,
        commands: [],
    }),
    view: (event: PublishedEventType, h: HtmlBuilder<Message>): Document => {
        const image_url = safe_url(event.image_url)
        const venue_url = safe_url(event.venue_url)
        const tickets_url = safe_url(event.tickets_url)
        const coordinates = event_coordinates(event)
        const end_time = event.end_time?.trim()
        return {
            title: event.title,
            body: h.main(
                [h.Class("site-page site-event site-event-stack")],
                [
                    h.article(
                        [h.Class("site-event-panel")],
                        [
                            h.header(
                                [h.Class("site-event-heading")],
                                [
                                    h.h1([], [event.title]),
                                    h.p(
                                        [h.Class("site-event-when")],
                                        [
                                            h.time(
                                                [
                                                    h.Attribute(
                                                        "datetime",
                                                        event_date_value(
                                                            event.date
                                                        )
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
                                          h.Class("site-event-image"),
                                      ]),
                                  ]),
                            h.dl(
                                [h.Class("site-event-details")],
                                [
                                    event_detail("Venue", event.venue_name, h),
                                    event_detail("Start", event.start_time, h),
                                    event_detail(
                                        "End",
                                        end_time === undefined ||
                                            end_time === ""
                                            ? "—"
                                            : end_time,
                                        h
                                    ),
                                    ...(coordinates === undefined
                                        ? []
                                        : [
                                              event_detail(
                                                  "Location",
                                                  `${coordinates.latitude}, ${coordinates.longitude}`,
                                                  h
                                              ),
                                          ]),
                                    ...(venue_url === undefined
                                        ? []
                                        : [
                                              event_link_detail(
                                                  "Venue URL",
                                                  venue_url,
                                                  "Visit venue website",
                                                  h
                                              ),
                                          ]),
                                    ...(tickets_url === undefined
                                        ? []
                                        : [
                                              event_link_detail(
                                                  "Tickets URL",
                                                  tickets_url,
                                                  "View ticket information",
                                                  h
                                              ),
                                          ]),
                                ]
                            ),
                            h.section(
                                [h.Class("site-event-description")],
                                [
                                    h.h2([], ["Description"]),
                                    ...(event.description === undefined
                                        ? [
                                              h.p(
                                                  [],
                                                  ["No description available."]
                                              ),
                                          ]
                                        : event.description
                                              .split(/\r?\n\s*\r?\n/)
                                              .map((paragraph) =>
                                                  h.p([], [paragraph])
                                              )),
                                ]
                            ),
                            h.div(
                                [h.Class("site-event-actions")],
                                [
                                    ...(tickets_url === undefined
                                        ? []
                                        : [
                                              h.a(
                                                  [
                                                      h.Href(tickets_url),
                                                      h.Class(
                                                          "site-event-action-primary"
                                                      ),
                                                  ],
                                                  ["Get tickets"]
                                              ),
                                          ]),
                                    h.a(
                                        [
                                            h.Href("/events/"),
                                            h.Class(
                                                "site-event-action-secondary"
                                            ),
                                        ],
                                        ["Back to events"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("site-event-actions")],
                        [
                            ...(tickets_url === undefined
                                ? []
                                : [
                                      h.a(
                                          [
                                              h.Href(tickets_url),
                                              h.Class(
                                                  "site-event-action-primary"
                                              ),
                                          ],
                                          ["Buy tickets"]
                                      ),
                                  ]),
                            h.a(
                                [
                                    h.Href("/events/"),
                                    h.Class("site-event-action-secondary"),
                                ],
                                ["Back to events"]
                            ),
                        ]
                    ),
                    ...event_enhancements(event, h),
                ]
            ),
        }
    },
}

export const renderEventIndex = Effect.fn("EventIndex.render")(function* (
    events: ReadonlyArray<PublishedEventType>,
    layout?: PublishedSiteLayout
) {
    return yield* renderToString(
        {
            ...index_application,
            view: (flags: EventIndex, h: HtmlBuilder<Message>) => {
                const document = index_application.view(flags, h)
                return {
                    ...document,
                    body: renderSiteLayout(
                        layout,
                        "/events/",
                        document.body,
                        h
                    ),
                }
            },
        },
        { flags: { events }, isHydratable: false }
    )
})

export const renderEventPage = Effect.fn("EventPage.render")(function* (
    event: PublishedEventType,
    layout?: PublishedSiteLayout
) {
    return yield* renderToString(
        {
            ...event_application,
            view: (flags: PublishedEventType, h: HtmlBuilder<Message>) => {
                const document = event_application.view(flags, h)
                return {
                    ...document,
                    body: renderSiteLayout(
                        layout,
                        event.path,
                        document.body,
                        h
                    ),
                }
            },
        },
        { flags: event, isHydratable: false }
    )
})
