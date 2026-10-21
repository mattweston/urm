import type { Html, HtmlBuilder } from "foldkit/html"
import { Option } from "effect"
import { playerElementId } from "./youtube-embed.command.ts"
import { debuggerView } from "./youtube-embed.debugger.view.ts"
import {
    ClickedPause,
    ClickedPlay,
    ClickedPreview,
    FocusedPreview,
    HoveredPreview,
    LoadedPlayer,
    type Message,
} from "./youtube-embed.message.ts"
import type { Model, PlayerError } from "./youtube-embed.model.ts"
import { videoStructuredData } from "./youtube-embed.seo.ts"
import {
    playerUrl,
    posterUrl,
    watchUrl,
    YOUTUBE_NOCOOKIE_URL,
    type PosterQuality,
} from "./youtube-embed.urls.ts"

const playerErrorLabel = (error: PlayerError): string => {
    switch (error) {
        case "INVALID_PARAM":
            return "The player rejected an embed parameter"
        case "HTML5_ERROR":
            return "The video cannot play in the HTML5 player"
        case "VIDEO_NOT_FOUND":
            return "The video was removed or made private"
        case "NOT_EMBEDDABLE":
        case "NOT_EMBEDDABLE_DISGUISED":
            return "The owner does not allow this video to be embedded"
        case "REFERRER_NOT_FOUND":
            return "YouTube rejected this page as a referrer"
        case "UNKNOWN":
            return "The player reported an unrecognised error"
    }
}

// Structured data for search engines, plus a plain link for anything that does
// not run the embed. Both only reach a crawler once this view is rendered
// server-side — see the note in the module docs.
const seoView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> => [
    h.script([h.Type("application/ld+json")], [videoStructuredData(model)]),
    h.a(
        [
            h.Href(watchUrl(model.videoId)),
            h.AriaLabel(`Watch ${model.title} on YouTube`),
            h.Class("text-sm underline underline-offset-4"),
        ],
        [`Watch "${model.title}" on YouTube`]
    ),
    // Deprecated: browsers parse nested noscript markup as text when scripting
    // is enabled, so Foldkit rejects it during server-rendered DOM validation.
    // h.noscript(
    //     [],
    //     [
    //         h.a(
    //             [
    //                 h.Href(watchUrl(model.videoId)),
    //                 h.AriaLabel(`Watch ${model.title} on YouTube`),
    //             ],
    //             [`Watch "${model.title}" on YouTube`]
    //         ),
    //     ]
    // ),
]

const statusView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    if (model.handshake._tag === "HandshakeExhausted") {
        return h.span(
            [h.Role("alert"), h.Class("text-sm text-destructive")],
            ["The player never answered — try reloading"]
        )
    }

    const pending =
        model.pendingRequests.length > 0
            ? ` (${model.pendingRequests.length} queued)`
            : ""

    return h.span(
        [h.Class("text-sm text-muted-foreground")],
        [
            model.handshake._tag === "HandshakeConnected"
                ? model.playback._tag
                : `Connecting${pending}`,
        ]
    )
}

export interface ViewOptions {
    readonly aspect_width?: number
    readonly aspect_height?: number
    readonly poster_quality?: PosterQuality
    readonly webp?: boolean
}

const positive_dimension = (value: number | undefined, fallback: number) =>
    value !== undefined && Number.isFinite(value) && value > 0
        ? value
        : fallback

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    options: ViewOptions = {}
): Html => {
    const preview_src =
        model.seo.thumbnailUrl ??
        posterUrl(model.videoId, options.poster_quality, options.webp)
    const aspect_width = positive_dimension(options.aspect_width, 16)
    const aspect_height = positive_dimension(options.aspect_height, 9)

    return h.section(
        [h.Class("mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6")],
        [
            ...seoView(model, h),
            h.link([
                h.Rel("preload"),
                h.Href(preview_src),
                h.Attribute("as", "image"),
            ]),
            ...(model.isPreconnected
                ? [
                      h.link([
                          h.Rel("preconnect"),
                          h.Href(YOUTUBE_NOCOOKIE_URL),
                      ]),
                      h.link([
                          h.Rel("preconnect"),
                          h.Href("https://www.google.com"),
                      ]),
                  ]
                : []),
            h.div(
                [
                    h.Class(
                        "group relative overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-black [box-shadow:var(--shadow-surface)]"
                    ),
                    h.Style({
                        aspectRatio: `${aspect_width} / ${aspect_height}`,
                    }),
                ],
                [
                    ...(model.isPreviewing
                        ? [
                              h.img([
                                  h.Src(preview_src),
                                  // Baked into the static HTML, so this is what
                                  // image search indexes. The overlaying button
                                  // carries the action ("Watch …"); this
                                  // describes the picture.
                                  h.Alt(`Video thumbnail: ${model.title}`),
                                  h.Class(
                                      "absolute inset-0 h-full w-full object-cover"
                                  ),
                              ]),
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.OnClick(
                                          toParentMessage(ClickedPreview())
                                      ),
                                      h.OnFocus(
                                          toParentMessage(FocusedPreview())
                                      ),
                                      h.OnPointerMove(() =>
                                          Option.some(
                                              toParentMessage(HoveredPreview())
                                          )
                                      ),
                                      h.AriaLabel(`Watch ${model.title}`),
                                      h.Class(
                                          "absolute inset-0 grid cursor-pointer place-items-center bg-transparent"
                                      ),
                                  ],
                                  [
                                      h.svg(
                                          [
                                              h.AriaHidden(true),
                                              h.ViewBox("0 0 68 48"),
                                              h.Class(
                                                  "h-12 w-17 opacity-80 grayscale transition-[filter,opacity] duration-100 ease-out group-hover:opacity-100 group-hover:grayscale-0 group-focus-within:opacity-100 group-focus-within:grayscale-0"
                                              ),
                                          ],
                                          [
                                              h.path([
                                                  h.Fill("#f00"),
                                                  h.D(
                                                      "M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
                                                  ),
                                              ]),
                                              h.path([
                                                  h.Fill("#fff"),
                                                  h.D("M45 24 27 14v20"),
                                              ]),
                                          ]
                                      ),
                                  ]
                              ),
                          ]
                        : [
                              h.iframe([
                                  h.Id(playerElementId),
                                  h.Src(playerUrl(model.videoId)),
                                  h.Title(model.title),
                                  h.Allow(
                                      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  ),
                                  h.Referrerpolicy(
                                      "strict-origin-when-cross-origin"
                                  ),
                                  h.Attribute("allowfullscreen", ""),
                                  h.OnLoad(toParentMessage(LoadedPlayer())),
                                  h.Class(
                                      "absolute inset-0 h-full w-full border-0"
                                  ),
                              ]),
                          ]),
                    ...(model.isDebugEnabled
                        ? [debuggerView(model, toParentMessage, h)]
                        : []),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap items-center gap-2")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(toParentMessage(ClickedPlay())),
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-sm bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                            ),
                        ],
                        ["Play"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(toParentMessage(ClickedPause())),
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-sm"
                            ),
                        ],
                        ["Pause"]
                    ),
                    Option.match(model.maybePlayerError, {
                        onNone: () => statusView(model, h),
                        onSome: (error) =>
                            h.span(
                                [
                                    h.Role("alert"),
                                    h.Class("text-sm text-destructive"),
                                ],
                                [playerErrorLabel(error)]
                            ),
                    }),
                ]
            ),
        ]
    )
}
