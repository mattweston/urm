import { Effect, Function, Option, Queue, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"

import { getEventMap } from "./map.host.ts"
import { PickedEventCoordinates, type Message } from "./map.message.ts"
import type { Model } from "./app.model.ts"

type ClickEvent = {
    readonly lngLat: { readonly lng: number; readonly lat: number }
}

export const EventMapSubscriptionDependencies = S.Struct({
    maybeEventMapHostId: S.Option(S.String),
})

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    maybeEventMapHostId: entry(EventMapSubscriptionDependencies.fields, {
        modelToDependencies: (model) => ({
            maybeEventMapHostId: model.maybeEventMapHostId,
        }),
        dependenciesToStream: ({ maybeEventMapHostId }) =>
            Option.match(maybeEventMapHostId, {
                onNone: () => Stream.empty,
                onSome: (hostId) =>
                    Stream.callback<Message>((queue) =>
                        Effect.acquireRelease(
                            Effect.sync(() =>
                                Option.match(getEventMap(hostId), {
                                    onNone: () => Option.none(),
                                    onSome: ({ map, marker }) => {
                                        const onClick = (event: ClickEvent) => {
                                            marker.setLngLat([
                                                event.lngLat.lng,
                                                event.lngLat.lat,
                                            ])
                                            Queue.offerUnsafe(
                                                queue,
                                                PickedEventCoordinates({
                                                    lng: event.lngLat.lng,
                                                    lat: event.lngLat.lat,
                                                })
                                            )
                                        }

                                        const onDragEnd = () => {
                                            const lngLat = marker.getLngLat()

                                            Queue.offerUnsafe(
                                                queue,
                                                PickedEventCoordinates({
                                                    lng: lngLat.lng,
                                                    lat: lngLat.lat,
                                                })
                                            )
                                        }

                                        map.on("click", onClick)
                                        marker.on("dragend", onDragEnd)

                                        return Option.some({
                                            map,
                                            onClick,
                                            marker,
                                            onDragEnd,
                                        })
                                    },
                                })
                            ),
                            (maybeHandle) =>
                                Effect.sync(() =>
                                    Option.match(maybeHandle, {
                                        onNone: Function.constVoid,
                                        onSome: ({
                                            map,
                                            marker,
                                            onClick,
                                            onDragEnd,
                                        }) => {
                                            map.off("click", onClick)
                                            marker.off("dragend", onDragEnd)
                                        },
                                    })
                                )
                        ).pipe(Effect.flatMap(() => Effect.never))
                    ),
            }),
    }),
}))
