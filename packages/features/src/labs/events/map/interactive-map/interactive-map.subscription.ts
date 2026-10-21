import { Effect, Option, Queue, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"
import { clearEventHandlers, setEventHandlers } from "./interactive-map.host.ts"
import {
    ClickedMarker,
    FailedGeolocate,
    SucceededGeolocate,
    type Message,
} from "./interactive-map.message.ts"
import { type Model } from "./interactive-map.model.ts"

export const SubscriptionDependencies = S.Struct({
    interactiveMapEvents: S.Option(S.String),
})

// The markers and the geolocate control are built and owned imperatively by the
// Mount, so this is the seam where what they do becomes Messages. The handlers
// live as long as the subscription does, and markers coming and going with the
// area selection never touch them.
export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    interactiveMapEvents: entry(SubscriptionDependencies.fields, {
        modelToDependencies: (model) => ({
            interactiveMapEvents: model.maybeMapHostId,
        }),
        dependenciesToStream: ({ interactiveMapEvents: maybeHostId }) =>
            Option.match(maybeHostId, {
                onNone: () => Stream.empty,
                onSome: (hostId) =>
                    Stream.callback<Message>((queue) =>
                        Effect.acquireRelease(
                            Effect.sync(() =>
                                setEventHandlers(hostId, {
                                    onStudioClick: (studioId: string) => {
                                        Queue.offerUnsafe(
                                            queue,
                                            ClickedMarker({ studioId })
                                        )
                                    },
                                    onGeolocate: (lng: number, lat: number) => {
                                        Queue.offerUnsafe(
                                            queue,
                                            SucceededGeolocate({ lng, lat })
                                        )
                                    },
                                    onGeolocateError: (reason: string) => {
                                        Queue.offerUnsafe(
                                            queue,
                                            FailedGeolocate({ reason })
                                        )
                                    },
                                })
                            ),
                            () => Effect.sync(() => clearEventHandlers(hostId))
                        ).pipe(Effect.flatMap(() => Effect.never))
                    ),
            }),
    }),
}))
