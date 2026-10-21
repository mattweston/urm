import { Match as M } from "effect"
import { Command } from "foldkit"

import * as InteractiveMap from "./interactive-map/interactive-map.update.ts"
import { initialModel as initialInteractiveMapModel } from "./interactive-map/interactive-map.model.ts"
import type { Message as InteractiveMapMessage } from "./interactive-map/interactive-map.message.ts"
import * as MapDemo from "./map/map.update.ts"
import { initialModel as initialMapModel } from "./map/map.model.ts"
import type { Message as MapMessage } from "./map/map.message.ts"
import * as Journey from "./journey/journey.update.ts"
import { initialModel as initialJourneyModel } from "./journey/journey.model.ts"
import type { Message as JourneyMessage } from "./journey/journey.message.ts"
import * as Isochrone from "./isochrone/isochrone.update.ts"
import { initialModel as initialIsochroneModel } from "./isochrone/isochrone.model.ts"
import type { Message as IsochroneMessage } from "./isochrone/isochrone.message.ts"
import * as Storymap from "./storymap/storymap.update.ts"
import { initialModel as initialStorymapModel } from "./storymap/storymap.model.ts"
import type { Message as StorymapMessage } from "./storymap/storymap.message.ts"
import * as Weather from "./weather/weather.update.ts"
import { initialModel as initialWeatherModel } from "./weather/weather.model.ts"
import type { Message as WeatherMessage } from "./weather/weather.message.ts"
import * as WeatherMap from "./weather-map/weather-map.update.ts"
import { initialModel as initialWeatherMapModel } from "./weather-map/weather-map.model.ts"
import type { Message as WeatherMapMessage } from "./weather-map/weather-map.message.ts"
import {
    GotInteractiveMapMessage,
    GotIsochroneMessage,
    GotJourneyMessage,
    GotMapMessage,
    GotStorymapMessage,
    GotWeatherMessage,
    GotWeatherMapMessage,
    type Message,
} from "./app.message.ts"
import type { Model } from "./app.model.ts"
import { type AppRoute, urlToAppRoute } from "./route.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const initialModel = (route: AppRoute): Model => ({
    route,
    interactiveMap: initialInteractiveMapModel,
    map: initialMapModel,
    journey: initialJourneyModel,
    isochrone: initialIsochroneModel,
    storymap: initialStorymapModel,
    weather: initialWeatherModel,
    weatherMap: initialWeatherMapModel,
})

const mapCommands = <ChildMessage>(
    commands: ReadonlyArray<Command.Command<ChildMessage>>,
    wrap: (message: ChildMessage) => Message
) => Command.mapMessages(commands, wrap)

const initializeRoute = (model: Model): UpdateReturn =>
    M.value(model.route).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            Index: () => [model, []],
            InteractiveMap: () => {
                const [interactiveMap, commands] = InteractiveMap.init()
                return [
                    { ...model, interactiveMap },
                    mapCommands(commands, (message: InteractiveMapMessage) =>
                        GotInteractiveMapMessage({ message })
                    ),
                ]
            },
            Map: () => {
                const [map, commands] = MapDemo.init()
                return [
                    { ...model, map },
                    mapCommands(commands, (message: MapMessage) =>
                        GotMapMessage({ message })
                    ),
                ]
            },
            Journey: () => {
                const [journey, commands] = Journey.init()
                return [
                    { ...model, journey },
                    mapCommands(commands, (message: JourneyMessage) =>
                        GotJourneyMessage({ message })
                    ),
                ]
            },
            Isochrone: () => {
                const [isochrone, commands] = Isochrone.init()
                return [
                    { ...model, isochrone },
                    mapCommands(commands, (message: IsochroneMessage) =>
                        GotIsochroneMessage({ message })
                    ),
                ]
            },
            Storymap: () => {
                const [storymap, commands] = Storymap.init()
                return [
                    { ...model, storymap },
                    mapCommands(commands, (message: StorymapMessage) =>
                        GotStorymapMessage({ message })
                    ),
                ]
            },
            Weather: () => {
                const [weather, commands] = Weather.init()
                return [
                    { ...model, weather },
                    mapCommands(commands, (message: WeatherMessage) =>
                        GotWeatherMessage({ message })
                    ),
                ]
            },
            WeatherMap: () => {
                const [weatherMap, commands] = WeatherMap.init()
                return [
                    { ...model, weatherMap },
                    mapCommands(commands, (message: WeatherMapMessage) =>
                        GotWeatherMapMessage({ message })
                    ),
                ]
            },
            NotFound: () => [model, []],
        })
    )

export const init = (pathname: string): UpdateReturn =>
    initializeRoute(initialModel(urlToAppRoute(pathname)))

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedUrl: ({ url }) =>
                initializeRoute({
                    ...model,
                    route: urlToAppRoute(url.pathname),
                }),
            ChangedPath: ({ pathname }) =>
                initializeRoute({
                    ...model,
                    route: urlToAppRoute(pathname),
                }),
            ClickedLink: () => [model, []],
            GotInteractiveMapMessage: ({ message }) => {
                const [interactiveMap, commands] = InteractiveMap.update(
                    model.interactiveMap,
                    message
                )
                return [
                    { ...model, interactiveMap },
                    mapCommands(commands, (next: InteractiveMapMessage) =>
                        GotInteractiveMapMessage({ message: next })
                    ),
                ]
            },
            GotMapMessage: ({ message }) => {
                const [map, commands] = MapDemo.update(model.map, message)
                return [
                    { ...model, map },
                    mapCommands(commands, (next: MapMessage) =>
                        GotMapMessage({ message: next })
                    ),
                ]
            },
            GotJourneyMessage: ({ message }) => {
                const [journey, commands] = Journey.update(
                    model.journey,
                    message
                )
                return [
                    { ...model, journey },
                    mapCommands(commands, (next: JourneyMessage) =>
                        GotJourneyMessage({ message: next })
                    ),
                ]
            },
            GotIsochroneMessage: ({ message }) => {
                const [isochrone, commands] = Isochrone.update(
                    model.isochrone,
                    message
                )
                return [
                    { ...model, isochrone },
                    mapCommands(commands, (next: IsochroneMessage) =>
                        GotIsochroneMessage({ message: next })
                    ),
                ]
            },
            GotStorymapMessage: ({ message }) => {
                const [storymap, commands] = Storymap.update(
                    model.storymap,
                    message
                )
                return [
                    { ...model, storymap },
                    mapCommands(commands, (next: StorymapMessage) =>
                        GotStorymapMessage({ message: next })
                    ),
                ]
            },
            GotWeatherMessage: ({ message }) => {
                const [weather, commands] = Weather.update(
                    model.weather,
                    message
                )
                return [
                    { ...model, weather },
                    mapCommands(commands, (next: WeatherMessage) =>
                        GotWeatherMessage({ message: next })
                    ),
                ]
            },
            GotWeatherMapMessage: ({ message }) => {
                const [weatherMap, commands] = WeatherMap.update(
                    model.weatherMap,
                    message
                )
                return [
                    { ...model, weatherMap },
                    mapCommands(commands, (next: WeatherMapMessage) =>
                        GotWeatherMapMessage({ message: next })
                    ),
                ]
            },
        })
    )
