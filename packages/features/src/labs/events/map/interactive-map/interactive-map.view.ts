import { Array, Equal, Match as M, Option, String } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    MAX_ROUTE_STUDIOS,
    SEARCH_INPUT_ID,
} from "./interactive-map.constant.ts"
import type { Message } from "./interactive-map.message.ts"
import {
    AcknowledgedLocationNotice,
    AddedArea,
    ClearedAreas,
    SelectedRouteProfile,
    SelectedMapStyle,
    ClickedStudio,
    ClosedHelp,
    DismissedGeolocate,
    DismissedStudio,
    OpenedHelp,
    RemovedArea,
    ToggledSuppressLocationNotice,
    UpdatedSearchQuery,
} from "./interactive-map.message.ts"
import type {
    GeolocateState,
    RouteProfile,
    LocationNoticeState,
    Model,
    RouteState,
} from "./interactive-map.model.ts"
import { mapHostId, mountMap } from "./interactive-map.mount.ts"
import {
    mapStyles,
    parseMapStyleId,
    type MapStyleId,
} from "./interactive-map.style.ts"
import {
    routeGroups,
    studiosInArea,
    studiosInAreas,
    type RouteGroup,
    type Studio,
} from "./interactive-map.studio.ts"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("min-h-full w-full flex bg-background text-foreground")],
        [
            sidebarView(model, toParentMessage, h),
            mapPaneView(model, toParentMessage, h),
            helpModalView(model.isHelpOpen, toParentMessage, h),
            locationNoticeView(
                model.locationNoticeState,
                model.suppressLocationNotice,
                toParentMessage,
                h
            ),
            geolocateOverlayView(model.geolocateState, toParentMessage, h),
        ]
    )

const findStudio = (model: Model, studioId: string): Option.Option<Studio> =>
    Array.findFirst(model.studios, ({ id }) => Equal.equals(id, studioId))

const findArea = (areaId: string): Option.Option<RouteGroup> =>
    Array.findFirst(routeGroups, ({ id }) => Equal.equals(id, areaId))

const areaColor = (areaId: string): string =>
    Option.match(findArea(areaId), {
        onNone: () => "#f84d4d",
        onSome: ({ color }) => color,
    })

const areaName = (areaId: string): string =>
    Option.match(findArea(areaId), {
        onNone: () => areaId,
        onSome: ({ name }) => name,
    })

const matchesQuery = (studio: Studio, query: string): boolean =>
    studio.name.toLowerCase().includes(query)

const formatDistance = (meters: number): string =>
    `${(meters / 1000).toFixed(1)} km`

const formatDuration = (seconds: number): string => {
    const totalMinutes = Math.round(seconds / 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return hours === 0 ? `${minutes} min` : `${hours} h ${minutes} min`
}

// The details panel sits over the sidebar rather than beside it, so the sidebar
// is a positioning context and the panel fills it.
const sidebarView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.aside(
        [
            h.Class(
                "w-80 shrink-0 border-r-(length:--surface-border-width) border-border bg-card flex flex-col h-full text-card-foreground relative"
            ),
        ],
        [
            sidebarListView(model, toParentMessage, h),
            studioDetailsView(model, toParentMessage, h),
        ]
    )

const sidebarListView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("flex flex-col h-full")],
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
                        ["Open Studios"]
                    ),
                    h.p(
                        [h.Class("text-xs text-muted-foreground mt-1")],
                        ["Tick an area to add its studios to your route."]
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
                        h.Placeholder("Find a studio…"),
                        h.AriaLabel("Find a studio"),
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
            routeSummaryView(model, toParentMessage, h),
            h.ul(
                [h.Class("flex-1 overflow-y-auto"), h.AriaLabel("Areas")],
                Array.map(routeGroups, (area) =>
                    areaListItemView(model, toParentMessage)(area, h)
                )
            ),
            Option.match(model.maybeUserLocation, {
                onNone: () => h.empty,
                onSome: ({ lng, lat }) =>
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-3 text-xs text-muted-foreground"
                            ),
                        ],
                        [`You are near ${lat.toFixed(3)}, ${lng.toFixed(3)}.`]
                    ),
            }),
        ]
    )
}

