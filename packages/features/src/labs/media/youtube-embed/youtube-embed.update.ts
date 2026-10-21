import { Match as M, Option } from "effect"
import { Command } from "foldkit"
import {
    listen,
    pause,
    play,
    scheduleHandshakeRetry,
    seek,
} from "./youtube-embed.command.ts"
import type { Message } from "./youtube-embed.message.ts"
import {
    HandshakeAwaiting,
    HandshakeConnected,
    HandshakeExhausted,
    PlaybackBuffering,
    PlaybackCued,
    PlaybackEnded,
    PlaybackPaused,
    PlaybackPlaying,
    PlaybackUnstarted,
    RequestPause,
    RequestPlay,
    RequestSeek,
    type Model,
    type Playback,
    type PlayerError,
    type PlayerRequest,
} from "./youtube-embed.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

// Upstream retries the `listening` message five times on an exponential
// backoff before giving up.
const HANDSHAKE_MAX_ATTEMPTS = 5

// The handshake window is short, so this only bounds a queue that would
// otherwise grow without limit against an iframe that never answers.
const MAX_PENDING_REQUESTS = 16

const playbackFromCode = (
    code: number,
    currentTimeSeconds: number,
    durationSeconds: number | undefined
): Playback => {
    switch (code) {
        case -1:
            return PlaybackUnstarted()
        case 0:
            return PlaybackEnded({
                currentTimeSeconds: durationSeconds ?? currentTimeSeconds,
            })
        case 1:
            return PlaybackPlaying({ currentTimeSeconds })
        case 2:
            return PlaybackPaused({ currentTimeSeconds })
        case 3:
            return PlaybackBuffering({ currentTimeSeconds })
        case 5:
            return PlaybackCued({ currentTimeSeconds })
        default:
            return PlaybackUnstarted()
    }
}

// The inverse of `playbackFromCode`. Most `infoDelivery` frames carry a time
// but no `playerState`, so the current playback has to supply the code for the
// patch to be applied to.
const playbackToCode = (playback: Playback): number =>
    M.value(playback).pipe(
        M.withReturnType<number>(),
        M.tagsExhaustive({
            PlaybackUnstarted: () => -1,
            PlaybackEnded: () => 0,
            PlaybackPlaying: () => 1,
            PlaybackPaused: () => 2,
            PlaybackBuffering: () => 3,
            PlaybackCued: () => 5,
        })
    )

const playerErrorFromCode = (code: number): PlayerError => {
    switch (code) {
        case 2:
            return "INVALID_PARAM"
        case 5:
            return "HTML5_ERROR"
        case 100:
            return "VIDEO_NOT_FOUND"
        case 101:
            return "NOT_EMBEDDABLE"
        case 150:
            return "NOT_EMBEDDABLE_DISGUISED"
        case 153:
            return "REFERRER_NOT_FOUND"
        default:
            return "UNKNOWN"
    }
}

const currentTime = (model: Model): number =>
    model.playback._tag === "PlaybackUnstarted"
        ? 0
        : model.playback.currentTimeSeconds

const commandForRequest = (request: PlayerRequest): Command.Command<Message> =>
    M.value(request).pipe(
        M.withReturnType<Command.Command<Message>>(),
        M.tagsExhaustive({
            RequestPlay: () => play(),
            RequestPause: () => pause(),
            RequestSeek: ({ seconds }) => seek(seconds),
        })
    )

// Before the iframe acknowledges the handshake it discards anything posted to
// it, so a request made in that window is held and replayed on connect.
const requestPlayer = (model: Model, request: PlayerRequest): UpdateReturn =>
    model.handshake._tag === "HandshakeConnected"
        ? [model, [commandForRequest(request)]]
        : [
              {
                  ...model,
                  pendingRequests: [
                      ...model.pendingRequests.slice(1 - MAX_PENDING_REQUESTS),
                      request,
                  ],
              },
              [],
          ]

