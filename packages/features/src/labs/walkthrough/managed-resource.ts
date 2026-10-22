import { Effect, Match as M, Option, Schema as S } from "effect"
import { ManagedResource } from "foldkit"

import {
    FailedStartAudio,
    StartedAudio,
    StoppedAudio,
    resource,
} from "./audio.ts"
import type { Message } from "./message.ts"
import type { Model } from "./model.ts"

// The Model decides whether the context should exist: the two states that want
// sound ask for it, the two that do not release it. Nothing calls
// `new AudioContext()` or `close()` from an event handler.
export const managedResources = ManagedResource.make<Model, Message>()(
    (entry) => ({
        audio: entry(S.Option(S.Null), {
            resource,
            modelToMaybeRequirements: (model) =>
                M.value(model.audio).pipe(
                    M.tag("AudioStarting", "AudioReady", () =>
                        Option.some(null)
                    ),
                    M.tag("AudioOff", "AudioFailed", () => Option.none()),
                    M.exhaustive
                ),
            // A context built outside the click's own task starts suspended,
            // and a Command runs after the Message that caused it, so this one
            // always does. The page has sticky activation from that click by
            // now, which is what lets `resume` take.
            //
            // `resume` and `close` both reject rather than throw, and
            // Effect.promise turns a rejection into a defect the acquire fiber
            // dies on — which strands the Model in AudioStarting forever, since
            // onAcquireError only ever sees failures. Both are `tryPromise` so
            // a rejection is a value, and both are ignored because neither
            // outcome should decide whether the context exists: a context that
            // would not resume is still worth holding, and PlayCue resumes
            // again before every cue.
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
