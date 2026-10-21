import { Option, Schema as S } from "effect"

import { AirQuality } from "./air-quality.ts"
import { Place } from "./place.ts"
import { Forecast, Position } from "./weather.ts"

export const Model = S.Struct({
    position: Position,
    maybeMapHostId: S.Option(S.String),
    mapError: S.Option(S.String),
    forecast: S.Option(Forecast),
    forecastError: S.Option(S.String),
    isForecastLoading: S.Boolean,
    airQuality: S.Option(AirQuality),
    airQualityError: S.Option(S.String),
    isAirQualityLoading: S.Boolean,
    place: S.Option(Place),
    placeError: S.Option(S.String),
    isPlaceLoading: S.Boolean,
})

export type Model = typeof Model.Type

export const initialModel: Model = {
    position: { lng: -2.217, lat: 51.745 },
    maybeMapHostId: Option.none(),
    mapError: Option.none(),
    forecast: Option.none(),
    forecastError: Option.none(),
    isForecastLoading: true,
    airQuality: Option.none(),
    airQualityError: Option.none(),
    isAirQualityLoading: true,
    place: Option.none(),
    placeError: Option.none(),
    isPlaceLoading: true,
}
