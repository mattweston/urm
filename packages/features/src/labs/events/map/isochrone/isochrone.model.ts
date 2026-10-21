import { Option, Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { studios } from "../interactive-map/interactive-map.studio.ts"

export const Coordinate = S.Tuple([S.Number, S.Number])
export const Ring = S.Array(Coordinate)

// One contour: how many minutes it represents, the colour the API returned for
// it, and the polygon rings that bound it.
export const Band = S.Struct({
    minutes: S.Number,
    color: S.String,
    rings: S.Array(Ring),
})

export type Band = typeof Band.Type

export const TravelProfile = S.Literals(["driving", "cycling", "walking"])

export type TravelProfile = typeof TravelProfile.Type

export const BandsLoading = taggedStruct("BandsLoading")
export const BandsFailed = taggedStruct("BandsFailed", { reason: S.String })
export const BandsReady = taggedStruct("BandsReady", { bands: S.Array(Band) })

export const BandsState = S.Union([BandsLoading, BandsFailed, BandsReady])

export type BandsState = typeof BandsState.Type

export const Model = S.Struct({
    maybeMapHostId: S.Option(S.String),
    maybeMapError: S.Option(S.String),
    originStudioId: S.String,
    profile: TravelProfile,
    bandsState: BandsState,
})

export type Model = typeof Model.Type

// Lansdown Hall: central enough that every profile has somewhere to reach, and
// far enough up the valley that the bands are not all road.
const defaultOriginId = studios[0]?.id ?? ""

export const initialModel: Model = {
    maybeMapHostId: Option.none(),
    maybeMapError: Option.none(),
    originStudioId: defaultOriginId,
    profile: "driving",
    bandsState: BandsLoading(),
}