const routeSummaryView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const areaCount = model.selectedAreaIds.length
    const studioCount = studiosInAreas(model.selectedAreaIds).length

    return h.div(
        [
            h.Class(
                "px-5 py-3 border-b-(length:--surface-border-width) border-border space-y-2"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-2")],
                [
                    h.span(
                        [h.Class("text-xs font-medium text-foreground")],
                        [
                            areaCount === 0
                                ? "No areas selected"
                                : `${areaCount} ${areaCount === 1 ? "area" : "areas"} · ${studioCount} studios`,
                        ]
                    ),
                    areaCount === 0
                        ? h.empty
                        : h.button(
                              [
                                  h.Type("button"),
                                  h.OnClick(toParentMessage(ClearedAreas())),
                                  h.Class(
                                      "text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                                  ),
                              ],
                              ["Clear"]
                          ),
                ]
            ),
            routeStateView(model.routeState, h),
        ]
    )
}

// The original's profileSwitcher, kept on the map where that kind of control
// usually lives. Offset to the right of the navigation and geolocate controls,
// which mapbox stacks down the left edge.
const routeProfiles: ReadonlyArray<{
    readonly profile: RouteProfile
    readonly label: string
}> = [
    { profile: "driving", label: "Driving" },
    { profile: "cycling", label: "Cycling" },
    { profile: "walking", label: "Walking" },
]

const routeProfileView = <ParentMessage>(
    selected: RouteProfile,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "absolute top-3 left-14 z-10 flex rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card [box-shadow:var(--shadow-surface)] overflow-hidden"
            ),
            h.AriaLabel("Travel by"),
        ],
        Array.map(routeProfiles, ({ profile, label }) =>
            h.button(
                [
                    h.Key(profile),
                    h.Type("button"),
                    h.AriaPressed(profile === selected ? "true" : "false"),
                    h.OnClick(
                        toParentMessage(SelectedRouteProfile({ profile }))
                    ),
                    h.Class(
                        profile === selected
                            ? "px-3 py-2 text-xs font-medium bg-primary text-primary-foreground cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            : "px-3 py-2 text-xs text-card-foreground hover:bg-accent cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                    ),
                ],
                [label]
            )
        )
    )

const routeStateView = <ParentMessage>(
    routeState: RouteState,
    h: HtmlBuilder<ParentMessage>
): Html =>
    M.value(routeState).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            RouteIdle: () =>
                h.p(
                    [h.Class("text-xs text-muted-foreground")],
                    ["Select an area to see a route."]
                ),
            RouteLoading: () =>
                h.p(
                    [h.Class("text-xs text-muted-foreground")],
                    ["Working out a route…"]
                ),
            RouteLoaded: ({ distanceMeters, durationSeconds }) =>
                h.p(
                    [h.Class("text-xs text-muted-foreground")],
                    [
                        `${formatDistance(distanceMeters)} · ${formatDuration(durationSeconds)} driving`,
                    ]
                ),
            RouteFailed: ({ reason }) =>
                h.p([h.Class("text-xs text-destructive")], [reason]),
            RouteTooManyStudios: ({ count }) =>
                h.p(
                    [h.Class("text-xs text-muted-foreground")],
                    [
                        `Showing all ${count} studios. Untick an area to plan a route between up to ${MAX_ROUTE_STUDIOS} of them.`,
                    ]
                ),
        })
    )

