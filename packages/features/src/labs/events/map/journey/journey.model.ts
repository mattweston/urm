import { Option, Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const Coordinate = S.Tuple([S.Number, S.Number])

// Nothing fetched yet, fetching, ready to play, playing, or finished. Playing is
// distinct from ready so the controls can say what pressing them will do.
export const JourneyLoading = taggedStruct("JourneyLoading")
export const JourneyFailed = taggedStruct("JourneyFailed", { reason: S.String })
export const JourneyReady = taggedStruct("JourneyReady", {
    coordinates: S.Array(Coordinate),
    distanceMeters: S.Number,
    durationSeconds: S.Number,
})
export const JourneyPlaying = taggedStruct("JourneyPlaying", {
    coordinates: S.Array(Coordinate),
    distanceMeters: S.Number,
    durationSeconds: S.Number,
})
export const JourneyFinished = taggedStruct("JourneyFinished", {
    coordinates: S.Array(Coordinate),
    distanceMeters: S.Number,
    durationSeconds: S.Number,
})

export const JourneyState = S.Union([
    JourneyLoading,
    JourneyFailed,
    JourneyReady,
    JourneyPlaying,
    JourneyFinished,
])

export type JourneyState = typeof JourneyState.Type

export const Model = S.Struct({
    maybeMapHostId: S.Option(S.String),
    maybeMapError: S.Option(S.String),
    journeyState: JourneyState,
})

export type Model = typeof Model.Type

export const initialModel: Model = {
    maybeMapHostId: Option.none(),
    maybeMapError: Option.none(),
    journeyState: JourneyLoading(),
}
