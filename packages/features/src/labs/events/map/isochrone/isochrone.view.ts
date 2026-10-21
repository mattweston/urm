import { Array, Match as M, Option } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    studios,
    type Studio,
} from "../interactive-map/interactive-map.studio.ts"
import { isPointInPolygon } from "./isochrone.geo.ts"
import { isochroneHostId, mountMap } from "./isochrone.mount.ts"
import type { Message } from "./isochrone.message.ts"
import { SelectedProfile } from "./isochrone.message.ts"
import type {
    Band,
    BandsState,
    Model,
    TravelProfile,
} from "./isochrone.model.ts"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("relative w-full bg-background text-foreground")],
        [
            h.div(
                [
                    h.Class(
                        "h-[calc(100vh-4.25rem)] w-full relative overflow-hidden"
                    ),
                    h.AriaLabel("Catchment map"),
                    h.OnMount(
                        Mount.mapMessage(
                            mountMap(isochroneHostId),
                            toParentMessage
                        )
                    ),
                ],
                []
            ),
            panelView(model, toParentMessage, h),
            mapErrorBannerView<ParentMessage>(model.maybeMapError, h),
        ]
    )

const originName = (studioId: string): string =>
    Option.match(
        Array.findFirst(studios, (studio) => studio.id === studioId),
        {
            onNone: () => "a studio",
            onSome: ({ name }) => name,
        }
    )

// Which studios a band reaches is worked out here rather than stored: the
// polygons are already in the Model, and 39 points against three rings is
// cheaper than keeping a derived list in step with them.
const studiosWithin = (band: Band): ReadonlyArray<Studio> =>
    Array.filter(studios, (studio) =>
        isPointInPolygon([studio.lng, studio.lat], band.rings)
    )

const profiles: ReadonlyArray<{
    readonly profile: TravelProfile
    readonly label: string
}> = [
    { profile: "driving", label: "Driving" },
    { profile: "cycling", label: "Cycling" },
    { profile: "walking", label: "Walking" },
]

const panelView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "absolute top-4 right-4 z-10 w-80 bg-card/95 backdrop-blur-sm border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] px-5 py-4 text-card-foreground"
            ),
        ],
        [
            h.h1(
                [h.Class("text-lg font-semibold tracking-tight")],
                ["How far can you get?"]
            ),
            h.p(
                [h.Class("text-xs text-muted-foreground mt-1")],
                [
                    `Travel time from ${originName(model.originStudioId)}. Click any marker to measure from there instead.`,
                ]
            ),
            profileView(model.profile, toParentMessage, h),
            bandsView(model.bandsState, h),
        ]
    )

const profileView = <ParentMessage>(
    selected: TravelProfile,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "mt-4 flex rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border overflow-hidden"
            ),
            h.AriaLabel("Travel by"),
        ],
        Array.map(profiles, ({ profile, label }) =>
            h.button(
                [
                    h.Key(profile),
                    h.Type("button"),
                    h.AriaPressed(profile === selected ? "true" : "false"),
                    h.OnClick(toParentMessage(SelectedProfile({ profile }))),
                    h.Class(
                        profile === selected
                            ? "flex-1 px-2 py-1.5 text-xs font-medium bg-primary text-primary-foreground cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            : "flex-1 px-2 py-1.5 text-xs text-card-foreground hover:bg-accent cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                    ),
                ],
                [label]
            )
        )
    )

const bandsView = <ParentMessage>(
    state: BandsState,
    h: HtmlBuilder<ParentMessage>
): Html =>
    M.value(state).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            BandsLoading: () =>
                h.p(
                    [h.Class("mt-4 text-xs text-muted-foreground")],
                    ["Working out the catchment…"]
                ),
            BandsFailed: ({ reason }) =>
                h.p([h.Class("mt-4 text-xs text-destructive")], [reason]),
            BandsReady: ({ bands }) =>
                h.ul(
                    [h.Class("mt-4 space-y-2"), h.AriaLabel("Travel bands")],
                    // Smallest first here, the reverse of the paint order: a
                    // legend reads outwards from the origin.
                    Array.map(Array.reverse(bands), (band) =>
                        bandRowView(band, h)
                    )
                ),
        })
    )

const bandRowView = <ParentMessage>(
    band: Band,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const reached = studiosWithin(band)

    return h.li(
        [h.Key(`${band.minutes}`), h.Class("flex items-center gap-2 text-xs")],
        [
            h.span(
                [
                    h.Class("w-2.5 h-2.5 rounded-full shrink-0"),
                    h.Style({ backgroundColor: band.color }),
                    h.AriaHidden(true),
                ],
                []
            ),
            h.span(
                [h.Class("text-card-foreground")],
                [`${band.minutes} minutes`]
            ),
            h.span(
                [h.Class("ml-auto text-muted-foreground")],
                [
                    `${reached.length} ${reached.length === 1 ? "studio" : "studios"}`,
                ]
            ),
        ]
    )
}

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
                        "absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-md bg-card border-(length:--surface-border-width) border-border text-card-foreground rounded-[var(--radius-surface)] [box-shadow:var(--shadow-surface)] px-4 py-3 text-sm"
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