const areaListItemView =
    <ParentMessage>(
        model: Model,
        toParentMessage: (message: Message) => ParentMessage
    ) =>
    (area: RouteGroup, h: HtmlBuilder<ParentMessage>): Html => {
        const isSelected = Array.contains(model.selectedAreaIds, area.id)
        const areaStudios = studiosInArea(area.id)
        const trimmedQuery = String.trim(model.searchQuery).toLowerCase()
        const isFiltering = !String.isEmpty(trimmedQuery)
        const matchingStudios = isFiltering
            ? Array.filter(areaStudios, (studio) =>
                  matchesQuery(studio, trimmedQuery)
              )
            : areaStudios

        // A search reveals the studios it matched even in areas that are not in
        // the route, otherwise searching a place you have not ticked looks like
        // it found nothing.
        const isExpanded = isSelected || isFiltering

        if (isFiltering && matchingStudios.length === 0) {
            return h.empty
        }

        return h.li(
            [
                h.Class(
                    "border-b-(length:--surface-border-width) border-border/50"
                ),
                h.Key(area.id),
            ],
            [
                h.div(
                    [h.Class("flex items-center gap-2 px-5 py-2.5")],
                    [
                        h.input([
                            h.Type("checkbox"),
                            h.Checked(isSelected),
                            h.AriaLabel(
                                isSelected
                                    ? `Remove ${area.name} from your route`
                                    : `Add ${area.name} to your route`
                            ),
                            h.Class(
                                "h-4 w-4 rounded text-primary focus:ring-ring cursor-pointer"
                            ),
                            h.OnClick(
                                toParentMessage(
                                    isSelected
                                        ? RemovedArea({ areaId: area.id })
                                        : AddedArea({ areaId: area.id })
                                )
                            ),
                        ]),
                        h.span(
                            [
                                h.Class("w-2.5 h-2.5 rounded-full shrink-0"),
                                h.Style({ backgroundColor: area.color }),
                                h.AriaHidden(true),
                            ],
                            []
                        ),
                        h.span(
                            [
                                h.Class(
                                    isSelected
                                        ? "flex-1 text-sm font-medium text-foreground"
                                        : "flex-1 text-sm text-foreground"
                                ),
                            ],
                            [area.name]
                        ),
                        h.span(
                            [h.Class("text-xs text-muted-foreground")],
                            [`${areaStudios.length}`]
                        ),
                    ]
                ),
                isExpanded
                    ? h.ul(
                          [
                              h.Class("pb-2"),
                              h.AriaLabel(`Studios in ${area.name}`),
                          ],
                          Array.map(matchingStudios, (studio) =>
                              studioListItemView(model, toParentMessage)(
                                  studio,
                                  h
                              )
                          )
                      )
                    : h.empty,
            ]
        )
    }

