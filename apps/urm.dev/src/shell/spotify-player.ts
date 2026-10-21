import { Schema } from "effect"
import {
    DEFAULT_SPOTIFY_PLAYLIST_ID,
    type SpotifyPlaylistId,
} from "@urm/domain/schemas/settings"

export const SpotifyPlayerState = Schema.Literals([
    "NotLoaded",
    "Expanded",
    "Collapsed",
])
export type SpotifyPlayerState = typeof SpotifyPlayerState.Type

export const SpotifyPlaylistStatus = Schema.Literals([
    "Idle",
    "Saving",
    "Saved",
    "Error",
])
export type SpotifyPlaylistStatus = typeof SpotifyPlaylistStatus.Type

export const initial_spotify_playlist_id = DEFAULT_SPOTIFY_PLAYLIST_ID

export const spotify_playlist_url = (playlist_id: SpotifyPlaylistId): string =>
    `https://open.spotify.com/embed/playlist/${playlist_id}?utm_source=generator`
