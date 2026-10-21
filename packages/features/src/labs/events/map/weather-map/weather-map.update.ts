import { Match as M, Option } from "effect"
import { Command } from "foldkit"

import { fetchReadings } from "./weather-map.command.ts"
import type { Message } from "./weather-map.message.ts"
import type { Model } from "./weather-map.model.ts"
import { initialModel } from "./weather-map.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [
    initialModel,
    fetchReadings(initialModel.position),
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            SucceededMountMap: ({ hostId }) => [
                { ...model, maybeMapHostId: Option.some(hostId) },
                [],
            ],
            FailedMountMap: ({ reason }) => [
                { ...model, mapError: Option.some(reason) },
                [],
            ],
            MovedMarker: ({ position }) => [
                {
                    ...model,
                    position,
                    forecastError: Option.none(),
                    isForecastLoading: true,
                    airQualityError: Option.none(),
                    isAirQualityLoading: true,
                    placeError: Option.none(),
                    isPlaceLoading: true,
                },
                fetchReadings(position),
            ],
            SucceededFetchForecast: ({ forecast }) => [
                {
                    ...model,
                    forecast: Option.some(forecast),
                    isForecastLoading: false,
                },
                [],
            ],
            FailedFetchForecast: ({ reason }) => [
                {
                    ...model,
                    forecastError: Option.some(reason),
                    isForecastLoading: false,
                },
                [],
            ],
            SucceededFetchAirQuality: ({ airQuality }) => [
                {
                    ...model,
                    airQuality: Option.some(airQuality),
                    isAirQualityLoading: false,
                },
                [],
            ],
            FailedFetchAirQuality: ({ reason }) => [
                {
                    ...model,
                    airQualityError: Option.some(reason),
                    isAirQualityLoading: false,
                },
                [],
            ],
            SucceededFetchPlace: ({ place }) => [
                { ...model, place: Option.some(place), isPlaceLoading: false },
                [],
            ],
            FailedFetchPlace: ({ reason }) => [
                {
                    ...model,
                    placeError: Option.some(reason),
                    isPlaceLoading: false,
                },
                [],
            ],
        })
    )
