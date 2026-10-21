import { Array, Match as M, Option } from "effect"
import clsx from "clsx"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ChangedRouteTransitionsRoute,
    UpdatedRtStudioDraft,
    type RouteTransitionsMessage,
} from "./message.ts"
import { findPaintingWithIndex, paintings } from "./data.ts"
import {
    CatalogStatus,
    LoggedTransition,
    PaintingStatus,
    RtGallery,
    RtHome,
    RtPainting,
    RtRoute,
    RtStudio,
} from "./route.ts"

// The demo lives at paths the host application owns, so the view takes its
// links instead of reaching into the app's route module.
export type RouteTransitionsHrefs = Readonly<{
    home: () => string
    gallery: () => string
    painting: (paintingId: number) => string
    studio: () => string
}>

const NAV_LINK_CLASS =
    "px-3 py-1.5 rounded-[var(--radius-control)] text-sm font-medium transition border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const navLink = <ParentMessage>(
    label: string,
    href: string,
    isActive: boolean,
    route: RtRoute,
    toRouteTransitionsMessage: (
        message: RouteTransitionsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("a")(
        label,
        [
            h.Href(href),
            h.OnClick(
                toRouteTransitionsMessage(
                    ChangedRouteTransitionsRoute({
                        route,
                        isColdLoad: false,
                    })
                )
            ),
            h.Class(
                clsx(
                    NAV_LINK_CLASS,
                    isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
            ),
        ],
        [label]
    )

const navView = <ParentMessage>(
    route: RtRoute,
    hrefs: RouteTransitionsHrefs,
    toRouteTransitionsMessage: (
        message: RouteTransitionsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [h.Class("flex flex-wrap gap-2")],
        [
            navLink(
                "Home",
                hrefs.home(),
                route._tag === "RtHome",
                RtHome(),
                toRouteTransitionsMessage,
                h
            ),
            navLink(
                "Gallery",
                hrefs.gallery(),
                route._tag === "RtGallery" || route._tag === "RtPainting",
                RtGallery(),
                toRouteTransitionsMessage,
                h
            ),
            navLink(
                "Studio",
                hrefs.studio(),
                route._tag === "RtStudio",
                RtStudio(),
                toRouteTransitionsMessage,
                h
            ),
        ]
    )

const homeView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [h.Class("flex flex-col gap-2")],
        [
            h.h3([h.Class("text-lg font-semibold")], ["Home"]),
            h.p(
                [h.Class("text-sm text-muted-foreground max-w-prose")],
                [
                    "Nothing loads here. Move to the gallery and the catalogue fetches once; come back and it does not fetch again, because entering is not the same as being on a route.",
                ]
            ),
        ]
    )

const galleryView = <ParentMessage>(
    catalogStatus: CatalogStatus,
    hrefs: RouteTransitionsHrefs,
    toRouteTransitionsMessage: (
        message: RouteTransitionsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-col gap-3")],
        [
            h.h3([h.Class("text-lg font-semibold")], ["Gallery"]),
            catalogStatus === "Ready"
                ? h.keyed("div")(
                      "Catalog",
                      [h.Class("grid grid-cols-2 gap-4 sm:grid-cols-3")],
                      Array.map(paintings, (painting) =>
                          h.keyed("a")(
                              String(painting.id),
                              [
                                  h.Href(hrefs.painting(painting.id)),
                                  h.OnClick(
                                      toRouteTransitionsMessage(
                                          ChangedRouteTransitionsRoute({
                                              route: RtPainting({
                                                  paintingId: painting.id,
                                              }),
                                              isColdLoad: false,
                                          })
                                      )
                                  ),
                                  h.Class("group block"),
                              ],
                              [
                                  h.div([
                                      h.Class(
                                          `aspect-video rounded-lg bg-gradient-to-br transition-shadow group-hover:shadow-lg ${painting.gradient}`
                                      ),
                                  ]),
                                  h.p(
                                      [
                                          h.Class(
                                              "mt-2 text-sm font-medium text-foreground"
                                          ),
                                      ],
                                      [painting.title]
                                  ),
                              ]
                          )
                      )
                  )
                : h.keyed("p")(
                      "CatalogLoading",
                      [h.Class("text-sm text-muted-foreground")],
                      ["Loading the catalogue..."]
                  ),
        ]
    )

const paintingView = <ParentMessage>(
    paintingStatus: PaintingStatus,
    paintingId: number,
    hrefs: RouteTransitionsHrefs,
    toRouteTransitionsMessage: (
        message: RouteTransitionsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isReady =
        paintingStatus._tag === "PaintingReady" &&
        paintingStatus.paintingId === paintingId

    return h.div(
        [h.Class("flex flex-col gap-3")],
        [
            h.a(
                [
                    h.Href(hrefs.gallery()),
                    h.OnClick(
                        toRouteTransitionsMessage(
                            ChangedRouteTransitionsRoute({
                                route: RtGallery(),
                                isColdLoad: false,
                            })
                        )
                    ),
                    h.Class(
                        "self-start text-sm text-muted-foreground underline hover:text-foreground"
                    ),
                ],
                ["Back to gallery"]
            ),
            Option.match(findPaintingWithIndex(paintingId), {
                onNone: () =>
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [`No painting with id ${paintingId}.`]
                    ),
                onSome: ({ painting, paintingIndex }) =>
                    isReady
                        ? h.keyed("div")(
                              `Painting-${painting.id}`,
                              [h.Class("flex flex-col gap-3")],
                              [
                                  h.div([
                                      h.Class(
                                          `aspect-video w-full max-w-lg rounded-xl bg-gradient-to-br ${painting.gradient}`
                                      ),
                                  ]),
                                  h.h3(
                                      [h.Class("text-lg font-semibold")],
                                      [painting.title]
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          `${painting.artist}. Number ${paintingIndex + 1} of ${paintings.length}.`,
                                      ]
                                  ),
                              ]
                          )
                        : h.keyed("p")(
                              "PaintingLoading",
                              [h.Class("text-sm text-muted-foreground")],
                              ["Loading the painting..."]
                          ),
            }),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                Array.map(paintings, (painting) =>
                    h.keyed("a")(
                        `jump-${painting.id}`,
                        [
                            h.Href(hrefs.painting(painting.id)),
                            h.OnClick(
                                toRouteTransitionsMessage(
                                    ChangedRouteTransitionsRoute({
                                        route: RtPainting({
                                            paintingId: painting.id,
                                        }),
                                        isColdLoad: false,
                                    })
                                )
                            ),
                            h.Class(
                                clsx(
                                    "px-2 py-1 rounded text-xs font-mono border-(length:--surface-border-width)",
                                    painting.id === paintingId
                                        ? "border-primary text-primary"
                                        : "border-border text-muted-foreground hover:bg-muted"
                                )
                            ),
                        ],
                        [String(painting.id)]
                    )
                )
            ),
        ]
    )
}

const studioView = <ParentMessage>(
    studioDraft: string,
    maybeSavedDraft: Option.Option<string>,
    toRouteTransitionsMessage: (
        message: RouteTransitionsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-col gap-3")],
        [
            h.h3([h.Class("text-lg font-semibold")], ["Studio"]),
            h.p(
                [h.Class("text-sm text-muted-foreground max-w-prose")],
                [
                    "Type something, then navigate away. Leaving is what saves it: the draft is written on the exit transition, not on every keystroke.",
                ]
            ),
            h.textarea([
                h.Value(studioDraft),
                h.Placeholder("Notes for the next piece"),
                h.OnInput((value) =>
                    toRouteTransitionsMessage(UpdatedRtStudioDraft({ value }))
                ),
                h.Class(
                    "w-full max-w-lg h-28 rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-foreground outline-none focus:border-ring"
                ),
            ]),
            Option.match(maybeSavedDraft, {
                onNone: () =>
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        ["Nothing saved yet."]
                    ),
                onSome: (draft) =>
                    h.p(
                        [h.Class("text-sm text-foreground")],
                        [`Saved on exit: "${draft}"`]
                    ),
            }),
        ]
    )

const routeLabel = (route: RtRoute): string =>
    M.value(route).pipe(
        M.tagsExhaustive({
            RtHome: () => "Home",
            RtGallery: () => "Gallery",
            RtPainting: ({ paintingId }) => `Painting ${paintingId}`,
            RtStudio: () => "Studio",
        })
    )

const transitionLogView = <ParentMessage>(
    transitionLog: ReadonlyArray<LoggedTransition>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-col gap-2")],
        [
            h.h3(
                [h.Class("text-lg font-semibold text-foreground")],
                ["Transition log"]
            ),
            Array.match(transitionLog, {
                onEmpty: () =>
                    h.keyed("p")(
                        "NoTransitions",
                        [h.Class("text-sm text-muted-foreground")],
                        ["Nothing yet."]
                    ),
                onNonEmpty: (entries) =>
                    h.keyed("ul")(
                        "TransitionLog",
                        [
                            h.Class(
                                "flex flex-col gap-1 font-mono text-xs text-muted-foreground"
                            ),
                        ],
                        Array.map(entries, (entry) =>
                            h.keyed("li")(
                                String(entry.sequenceNumber),
                                [
                                    h.Class(
                                        "border-b-(length:--surface-border-width) border-border pb-1 last:border-b-0"
                                    ),
                                ],
                                [
                                    Option.match(entry.maybePreviousRoute, {
                                        onNone: () =>
                                            `cold load -> ${routeLabel(entry.nextRoute)}`,
                                        onSome: (previousRoute) =>
                                            `${routeLabel(previousRoute)} -> ${routeLabel(entry.nextRoute)}`,
                                    }),
                                ]
                            )
                        )
                    ),
            }),
        ]
    )

export const view = <ParentMessage>(
    route: RtRoute,
    catalogStatus: CatalogStatus,
    paintingStatus: PaintingStatus,
    studioDraft: string,
    maybeSavedDraft: Option.Option<string>,
    transitionLog: ReadonlyArray<LoggedTransition>,
    hrefs: RouteTransitionsHrefs,
    toRouteTransitionsMessage: (
        message: RouteTransitionsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Route transitions"]
            ),
            h.div(
                [h.Class("flex flex-col gap-6 max-w-3xl")],
                [
                    navView(route, hrefs, toRouteTransitionsMessage, h),
                    h.div(
                        [
                            h.Class(
                                "bg-card text-card-foreground border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] p-6"
                            ),
                        ],
                        [
                            M.value(route).pipe(
                                M.tagsExhaustive({
                                    RtHome: () => homeView(h),
                                    RtGallery: () =>
                                        galleryView(
                                            catalogStatus,
                                            hrefs,
                                            toRouteTransitionsMessage,
                                            h
                                        ),
                                    RtPainting: ({ paintingId }) =>
                                        paintingView(
                                            paintingStatus,
                                            paintingId,
                                            hrefs,
                                            toRouteTransitionsMessage,
                                            h
                                        ),
                                    RtStudio: () =>
                                        studioView(
                                            studioDraft,
                                            maybeSavedDraft,
                                            toRouteTransitionsMessage,
                                            h
                                        ),
                                })
                            ),
                        ]
                    ),
                    transitionLogView(transitionLog, h),
                ]
            ),
        ]
    )
