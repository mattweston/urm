import { Command } from "foldkit"
import * as Maps from "@urm/features/labs/events/map"
import type { DesktopRoute } from "../../routing/route.ts"

export {
    Model,
    Message,
    isAppScope,
    subscriptions,
    view,
} from "@urm/features/labs/events/map"

type UpdateReturn = readonly [
    Maps.Model,
    ReadonlyArray<Command.Command<Maps.Message>>,
]

const path_for_route = (route: DesktopRoute): string =>
    route._tag === "Labs" && Maps.isAppScope(route.labs_path)
        ? route.labs_path
        : Maps.indexHref()

export const init = (route: DesktopRoute): UpdateReturn =>
    Maps.init(path_for_route(route))

export const changed_route = (
    model: Maps.Model,
    previous_route: DesktopRoute,
    route: DesktopRoute
): UpdateReturn =>
    path_for_route(previous_route) === path_for_route(route)
        ? [model, []]
        : init(route)

export const update = (
    model: Maps.Model,
    message: Maps.Message
): UpdateReturn => {
    const active = (() => {
        switch (message._tag) {
            case "GotInteractiveMapMessage":
                return model.route._tag === "InteractiveMap"
            case "GotJourneyMessage":
                return model.route._tag === "Journey"
            case "GotIsochroneMessage":
                return model.route._tag === "Isochrone"
            case "GotStorymapMessage":
                return model.route._tag === "Storymap"
            case "GotWeatherMessage":
                return model.route._tag === "Weather"
            case "GotWeatherMapMessage":
                return model.route._tag === "WeatherMap"
            default:
                return false
        }
    })()
    return active ? Maps.update(model, message) : [model, []]
}
