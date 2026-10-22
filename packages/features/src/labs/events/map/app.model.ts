import { Schema as S } from "effect"

import { Model as InteractiveMapModel } from "./interactive-map/interactive-map.model.ts"
import { Model as JourneyModel } from "./journey/journey.model.ts"
import { Model as IsochroneModel } from "./isochrone/isochrone.model.ts"
import { Model as StorymapModel } from "./storymap/storymap.model.ts"
import { Model as WeatherModel } from "./weather/weather.model.ts"
import { Model as WeatherMapModel } from "./weather-map/weather-map.model.ts"
import { AppRoute } from "./route.ts"

export const Model = S.Struct({
    route: AppRoute,
    interactiveMap: InteractiveMapModel,
    journey: JourneyModel,
    isochrone: IsochroneModel,
    storymap: StorymapModel,
    weather: WeatherModel,
    weatherMap: WeatherMapModel,
})

export type Model = typeof Model.Type
