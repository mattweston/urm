import { Array, Equal, Match as M, Option, String } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Message } from "./map.message.ts"
import {
    ClickedFindMe,
    ClickedLocation,
    DismissedGeolocate,
    UpdatedSearchQuery,
} from "./map.message.ts"
import { mapHostId, mountMap } from "./map.mount.ts"
import type { Location } from "./map.location.ts"
import type { Bounds, GeolocateState, Model } from "./map.model.ts"
import { SEARCH_INPUT_ID } from "./map.constant.ts"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("min-h-full w-full flex bg-background text-foreground")],
        [
            sidebarView(model, toParentMessage, h),
            mapPaneView(model, toParentMessage, h),
            geolocateOverlayView(model.geolocateState, toParentMessage, h),
        ]
    )
}

const filterLocations = (
    locations: ReadonlyArray<Location>,
    query: string
): ReadonlyArray<Location> => {
    const trimmedQuery = String.trim(query).toLowerCase()

    if (String.isEmpty(trimmedQuery)) {
        return locations
    }

    return Array.filter(
        locations,
        (location) =>
            location.name.toLowerCase().includes(trimmedQuery) ||
            location.region.toLowerCase().includes(trimmedQuery)
    )
}

const sidebarView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const visibleLocations = filterLocations(model.locations, model.searchQuery)
    const isLocating = model.geolocateState._tag === "GeolocateLocating"

    return h.aside(
        [
            h.Class(
                "w-80 shrink-0 border-r-(length:--surface-border-width) border-border bg-card flex flex-col h-full text-card-foreground"
            ),
        ],
        [
            h.header(
                [
                    h.Class(
                        "px-5 py-4 border-b-(length:--surface-border-width) border-border"
                    ),
                ],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-lg font-semibold tracking-tight text-foreground"
                            ),
                        ],
                        ["Foldkit Map"]
                    ),
                    h.p(
                        [h.Class("text-xs text-muted-foreground mt-1")],
                        ["Pan, zoom, and click a marker."]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "px-5 py-3 border-b-(length:--surface-border-width) border-border"
                    ),
                ],
                [
                    h.input([
                        h.Id(SEARCH_INPUT_ID),
                        h.Type("search"),
                        h.Placeholder("Filter locations"),
                        h.AriaLabel("Filter locations"),
                        h.Class(
                            "w-full px-3 py-2 text-sm rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                        ),
                        h.Value(model.searchQuery),
                        h.OnInput((value) =>
                            toParentMessage(UpdatedSearchQuery({ value }))
                        ),
                    ]),
                ]
            ),
            h.ul(
                [h.Class("flex-1 overflow-y-auto"), h.AriaLabel("Locations")],
                Array.match(visibleLocations, {
                    onEmpty: () => [
                        emptySidebarView<ParentMessage>(model.searchQuery, h),
                    ],
                    onNonEmpty: (locations) =>
                        Array.map(locations, (location) =>
                            locationListItemView(
                                model.maybeSelectedLocationId,
                                toParentMessage
                            )(location, h)
                        ),
                })
            ),
            h.div(
                [
                    h.Class(
                        "border-t-(length:--surface-border-width) border-border px-5 py-3 space-y-2"
                    ),
                ],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(toParentMessage(ClickedFindMe())),
                            h.Disabled(isLocating),
                            h.Class(
                                "w-full px-3 py-2 text-sm font-medium rounded-[var(--radius-control)] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        [isLocating ? "Locating…" : "Find my location"]
                    ),
                    Option.match(model.maybeUserLocation, {
                        onNone: () => h.empty,
                        onSome: ({ lng, lat }) =>
                            h.p(
                                [h.Class("text-xs text-muted-foreground")],
                                [
                                    `You are near ${lat.toFixed(3)}, ${lng.toFixed(3)}.`,
                                ]
                            ),
                    }),
                ]
            ),
        ]
    )
}

const emptySidebarView = <ParentMessage>(
    searchQuery: string,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const trimmedSearchQuery = String.trim(searchQuery)

    return h.li(
        [h.Class("px-5 py-6 text-sm text-muted-foreground")],
        [
            String.isEmpty(trimmedSearchQuery)
                ? "No locations available."
                : `No locations match "${trimmedSearchQuery}".`,
        ]
    )
}

const locationListItemView =
    <ParentMessage>(
        maybeSelectedLocationId: Option.Option<string>,
        toParentMessage: (message: Message) => ParentMessage
    ) =>
    (location: Location, h: HtmlBuilder<ParentMessage>): Html => {
        const isSelected = Option.exists(
            maybeSelectedLocationId,
            Equal.equals(location.id)
        )

        return h.li(
            [],
            [
                h.button(
                    [
                        h.Type("button"),
                        h.AriaPressed(isSelected ? "true" : "false"),
                        h.OnClick(
                            toParentMessage(
                                ClickedLocation({ locationId: location.id })
                            )
                        ),
                        h.Class(
                            isSelected
                                ? "w-full text-left px-5 py-3 cursor-pointer bg-accent border-l-2 border-primary text-accent-foreground [box-shadow:var(--shadow-control)]"
                                : "w-full text-left px-5 py-3 cursor-pointer hover:bg-accent border-l-2 border-transparent [box-shadow:var(--shadow-control)]"
                        ),
                    ],
                    [
                        h.div(
                            [h.Class("text-sm font-medium text-foreground")],
                            [location.name]
                        ),
                        h.div(
                            [h.Class("text-xs text-muted-foreground mt-0.5")],
                            [location.region]
                        ),
                    ]
                ),
            ]
        )
    }

