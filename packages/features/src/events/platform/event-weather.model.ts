import { Schema as S } from "effect"
import { AsyncData } from "foldkit"

export const EventWeather = S.Struct({
    temperature: S.Number,
    description: S.String,
    humidity: S.Number,
    wind_speed: S.Number,
    updated_at: S.Number,
})

export type EventWeather = typeof EventWeather.Type

export const EventWeatherAsyncData = AsyncData.Schema(EventWeather, S.String)
export type EventWeatherAsyncData = typeof EventWeatherAsyncData.schema.Type