const studioListItemView =
    <ParentMessage>(
        model: Model,
        toParentMessage: (message: Message) => ParentMessage
    ) =>
    (studio: Studio, h: HtmlBuilder<ParentMessage>): Html => {
        const isSelected = Option.exists(
            model.maybeSelectedStudioId,
            Equal.equals(studio.id)
        )

        return h.li(
            [h.Key(studio.id)],
            [
                h.button(
                    [
                        h.Type("button"),
                        h.AriaPressed(isSelected ? "true" : "false"),
                        h.OnClick(
                            toParentMessage(
                                ClickedStudio({ studioId: studio.id })
                            )
                        ),
                        h.Class(
                            isSelected
                                ? "w-full text-left pl-12 pr-5 py-1.5 text-sm cursor-pointer bg-accent text-accent-foreground"
                                : "w-full text-left pl-12 pr-5 py-1.5 text-sm cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        ),
                    ],
                    [studio.name]
                ),
            ]
        )
    }

// Overlays the sidebar rather than replacing it, so closing it returns to the
// list exactly as it was — including which areas are expanded.
const studioDetailsView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(
        Option.flatMap(model.maybeSelectedStudioId, (studioId) =>
            findStudio(model, studioId)
        ),
        {
            onNone: () => h.empty,
            onSome: (studio) => {
                const isAreaSelected = Array.contains(
                    model.selectedAreaIds,
                    studio.routeGroupId
                )

                return h.keyed("div")(
                    `studio-details-${studio.id}`,
                    [
                        h.Class(
                            "absolute inset-0 z-10 bg-card flex flex-col overflow-y-auto"
                        ),
                        h.AriaLabel(`${studio.name} details`),
                    ],
                    [
                        h.div(
                            [
                                h.Class(
                                    "px-5 py-4 border-b-(length:--surface-border-width) border-border flex items-start justify-between gap-2"
                                ),
                            ],
                            [
                                h.div(
                                    [h.Class("flex items-start gap-3")],
                                    [
                                        Option.match(
                                            Option.fromNullishOr(
                                                studio.profileImage
                                            ),
                                            {
                                                onNone: () => h.empty,
                                                onSome: (src) =>
                                                    h.img([
                                                        h.Attribute("src", src),
                                                        h.Attribute(
                                                            "alt",
                                                            `${studio.name} portrait`
                                                        ),
                                                        h.Attribute(
                                                            "loading",
                                                            "lazy"
                                                        ),
                                                        h.Class(
                                                            "w-11 h-11 rounded-full object-cover shrink-0 bg-muted"
                                                        ),
                                                    ]),
                                            }
                                        ),
                                        h.div(
                                            [],
                                            [
                                                h.h2(
                                                    [
                                                        h.Class(
                                                            "text-base font-semibold text-foreground"
                                                        ),
                                                    ],
                                                    [studio.name]
                                                ),
                                                h.div(
                                                    [
                                                        h.Class(
                                                            "flex items-center gap-2 mt-1"
                                                        ),
                                                    ],
                                                    [
                                                        h.span(
                                                            [
                                                                h.Class(
                                                                    "w-2 h-2 rounded-full shrink-0"
                                                                ),
                                                                h.Style({
                                                                    backgroundColor:
                                                                        areaColor(
                                                                            studio.routeGroupId
                                                                        ),
                                                                }),
                                                                h.AriaHidden(
                                                                    true
                                                                ),
                                                            ],
                                                            []
                                                        ),
                                                        h.span(
                                                            [
                                                                h.Class(
                                                                    "text-xs text-muted-foreground"
                                                                ),
                                                            ],
                                                            [
                                                                areaName(
                                                                    studio.routeGroupId
                                                                ),
                                                            ]
                                                        ),
                                                    ]
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.AriaLabel("Back to the studio list"),
                                        h.OnClick(
                                            toParentMessage(DismissedStudio())
                                        ),
                                        h.Class(
                                            "text-muted-foreground hover:text-foreground cursor-pointer text-lg leading-none"
                                        ),
                                    ],
                                    ["×"]
                                ),
                            ]
                        ),
                        studioImagesView(studio, h),
                        Option.match(
                            Option.fromNullishOr(studio.directoryText),
                            {
                                onNone: () => h.empty,
                                onSome: (text) =>
                                    h.p(
                                        [
                                            h.Class(
                                                "px-5 pt-4 text-sm text-foreground"
                                            ),
                                        ],
                                        [text]
                                    ),
                            }
                        ),
                        h.dl(
                            [h.Class("px-5 py-4 space-y-3 text-sm")],
                            [
                                detailRowView(
                                    "Route",
                                    areaName(studio.routeGroupId),
                                    h
                                ),
                                optionalRowView("Address", studio.address, h),
                                optionalRowView(
                                    "Directions",
                                    studio.directions,
                                    h
                                ),
                                optionalLinkRowView(
                                    "Email",
                                    studio.email,
                                    (email) => `mailto:${email}`,
                                    h
                                ),
                                optionalLinkRowView(
                                    "Phone",
                                    studio.phone,
                                    (phone) =>
                                        `tel:${phone.replace(/[^+\d]/g, "")}`,
                                    h
                                ),
                                optionalLinkRowView(
                                    "Website",
                                    studio.website,
                                    (website) =>
                                        website.startsWith("http")
                                            ? website
                                            : `https://${website}`,
                                    h
                                ),
                                optionalRowView(
                                    "Social",
                                    studio.socialMedia,
                                    h
                                ),
                                detailRowView(
                                    "Coordinates",
                                    `${studio.lat.toFixed(5)}, ${studio.lng.toFixed(5)}`,
                                    h
                                ),
                                linkRowView(
                                    "Street view",
                                    "Open in Google Maps",
                                    streetViewHref(studio),
                                    h
                                ),
                                detailRowView(
                                    "In your route",
                                    isAreaSelected ? "Yes" : "No",
                                    h
                                ),
                            ]
                        ),
                        h.div(
                            [h.Class("px-5 pb-5 mt-auto")],
                            [
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.OnClick(
                                            toParentMessage(
                                                isAreaSelected
                                                    ? RemovedArea({
                                                          areaId: studio.routeGroupId,
                                                      })
                                                    : AddedArea({
                                                          areaId: studio.routeGroupId,
                                                      })
                                            )
                                        ),
                                        h.Class(
                                            isAreaSelected
                                                ? "w-full px-3 py-2 text-sm font-medium rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border text-foreground hover:bg-accent cursor-pointer [box-shadow:var(--shadow-control)]"
                                                : "w-full px-3 py-2 text-sm font-medium rounded-[var(--radius-control)] bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                        ),
                                    ],
                                    [
                                        isAreaSelected
                                            ? `Remove ${areaName(studio.routeGroupId)} from route`
                                            : `Add ${areaName(studio.routeGroupId)} to route`,
                                    ]
                                ),
                                h.p(
                                    [
                                        h.Class(
                                            "text-xs text-muted-foreground mt-2"
                                        ),
                                    ],
                                    [
                                        "Studios join and leave the route with their area.",
                                    ]
                                ),
                            ]
                        ),
                    ]
                )
            },
        }
    )

// The original showed each studio as a slideshow of up to nine pictures. Here
// the first is the header and the rest are a strip beneath it, so the panel
// stays readable at sidebar width.
const studioImagesView = <ParentMessage>(
    studio: Studio,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const images = studio.images ?? []
    const [first, ...rest] = images

    if (first === undefined) {
        return h.empty
    }

    return h.div(
        [h.Class("px-5 pt-4 space-y-2")],
        [
            h.img([
                h.Attribute("src", first),
                h.Attribute("alt", `${studio.name}`),
                h.Attribute("loading", "lazy"),
                h.Class(
                    "w-full aspect-[8/5] object-cover rounded-[var(--radius-surface)] bg-muted"
                ),
            ]),
            rest.length === 0
                ? h.empty
                : h.div(
                      [h.Class("grid grid-cols-2 gap-2")],
                      Array.map(rest, (src, index) =>
                          h.img([
                              h.Key(src),
                              h.Attribute("src", src),
                              h.Attribute("alt", `${studio.name} ${index + 2}`),
                              h.Attribute("loading", "lazy"),
                              h.Class(
                                  "w-full aspect-[8/5] object-cover rounded-[var(--radius-surface)] bg-muted"
                              ),
                          ])
                      )
                  ),
        ]
    )
}

// Mapbox has no street-level imagery of its own, so this leaves for Google
// Maps rather than embedding anything: the coordinates are already here, and a
// plain link needs no key and no second SDK.
const streetViewHref = ({ lat, lng }: Studio): string =>
    `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`

const linkRowView = <ParentMessage>(
    label: string,
    text: string,
    href: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex justify-between gap-3")],
        [
            h.dt([h.Class("text-muted-foreground")], [label]),
            h.dd(
                [h.Class("text-right")],
                [
                    h.a(
                        [
                            h.Href(href),
                            h.Target("_blank"),
                            h.Rel("noopener noreferrer"),
                            h.Class("text-primary underline"),
                        ],
                        [text]
                    ),
                ]
            ),
        ]
    )

const optionalRowView = <ParentMessage>(
    label: string,
    maybeValue: string | undefined,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(Option.fromNullishOr(maybeValue), {
        onNone: () => h.empty,
        onSome: (value) => detailRowView(label, value, h),
    })

const optionalLinkRowView = <ParentMessage>(
    label: string,
    maybeValue: string | undefined,
    toHref: (value: string) => string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(Option.fromNullishOr(maybeValue), {
        onNone: () => h.empty,
        onSome: (value) =>
            h.div(
                [h.Class("flex justify-between gap-3")],
                [
                    h.dt([h.Class("text-muted-foreground")], [label]),
                    h.dd(
                        [h.Class("text-right")],
                        [
                            h.a(
                                [
                                    h.Href(toHref(value)),
                                    h.Class("text-primary underline break-all"),
                                ],
                                [value]
                            ),
                        ]
                    ),
                ]
            ),
    })

const detailRowView = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex justify-between gap-3")],
        [
            h.dt([h.Class("text-muted-foreground")], [label]),
            h.dd([h.Class("text-foreground text-right")], [value]),
        ]
    )

const mapPaneView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
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
            routeProfileView(model.routeProfile, toParentMessage, h),
            mapStyleView(model.mapStyleId, toParentMessage, h),
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(toParentMessage(OpenedHelp())),
                    h.Class(
                        "absolute top-3 right-3 px-3 py-2 text-sm font-medium rounded-[var(--radius-surface)] bg-card text-card-foreground border-(length:--surface-border-width) border-border [box-shadow:var(--shadow-surface)] hover:bg-accent cursor-pointer"
                    ),
                ],
                ["Help"]
            ),
            legendView(model, toParentMessage, h),
        ]
    )

