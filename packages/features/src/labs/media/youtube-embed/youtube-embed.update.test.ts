import { Option } from "effect"
import { describe, expect, it } from "vitest"
import {
    ChangedSeekInput,
    ClearedDebugFilters,
    ClickedPause,
    ClickedPlay,
    ClickedPreview,
    LoadedPlayer,
    ReceivedPlayerError,
    ReceivedPlayerEvent,
    RetriedHandshake,
    SubmittedSeek,
    ToggledDebugFilter,
    ToggledDebugger,
} from "./youtube-embed.message.ts"
import { init } from "./youtube-embed.model.ts"
import { update } from "./youtube-embed.update.ts"

const initial = () => init({ id: "video-id", title: "Video title" })

// Walks the retry ladder from a freshly loaded iframe that never answers.
const exhaustHandshake = () => {
    let [model] = update(initial(), LoadedPlayer())

    while (model.handshake._tag === "HandshakeAwaiting") {
        const attempt = model.handshake.attempt
        ;[model] = update(model, RetriedHandshake({ attempt }))
    }

    return model
}

describe("YouTube embed update", () => {
    it("replaces the poster with the player after activation", () => {
        const [model] = update(
            init({ id: "video-id", title: "Video title" }),
            ClickedPreview()
        )

        expect(model.isPreviewing).toBe(false)
    })

    it("maps YouTube playing and paused states without inversion", () => {
        const initial = init({ id: "video-id", title: "Video title" })
        const [playing] = update(
            initial,
            ReceivedPlayerEvent({
                raw: "playing",
                playerState: 1,
                currentTimeSeconds: 12,
            })
        )
        const [paused] = update(
            playing,
            ReceivedPlayerEvent({
                raw: "paused",
                playerState: 2,
                currentTimeSeconds: 14,
            })
        )

        expect(playing.playback).toEqual({
            _tag: "PlaybackPlaying",
            currentTimeSeconds: 12,
        })
        expect(paused.playback).toEqual({
            _tag: "PlaybackPaused",
            currentTimeSeconds: 14,
        })
    })

    it("advances the clock on info frames that omit the player state", () => {
        const [playing] = update(
            init({ id: "video-id", title: "Video title" }),
            ReceivedPlayerEvent({
                raw: "playing",
                playerState: 1,
                currentTimeSeconds: 12,
            })
        )
        const [ticked] = update(
            playing,
            ReceivedPlayerEvent({
                raw: "infoDelivery",
                currentTimeSeconds: 19,
            })
        )

        expect(ticked.playback).toEqual({
            _tag: "PlaybackPlaying",
            currentTimeSeconds: 19,
        })
    })

    it("records an error code as a failure instead of a playback state", () => {
        const [errored] = update(
            init({ id: "video-id", title: "Video title" }),
            ReceivedPlayerError({ raw: "onError", code: 150 })
        )

        expect(errored.maybePlayerError).toEqual(
            Option.some("NOT_EMBEDDABLE_DISGUISED")
        )
        expect(errored.playback._tag).toBe("PlaybackUnstarted")
    })

    it("maps an undocumented error code to UNKNOWN", () => {
        const [errored] = update(
            init({ id: "video-id", title: "Video title" }),
            ReceivedPlayerError({ raw: "onError", code: 999 })
        )

        expect(errored.maybePlayerError).toEqual(Option.some("UNKNOWN"))
    })

    it("keeps a failure once the player has reported one", () => {
        const [errored] = update(
            init({ id: "video-id", title: "Video title" }),
            ReceivedPlayerError({ raw: "onError", code: 100 })
        )
        const [afterEvent] = update(
            errored,
            ReceivedPlayerEvent({
                raw: "infoDelivery",
                currentTimeSeconds: 3,
            })
        )

        expect(afterEvent.maybePlayerError).toEqual(
            Option.some("VIDEO_NOT_FOUND")
        )
    })

    it("re-sends the handshake while the player stays silent", () => {
        const [loaded, loadCommands] = update(initial(), LoadedPlayer())

        expect(loaded.handshake).toEqual({
            _tag: "HandshakeAwaiting",
            attempt: 1,
        })
        expect(loadCommands).toHaveLength(2)

        const [retried, retryCommands] = update(
            loaded,
            RetriedHandshake({ attempt: 1 })
        )

        expect(retried.handshake).toEqual({
            _tag: "HandshakeAwaiting",
            attempt: 2,
        })
        expect(retryCommands).toHaveLength(2)
    })

    it("gives up after five attempts", () => {
        expect(exhaustHandshake().handshake._tag).toBe("HandshakeExhausted")
    })

    it("stops retrying once the player answers", () => {
        const [loaded] = update(initial(), LoadedPlayer())
        const [connected] = update(
            loaded,
            ReceivedPlayerEvent({ raw: "onReady" })
        )
        const [afterStaleTick, commands] = update(
            connected,
            RetriedHandshake({ attempt: 1 })
        )

        expect(connected.handshake._tag).toBe("HandshakeConnected")
        expect(afterStaleTick.handshake._tag).toBe("HandshakeConnected")
        expect(commands).toEqual([])
    })

    it("ignores a retry tick from a superseded attempt", () => {
        const [loaded] = update(initial(), LoadedPlayer())
        const [second] = update(loaded, RetriedHandshake({ attempt: 1 }))
        const [afterStaleTick, commands] = update(
            second,
            RetriedHandshake({ attempt: 1 })
        )

        expect(afterStaleTick.handshake).toEqual({
            _tag: "HandshakeAwaiting",
            attempt: 2,
        })
        expect(commands).toEqual([])
    })

    it("holds controls pressed before the handshake completes", () => {
        const [loaded] = update(initial(), LoadedPlayer())
        const [queued, commands] = update(loaded, ClickedPlay())

        expect(commands).toEqual([])
        expect(queued.pendingRequests).toEqual([{ _tag: "RequestPlay" }])
    })

    it("replays queued controls when the player connects", () => {
        const [loaded] = update(initial(), LoadedPlayer())
        const [withPlay] = update(loaded, ClickedPlay())
        const [withPause] = update(withPlay, ClickedPause())
        const [connected, commands] = update(
            withPause,
            ReceivedPlayerEvent({ raw: "onReady" })
        )

        expect(commands).toHaveLength(2)
        expect(connected.pendingRequests).toEqual([])
    })

    it("sends controls straight through once connected", () => {
        const [loaded] = update(initial(), LoadedPlayer())
        const [connected] = update(
            loaded,
            ReceivedPlayerEvent({ raw: "onReady" })
        )
        const [afterPlay, commands] = update(connected, ClickedPlay())

        expect(commands).toHaveLength(1)
        expect(afterPlay.pendingRequests).toEqual([])
    })

    it("does not replay queued controls at a failed player", () => {
        const [loaded] = update(initial(), LoadedPlayer())
        const [withPlay] = update(loaded, ClickedPlay())
        const [errored, commands] = update(
            withPlay,
            ReceivedPlayerError({ raw: "onError", code: 101 })
        )

        expect(commands).toEqual([])
        expect(errored.handshake._tag).toBe("HandshakeConnected")
    })

    it("seeks from the debugger input once connected", () => {
        const [loaded] = update(initial(), LoadedPlayer())
        const [connected] = update(
            loaded,
            ReceivedPlayerEvent({ raw: "onReady" })
        )
        const [typed] = update(connected, ChangedSeekInput({ value: "42.5" }))
        const [, commands] = update(typed, SubmittedSeek())

        expect(commands).toHaveLength(1)
    })

    it("ignores a seek submission that is not a positive number", () => {
        const [loaded] = update(initial(), LoadedPlayer())
        const [connected] = update(
            loaded,
            ReceivedPlayerEvent({ raw: "onReady" })
        )
        const [typed] = update(connected, ChangedSeekInput({ value: "-3" }))
        const [, negative] = update(typed, SubmittedSeek())
        const [nonsense] = update(connected, ChangedSeekInput({ value: "abc" }))
        const [, unparsed] = update(nonsense, SubmittedSeek())

        expect(negative).toEqual([])
        expect(unparsed).toEqual([])
    })

    it("toggles debug event filters", () => {
        const [opened] = update(initial(), ToggledDebugger())
        const [filtered] = update(
            opened,
            ToggledDebugFilter({ label: "infoDelivery" })
        )
        const [unfiltered] = update(
            filtered,
            ToggledDebugFilter({ label: "infoDelivery" })
        )

        expect(opened.isDebuggerOpen).toBe(true)
        expect(filtered.debugFilters).toEqual(["infoDelivery"])
        expect(unfiltered.debugFilters).toEqual([])
    })

    it("clears every debug event filter at once", () => {
        const [withOne] = update(
            initial(),
            ToggledDebugFilter({ label: "onStateChange" })
        )
        const [withTwo] = update(
            withOne,
            ToggledDebugFilter({ label: "infoDelivery" })
        )
        const [cleared] = update(withTwo, ClearedDebugFilters())

        expect(withTwo.debugFilters).toHaveLength(2)
        expect(cleared.debugFilters).toEqual([])
    })

    it("caps the debug event buffer", () => {
        let model = init(
            { id: "video-id", title: "Video title" },
            { debug: true }
        )

        for (let index = 0; index < 600; index += 1) {
            ;[model] = update(
                model,
                ReceivedPlayerEvent({ raw: `event-${index}` })
            )
        }

        expect(model.debugEvents).toHaveLength(500)
        expect(model.debugEvents.at(-1)).toBe("event-599")
        expect(model.debugEvents.at(0)).toBe("event-100")
    })

    it("captures nothing when the debugger is off", () => {
        const [model] = update(initial(), ReceivedPlayerEvent({ raw: "event" }))

        expect(model.isDebugEnabled).toBe(false)
        expect(model.debugEvents).toEqual([])
    })

    it("bounds the pending queue against a player that never answers", () => {
        let model = exhaustHandshake()

        for (let index = 0; index < 40; index += 1) {
            ;[model] = update(model, ClickedPlay())
        }

        expect(model.pendingRequests).toHaveLength(16)
    })
})
