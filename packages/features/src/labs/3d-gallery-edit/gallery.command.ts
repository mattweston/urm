import { Array, Effect, Option, Schema as S } from "effect"
import { Command, File } from "foldkit"
import { pushUrl } from "foldkit/navigation"
import { frames, GalleryText } from "./images.ts"
import { ImageSettings } from "./gallery.presentation.ts"
import type { Model } from "./gallery.model.ts"
import {
    CompletedSyncScene,
    FailedSyncScene,
    FailedFocusFrame,
    FailedReplaceFrameImage,
    FailedResetCamera,
    FailedRestoreFrameImage,
    SucceededFocusFrame,
    SucceededReplaceFrameImage,
    SucceededResetCamera,
    SucceededRestoreFrameImage,
    CompletedNavigateGallery,
} from "./gallery.message.ts"
import { GALLERY_HOST_ID, getInstance } from "./host.ts"

const NavigateGallery = Command.define("NavigateGallery", {
    args: { href: S.String },
    messages: [CompletedNavigateGallery],
    execute: ({ href }) =>
        pushUrl(href).pipe(
            Effect.tap(() =>
                Effect.sync(() =>
                    window.dispatchEvent(new Event("urm:navigation"))
                )
            ),
            Effect.as(CompletedNavigateGallery())
        ),
})

const FocusFrame = Command.define("FocusFrame", {
    args: { frameKey: S.String },
    messages: [SucceededFocusFrame, FailedFocusFrame],
    execute: ({ frameKey }) =>
        Effect.promise(async () => {
            const { focusCameraOn } = await import("./scene.ts")
            const maybeInstance = Option.fromUndefinedOr(
                getInstance(GALLERY_HOST_ID)
            )

            if (Option.isNone(maybeInstance)) {
                return FailedFocusFrame({
                    frameKey,
                    error: "Gallery not mounted",
                })
            }

            const instance = maybeInstance.value
            const maybeFrame = Array.findFirst(
                instance.frameMeshes,
                (f) => f.key === frameKey
            )

            if (Option.isNone(maybeFrame)) {
                return FailedFocusFrame({
                    frameKey,
                    error: `Frame not found: ${frameKey}`,
                })
            }

            focusCameraOn(instance, maybeFrame.value.group)

            return SucceededFocusFrame({ frameKey })
        }),
})
const ReplaceFrameImage = Command.define("ReplaceFrameImage", {
    args: {
        file: File.File,
        frameKey: S.String,
        maybePreviousObjectUrl: S.Option(S.String),
    },
    messages: [SucceededReplaceFrameImage, FailedReplaceFrameImage],
    execute: ({ file, frameKey, maybePreviousObjectUrl }) =>
        Effect.promise(async () => {
            try {
                if (!file.type.startsWith("image/")) {
                    return FailedReplaceFrameImage({
                        frameKey,
                        error: `Not an image file: ${file.name}`,
                    })
                }

                const instance = getInstance(GALLERY_HOST_ID)
                if (instance === undefined) {
                    return FailedReplaceFrameImage({
                        frameKey,
                        error: "Gallery not mounted",
                    })
                }

                const objectUrl = URL.createObjectURL(file)
                instance.object_urls.add(objectUrl)
                try {
                    const { setFrameTexture } = await import("./scene.ts")
                    await setFrameTexture(instance, frameKey, objectUrl)
                } catch (error) {
                    URL.revokeObjectURL(objectUrl)
                    instance.object_urls.delete(objectUrl)
                    throw error
                }

                if (Option.isSome(maybePreviousObjectUrl)) {
                    URL.revokeObjectURL(maybePreviousObjectUrl.value)
                    instance.object_urls.delete(maybePreviousObjectUrl.value)
                }

                return SucceededReplaceFrameImage({ frameKey, objectUrl })
            } catch (error) {
                return FailedReplaceFrameImage({
                    frameKey,
                    error: errorMessage(error),
                })
            }
        }),
})
const RestoreFrameImage = Command.define("RestoreFrameImage", {
    args: { frameKey: S.String, objectUrl: S.String },
    messages: [SucceededRestoreFrameImage, FailedRestoreFrameImage],
    execute: ({ frameKey, objectUrl }) =>
        Effect.promise(async () => {
            try {
                const instance = getInstance(GALLERY_HOST_ID)
                if (instance === undefined) {
                    return FailedRestoreFrameImage({
                        frameKey,
                        error: "Gallery not mounted",
                    })
                }

                const frame = frames.find(
                    (frameDef) => frameDef.key === frameKey
                )
                if (frame === undefined) {
                    return FailedRestoreFrameImage({
                        frameKey,
                        error: `Frame not found: ${frameKey}`,
                    })
                }

                const { setFrameTexture } = await import("./scene.ts")
                await setFrameTexture(instance, frameKey, frame.url)
                URL.revokeObjectURL(objectUrl)
                instance.object_urls.delete(objectUrl)

                return SucceededRestoreFrameImage({ frameKey })
            } catch (error) {
                return FailedRestoreFrameImage({
                    frameKey,
                    error: errorMessage(error),
                })
            }
        }),
})

