import { Match as M } from "effect"
import { Command } from "foldkit"
import { fetchWeather } from "./weather.command.ts"
import type { Message } from "./weather.message.ts"
import type { Model } from "./weather.model.ts"
import {
    WeatherFailure,
    WeatherLoading,
    WeatherSuccess,
    initialModel,
} from "./weather.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (): UpdateReturn => [initialModel, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedPostcodeInput: ({ value }) => [
                {
                    ...model,
                    postcodeInput: value,
                },
                [],
            ],
            SubmittedWeatherForm: () => [
                {
                    ...model,
                    weather: WeatherLoading(),
                },
                [fetchWeather(model.postcodeInput)],
            ],
            SucceededFetchWeather: ({ weather }) => [
                {
                    ...model,
                    weather: WeatherSuccess({ data: weather }),
                },
                [],
            ],
            FailedFetchWeather: ({ error }) => [
                {
                    ...model,
                    weather: WeatherFailure({ error }),
                },
                [],
            ],
        })
    )
