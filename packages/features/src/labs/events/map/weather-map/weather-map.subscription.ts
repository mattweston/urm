import { Effect, Option, Queue, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"

import { clearMoveHandler, setMoveHandler } from "./weather-map.host.ts"
import { MovedMarker, type Message } from "./weather-map.message.ts"
import type { Model } from "./weather-map.model.ts"

export const SubscriptionDependencies = S.Struct({
    weatherMapMoves: S.Option(S.String),
})

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    weatherMapMoves: entry(SubscriptionDependencies.fields, {
        modelToDependencies: (model) => ({
            weatherMapMoves: model.maybeMapHostId,
        }),
        dependenciesToStream: ({ weatherMapMoves: maybeHostId }) =>
            Option.match(maybeHostId, {
                onNone: () => Stream.empty,
                onSome: (hostId) =>
                    Stream.callback<Message>((queue) =>
                        Effect.acquireRelease(
                            Effect.sync(() =>
                                setMoveHandler(hostId, (position) => {
                                    Queue.offerUnsafe(
                                        queue,
                                        MovedMarker({ position })
                                    )
                                })
                            ),
                            () => Effect.sync(() => clearMoveHandler(hostId))
                        ).pipe(Effect.flatMap(() => Effect.never))
                    ),
            }),
    }),
}))
