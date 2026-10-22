import { Effect, Option, Schema as S, Stream } from "effect"
import { Subscription } from "foldkit"
import { streamFromEventFilterMap } from "foldkit/dom"
import {
    ReceivedPlayerError,
    ReceivedPlayerEvent,
} from "./youtube-embed.message.ts"
import type { Message } from "./youtube-embed.message.ts"
import type { Model } from "./youtube-embed.model.ts"
import { playerElementId } from "./youtube-embed.command.ts"
import { YOUTUBE_NOCOOKIE_URL } from "./youtube-embed.urls.ts"

const PlayerEvent = S.Struct({
    event: S.String,
    info: S.optional(
        S.Union([
            S.Number,
            S.Struct({
                playerState: S.optional(S.Number),
                currentTime: S.optional(S.Number),
                duration: S.optional(S.Number),
            }),
        ])
    ),
})

const decodePlayerEvent = S.decodeUnknownOption(S.fromJsonString(PlayerEvent))

const toMessage = (event: MessageEvent): Option.Option<Message> => {
    const iframe = document.getElementById(playerElementId)

    if (
        event.origin !== YOUTUBE_NOCOOKIE_URL ||
        !(iframe instanceof HTMLIFrameElement) ||
        event.source !== iframe.contentWindow
    ) {
        return Option.none()
    }

    return Option.flatMap(
        decodePlayerEvent(event.data),
        (decoded): Option.Option<Message> => {
            const raw = typeof event.data === "string" ? event.data : ""
            const info = decoded.info

            // `onError` and `onStateChange` both carry a bare numeric `info`,
            // but only the latter is a player state code. Splitting them here
            // keeps an error code from being read as a playback state.
            if (decoded.event === "onError") {
                return Option.some(
                    ReceivedPlayerError({
                        raw,
                        code: typeof info === "number" ? info : -1,
                    })
                )
            }

            const patch = typeof info === "object" ? info : undefined
            const playerState =
                typeof info === "number" ? info : patch?.playerState

            return Option.some(
                ReceivedPlayerEvent({
                    raw,
                    playerState,
                    currentTimeSeconds: patch?.currentTime,
                    durationSeconds: patch?.duration,
                })
            )
        }
    )
}

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    playerEvents: entry(
        { isListening: S.Boolean },
        {
            modelToDependencies: (model) => ({
                isListening: !model.isPreviewing,
            }),
            dependenciesToStream: ({ isListening }) =>
                Stream.when(
                    streamFromEventFilterMap({
                        target: window,
                        type: "message",
                        filterMapEvent: toMessage,
                    }),
                    Effect.succeed(isListening)
                ),
        }
    ),
}))