const legendView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm rounded-[var(--radius-surface)] [box-shadow:var(--shadow-surface)] px-3 py-2 border-(length:--surface-border-width) border-border space-y-1"
            ),
            h.AriaLabel("Areas"),
        ],
        Array.map(routeGroups, (area) => {
            const isSelected = Array.contains(model.selectedAreaIds, area.id)

            return h.button(
                [
                    h.Key(area.id),
                    h.Type("button"),
                    h.AriaPressed(isSelected ? "true" : "false"),
                    h.OnClick(
                        toParentMessage(
                            isSelected
                                ? RemovedArea({ areaId: area.id })
                                : AddedArea({ areaId: area.id })
                        )
                    ),
                    h.Class(
                        "flex w-full items-center gap-2 text-xs cursor-pointer"
                    ),
                ],
                [
                    h.span(
                        [
                            h.Class("w-2.5 h-2.5 rounded-full shrink-0"),
                            h.Style({ backgroundColor: area.color }),
                            h.AriaHidden(true),
                        ],
                        []
                    ),
                    h.span(
                        [
                            h.Class(
                                isSelected
                                    ? "text-card-foreground font-medium"
                                    : "text-muted-foreground"
                            ),
                        ],
                        [area.name]
                    ),
                ]
            )
        })
    )

