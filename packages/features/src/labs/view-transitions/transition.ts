import { Match as M, Option } from "effect"
import type { Runtime } from "foldkit"
import { Transition } from "foldkit/route"

type Tagged = Readonly<{ _tag: string }>

// For hosts that give the gallery and the detail page a single route tag and
// keep the food slug in the model instead. The tag-based config below cannot
// name a direction when both sides carry the same tag, so the transition type
// is derived from the slug appearing or disappearing.
export const viewTransitionBySlug =
    <Model, Message extends Tagged>(config: {
        readonly isViewTransitionsModel: (model: Model) => boolean
        readonly toFoodSlug: (model: Model) => Option.Option<string>
    }): Runtime.ViewTransitionConfig<Model, Message> =>
    ({ previousModel, model, message }) => {
        if (message._tag !== "ChangedUrl") {
            return false
        }

        if (
            !config.isViewTransitionsModel(previousModel) ||
            !config.isViewTransitionsModel(model)
        ) {
            return false
        }

        const before = config.toFoodSlug(previousModel)
        const after = config.toFoodSlug(model)

        if (Option.isNone(before) && Option.isSome(after)) {
            return { types: ["to-food-detail"] }
        }

        if (Option.isSome(before) && Option.isNone(after)) {
            return { types: ["to-gallery"] }
        }

        return true
    }

// Only the view transition pages animate. Every other navigation in the site,
// and every Message that is not a URL change, renders straight through. The
// host application supplies its own route-tag predicate, so this stays
// independent of the app's route union.
export const viewTransition =
    <Model extends Readonly<{ route: Tagged }>, Message extends Tagged>(
        isViewTransitionsRouteTag: (routeTag: string) => boolean
    ): Runtime.ViewTransitionConfig<Model, Message> =>
    ({ previousModel, model, message }) => {
        if (message._tag !== "ChangedUrl") {
            return false
        }

        const previousRoute = previousModel.route
        const nextRoute = model.route

        if (
            !isViewTransitionsRouteTag(previousRoute._tag) ||
            !isViewTransitionsRouteTag(nextRoute._tag)
        ) {
            return false
        }

        const transition = Transition.make(previousRoute, nextRoute)

        return Option.match(Transition.enteredAny(transition), {
            onNone: () => true,
            onSome: (entered) =>
                M.value(entered._tag).pipe(
                    M.withReturnType<Runtime.ViewTransitionDecision>(),
                    M.when("ViewTransitionsFood", () => ({
                        types: ["to-food-detail"],
                    })),
                    M.when("ViewTransitions", () => ({
                        types: ["to-gallery"],
                    })),
                    M.orElse(() => true)
                ),
        })
    }
