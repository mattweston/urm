import { Data, Effect, Queue, Stream } from "effect"
import { Mount } from "foldkit"
import { frames } from "./images.ts"
import {
    ClickedCloseEditor,
    UpdatedTextureState,
    ClickedFrame,
    ClickedDetails,
    FailedMountGallery,
    SucceededMountGallery,
} from "./gallery.message.ts"
import type { Message } from "./gallery.message.ts"
import {
    GALLERY_HOST_ID,
    getInstance,
    removeInstance,
    setInstance,
} from "./host.ts"

type MountMessage = Extract<
    Message,
    {
        _tag:
            | "SucceededMountGallery"
            | "FailedMountGallery"
            | "ClickedFrame"
            | "ClickedDetails"
            | "ClickedCloseEditor"
            | "UpdatedTextureState"
    }
>

class GalleryMountError extends Data.TaggedError("GalleryMountError")<{
    readonly reason: string
    readonly cause?: unknown
}> {}

export const mountGallery = () =>
    Mount.defineStream("MountGallery3dEdit", {
        messages: [
            SucceededMountGallery,
            FailedMountGallery,
            ClickedFrame,
            ClickedDetails,
            ClickedCloseEditor,
            UpdatedTextureState,
        ],
        execute: ({ element }) =>
            Stream.callback<MountMessage>((queue) =>
                Effect.scoped(
                    Effect.gen(function* () {
                        yield* Effect.acquireRelease(
                            Effect.gen(function* () {
                                if (!(element instanceof HTMLElement)) {
                                    return yield* Effect.fail(
                                        new GalleryMountError({
                                            reason: "Gallery host is not an HTMLElement.",
                                        })
                                    )
                                }
                                const scene = yield* Effect.tryPromise({
                                    try: () => import("./scene.ts"),
                                    catch: (cause) =>
                                        new GalleryMountError({
                                            reason: `The 3D gallery module could not load: ${cause instanceof Error ? cause.message : globalThis.String(cause)}`,
                                            cause,
                                        }),
                                })
                                const instance = yield* Effect.try({
                                    try: () => {
                                        const inst = scene.initGalleryScene(
                                            element,
                                            frames
                                        )
                                        setInstance(GALLERY_HOST_ID, inst)
                                        return inst
                                    },
                                    catch: (error) =>
                                        new GalleryMountError({
                                            reason:
                                                error instanceof Error
                                                    ? error.message
                                                    : `Failed to init: ${error}`,
                                            cause: error,
                                        }),
                                })
                                instance.onClickFrame = (key: string) => {
                                    Queue.offerUnsafe(
                                        queue,
                                        ClickedFrame({ frameKey: key })
                                    )
                                }
                                instance.onClickLabel = (key: string) => {
                                    Queue.offerUnsafe(
                                        queue,
                                        ClickedDetails({ frameKey: key })
                                    )
                                }
                                instance.on_close = () =>
                                    Queue.offerUnsafe(
                                        queue,
                                        ClickedCloseEditor()
                                    )
                                instance.on_texture_state = (
                                    frame_key,
                                    status
                                ) =>
                                    Queue.offerUnsafe(
                                        queue,
                                        UpdatedTextureState({
                                            frame_key,
                                            status,
                                        })
                                    )
                                Queue.offerUnsafe(
                                    queue,
                                    SucceededMountGallery()
                                )
                                scene.loadGalleryTextures(instance, frames)
                                return { instance, scene }
                            }),
                            ({ instance, scene }) =>
                                Effect.sync(() => {
                                    instance.on_close = null
                                    instance.on_texture_state = null
                                    instance.onClickFrame = null
                                    instance.onClickLabel = null
                                    const existing =
                                        getInstance(GALLERY_HOST_ID)
                                    scene.cleanupGalleryScene(instance)
                                    if (existing === instance) {
                                        removeInstance(GALLERY_HOST_ID)
                                    }
                                })
                        )

                        return yield* Effect.never
                    }).pipe(
                        Effect.catch((error) =>
                            Effect.sync(() => {
                                console.error(
                                    "[3d-gallery] mount failed",
                                    error.cause ?? error
                                )
                                Queue.offerUnsafe(
                                    queue,
                                    FailedMountGallery({
                                        reason: error.reason,
                                    })
                                )
                            })
                        )
                    )
                )
            ),
    })()