const mapStyleView = <ParentMessage>(
    selected: MapStyleId,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.select(
        [
            h.Value(selected),
            h.AriaLabel("Map style"),
            h.Class(
                "absolute top-16 right-3 z-10 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)] px-2 py-1.5 text-xs cursor-pointer"
            ),
            // A <select> hands back a string, so an unrecognised value leaves
            // the style alone rather than being forced into the union.
            h.OnInput((value) =>
                toParentMessage(
                    Option.match(parseMapStyleId(value), {
                        onNone: () => SelectedMapStyle({ styleId: selected }),
                        onSome: (styleId) => SelectedMapStyle({ styleId }),
                    })
                )
            ),
        ],
        Array.map(mapStyles, ({ id, label }) =>
            h.option([h.Key(id), h.Value(id)], [label])
        )
    )

const mapErrorBannerView = <ParentMessage>(
    maybeReason: Option.Option<string>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(maybeReason, {
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

const modalShellView = <ParentMessage>(
    key: string,
    content: Html,
    label: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("div")(
        key,
        [
            h.Class(
                "fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
            ),
            h.AriaLabel(label),
        ],
        [content]
    )

const helpModalView = <ParentMessage>(
    isOpen: boolean,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    isOpen
        ? modalShellView(
              "help-modal",
              h.article(
                  [
                      h.Class(
                          "bg-card text-card-foreground rounded-[var(--radius-surface)] [box-shadow:var(--shadow-overlay)] max-w-lg w-full mx-4 px-6 py-5 border-(length:--surface-border-width) border-border"
                      ),
                  ],
                  [
                      h.h2(
                          [h.Class("text-base font-semibold mb-3")],
                          ["Using the map"]
                      ),
                      h.ol(
                          [
                              h.Class(
                                  "list-decimal pl-5 space-y-2 text-sm text-muted-foreground"
                              ),
                          ],
                          [
                              h.li(
                                  [],
                                  [
                                      "Tick an area to add every studio in it to your route. The area opens to show what it holds.",
                                  ]
                              ),
                              h.li(
                                  [],
                                  [
                                      "Untick it and it collapses back to a single row, and its studios leave the route.",
                                  ]
                              ),
                              h.li(
                                  [],
                                  [
                                      "Click a studio, in the list or on the map, to read its details.",
                                  ]
                              ),
                              h.li(
                                  [],
                                  [
                                      "Your selection is saved in this browser, so it is still here when you come back.",
                                  ]
                              ),
                              h.li(
                                  [],
                                  [
                                      `A route can hold at most ${MAX_ROUTE_STUDIOS} studios, so not every area fits at once.`,
                                  ]
                              ),
                          ]
                      ),
                      h.button(
                          [
                              h.Type("button"),
                              h.OnClick(toParentMessage(ClosedHelp())),
                              h.Class(
                                  "mt-5 px-4 py-2 text-sm font-medium rounded-[var(--radius-control)] bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                              ),
                          ],
                          ["Close"]
                      ),
                  ]
              ),
              "Help",
              h
          )
        : h.empty

const locationNoticeView = <ParentMessage>(
    state: LocationNoticeState,
    isSuppressed: boolean,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    M.value(state).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            LocationNoticeChecking: () => h.empty,
            LocationNoticeHidden: () => h.empty,
            LocationNoticeVisible: () =>
                modalShellView(
                    "location-notice",
                    h.article(
                        [
                            h.Class(
                                "bg-card text-card-foreground rounded-[var(--radius-surface)] [box-shadow:var(--shadow-overlay)] max-w-sm w-full mx-4 px-6 py-5 border-(length:--surface-border-width) border-border"
                            ),
                        ],
                        [
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "To find your own location on the map you will need Location Services enabled in your operating system preferences.",
                                ]
                            ),
                            h.label(
                                [
                                    h.Class(
                                        "mt-4 flex items-center gap-2 text-sm cursor-pointer"
                                    ),
                                ],
                                [
                                    h.input([
                                        h.Type("checkbox"),
                                        h.Checked(isSuppressed),
                                        h.Class(
                                            "h-4 w-4 rounded text-primary focus:ring-ring"
                                        ),
                                        h.OnClick(
                                            toParentMessage(
                                                ToggledSuppressLocationNotice({
                                                    value: !isSuppressed,
                                                })
                                            )
                                        ),
                                    ]),
                                    h.span([], ["Do not show again"]),
                                ]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(
                                        toParentMessage(
                                            AcknowledgedLocationNotice()
                                        )
                                    ),
                                    h.Class(
                                        "mt-4 px-4 py-2 text-sm font-medium rounded-[var(--radius-control)] bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                    ),
                                ],
                                ["OK"]
                            ),
                        ]
                    ),
                    "Location services",
                    h
                ),
        })
    )

const geolocateOverlayView = <ParentMessage>(
    state: GeolocateState,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    M.value(state).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            GeolocateIdle: () => h.empty,
            GeolocateFailed: ({ reason }) =>
                modalShellView(
                    "geolocate-failed",
                    h.article(
                        [
                            h.Class(
                                "bg-card text-card-foreground rounded-[var(--radius-surface)] [box-shadow:var(--shadow-overlay)] max-w-sm w-full mx-4 px-6 py-5 text-center border-(length:--surface-border-width) border-border"
                            ),
                        ],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "text-base font-semibold mb-1 text-destructive"
                                    ),
                                ],
                                ["Could not locate you"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [reason]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(
                                        toParentMessage(DismissedGeolocate())
                                    ),
                                    h.Class(
                                        "mt-4 px-4 py-2 text-sm font-medium rounded-[var(--radius-control)] bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                    ),
                                ],
                                ["Dismiss"]
                            ),
                        ]
                    ),
                    "Geolocation",
                    h
                ),
        })
    )
