import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Navigation } from "foldkit"
import { Url } from "foldkit/url"

import { Message as InteractiveMapMessage } from "./interactive-map/interactive-map.message.ts"
import { Message as MapMessage } from "./map/map.message.ts"
import { Message as JourneyMessage } from "./journey/journey.message.ts"
import { Message as IsochroneMessage } from "./isochrone/isochrone.message.ts"
import { Message as StorymapMessage } from "./storymap/storymap.message.ts"
import { Message as WeatherMessage } from "./weather/weather.message.ts"
import { Message as WeatherMapMessage } from "./weather-map/weather-map.message.ts"

export const ChangedUrl = taggedStruct("ChangedUrl", { url: Url })
export const ChangedPath = taggedStruct("ChangedPath", { pathname: S.String })
export const ClickedLink = taggedStruct("ClickedLink", {
    request: Navigation.UrlRequest,
})
export const GotInteractiveMapMessage = taggedStruct(
    "GotInteractiveMapMessage",
    {
        message: InteractiveMapMessage,
    }
)
export const GotMapMessage = taggedStruct("GotMapMessage", {
    message: MapMessage,
})
export const GotJourneyMessage = taggedStruct("GotJourneyMessage", {
    message: JourneyMessage,
})
export const GotIsochroneMessage = taggedStruct("GotIsochroneMessage", {
    message: IsochroneMessage,
})
export const GotStorymapMessage = taggedStruct("GotStorymapMessage", {
    message: StorymapMessage,
})
export const GotWeatherMessage = taggedStruct("GotWeatherMessage", {
    message: WeatherMessage,
})
export const GotWeatherMapMessage = taggedStruct("GotWeatherMapMessage", {
    message: WeatherMapMessage,
})
export const Message = S.Union([
    ChangedUrl,
    ChangedPath,
    ClickedLink,
    GotInteractiveMapMessage,
    GotMapMessage,
    GotJourneyMessage,
    GotIsochroneMessage,
    GotStorymapMessage,
    GotWeatherMessage,
    GotWeatherMapMessage,
])

export type Message = typeof Message.Type
