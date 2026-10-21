import { Effect, Function, Option, Queue, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"
import type { Map as MapInstance } from "maplibre-gl"
import { getMap } from "./map.host.ts"
import { ClickedMarker, MovedMap, type Message } from "./map.message.ts"
import { Bounds, type Model } from "./map.model.ts"

export const SubscriptionDependencies = S.Struct({
    mapEvents: S.Option(S.String),
})

const boundsFromMap = (map: MapInstance): Bounds => {
    const bounds = map.getBounds()

    return {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
    }
}

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    mapEvents: entry(SubscriptionDependencies.fields, {
        modelToDependencies: (model) => ({
            mapEvents: model.maybeMapHostId,
        }),
        dependenciesToStream: ({ mapEvents: maybeHostId }) =>
            Option.match(maybeHostId, {
                onNone: () => Stream.empty,
                onSome: (hostId) =>
                    Stream.callback<Message>((queue) =>
                        Effect.acquireRelease(
                            Effect.sync(() =>
                                Option.match(getMap(hostId), {
                                    onNone: () => Option.none(),
                                    onSome: (map) => {
                                        const onMoveEnd = () => {
                                            Queue.offerUnsafe(
                                                queue,
                                                MovedMap({
                                                    bounds: boundsFromMap(map),
                                                })
                                            )
                                        }

                                        const onContainerClick = (
                                            event: MouseEvent
                                        ) => {
                                            const target = event.target

                                            if (!(target instanceof Element)) {
                                                return
                                            }

                                            const marker =
                                                target.closest(
                                                    "[data-location-id]"
                                                )

                                            if (
                                                !(marker instanceof HTMLElement)
                                            ) {
                                                return
                                            }

                                            const locationId =
                                                marker.dataset["locationId"]

                                            if (locationId !== undefined) {
                                                Queue.offerUnsafe(
                                                    queue,
                                                    ClickedMarker({
                                                        locationId,
                                                    })
                                                )
                                            }
                                        }

                                        map.on("moveend", onMoveEnd)
                                        map.getContainer().addEventListener(
                                            "click",
                                            onContainerClick
                                        )

                                        Queue.offerUnsafe(
                                            queue,
                                            MovedMap({
                                                bounds: boundsFromMap(map),
                                            })
                                        )

                                        return Option.some({
                                            map,
                                            onMoveEnd,
                                            onContainerClick,
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
                                            onMoveEnd,
                                            onContainerClick,
                                        }) => {
                                            map.off("moveend", onMoveEnd)
                                            map.getContainer().removeEventListener(
                                                "click",
                                                onContainerClick
                                            )
                                        },
                                    })
                                )
                        ).pipe(Effect.flatMap(() => Effect.never))
                    ),
            }),
    }),
}))
