import { Array, Option, Schema as S } from "effect"

export const MapStyleId = S.Literals(["streets", "outdoors", "satellite"])

export type MapStyleId = typeof MapStyleId.Type

export type MapStyle = Readonly<{
    id: MapStyleId
    label: string
    url: string
}>

export const mapStyles: ReadonlyArray<MapStyle> = [
    {
        id: "streets",
        label: "Streets",
        url: "mapbox://styles/mapbox/streets-v12",
    },
    {
        id: "outdoors",
        label: "Outdoors",
        url: "mapbox://styles/mapbox/outdoors-v12",
    },
    {
        id: "satellite",
        label: "Satellite",
        url: "mapbox://styles/mapbox/satellite-streets-v12",
    },
]

export const mapStyleUrl = (id: MapStyleId): string =>
    Option.match(
        Array.findFirst(mapStyles, (style) => style.id === id),
        {
            onNone: () => "mapbox://styles/mapbox/streets-v12",
            onSome: ({ url }) => url,
        }
    )

// A value coming back off a <select> is a string, so it is checked against the
// list rather than trusted into the union.
export const parseMapStyleId = (value: string): Option.Option<MapStyleId> =>
    Option.map(
        Array.findFirst(mapStyles, (style) => style.id === value),
        ({ id }) => id
    )

// Where the map opens; the picker owns the style from then on.
export const initialMapStyleId = (): MapStyleId => "streets"
