/** # Rhythm stack pulse Command
 *
 *  Schedules one pulse of the stacked rhythms on the AudioContext that
 *  {@link managedResources} owns. The context is read back through the resource
 *  tag rather than held here, so this module keeps no state between pulses.
 */
import { Effect, Schema as S } from "effect"
import { Command } from "foldkit"

import { resource } from "./rhythm-stack.audio.ts"
import { rhythmIds, totalUnits, voiceAtUnit } from "./rhythm-stack.data.ts"
import {
    CompletedPlayRhythmSounds,
    FailedPlayRhythmSounds,
} from "./rhythm-stack.message.ts"

const EnabledRhythms = S.Struct({
    sixEight: S.Boolean,
    fiveFour: S.Boolean,
    sevenFour: S.Boolean,
    twoFour: S.Boolean,
    threeFour: S.Boolean,
})

type EnabledRhythms = typeof EnabledRhythms.Type

const playTone = (
    context: AudioContext,
    frequency: number,
    gainValue: number,
    durationSeconds: number
): void => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime

    oscillator.frequency.value = frequency

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds)

    oscillator.connect(gain)
    gain.connect(context.destination)

    oscillator.start(now)
    oscillator.stop(now + durationSeconds + 0.01)
}

const playPulse = (
    context: AudioContext,
    step: number,
    enabledRhythms: EnabledRhythms
): void => {
    // Constant 4/4 bass drum.
    // The master clock is 12/8, so every three pulses is one beat.
    if (step % 3 === 0) {
        playTone(context, 70, 0.14, 0.09)
    }

    for (const rhythmId of rhythmIds) {
        if (!enabledRhythms[rhythmId]) {
            continue
        }

        const rhythmUnit = step % totalUnits(rhythmId)
        const voice = voiceAtUnit(rhythmId, rhythmUnit)

        if (voice === "boom") {
            playTone(context, 180, 0.08, 0.055)
        } else if (voice === "bap") {
            playTone(context, 330, 0.045, 0.055)
        }
    }
}

/** A pulse fired while the transport is stopped is not an error worth handling
 *  at the call site: `.get` fails with `ResourceNotAvailable` and the pulse is
 *  dropped. Anything else reaches the Model instead of being swallowed. */
export const PlayRhythmSounds = Command.define("PlayRhythmSounds", {
    args: {
        step: S.Number,
        enabledRhythms: EnabledRhythms,
    },
    messages: [CompletedPlayRhythmSounds, FailedPlayRhythmSounds],
    execute: ({ step, enabledRhythms }) =>
        resource.get.pipe(
            Effect.flatMap((context) =>
                // Backgrounding a tab suspends the context again, so the state
                // is worth re-checking rather than trusting what acquire left.
                (context.state === "suspended"
                    ? Effect.tryPromise(() => context.resume())
                    : Effect.void
                ).pipe(
                    Effect.andThen(
                        Effect.sync(() => {
                            playPulse(context, step, enabledRhythms)
                            return CompletedPlayRhythmSounds()
                        })
                    )
                )
            ),
            Effect.catchTag("ResourceNotAvailable", () =>
                Effect.succeed(CompletedPlayRhythmSounds())
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    FailedPlayRhythmSounds({ reason: String(error) })
                )
            )
        ),
})
