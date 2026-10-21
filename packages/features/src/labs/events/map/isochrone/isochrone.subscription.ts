import { Effect, Option, Queue, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"
import { clearStudioHandler, setStudioHandler } from "./isochrone.host.ts"
import { SelectedOrigin, type Message } from "./isochrone.message.ts"
import { type Model } from "./isochrone.model.ts"

export const SubscriptionDependencies = S.Struct({
    isochroneStudios: S.Option(S.String),
})

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    isochroneStudios: entry(SubscriptionDependencies.fields, {
        modelToDependencies: (model) => ({
            isochroneStudios: model.maybeMapHostId,
        }),
        dependenciesToStream: ({ isochroneStudios: maybeHostId }) =>
            Option.match(maybeHostId, {
                onNone: () => Stream.empty,
                onSome: (hostId) =>
                    Stream.callback<Message>((queue) =>
                        Effect.acquireRelease(
                            Effect.sync(() =>
                                setStudioHandler(hostId, (studioId) => {
                                    Queue.offerUnsafe(
                                        queue,
                                        SelectedOrigin({ studioId })
                                    )
                                })
                            ),
                            () => Effect.sync(() => clearStudioHandler(hostId))
                        ).pipe(Effect.flatMap(() => Effect.never))
                    ),
            }),
    }),
}))
