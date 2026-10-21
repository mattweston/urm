import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/unstable/rpc"
import {
    AuthenticatedRpcMiddleware,
    PublicWorkerRpcMiddleware,
} from "../../auth-legacy/rpc-middleware.ts"

export const WeatherData = Schema.Struct({
    temperature: Schema.Number,
    description: Schema.String,
    humidity: Schema.Number,
    windSpeed: Schema.Number,
})
export type WeatherData = typeof WeatherData.Type

export const WeatherUnavailableError = Schema.Struct({
    message: Schema.String,
})
export type WeatherUnavailableError = typeof WeatherUnavailableError.Type

const WeatherRequest = Schema.Struct({
    latitude: Schema.Number,
    longitude: Schema.Number,
})

export const WeatherGetCurrentRpc = Rpc.make("weather.get_current", {
    payload: WeatherRequest,
    success: WeatherData,
    error: WeatherUnavailableError,
})

export const PublicWeatherGetCurrentRpc = Rpc.make(
    "weather.public.get_current",
    {
        payload: WeatherRequest,
        success: WeatherData,
        error: WeatherUnavailableError,
    }
)

const PublicWeatherRpcs = RpcGroup.make(PublicWeatherGetCurrentRpc).middleware(
    PublicWorkerRpcMiddleware
)

const AuthenticatedWeatherRpcs = RpcGroup.make(WeatherGetCurrentRpc).middleware(
    AuthenticatedRpcMiddleware
)

export const WeatherRpcs = PublicWeatherRpcs.merge(AuthenticatedWeatherRpcs)