const mapPaneView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.main(
        [h.Class("flex-1 relative min-w-0")],
        [
            h.div(
                [
                    h.Class("h-full w-full min-h-[calc(100vh-4.25rem)]"),
                    h.AriaLabel("Map"),
                    h.OnMount(
                        Mount.mapMessage(mountMap(mapHostId), toParentMessage)
                    ),
                ],
                []
            ),
            mapErrorBannerView<ParentMessage>(model.maybeMapError, h),
            boundsBadgeView<ParentMessage>(model.maybeBounds, h),
        ]
    )
}

const mapErrorBannerView = <ParentMessage>(
    maybeReason: Option.Option<string>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return Option.match(maybeReason, {
        onNone: () => h.empty,
        onSome: (reason) =>
            h.div(
                [
                    h.AriaLabel("Map failed to load"),
                    h.Class(
                        "absolute top-3 left-1/2 -translate-x-1/2 max-w-md bg-card border-(length:--surface-border-width) border-border text-card-foreground rounded-[var(--radius-surface)] [box-shadow:var(--shadow-surface)] px-4 py-3 text-sm"
                    ),
                ],
                [
                    h.div(
                        [h.Class("font-semibold mb-0.5")],
                        ["Could not load the map."]
                    ),
                    h.div([h.Class("text-xs text-muted-foreground")], [reason]),
                ]
            ),
    })
}

const boundsBadgeView = <ParentMessage>(
    maybeBounds: Option.Option<Bounds>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return Option.match(maybeBounds, {
        onNone: () => h.empty,
        onSome: (bounds) =>
            h.div(
                [
                    h.Class(
                        "absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm rounded-[var(--radius-surface)] [box-shadow:var(--shadow-surface)] px-3 py-2 text-xs font-mono text-card-foreground border-(length:--surface-border-width) border-border"
                    ),
                ],
                [
                    h.div([], [`N ${bounds.north.toFixed(2)}`]),
                    h.div([], [`S ${bounds.south.toFixed(2)}`]),
                    h.div([], [`E ${bounds.east.toFixed(2)}`]),
                    h.div([], [`W ${bounds.west.toFixed(2)}`]),
                ]
            ),
    })
}

const geolocateOverlayView = <ParentMessage>(
    state: GeolocateState,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return M.value(state).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            GeolocateIdle: () => h.empty,
            GeolocateLocating: () =>
                geolocateOverlayShellView(
                    geolocateLocatingContentView<ParentMessage>(h),
                    h
                ),
            GeolocateFailed: ({ reason }) =>
                geolocateOverlayShellView(
                    geolocateFailedContentView(reason, toParentMessage, h),
                    h
                ),
        })
    )
}

const geolocateOverlayShellView = <ParentMessage>(
    content: Html,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("div")(
        "Geolocate()-overlay",
        [
            h.Class(
                "fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
            ),
            h.AriaLabel("Geolocation"),
        ],
        [content]
    )
}

const geolocateLocatingContentView = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("article")(
        "Geolocate()-locating",
        [
            h.Class(
                "bg-card text-card-foreground rounded-[var(--radius-surface)] [box-shadow:var(--shadow-overlay)] max-w-sm w-full mx-4 px-6 py-5 text-center border-(length:--surface-border-width) border-border"
            ),
        ],
        [
            h.h2([h.Class("text-base font-semibold mb-1")], ["Locating you…"]),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                ["Asking your browser for permission to use your location."]
            ),
            spinnerView<ParentMessage>(h),
        ]
    )
}

const geolocateFailedContentView = <ParentMessage>(
    reason: string,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("article")(
        "Geolocate()-failed",
        [
            h.Class(
                "bg-card text-card-foreground rounded-[var(--radius-surface)] [box-shadow:var(--shadow-overlay)] max-w-sm w-full mx-4 px-6 py-5 text-center border-(length:--surface-border-width) border-border"
            ),
        ],
        [
            h.h2(
                [h.Class("text-base font-semibold mb-1 text-destructive")],
                ["Could not locate you"]
            ),
            h.p([h.Class("text-sm text-muted-foreground")], [reason]),
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(toParentMessage(DismissedGeolocate())),
                    h.Class(
                        "mt-4 px-4 py-2 text-sm font-medium rounded-[var(--radius-control)] bg-primary text-primary-foreground hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                    ),
                ],
                ["Dismiss"]
            ),
        ]
    )
}

const spinnerView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    return h.div(
        [h.Class("flex justify-center mt-4")],
        [
            h.span(
                [
                    h.Class(
                        "inline-block w-6 h-6 border-2 border-border border-t-primary rounded-full motion-safe:animate-spin"
                    ),
                    h.AriaLabel("Loading"),
                ],
                []
            ),
        ]
    )
}