export const focusFrame = (frameKey: string) => FocusFrame({ frameKey })
export const navigateGallery = (href: string) => NavigateGallery({ href })
const ResetCamera = Command.define("ResetCamera", {
    messages: [SucceededResetCamera, FailedResetCamera],
    execute: Effect.promise(async () => {
        const { resetCamera } = await import("./scene.ts")
        const maybeInstance = Option.fromUndefinedOr(
            getInstance(GALLERY_HOST_ID)
        )

        if (Option.isNone(maybeInstance)) {
            return FailedResetCamera({ error: "Gallery not mounted" })
        }

        resetCamera(maybeInstance.value)

        return SucceededResetCamera()
    }),
})

export const resetCameraToDefault = () => ResetCamera()

const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : `${error}`

export const replaceFrameImage = (
    frameKey: string,
    file: File.File,
    maybePreviousObjectUrl: Option.Option<string>
) => ReplaceFrameImage({ file, frameKey, maybePreviousObjectUrl })

export const restoreFrameImage = (frameKey: string, objectUrl: string) =>
    RestoreFrameImage({ frameKey, objectUrl })

const SyncGalleryScene = Command.define("SyncGalleryScene", {
    args: {
        active: S.Boolean,
        text_overrides: S.Record(S.String, GalleryText),
        image_settings: S.Record(S.String, ImageSettings),
    },
    messages: [CompletedSyncScene, FailedSyncScene],
    execute: (settings) =>
        Effect.tryPromise({
            try: async () => {
                const instance = getInstance(GALLERY_HOST_ID)
                if (instance !== undefined && !instance.disposed) {
                    const { syncScene } = await import("./scene.ts")
                    if (!instance.disposed) syncScene(instance, settings)
                }
                return CompletedSyncScene()
            },
            catch: (error) => FailedSyncScene({ error: errorMessage(error) }),
        }).pipe(Effect.catch((message) => Effect.succeed(message))),
})

export const syncGalleryScene = (model: Model) =>
    SyncGalleryScene({
        active:
            !model.grid_view && model.route._tag !== "Gallery3dEditItemDetails",
        text_overrides: model.textOverrides,
        image_settings: model.image_settings,
    })

const RetryGalleryImages = Command.define("RetryGalleryImages", {
    args: { frame_keys: S.Array(S.String) },
    messages: [CompletedSyncScene],
    execute: ({ frame_keys }) =>
        Effect.promise(async () => {
            const instance = getInstance(GALLERY_HOST_ID)
            if (instance !== undefined && !instance.disposed) {
                const { loadGalleryTextures } = await import("./scene.ts")
                if (instance.disposed) return CompletedSyncScene()
                loadGalleryTextures(
                    instance,
                    frames.filter((frame) => frame_keys.includes(frame.key))
                )
            }
            return CompletedSyncScene()
        }),
})

export const retryGalleryImages = (frame_keys: ReadonlyArray<string>) =>
    RetryGalleryImages({ frame_keys })
