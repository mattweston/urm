import { Effect, Queue, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"

import { AdvancedPulse, type Message } from "./rhythm-stack.message.ts"
import type { Model } from "./rhythm-stack.model.ts"

const pulseStream = (tempo: number): Stream.Stream<Message> =>
    Stream.callback<Message>((queue) =>
        Effect.acquireRelease(
            Effect.sync(() => {
                // tempo represents the four main 4/4 beats.
                // Each beat contains three 12/8 eighth-note pulses.
                const pulseMilliseconds = 60_000 / tempo / 3

                const intervalId = window.setInterval(() => {
                    Queue.offerUnsafe(queue, AdvancedPulse())
                }, pulseMilliseconds)

                return intervalId
            }),
            (intervalId) =>
                Effect.sync(() => {
                    window.clearInterval(intervalId)
                })
        ).pipe(Effect.flatMap(() => Effect.never))
    )

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    clock: entry(
        {
            isPlaying: S.Boolean,
            tempo: S.Number,
        },
        {
            modelToDependencies: (model) => ({
                isPlaying: model.transport._tag === "Playing",
                tempo: model.tempo,
            }),

            dependenciesToStream: ({ isPlaying, tempo }) =>
                isPlaying ? pulseStream(tempo) : Stream.empty,
        }
    ),
}))