// Any validated message from the iframe means it is listening — upstream opens
// its latch on the raw message, before the payload is even decoded.
const markConnected = (
    model: Model
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => [
    { ...model, handshake: HandshakeConnected(), pendingRequests: [] },
    model.pendingRequests.map(commandForRequest),
]

// A playing video posts `infoDelivery` roughly four times a second, so a small
// buffer holds only the last few seconds and flushes out the events actually
// worth reading — `onReady`, state changes, errors. Nothing is captured at all
// unless the debugger is on.
const MAX_DEBUG_EVENTS = 500

const appendDebugEvent = (model: Model, raw: string): ReadonlyArray<string> =>
    model.isDebugEnabled
        ? [...model.debugEvents.slice(1 - MAX_DEBUG_EVENTS), raw]
        : model.debugEvents

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            FocusedPreview: () => [{ ...model, isPreconnected: true }, []],
            HoveredPreview: () => [{ ...model, isPreconnected: true }, []],
            ClickedPreview: () => [{ ...model, isPreviewing: false }, []],
            LoadedPlayer: () => [
                { ...model, handshake: HandshakeAwaiting({ attempt: 1 }) },
                [listen(), scheduleHandshakeRetry(1)],
            ],
            RetriedHandshake: ({ attempt }) => {
                // A tick that no longer matches the attempt it was scheduled
                // for has been superseded — by a connection, or by a later
                // attempt already in flight.
                if (
                    model.handshake._tag !== "HandshakeAwaiting" ||
                    model.handshake.attempt !== attempt
                ) {
                    return [model, []]
                }

                return attempt >= HANDSHAKE_MAX_ATTEMPTS
                    ? [{ ...model, handshake: HandshakeExhausted() }, []]
                    : [
                          {
                              ...model,
                              handshake: HandshakeAwaiting({
                                  attempt: attempt + 1,
                              }),
                          },
                          [listen(), scheduleHandshakeRetry(attempt + 1)],
                      ]
            },
            ReceivedPlayerEvent: ({
                raw,
                playerState,
                currentTimeSeconds,
                durationSeconds,
            }) => {
                const [connected, commands] = markConnected(model)

                return [
                    {
                        ...connected,
                        playback: playbackFromCode(
                            playerState ?? playbackToCode(model.playback),
                            currentTimeSeconds ?? currentTime(model),
                            durationSeconds
                        ),
                        debugEvents: appendDebugEvent(model, raw),
                    },
                    commands,
                ]
            },
            ReceivedPlayerError: ({ raw, code }) => {
                const [connected] = markConnected(model)

                // A failed video still means the iframe is talking to us, but
                // replaying queued controls at a dead player is pointless.
                return [
                    {
                        ...connected,
                        maybePlayerError: Option.some(
                            playerErrorFromCode(code)
                        ),
                        debugEvents: appendDebugEvent(model, raw),
                    },
                    [],
                ]
            },
            ClickedPlay: () => requestPlayer(model, RequestPlay()),
            ClickedPause: () => requestPlayer(model, RequestPause()),
            ClickedSeek: ({ seconds }) =>
                requestPlayer(model, RequestSeek({ seconds })),
            CompletedPlayerCommand: () => [model, []],
            ToggledDebugger: () => [
                { ...model, isDebuggerOpen: !model.isDebuggerOpen },
                [],
            ],
            ChangedSeekInput: ({ value }) => [
                { ...model, seekInput: value },
                [],
            ],
            SubmittedSeek: () => {
                const seconds = Number(model.seekInput)

                return Number.isFinite(seconds) && seconds >= 0
                    ? requestPlayer(model, RequestSeek({ seconds }))
                    : [model, []]
            },
            ToggledDebugFilter: ({ label }) => [
                {
                    ...model,
                    debugFilters: model.debugFilters.includes(label)
                        ? model.debugFilters.filter(
                              (existing) => existing !== label
                          )
                        : [...model.debugFilters, label],
                },
                [],
            ],
            ClearedDebugFilters: () => [{ ...model, debugFilters: [] }, []],
        })
    )
