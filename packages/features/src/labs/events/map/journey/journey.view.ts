import { Match as M, Option } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { journeyStudios, journeySubtitle, journeyTitle } from "./journey.leg.ts"
import type { Message } from "./journey.message.ts"
import { ClickedPlay, ClickedReset } from "./journey.message.ts"
import type { JourneyState, Model } from "./journey.model.ts"
import { journeyHostId, mountMap } from "./journey.mount.ts"

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
                    h.AriaLabel("Journey map"),
                    h.OnMount(
                        Mount.mapMessage(
                            mountMap(journeyHostId),
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

const formatDistance = (meters: number): string =>
    `${(meters / 1000).toFixed(1)} km`

const formatDuration = (seconds: number): string => {
    const totalMinutes = Math.round(seconds / 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return hours === 0 ? `${minutes} min` : `${hours} h ${minutes} min`
}

const panelView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "absolute top-4 left-4 z-10 w-80 bg-card/90 backdrop-blur-sm border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] px-5 py-4 text-card-foreground"
            ),
        ],
        [
            h.h1(
                [h.Class("text-lg font-semibold tracking-tight")],
                [journeyTitle]
            ),
            h.p(
                [h.Class("text-xs text-muted-foreground mt-1")],
                [journeySubtitle]
            ),
            h.p(
                [h.Class("text-xs text-muted-foreground mt-2")],
                [`${journeyStudios.length} stops`]
            ),
            journeyStateView(model.journeyState, h),
            controlsView(model.journeyState, toParentMessage, h),
        ]
    )

const journeyStateView = <ParentMessage>(
    state: JourneyState,
    h: HtmlBuilder<ParentMessage>
): Html =>
    M.value(state).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            JourneyLoading: () =>
                h.p(
                    [h.Class("mt-3 text-xs text-muted-foreground")],
                    ["Working out the drive…"]
                ),
            JourneyFailed: ({ reason }) =>
                h.p([h.Class("mt-3 text-xs text-destructive")], [reason]),
            JourneyReady: ({ distanceMeters, durationSeconds }) =>
                summaryView(distanceMeters, durationSeconds, h),
            JourneyPlaying: ({ distanceMeters, durationSeconds }) =>
                summaryView(distanceMeters, durationSeconds, h),
            JourneyFinished: ({ distanceMeters, durationSeconds }) =>
                summaryView(distanceMeters, durationSeconds, h),
        })
    )

const summaryView = <ParentMessage>(
    distanceMeters: number,
    durationSeconds: number,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.p(
        [h.Class("mt-3 text-xs text-muted-foreground")],
        [
            `${formatDistance(distanceMeters)} · ${formatDuration(durationSeconds)} driving`,
        ]
    )

const controlsView = <ParentMessage>(
    state: JourneyState,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isPlaying = state._tag === "JourneyPlaying"
    const canPlay =
        state._tag === "JourneyReady" || state._tag === "JourneyFinished"

    return h.div(
        [h.Class("mt-4 flex gap-2")],
        [
            h.button(
                [
                    h.Type("button"),
                    h.Disabled(!canPlay),
                    h.OnClick(toParentMessage(ClickedPlay())),
                    h.Class(
                        "flex-1 px-3 py-2 text-sm font-medium rounded-[var(--radius-control)] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                    ),
                ],
                [
                    isPlaying
                        ? "Driving…"
                        : state._tag === "JourneyFinished"
                          ? "Drive again"
                          : "Drive the route",
                ]
            ),
            isPlaying || state._tag === "JourneyFinished"
                ? h.button(
                      [
                          h.Type("button"),
                          h.OnClick(toParentMessage(ClickedReset())),
                          h.Class(
                              "px-3 py-2 text-sm font-medium rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border hover:bg-accent cursor-pointer [box-shadow:var(--shadow-control)]"
                          ),
                      ],
                      ["Reset"]
                  )
                : h.empty,
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
