import * as Appearance from "@urm/features/settings/appearance"
import * as AppIcon from "@urm/ui/foldkit/icons/view.ts"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { SpotifyPlaylistId as SpotifyPlaylistIdType } from "@urm/domain/schemas/settings"
import {
    type SpotifyPlayerState,
    type SpotifyPlaylistStatus,
} from "./spotify-player.ts"
import { spotifyPlayerView } from "./spotify-player.view.ts"

type Props<ParentMessage> = Readonly<{
    title: string
    is_sidebar_collapsed: boolean
    spotify_player_state: SpotifyPlayerState
    spotify_player_popover: Ui.Popover.Model
    spotify_playlist_id: SpotifyPlaylistIdType
    spotify_playlist_id_draft: string
    spotify_playlist_status: SpotifyPlaylistStatus
    spotify_playlist_error: string
    appearance: Appearance.ModelType
    on_toggle_sidebar: ParentMessage
    on_toggle_mobile_sidebar: ParentMessage
    to_spotify_player_popover_message: (
        message: Ui.Popover.Message
    ) => ParentMessage
    on_change_spotify_playlist_id: (value: string) => ParentMessage
    on_submit_spotify_playlist_id: ParentMessage
    to_appearance_message: (message: Appearance.MessageType) => ParentMessage
    auth: Html
    search?: Html
}>

export const headerView = <ParentMessage>(
    props: Props<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.header(
        [
            h.Class(
                "flex flex-wrap min-h-[calc(4rem+var(--surface-border-width))] items-center justify-between gap-x-4 gap-y-2 border-b-(length:--surface-border-width) border-border bg-background/95 px-4 py-2 text-foreground sm:px-6"
            ),
        ],
        [
            h.div(
                [h.Class("flex min-w-0 flex-[1_1_14rem] items-center gap-2")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(props.on_toggle_mobile_sidebar),
                            h.AriaLabel("Open sidebar"),
                            h.Class(
                                "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)] md:hidden"
                            ),
                        ],
                        [AppIcon.HamburgerMenuIcon({ class: "size-4" })]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(props.on_toggle_sidebar),
                            h.AriaLabel(
                                props.is_sidebar_collapsed
                                    ? "Expand sidebar"
                                    : "Collapse sidebar"
                            ),
                            h.Class(
                                "hidden size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)] md:flex"
                            ),
                        ],
                        [
                            props.is_sidebar_collapsed
                                ? AppIcon.IconSidebarOpen({ class: "size-4" })
                                : AppIcon.IconPanelLeft({ class: "size-4" }),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "min-w-0 text-sm font-medium [overflow-wrap:anywhere]"
                            ),
                        ],
                        [props.title]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "ms-auto flex min-w-0 max-w-full shrink-0 flex-wrap items-center justify-end gap-x-4 gap-y-2"
                    ),
                ],
                [
                    ...(props.search === undefined ? [] : [props.search]),
                    spotifyPlayerView(
                        {
                            state: props.spotify_player_state,
                            popover: props.spotify_player_popover,
                            playlist_id: props.spotify_playlist_id,
                            playlist_id_draft: props.spotify_playlist_id_draft,
                            playlist_status: props.spotify_playlist_status,
                            playlist_error: props.spotify_playlist_error,
                            on_change_playlist_id:
                                props.on_change_spotify_playlist_id,
                            on_submit_playlist_id:
                                props.on_submit_spotify_playlist_id,
                            to_popover_message:
                                props.to_spotify_player_popover_message,
                        },
                        h
                    ),
                    props.auth,
                    h.div(
                        [
                            h.Role("group"),
                            h.AriaLabel("Appearance"),
                            h.Class(
                                "flex max-w-full flex-wrap items-center gap-2"
                            ),
                        ],
                        [
                            Appearance.themeMenuView(
                                props.appearance,
                                props.to_appearance_message,
                                h
                            ),
                            Appearance.themeModeButtonView(
                                props.appearance,
                                props.to_appearance_message,
                                h
                            ),
                            Appearance.fontMenuView(
                                props.appearance,
                                props.to_appearance_message,
                                h
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
