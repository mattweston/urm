import { Data, Effect, Option, Schema as S } from "effect"
import { Command, Dom } from "foldkit"
import { GEOLOCATION_TIMEOUT_MS, SEARCH_INPUT_ID } from "./map.constant.ts"
import { getMap } from "./map.host.ts"
import {
    CompletedFocusSearchInput,
    CompletedLockBodyScroll,
    CompletedUnlockBodyScroll,
    FailedFlyTo,
    FailedGeolocate,
    SucceededFlyTo,
    SucceededGeolocate,
} from "./map.message.ts"

export const FlyTo = Command.define("FlyTo", {
    args: {
        maybeHostId: S.Option(S.String),
        lng: S.Number,
        lat: S.Number,
        zoom: S.Number,
    },
    messages: [SucceededFlyTo, FailedFlyTo],
    execute: ({ maybeHostId, lng, lat, zoom }) =>
        Option.match(maybeHostId, {
            onNone: () =>
                Effect.succeed(
                    FailedFlyTo({
                        reason: "FlyTo dispatched before the map mounted.",
                    })
                ),
            onSome: (hostId) => flyToMap(hostId, lng, lat, zoom),
        }),
})

class GeolocationError extends Data.TaggedError("GeolocationError")<{
    readonly reason: string
}> {}

export const FocusSearchInput = Command.define("FocusSearchInput", {
    messages: [CompletedFocusSearchInput],
    execute: Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
        Effect.ignore,
        Effect.as(CompletedFocusSearchInput())
    ),
})

export const LockBodyScroll = Command.define("LockBodyScroll", {
    messages: [CompletedLockBodyScroll],
    execute: Effect.sync(() => {
        document.body.classList.add("overflow-hidden")
        return CompletedLockBodyScroll()
    }),
})

export const UnlockBodyScroll = Command.define("UnlockBodyScroll", {
    messages: [CompletedUnlockBodyScroll],
    execute: Effect.sync(() => {
        document.body.classList.remove("overflow-hidden")
        return CompletedUnlockBodyScroll()
    }),
})

const flyToMap = (
    hostId: string,
    lng: number,
    lat: number,
    zoom: number
): Effect.Effect<typeof SucceededFlyTo.Type | typeof FailedFlyTo.Type> =>
    Option.match(getMap(hostId), {
        onNone: () =>
            Effect.succeed(
                FailedFlyTo({
                    reason: `Could not find a live map for hostId ${hostId}.`,
                })
            ),
        onSome: (map) =>
            Effect.sync(() => {
                map.flyTo({ center: [lng, lat], zoom, essential: true })
                return SucceededFlyTo()
            }),
    })

export const Geolocate = Command.define("Geolocate", {
    messages: [SucceededGeolocate, FailedGeolocate],
    execute: Effect.gen(function* () {
        const position = yield* Effect.callback<
            GeolocationPosition,
            GeolocationError
        >((resume) => {
            if (typeof navigator === "undefined" || !navigator.geolocation) {
                resume(
                    Effect.fail(
                        new GeolocationError({
                            reason: "Geolocation is not available in this browser context.",
                        })
                    )
                )
                return
            }

            navigator.geolocation.getCurrentPosition(
                (nextPosition) => resume(Effect.succeed(nextPosition)),
                (error) =>
                    resume(
                        Effect.fail(
                            new GeolocationError({
                                reason: error.message,
                            })
                        )
                    ),
                {
                    enableHighAccuracy: false,
                    timeout: GEOLOCATION_TIMEOUT_MS,
                }
            )
        })

        return SucceededGeolocate({
            lng: position.coords.longitude,
            lat: position.coords.latitude,
        })
    }).pipe(
        Effect.catch((error) =>
            Effect.succeed(
                FailedGeolocate({
                    reason: error.reason,
                })
            )
        )
    ),
})
