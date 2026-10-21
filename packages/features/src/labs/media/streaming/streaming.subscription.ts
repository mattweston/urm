import { Effect, Option, Queue, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"

import { FailedStream, StartedStream } from "./streaming.message.ts"
import type { Message } from "./streaming.message.ts"
import type { Model } from "./streaming.model.ts"

const VIDEO_ID = "labs-media-streaming-video"

const videoElement = (): Option.Option<HTMLVideoElement> => {
    const element = document.getElementById(VIDEO_ID)

    return element instanceof HTMLVideoElement
        ? Option.some(element)
        : Option.none()
}

const clearVideo = (): void => {
    Option.match(videoElement(), {
        onNone: () => undefined,
        onSome: (video) => {
            video.srcObject = null
        },
    })
}

const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : "Unable to access the camera."

const requestMediaStream = (): Promise<MediaStream> => {
    const media_devices = navigator.mediaDevices

    if (
        media_devices === undefined ||
        typeof media_devices.getUserMedia !== "function"
    ) {
        return Promise.reject(
            new Error(
                "Camera access is unavailable. Open this page over HTTPS or localhost and use a browser that supports media capture."
            )
        )
    }

    return media_devices.getUserMedia({
        video: true,
        audio: true,
    })
}

const cameraStream = (): Stream.Stream<Message> =>
    Stream.callback<Message>((queue) =>
        Effect.acquireRelease(
            Effect.tryPromise({
                try: requestMediaStream,
                catch: errorMessage,
            }).pipe(
                Effect.matchEffect({
                    onFailure: (message) =>
                        Effect.sync(() => {
                            Queue.offerUnsafe(
                                queue,
                                FailedStream({ errorMessage: message })
                            )
                            return Option.none<MediaStream>()
                        }),
                    onSuccess: (stream) =>
                        Effect.sync(() => {
                            Option.match(videoElement(), {
                                onNone: () => undefined,
                                onSome: (video) => {
                                    video.srcObject = stream
                                },
                            })
                            Queue.offerUnsafe(queue, StartedStream())
                            return Option.some(stream)
                        }),
                })
            ),
            (maybeStream) =>
                Effect.sync(() => {
                    Option.match(maybeStream, {
                        onNone: clearVideo,
                        onSome: (stream) => {
                            for (const track of stream.getTracks()) {
                                track.stop()
                            }
                            clearVideo()
                        },
                    })
                })
        ).pipe(Effect.flatMap(() => Effect.never))
    )

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    cameraStream: entry(
        { shouldStream: S.Boolean },
        {
            modelToDependencies: (model) => ({
                shouldStream: model.status !== "Idle",
            }),
            dependenciesToStream: ({ shouldStream }) =>
                shouldStream ? cameraStream() : Stream.empty,
        }
    ),
}))

export { VIDEO_ID }
