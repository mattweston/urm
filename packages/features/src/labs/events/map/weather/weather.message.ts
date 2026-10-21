import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { WeatherData } from "./weather.model.ts"

export const UpdatedPostcodeInput = taggedStruct("UpdatedPostcodeInput", {
    value: S.String,
})
export const SubmittedWeatherForm = taggedStruct("SubmittedWeatherForm")
export const SucceededFetchWeather = taggedStruct("SucceededFetchWeather", {
    weather: WeatherData,
})
export const FailedFetchWeather = taggedStruct("FailedFetchWeather", {
    error: S.String,
})

export const Message = S.Union([
    UpdatedPostcodeInput,
    SubmittedWeatherForm,
    SucceededFetchWeather,
    FailedFetchWeather,
])

export type Message = typeof Message.Type
