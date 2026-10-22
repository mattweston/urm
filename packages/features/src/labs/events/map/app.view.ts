import { Match as M } from "effect"
import { Submodel } from "foldkit"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"

import { view as interactiveMapView } from "./interactive-map/interactive-map.view.ts"
import { view as mapView } from "./map/map.view.ts"
import { view as journeyView } from "./journey/journey.view.ts"
import { view as isochroneView } from "./isochrone/isochrone.view.ts"
import { view as storymapView } from "./storymap/storymap.view.ts"
import { view as weatherView } from "./weather/weather.view.ts"
import { view as weatherMapView } from "./weather-map/weather-map.view.ts"
import {
    ChangedPath,
    GotInteractiveMapMessage,
    GotIsochroneMessage,
    GotJourneyMessage,
    GotMapMessage,
    GotStorymapMessage,
    GotWeatherMessage,
    GotWeatherMapMessage,
    type Message,
} from "./app.message.ts"
import type { Model } from "./app.model.ts"
import {
    indexHref,
    interactiveMapHref,
    isochroneHref,
    journeyHref,
    mapHref,
    storymapHref,
    weatherHref,
    weatherMapHref,
} from "./route.ts"

const demos: ReadonlyArray<readonly [string, string, string]> = [
    [
        "Interactive map",
        interactiveMapHref(),
        "Area selection, studios, routes, and geolocation.",
    ],
    ["Map", mapHref(), "Searchable locations on a MapLibre map."],
    [
        "Journey",
        journeyHref(),
        "An animated route through Open Studios venues.",
    ],
    [
        "Isochrone",
        isochroneHref(),
        "Travel-time bands around a selected studio.",
    ],
    [
        "Storymap",
        storymapHref(),
        "A scroll-driven tour through the Five Valleys.",
    ],
    ["Weather", weatherHref(), "Current weather lookup by postcode."],
    [
        "Weather map",
        weatherMapHref(),
        "Weather, air quality, and place derived from a draggable marker.",
    ],
]

const navigationControl = (
    href: string,
    attributes: ReadonlyArray<Attribute<Message>>,
    children: ReadonlyArray<Html | string>,
    internal_navigation: boolean,
    h: HtmlBuilder<Message>
) =>
    internal_navigation
        ? h.button(
              [
                  h.Type("button"),
                  h.OnClick(ChangedPath({ pathname: href })),
                  ...attributes,
              ],
              children
          )
        : h.a([h.Href(href), ...attributes], children)

const indexView = (
    internal_navigation: boolean,
    h: HtmlBuilder<Message>
): Html =>
    h.main(
        [
            h.Class(
                "mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.header(
                [],
                [
                    h.h1(
                        [h.Class("text-3xl font-semibold text-foreground")],
                        ["Map labs"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-muted-foreground")],
                        [
                            "UI-only map demos. These routes do not read from or write to the database.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-4 sm:grid-cols-2")],
                demos.map(([label, href, summary]) =>
                    navigationControl(
                        href,
                        [
                            h.Class(
                                "text-left rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)] transition hover:bg-accent"
                            ),
                        ],
                        [
                            h.h2([h.Class("font-semibold")], [label]),
                            h.p(
                                [h.Class("mt-2 text-sm text-muted-foreground")],
                                [summary]
                            ),
                        ],
                        internal_navigation,
                        h
                    )
                )
            ),
        ]
    )

const demoShell = (
    content: Html,
    internal_navigation: boolean,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("flex min-h-full flex-col")],
        [
            h.nav(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border bg-card px-4 py-2"
                    ),
                ],
                [
                    navigationControl(
                        indexHref(),
                        [
                            h.Class(
                                "text-sm text-muted-foreground hover:text-foreground"
                            ),
                        ],
                        ["Map"],
                        internal_navigation,
                        h
                    ),
                ]
            ),
            h.div([h.Class("min-h-0 flex-1")], [content]),
        ]
    )

const contentView = (
    model: Model,
    internal_navigation: boolean,
    h: HtmlBuilder<Message>
): Html =>
    M.value(model.route).pipe(
        M.tagsExhaustive({
            Index: () => indexView(internal_navigation, h),
            InteractiveMap: () =>
                demoShell(
                    interactiveMapView(
                        model.interactiveMap,
                        (message) => GotInteractiveMapMessage({ message }),
                        h
                    ),
                    internal_navigation,
                    h
                ),
            Map: () =>
                demoShell(
                    mapView(
                        model.map,
                        (message) => GotMapMessage({ message }),
                        h
                    ),
                    internal_navigation,
                    h
                ),
            Journey: () =>
                demoShell(
                    journeyView(
                        model.journey,
                        (message) => GotJourneyMessage({ message }),
                        h
                    ),
                    internal_navigation,
                    h
                ),
            Isochrone: () =>
                demoShell(
                    isochroneView(
                        model.isochrone,
                        (message) => GotIsochroneMessage({ message }),
                        h
                    ),
                    internal_navigation,
                    h
                ),
            Storymap: () =>
                demoShell(
                    storymapView(
                        model.storymap,
                        (message) => GotStorymapMessage({ message }),
                        h
                    ),
                    internal_navigation,
                    h
                ),
            Weather: () =>
                demoShell(
                    weatherView(
                        model.weather,
                        (message) => GotWeatherMessage({ message }),
                        h
                    ),
                    internal_navigation,
                    h
                ),
            WeatherMap: () =>
                demoShell(
                    weatherMapView(
                        model.weatherMap,
                        (message) => GotWeatherMapMessage({ message }),
                        h
                    ),
                    internal_navigation,
                    h
                ),
            NotFound: ({ path }) =>
                h.main(
                    [h.Class("p-8")],
                    [
                        h.h1(
                            [h.Class("text-2xl font-semibold")],
                            ["Page not found"]
                        ),
                        h.p([h.Class("mt-2 text-muted-foreground")], [path]),
                        navigationControl(
                            indexHref(),
                            [
                                h.Class("mt-4 inline-block underline"),
                            ],
                            ["Back to map labs"],
                            internal_navigation,
                            h
                        ),
                    ]
                ),
        })
    )

export const view = Submodel.defineView<
    Model,
    Message,
    { readonly internalNavigation?: boolean }
>((model, { internalNavigation }, h) =>
    contentView(model, internalNavigation ?? false, h)
)
