import * as Ui from "@foldkit/ui"
import type { SpotifyPlaylistId as SpotifyPlaylistIdType } from "@urm/domain/schemas/settings"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    type SpotifyPlayerState,
    type SpotifyPlaylistStatus,
    spotify_playlist_url,
} from "./spotify-player.ts"

export type SpotifyPlayerViewProps<ParentMessage> = Readonly<{
    state: SpotifyPlayerState
    popover: Ui.Popover.Model
    playlist_id: SpotifyPlaylistIdType
    playlist_id_draft: string
    playlist_status: SpotifyPlaylistStatus
    playlist_error: string
    on_change_playlist_id: (value: string) => ParentMessage
    on_submit_playlist_id: ParentMessage
    to_popover_message: (message: Ui.Popover.Message) => ParentMessage
}>

const spotifyPlayerContent = <ParentMessage>(
    props: SpotifyPlayerViewProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> => [
    h.div(
        [
            h.Class(
                "flex items-center justify-between gap-4 border-b border-border px-3 py-2"
            ),
        ],
        [
            h.h2([h.Class("text-sm font-medium")], ["Spotify player"]),
            h.button(
                [
                    h.Id("spotify-player-close"),
                    h.Type("button"),
                    h.OnClick(
                        props.to_popover_message(
                            Ui.Popover.Message.RequestedClose()
                        )
                    ),
                    h.AriaLabel("Close Spotify player"),
                    h.Class(
                        "flex size-10 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]"
                    ),
                ],
                [AppIcon.IconX({ class: "size-4" })]
            ),
        ]
    ),
    h.form(
        [
            h.Class("grid gap-2 border-b border-border p-3"),
            h.OnSubmit(props.on_submit_playlist_id),
        ],
        [
            h.label(
                [h.For("spotify-playlist-id"), h.Class("text-xs font-medium")],
                ["Spotify playlist ID"]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    h.input([
                        h.Id("spotify-playlist-id"),
                        h.Type("text"),
                        h.Value(props.playlist_id_draft),
                        h.OnInput(props.on_change_playlist_id),
                        h.Placeholder("22-character playlist ID"),
                        h.Attribute("maxlength", "22"),
                        h.Attribute("pattern", "[A-Za-z0-9]{22}"),
                        h.Required(true),
                        h.Class(
                            "min-w-0 flex-1 basis-40 rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-base sm:text-sm"
                        ),
                    ]),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Disabled(props.playlist_status === "Saving"),
                            h.Class(
                                "rounded-[var(--radius-control)] bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                            ),
                        ],
                        [
                            props.playlist_status === "Saving"
                                ? "Saving…"
                                : "Save",
                        ]
                    ),
                ]
            ),
            ...(props.playlist_error === ""
                ? []
                : [
                      h.p(
                          [
                              h.Class("text-xs text-destructive"),
                              h.AriaLive("polite"),
                          ],
                          [props.playlist_error]
                      ),
                  ]),
        ]
    ),
    h.iframe([
        h.Src(spotify_playlist_url(props.playlist_id)),
        h.Title("Spotify playlist"),
        h.Loading("lazy"),
        h.Allow(
            "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        ),
        h.Attribute("allowfullscreen", ""),
        h.Class(
            "block h-[352px] w-full rounded-b-[var(--radius-surface)] border-0"
        ),
    ]),
]

export const spotifyPlayerView = <ParentMessage>(
    props: SpotifyPlayerViewProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.submodel({
        slotId: props.popover.id,
        model: props.popover,
        view: Ui.Popover.view,
        viewInputs: {
            ariaLabel: "Spotify player",
            anchor: {
                placement: "bottom-end",
                gap: 4,
                padding: 8,
            },
            focusSelector: "#spotify-player-close",
            toView: ({ button, panel, backdrop, isVisible }) =>
                h.div(
                    [h.Class("relative inline-block")],
                    [
                        h.button(
                            [
                                ...button,
                                h.Class(
                                    "inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]"
                                ),
                            ],
                            [AppIcon.IconPlayCircle({ class: "size-4" })]
                        ),
                        ...(isVisible
                            ? [
                                  h.div([
                                      ...backdrop,
                                      h.Class("fixed inset-0 z-40"),
                                  ]),
                              ]
                            : []),
                        ...(props.state === "NotLoaded"
                            ? []
                            : [
                                  h.div(
                                      [
                                          ...panel,
                                          h.Hidden(!isVisible),
                                          h.Class(
                                              "z-50 max-h-[calc(100dvh-5.5rem)] w-[min(352px,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] outline-none"
                                          ),
                                      ],
                                      spotifyPlayerContent(props, h)
                                  ),
                              ]),
                    ]
                ),
        },
        toParentMessage: props.to_popover_message,
    })
