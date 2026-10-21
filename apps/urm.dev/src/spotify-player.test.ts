import { Option } from "effect"
import * as Ui from "@foldkit/ui"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"

import {
    ChangedSpotifyPlaylistId,
    GotSpotifyPlayerPopoverMessage,
    SubmittedSpotifyPlaylistId,
    ToggledSpotifyPlayer,
    init,
    update,
} from "./main.ts"

const initial_model = init(
    Url.make({
        protocol: "http:",
        host: "urm.test",
        port: Option.some("1420"),
        pathname: "/dashboard",
        search: Option.none(),
        hash: Option.none(),
    })
).model

describe("Spotify player", () => {
    test("loads on first toggle and then collapses", () => {
        const [expanded] = update(initial_model, ToggledSpotifyPlayer())
        const [collapsed] = update(expanded, ToggledSpotifyPlayer())

        expect(expanded.spotify_player_state).toBe("Expanded")
        expect(collapsed.spotify_player_state).toBe("Collapsed")
    })

    test("tracks open and close messages from the player popover", () => {
        const [expanded] = update(
            initial_model,
            GotSpotifyPlayerPopoverMessage({
                message: Ui.Popover.Message.RequestedOpen(),
            })
        )
        const [collapsed] = update(
            expanded,
            GotSpotifyPlayerPopoverMessage({
                message: Ui.Popover.Message.RequestedClose(),
            })
        )

        expect(expanded.spotify_player_popover.isOpen).toBe(true)
        expect(expanded.spotify_player_state).toBe("Expanded")
        expect(collapsed.spotify_player_popover.isOpen).toBe(false)
        expect(collapsed.spotify_player_state).toBe("Collapsed")
    })

    test("validates the playlist ID before saving", () => {
        const [changed] = update(
            initial_model,
            ChangedSpotifyPlaylistId({ value: "not-a-playlist" })
        )
        const [submitted, commands] = update(
            changed,
            SubmittedSpotifyPlaylistId()
        )

        expect(submitted.spotify_playlist_status).toBe("Error")
        expect(submitted.spotify_playlist_error).toContain("22-character")
        expect(commands).toEqual([])
    })

    test("emits a save command for a valid playlist ID", () => {
        const signed_in = {
            ...initial_model,
            contacts: {
                ...initial_model.contacts,
                domain_id: "domain-one",
                session: {
                    account_id: "account-one",
                    domains: [
                        {
                            id: "domain-one",
                            slug: "test1",
                            name: "Test 1",
                            organization_name: "Test",
                            can_write: true,
                        },
                    ],
                },
            },
        }
        const [changed] = update(
            signed_in,
            ChangedSpotifyPlaylistId({ value: "37i9dQZF1DXcBWIGoYBM5M" })
        )
        const [submitted, commands] = update(
            changed,
            SubmittedSpotifyPlaylistId()
        )

        expect(submitted.spotify_playlist_status).toBe("Saving")
        expect(commands).toHaveLength(1)
    })
})
