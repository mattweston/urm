import { Option } from "effect"
import { describe, expect, it } from "vitest"

import {
    AudioFailed,
    AudioOff,
    AudioReady,
    AudioStarting,
    CompletedPlayCue,
    FailedPlayCue,
    ToggledAudio,
    update,
} from "../src/learn/walkthrough/audio.ts"

describe("Foldkit audio", () => {
    it("keeps sound off when a cue has no acquired context", () => {
        const { model, commands = [] } = update(
            AudioOff(),
            CompletedPlayCue({ context_state: "unavailable" })
        )

        expect(model).toStrictEqual(AudioOff())
        expect(commands).toStrictEqual([])
    })

    it("does not enable sound when a cue fails while it is off", () => {
        const { model, commands = [] } = update(
            AudioOff(),
            FailedPlayCue({ reason: "Resource not available" })
        )

        expect(model).toStrictEqual(AudioOff())
        expect(commands).toStrictEqual([])
    })

    it("records a cue failure when sound is enabled", () => {
        const { model, commands = [] } = update(
            AudioReady({ maybe_diagnostic: Option.none() }),
            FailedPlayCue({ reason: "Audio device unavailable" })
        )

        expect(model).toStrictEqual(
            AudioReady({
                maybe_diagnostic: Option.some("Audio device unavailable"),
            })
        )
        expect(commands).toStrictEqual([])
    })

    it("reports a context that did not resume", () => {
        const { model } = update(
            AudioReady({ maybe_diagnostic: Option.none() }),
            CompletedPlayCue({ context_state: "suspended" })
        )

        expect(model).toStrictEqual(
            AudioReady({ maybe_diagnostic: Option.some("context suspended") })
        )
    })

    it("asks for the context from the two states that lack one", () => {
        expect(update(AudioOff(), ToggledAudio()).model).toStrictEqual(
            AudioStarting()
        )
        expect(
            update(AudioFailed({ reason: "denied" }), ToggledAudio()).model
        ).toStrictEqual(AudioStarting())
    })

    it("releases the context from the two states that hold one", () => {
        expect(update(AudioStarting(), ToggledAudio()).model).toStrictEqual(
            AudioOff()
        )
        expect(
            update(
                AudioReady({ maybe_diagnostic: Option.none() }),
                ToggledAudio()
            ).model
        ).toStrictEqual(AudioOff())
    })
})
