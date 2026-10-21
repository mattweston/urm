import { Subscription } from "foldkit"

import { subscriptions as interactiveMapSubscriptions } from "./interactive-map/interactive-map.subscription.ts"
import { subscriptions as mapSubscriptions } from "./map/map.subscription.ts"
import { subscriptions as isochroneSubscriptions } from "./isochrone/isochrone.subscription.ts"
import { subscriptions as storymapSubscriptions } from "./storymap/storymap.subscription.ts"
import { subscriptions as weatherMapSubscriptions } from "./weather-map/weather-map.subscription.ts"
import {
    GotInteractiveMapMessage,
    GotIsochroneMessage,
    GotMapMessage,
    GotStorymapMessage,
    GotWeatherMapMessage,
    Message,
} from "./app.message.ts"
import { Model } from "./app.model.ts"

export { Model } from "./app.model.ts"
export type { Model as ModelType } from "./app.model.ts"
export { Message, ChangedPath, ChangedUrl } from "./app.message.ts"
export type { Message as MessageType } from "./app.message.ts"
export {
    indexHref,
    interactiveMapHref,
    isAppScope,
    isochroneHref,
    journeyHref,
    mapHref,
    storymapHref,
    weatherHref,
    weatherMapHref,
} from "./route.ts"
export { init, update } from "./app.update.ts"
export { view } from "./app.view.ts"

export const subscriptions = <ParentModel, ParentMessage>(config: {
    readonly toChildModel: (parentModel: ParentModel) => Model
    readonly toParentMessage: (message: Message) => ParentMessage
    readonly when?: (model: ParentModel) => boolean
}) => {
    const mapAppSubscriptions = Subscription.aggregate<Model, Message>()(
        Subscription.lift(interactiveMapSubscriptions)({
            toChildModel: (model: Model) => model.interactiveMap,
            toParentMessage: (message) => GotInteractiveMapMessage({ message }),
        }),
        Subscription.lift(mapSubscriptions)({
            toChildModel: (model: Model) => model.map,
            toParentMessage: (message) => GotMapMessage({ message }),
        }),
        Subscription.lift(isochroneSubscriptions)({
            toChildModel: (model: Model) => model.isochrone,
            toParentMessage: (message) => GotIsochroneMessage({ message }),
        }),
        Subscription.lift(storymapSubscriptions)({
            toChildModel: (model: Model) => model.storymap,
            toParentMessage: (message) => GotStorymapMessage({ message }),
        }),
        Subscription.lift(weatherMapSubscriptions)({
            toChildModel: (model: Model) => model.weatherMap,
            toParentMessage: (message) => GotWeatherMapMessage({ message }),
        })
    )

    const lifted = Subscription.lift(mapAppSubscriptions)<
        ParentModel,
        ParentMessage
    >(config)

    return lifted
}
