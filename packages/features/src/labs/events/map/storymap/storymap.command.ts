import { Array, Effect, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import { CameraPosition, chapters, MapAnimation } from "./storymap.chapter.ts"
import { RouteGroupId } from "../interactive-map/interactive-map.studio.ts"
import {
    CAMERA_DURATION_MS,
    cameraEasing,
    ROTATION_DEGREES,
    ROTATION_DURATION_MS,
} from "./storymap.constant.ts"
import { getEntry, showMarkersForArea } from "./storymap.host.ts"
import { CompletedMoveCamera } from "./storymap.message.ts"

// Everything a chapter does to the map, in one command: move the camera, swap
// in that valley's studio pins, swing the inset, and start the slow turn if the
// chapter asked for one. They belong together because they are one visual
// event, and splitting them would let the pins land before the camera.
const MoveCamera = Command.define("MoveCamera", {
    args: {
        maybeHostId: S.Option(S.String),
        areaId: RouteGroupId,
        location: CameraPosition,
        mapAnimation: MapAnimation,
        rotateAnimation: S.Boolean,
    },
    messages: [CompletedMoveCamera],
    execute: ({
        maybeHostId,
        areaId,
        location,
        mapAnimation,
        rotateAnimation,
    }) =>
        Option.match(maybeHostId, {
            onNone: () => Effect.void,
            onSome: (hostId) =>
                Option.match(getEntry(hostId), {
                    onNone: () => Effect.void,
                    onSome: ({ map, inset }) =>
                        Effect.sync(() => {
                            const camera = {
                                center: [location.lng, location.lat] as [
                                    number,
                                    number,
                                ],
                                zoom: location.zoom,
                                pitch: location.pitch,
                                bearing: location.bearing,
                            }

                            if (mapAnimation === "jumpTo") {
                                map.jumpTo(camera)
                            } else if (mapAnimation === "easeTo") {
                                map.easeTo({
                                    ...camera,
                                    duration: CAMERA_DURATION_MS,
                                    easing: cameraEasing,
                                })
                            } else {
                                // Kept for chapters far enough apart to want
                                // the arc. curve below the 1.42 default keeps
                                // the zoom-out shallow.
                                map.flyTo({
                                    ...camera,
                                    duration: CAMERA_DURATION_MS,
                                    curve: 1.1,
                                    easing: cameraEasing,
                                })
                            }

                            showMarkersForArea(hostId, areaId)

                            Option.match(inset, {
                                onNone: () => undefined,
                                onSome: ({
                                    map: insetMap,
                                    marker: insetMarker,
                                }) => {
                                    insetMap.easeTo({
                                        center: [location.lng, location.lat],
                                        duration: CAMERA_DURATION_MS,
                                        easing: cameraEasing,
                                    })
                                    insetMarker.setLngLat([
                                        location.lng,
                                        location.lat,
                                    ])
                                },
                            })

                            if (!rotateAnimation) {
                                return
                            }

                            // Waits for the move to land, otherwise the turn
                            // fights the approach and the camera arrives
                            // pointing somewhere it was never asked to.
                            map.once("moveend", () => {
                                map.rotateTo(
                                    map.getBearing() + ROTATION_DEGREES,
                                    {
                                        duration: ROTATION_DURATION_MS,
                                        easing: (t: number) => t,
                                    }
                                )
                            })
                        }),
                }),
        }).pipe(Effect.ignore, Effect.as(CompletedMoveCamera())),
})

export const moveCamera = (
    maybeHostId: Option.Option<string>,
    chapterId: string
): ReadonlyArray<ReturnType<typeof MoveCamera>> =>
    Option.match(
        Array.findFirst(chapters, (chapter) => chapter.id === chapterId),
        {
            onNone: () => [],
            onSome: ({ id, location, mapAnimation, rotateAnimation }) => [
                MoveCamera({
                    maybeHostId,
                    areaId: id,
                    location,
                    mapAnimation,
                    rotateAnimation,
                }),
            ],
        }
    )

// Clicking a chapter in the navigation scrolls to it; the observer then reports
// it as entered, so the camera move is not duplicated here.
const ScrollToChapter = Command.define("ScrollToChapter", {
    args: { chapterId: S.String },
    messages: [CompletedMoveCamera],
    execute: ({ chapterId }) =>
        Effect.sync(() => {
            document
                .querySelector(`[data-chapter-id="${chapterId}"]`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" })

            return CompletedMoveCamera()
        }),
})

export const scrollToChapter = (chapterId: string) =>
    ScrollToChapter({ chapterId })
