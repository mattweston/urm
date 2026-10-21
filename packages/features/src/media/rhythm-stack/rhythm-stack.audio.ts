/** # Rhythm stack audio resource
 *
 *  The AudioContext for the rhythm stack, owned by Foldkit rather than by this
 *  module. A context is a live browser handle: it cannot sit in the Model, and
 *  it cannot be built on import either, because there is no AudioContext while
 *  the page is being prerendered. Holding it in a module-level binding would
 *  make the pulse depend on state the runtime cannot see or replay, so the
 *  Model's own transport decides when it exists instead.
 */
import { Effect, Match as M, Option, Schema as S } from "effect"
import { ManagedResource } from "foldkit"

import {
    FailedStartAudio,
    StartedAudio,
    StoppedAudio,
} from "./rhythm-stack.message.ts"
import type { Message } from "./rhythm-stack.message.ts"
import type { Model } from "./rhythm-stack.model.ts"

/** The tag the pulse Command reads the context back out of. */
const AudioContextResource = ManagedResource.tag<AudioContext>()(
    "RhythmStackAudioContext"
)

/** The requirement a Command carries when it needs the rhythm stack's context. */
export type AudioService = ManagedResource.ServiceOf<
    typeof AudioContextResource
>

export const resource = AudioContextResource

/** Transport is the gate: playing wants a context, stopped releases it. Nothing
 *  calls `new AudioContext()` or `close()` from an event handler, and no result
 *  of the pulse Command feeds back into the transport that gates it. */
export const managedResources = ManagedResource.make<Model, Message>()(
    (entry) => ({
        audio: entry(S.Option(S.Null), {
            resource: AudioContextResource,
            modelToMaybeRequirements: (model) =>
                M.value(model.transport).pipe(
                    M.tag("Playing", () => Option.some(null)),
                    M.tag("Stopped", () => Option.none()),
                    M.exhaustive
                ),
            // A context built outside the click's own task starts suspended,
            // and a Command runs after the Message that caused it, so this one
            // always does. The page has sticky activation from the play click
            // by now, which is what lets `resume` take.
            //
            // `resume` and `close` reject rather than throw, and a rejection
            // under Effect.promise is a defect the acquire fiber dies on, which
            // would strand the transport in Playing with no sound. Both are
            // `tryPromise` so a rejection stays a value, and both are ignored:
            // a context that would not resume is still worth holding, and the
            // pulse resumes again before every step.
            acquire: () =>
                Effect.gen(function* () {
                    const context = yield* Effect.try(() => new AudioContext())
                    yield* Effect.tryPromise(() => context.resume()).pipe(
                        Effect.ignore
                    )
                    return context
                }),
            release: (context) =>
                Effect.tryPromise(() => context.close()).pipe(Effect.ignore),
            onAcquired: () => StartedAudio(),
            onReleased: () => StoppedAudio(),
            onAcquireError: (error) =>
                FailedStartAudio({ reason: String(error) }),
        }),
    })
)
