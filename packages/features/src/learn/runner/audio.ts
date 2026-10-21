import { Clock, Effect, Match as M, Schema as S } from "effect"
import { Command, ManagedResource } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import * as Tones from "./tone-sounds.ts"
import type { SoundSystem } from "./tone-sounds.ts"

// PORT NOTE: upstream's third state is `system`, which defers to
// `prefers-reduced-motion`. Someone who has asked their OS for less motion has
// usually asked for less of everything, so that is the default rather than
// silence-until-asked.
export const SoundPreference = S.Literals(["System", "On", "Off"])
export type SoundPreference = typeof SoundPreference.Type

export const next_sound_preference = (
    preference: SoundPreference
): SoundPreference =>
    preference === "System" ? "On" : preference === "On" ? "Off" : "System"

export const sound_preference_label = (preference: SoundPreference): string =>
    `SOUND ${preference.toUpperCase()}`

export const AudioRunStarted = taggedStruct("AudioRunStarted")
export const AudioRunSucceeded = taggedStruct("AudioRunSucceeded")
export const AudioRunFailed = taggedStruct("AudioRunFailed")
export const AudioRunDied = taggedStruct("AudioRunDied")
export const AudioRunInterrupted = taggedStruct("AudioRunInterrupted")
export const AudioRunReset = taggedStruct("AudioRunReset")

// Per-step cues. A run makes one noise; the nodes inside it each make their
// own, which is what turns a four-node concurrent run into something you can
// follow with your eyes shut.
export const AudioStepRunning = taggedStruct("AudioStepRunning")
export const AudioStepSucceeded = taggedStruct("AudioStepSucceeded")
export const AudioStepFailed = taggedStruct("AudioStepFailed")
export const AudioStepInterrupted = taggedStruct("AudioStepInterrupted")
export const AudioNotification = taggedStruct("AudioNotification")
export const AudioControlChanged = taggedStruct("AudioControlChanged")
export const AudioFinalizerFinished = taggedStruct("AudioFinalizerFinished")
// Upstream distinguishes a finalizer being registered, running and completing,
// and the port already emits all three events.
export const AudioFinalizerCreated = taggedStruct("AudioFinalizerCreated")
export const AudioFinalizerRunning = taggedStruct("AudioFinalizerRunning")
export const AudioRefUpdated = taggedStruct("AudioRefUpdated")

export const SoundCue = S.Union([
    AudioRunStarted,
    AudioRunSucceeded,
    AudioRunFailed,
    AudioRunDied,
    AudioRunInterrupted,
    AudioRunReset,
    AudioStepRunning,
    AudioStepSucceeded,
    AudioStepFailed,
    AudioStepInterrupted,
    AudioNotification,
    AudioControlChanged,
    AudioFinalizerFinished,
    AudioFinalizerCreated,
    AudioFinalizerRunning,
    AudioRefUpdated,
])
export type SoundCue = typeof SoundCue.Type

// PORT NOTE: this used to drive uisfx, a library of rendered cues. Upstream
// plays no rendered audio at all — see `tone-sounds.ts` — so the cue mapping is
// now one call per event into the ported synth graph. uisfx is no longer used
// by anything in the repo.

export const AudioResource =
    ManagedResource.tag<SoundSystem>()("EffectExampleAudio")
export type AudioService = ManagedResource.ServiceOf<typeof AudioResource>

export const PlayedSound = taggedStruct("PlayedSound")
export const AudioAvailable = taggedStruct("AudioAvailable")
export const AudioUnavailable = taggedStruct("AudioUnavailable")
export const AudioReleased = taggedStruct("AudioReleased")

// The scale walk lives inside the sound system, so ordering matters here in a
// way it does not for a sample library: the cue chosen decides which voice
// plays and whether it advances the walk.
const play_cue = (system: SoundSystem, cue: SoundCue, now: number): void =>
    M.value(cue).pipe(
        M.withReturnType<void>(),
        M.tagsExhaustive({
            AudioRunStarted: () => Tones.play_running(system, now),
            AudioRunSucceeded: () => Tones.play_success(system, now),
            AudioRunFailed: () => Tones.play_failure(system, now),
            AudioRunDied: () => Tones.play_death(system),
            AudioRunInterrupted: () => Tones.play_interrupted(system, now),
            AudioRunReset: () => Tones.play_reset(system),
            AudioStepRunning: () => Tones.play_running(system, now),
            AudioStepSucceeded: () => Tones.play_success(system, now),
            AudioStepFailed: () => Tones.play_failure(system, now),
            AudioStepInterrupted: () => Tones.play_interrupted(system, now),
            AudioNotification: () => Tones.play_notification(system),
            AudioControlChanged: () => Tones.play_configuration_change(system),
            AudioRefUpdated: () => Tones.play_ref_update(system),
            AudioFinalizerCreated: () =>
                Tones.play_finalizer_created(system, now),
            AudioFinalizerRunning: () =>
                Tones.play_finalizer_running(system, now),
            AudioFinalizerFinished: () =>
                Tones.play_finalizer_completed(system, now),
        })
    )

export const PlaySound = Command.define("PlaySound", {
    args: { cue: SoundCue },
    messages: [PlayedSound],
    execute: ({ cue }) =>
        Effect.gen(function* () {
            const now = yield* Clock.currentTimeMillis
            const system = yield* AudioResource.get

            play_cue(system, cue, now)

            return PlayedSound()
        }).pipe(Effect.catch(() => Effect.succeed(PlayedSound()))),
})

export const acquire_audio = Effect.tryPromise({
    try: () => Tones.create_sound_system(),
    catch: (cause) => new AudioUnavailableError({ cause }),
})

export const release_audio = (system: SoundSystem): Effect.Effect<void> =>
    Effect.sync(() => {
        Tones.stop_all(system)
        Tones.dispose_sound_system(system)
    })

export class AudioUnavailableError extends S.TaggedError<AudioUnavailableError>()(
    "AudioUnavailableError",
    { cause: S.Defect() }
) {}
