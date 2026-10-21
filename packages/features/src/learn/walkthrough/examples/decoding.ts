import { Effect, Match as M, Option, Schema as S } from "effect"
import { AsyncData, Command, Subscription, type Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

import * as Timer from "./timer.ts"

export const City = S.Struct({
    name: S.String,
    latitude: S.Number,
    longitude: S.Number,
})
export type City = typeof City.Type

export const cities: ReadonlyArray<City> = [
    City.make({ name: "Tokyo", latitude: 35.6762, longitude: 139.6503 }),
    City.make({ name: "London", latitude: 51.5074, longitude: -0.1278 }),
    City.make({ name: "New York", latitude: 40.7128, longitude: -74.006 }),
    City.make({ name: "Sydney", latitude: -33.8688, longitude: 151.2093 }),
]

export const Reading = S.Struct({
    current: S.Struct({
        temperature_2m: S.Finite,
        relative_humidity_2m: S.Finite,
    }),
})
export type Reading = typeof Reading.Type

export const Weather = AsyncData.Schema(Reading, S.String)
export const Model = S.Struct({
    city_index: S.Number,
    weather: Weather.schema,
    timer: Timer.Timer,
})
export type Model = typeof Model.Type

export const SelectedCity = taggedStruct("SelectedCity", {
    city_index: S.Number,
})
export const SucceededFetchWeather = taggedStruct("SucceededFetchWeather", {
    reading: Reading,
})
export const FailedFetchWeather = taggedStruct("FailedFetchWeather", {
    error: S.String,
})
export const TickedWeatherTimer = taggedStruct("TickedWeatherTimer", {
    now_ms: S.Number,
})
export const Message = S.Union([
    SelectedCity,
    SucceededFetchWeather,
    FailedFetchWeather,
    TickedWeatherTimer,
])
export type Message = typeof Message.Type

const first_city =
    cities[0] ?? City.make({ name: "", latitude: 0, longitude: 0 })
const reading_url = (city: City): string =>
    `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m`

const FetchWeather = Command.define("FetchWeather", {
    args: { city: City },
    messages: [SucceededFetchWeather, FailedFetchWeather],
    execute: ({ city }) =>
        Effect.tryPromise(() => fetch(reading_url(city))).pipe(
            Effect.flatMap((response) =>
                Effect.tryPromise(() => response.json())
            ),
            Effect.flatMap(S.decodeUnknownEffect(Reading)),
            Effect.map((reading) => SucceededFetchWeather({ reading })),
            Effect.catch((error) =>
                Effect.succeed(FailedFetchWeather({ error: String(error) }))
            )
        ),
})

export const city_at = (city_index: number): City =>
    cities[city_index] ?? first_city

export const init: readonly [Model, ReadonlyArray<Command.Command<Message>>] = [
    Model.make({
        city_index: 0,
        weather: AsyncData.Loading(),
        timer: Timer.start(),
    }),
    [FetchWeather({ city: first_city })],
]

type UpdateReturn = Update.Return<Model, Message>
export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedCity: ({ city_index }) => ({
                model: modifyFields(model, {
                    city_index: () => city_index,
                    weather: (weather) =>
                        Option.getOrElse(
                            AsyncData.revalidateOrLoad(weather),
                            () => weather
                        ),
                    timer: Timer.start,
                }),
                commands: [FetchWeather({ city: city_at(city_index) })],
            }),
            SucceededFetchWeather: ({ reading }) => ({
                model: modifyFields(model, {
                    weather: () => AsyncData.Success({ data: reading }),
                    timer: Timer.settle,
                }),
                commands: [],
            }),
            FailedFetchWeather: ({ error }) => ({
                model: modifyFields(model, {
                    weather: (weather) =>
                        AsyncData.match(weather, {
                            onIdle: () => AsyncData.Failure({ error }),
                            onLoading: () => AsyncData.Failure({ error }),
                            onFailure: () => AsyncData.Failure({ error }),
                            onRefreshing: (data) =>
                                AsyncData.Stale({ error, data }),
                            onStale: ({ data }) =>
                                AsyncData.Stale({ error, data }),
                            onSuccess: (data) =>
                                AsyncData.Stale({ error, data }),
                        }),
                    timer: Timer.settle,
                }),
                commands: [],
            }),
            TickedWeatherTimer: ({ now_ms }) => ({
                model: modifyFields(model, {
                    timer: (timer) => Timer.tick(timer, now_ms),
                }),
                commands: [],
            }),
        })
    )

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    weatherTimer: entry(
        { is_ticking: S.Boolean },
        {
            modelToDependencies: (model) => ({
                is_ticking: Timer.is_ticking(model.timer),
            }),
            dependenciesToStream: ({ is_ticking }) =>
                Timer.tick_stream(is_ticking, (now_ms) =>
                    TickedWeatherTimer({ now_ms })
                ),
        }
    ),
}))
