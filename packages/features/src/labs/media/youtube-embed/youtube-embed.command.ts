import { Duration, Effect, Schema as S } from "effect"
import { Command } from "foldkit"
import {
    CompletedPlayerCommand,
    RetriedHandshake,
} from "./youtube-embed.message.ts"
import { YOUTUBE_NOCOOKIE_URL } from "./youtube-embed.urls.ts"

export const playerElementId = "youtube-embed-player"

const SendYouTubePlayerCommand = Command.define("SendYouTubePlayerCommand", {
    args: {
        func: S.Literals(["listening", "playVideo", "pauseVideo", "seekTo"]),
        seconds: S.optional(S.Number),
    },
    messages: [CompletedPlayerCommand],
    execute: ({ func, seconds }) =>
        Effect.sync(() => {
            const iframe = document.getElementById(playerElementId)

            if (iframe instanceof HTMLIFrameElement) {
                const message =
                    func === "listening"
                        ? { event: "listening", id: 1 }
                        : func === "seekTo"
                          ? {
                                event: "command",
                                func,
                                args: [seconds ?? 0, true],
                                id: 1,
                            }
                          : { event: "command", func, args: [], id: 1 }

                iframe.contentWindow?.postMessage(
                    JSON.stringify(message),
                    YOUTUBE_NOCOOKIE_URL
                )
            }

            return CompletedPlayerCommand()
        }),
})

export const handshakeBaseDelay = Duration.millis(200)

// Exponential, matching upstream's `Schedule.exponential("200 millis")`:
// 200ms, 400ms, 800ms, 1600ms.
const handshakeDelay = (attempt: number): Duration.Duration =>
    Duration.times(handshakeBaseDelay, 2 ** Math.max(0, attempt - 1))

const ScheduleHandshakeRetry = Command.define("ScheduleHandshakeRetry", {
    args: { attempt: S.Number },
    messages: [RetriedHandshake],
    execute: ({ attempt }) =>
        Effect.sleep(handshakeDelay(attempt)).pipe(
            Effect.as(RetriedHandshake({ attempt }))
        ),
})

export const scheduleHandshakeRetry = (attempt: number) =>
    ScheduleHandshakeRetry({ attempt })

export const listen = () => SendYouTubePlayerCommand({ func: "listening" })
export const play = () => SendYouTubePlayerCommand({ func: "playVideo" })
export const pause = () => SendYouTubePlayerCommand({ func: "pauseVideo" })
export const seek = (seconds: number) =>
    SendYouTubePlayerCommand({ func: "seekTo", seconds })
