import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const WeatherData = S.Struct({
    postcode: S.String,
    temperature: S.Number,
    description: S.String,
    humidity: S.Number,
    windSpeed: S.Number,
    locationName: S.String,
    region: S.String,
})

export type WeatherData = typeof WeatherData.Type

export const WeatherInit = taggedStruct("WeatherInit")
export const WeatherLoading = taggedStruct("WeatherLoading")
export const WeatherSuccess = taggedStruct("WeatherSuccess", {
    data: WeatherData,
})
export const WeatherFailure = taggedStruct("WeatherFailure", {
    error: S.String,
})

export const WeatherAsyncResult = S.Union([
    WeatherInit,
    WeatherLoading,
    WeatherSuccess,
    WeatherFailure,
])

export type WeatherAsyncResult = typeof WeatherAsyncResult.Type

export const Model = S.Struct({
    postcodeInput: S.String,
    weather: WeatherAsyncResult,
})

export type Model = typeof Model.Type

export const initialModel: Model = {
    postcodeInput: "",
    weather: WeatherInit(),
}
