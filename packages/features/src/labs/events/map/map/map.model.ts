import { Option, Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { featuredLocations, Location } from "./map.location.ts"

export const Bounds = S.Struct({
    west: S.Number,
    south: S.Number,
    east: S.Number,
    north: S.Number,
})

export type Bounds = typeof Bounds.Type

export const LngLat = S.Struct({
    lng: S.Number,
    lat: S.Number,
})

export type LngLat = typeof LngLat.Type

export const GeolocateIdle = taggedStruct("GeolocateIdle")
export const GeolocateLocating = taggedStruct("GeolocateLocating")
export const GeolocateFailed = taggedStruct("GeolocateFailed", {
    reason: S.String,
})

export const GeolocateState = S.Union([
    GeolocateIdle,
    GeolocateLocating,
    GeolocateFailed,
])

export type GeolocateState = typeof GeolocateState.Type

export const Model = S.Struct({
    locations: S.Array(Location),
    searchQuery: S.String,
    maybeMapHostId: S.Option(S.String),
    maybeMapError: S.Option(S.String),
    maybeBounds: S.Option(Bounds),
    maybeSelectedLocationId: S.Option(S.String),
    maybeUserLocation: S.Option(LngLat),
    geolocateState: GeolocateState,
})

export type Model = typeof Model.Type

export const initialModel: Model = {
    locations: featuredLocations,
    searchQuery: "",
    maybeMapHostId: Option.none(),
    maybeMapError: Option.none(),
    maybeBounds: Option.none(),
    maybeSelectedLocationId: Option.none(),
    maybeUserLocation: Option.none(),
    geolocateState: GeolocateIdle(),
}
