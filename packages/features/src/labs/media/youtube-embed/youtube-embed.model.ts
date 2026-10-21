import { Option, Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const PlaybackUnstarted = taggedStruct("PlaybackUnstarted")
export const PlaybackEnded = taggedStruct("PlaybackEnded", {
    currentTimeSeconds: S.Number,
})
export const PlaybackPlaying = taggedStruct("PlaybackPlaying", {
    currentTimeSeconds: S.Number,
})
export const PlaybackPaused = taggedStruct("PlaybackPaused", {
    currentTimeSeconds: S.Number,
})
export const PlaybackBuffering = taggedStruct("PlaybackBuffering", {
    currentTimeSeconds: S.Number,
})
export const PlaybackCued = taggedStruct("PlaybackCued", {
    currentTimeSeconds: S.Number,
})

export const Playback = S.Union([
    PlaybackUnstarted,
    PlaybackEnded,
    PlaybackPlaying,
    PlaybackPaused,
    PlaybackBuffering,
    PlaybackCued,
])

export type Playback = typeof Playback.Type

// The `onError` codes the iframe API reports. `UNKNOWN` covers codes YouTube
// has not documented, so an unrecognised failure is still surfaced rather than
// dropped.
export const PlayerError = S.Literals([
    "INVALID_PARAM",
    "HTML5_ERROR",
    "VIDEO_NOT_FOUND",
    "NOT_EMBEDDABLE",
    "NOT_EMBEDDABLE_DISGUISED",
    "REFERRER_NOT_FOUND",
    "UNKNOWN",
])

export type PlayerError = typeof PlayerError.Type

// The iframe only starts posting events once it has received a `listening`
// message, and it drops that message if it arrives before its own API is up.
// `Awaiting` carries the attempt number so a stale retry tick can tell that it
// has been superseded.
export const HandshakeIdle = taggedStruct("HandshakeIdle")
export const HandshakeAwaiting = taggedStruct("HandshakeAwaiting", {
    attempt: S.Number,
})
export const HandshakeConnected = taggedStruct("HandshakeConnected")
export const HandshakeExhausted = taggedStruct("HandshakeExhausted")

export const Handshake = S.Union([
    HandshakeIdle,
    HandshakeAwaiting,
    HandshakeConnected,
    HandshakeExhausted,
])

export type Handshake = typeof Handshake.Type

// Control requests are held as data rather than dispatched straight to a
// command, so the ones made before the handshake completes can be replayed.
export const RequestPlay = taggedStruct("RequestPlay")
export const RequestPause = taggedStruct("RequestPause")
export const RequestSeek = taggedStruct("RequestSeek", { seconds: S.Number })

export const PlayerRequest = S.Union([RequestPlay, RequestPause, RequestSeek])

export type PlayerRequest = typeof PlayerRequest.Type

// schema.org `VideoObject` fields a caller can supply. Optional here so a bare
// `init(video)` still works, but Google requires `name`, `thumbnailUrl` and
// `uploadDate` before it will produce a video rich result. The first two are
// derived from the video id and title; `uploadDate` cannot be, so **a page that
// wants a rich result has to pass it** — omit it and the markup is valid
// schema.org that Google will ignore.
export const VideoSeo = S.Struct({
    // Required by Google. Defaults to the embed's own title.
    name: S.optional(S.String),
    // Required by Google. ISO 8601 date. Nothing derives this — pass it.
    uploadDate: S.optional(S.String),
    // Required by Google. Defaults to the video's large renditions; pass one to
    // override the whole list with a single image.
    thumbnailUrl: S.optional(S.String),
    // Recommended. 50-160 characters displays best in a search result.
    description: S.optional(S.String),
    // Recommended. ISO 8601 duration (PT#H#M#S).
    duration: S.optional(S.String),
    contentUrl: S.optional(S.String),
    embedUrl: S.optional(S.String),
})

export type VideoSeo = typeof VideoSeo.Type

export const Model = S.Struct({
    videoId: S.String,
    title: S.String,
    seo: VideoSeo,
    isPreviewing: S.Boolean,
    isPreconnected: S.Boolean,
    handshake: Handshake,
    playback: Playback,
    maybePlayerError: S.Option(PlayerError),
    pendingRequests: S.Array(PlayerRequest),
    isDebugEnabled: S.Boolean,
    isDebuggerOpen: S.Boolean,
    seekInput: S.String,
    // Empty means "no filter". Labels that have since scrolled out of
    // `debugEvents` are ignored at render rather than pruned here.
    debugFilters: S.Array(S.String),
    debugEvents: S.Array(S.String),
})

export type Model = typeof Model.Type

export const init = (
    video: {
        readonly id: string
        readonly title: string
    },
    options?: {
        readonly debug?: boolean | undefined
        readonly seo?: VideoSeo | undefined
    }
): Model => ({
    videoId: video.id,
    title: video.title,
    seo: options?.seo ?? {},
    isPreviewing: true,
    isPreconnected: false,
    handshake: HandshakeIdle(),
    playback: PlaybackUnstarted(),
    maybePlayerError: Option.none(),
    pendingRequests: [],
    isDebugEnabled: options?.debug ?? false,
    isDebuggerOpen: false,
    seekInput: "0",
    debugFilters: [],
    debugEvents: [],
})
