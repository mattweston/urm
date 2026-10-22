import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ModelMessageRoute = taggedStruct("ModelMessageRoute")
export const DerivedViewRoute = taggedStruct("DerivedViewRoute")
export const DerivedInputRoute = taggedStruct("DerivedInputRoute")
export const CommandRoute = taggedStruct("CommandRoute")
export const CommandSchemaRoute = taggedStruct("CommandSchemaRoute")
export const CommandTriggerRoute = taggedStruct("CommandTriggerRoute")
export const AsyncDataRoute = taggedStruct("AsyncDataRoute")
export const OptimisticUpdateRoute = taggedStruct("OptimisticUpdateRoute")
export const TodoListRoute = taggedStruct("TodoListRoute")
export const TodoFilterRoute = taggedStruct("TodoFilterRoute")
export const SubmodelRoute = taggedStruct("SubmodelRoute")
export const SubscriptionRoute = taggedStruct("SubscriptionRoute")
export const NotFoundRoute = taggedStruct("NotFoundRoute", {
    pathname: S.String,
})

export const FoldkitRoute = S.Union([
    ModelMessageRoute,
    DerivedViewRoute,
    DerivedInputRoute,
    CommandRoute,
    CommandSchemaRoute,
    CommandTriggerRoute,
    AsyncDataRoute,
    OptimisticUpdateRoute,
    TodoListRoute,
    TodoFilterRoute,
    SubmodelRoute,
    SubscriptionRoute,
    NotFoundRoute,
])
export type FoldkitRoute = typeof FoldkitRoute.Type

const PATH = "/labs/learn"

/** One table both directions: a lesson's path mirrors where it lives, and the
 *  subject names the idea rather than the library. */
const route_for_segment: Record<string, () => FoldkitRoute> = {
    "state/counter": ModelMessageRoute,
    "state/derived-values": DerivedViewRoute,
    "state/combined-inputs": DerivedInputRoute,
    "side-effects/on-change": CommandRoute,
    "side-effects/decoding": CommandSchemaRoute,
    "side-effects/on-demand": CommandTriggerRoute,
    "async/combining": AsyncDataRoute,
    "async/optimistic-update": OptimisticUpdateRoute,
    "async/streaming": SubscriptionRoute,
    "lists/items": TodoListRoute,
    "lists/filtering": TodoFilterRoute,
    "components/embedding": SubmodelRoute,
}

export const walkthrough_href = (segment: string): string =>
    `${PATH}/${segment}/`

export const walkthrough_segments: ReadonlyArray<string> =
    Object.keys(route_for_segment)

/** Exact membership: `/labs/learn/` is the index and every other lesson also lives
 *  one or two segments down, so a prefix test would claim them all. */
export const isFoldkitPath = (pathname: string): boolean =>
    route_for_segment[
        pathname.replace(/^\/labs\/learn\/?/, "").replace(/\/+$/, "")
    ] !== undefined

export const foldkitRouteForPath = (pathname: string): FoldkitRoute => {
    const segment = pathname.replace(/^\/labs\/learn\/?/, "").replace(/\/+$/, "")
    const route = route_for_segment[segment]
    return route === undefined ? NotFoundRoute({ pathname }) : route()
}
