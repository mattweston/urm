import { Match as M, Option } from "effect"
import { Command } from "foldkit"
import { replaceSearchUrl } from "./routing.command.ts"
import { type Message } from "./routing.message.ts"
import {
    RoutingPeopleRoute,
    routingPeopleHref,
    type RoutingRoute,
} from "./routing.route.ts"

type UpdateReturn = readonly [
    RoutingRoute,
    ReadonlyArray<Command.Command<Message>>,
]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const init = (route: RoutingRoute): UpdateReturn => [route, []]

export const update = (
    route: RoutingRoute,
    message: Message,
    people_href: (search_text: Option.Option<string>) => string = routingPeopleHref
): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedRoute: ({ route: next_route }) => [next_route, []],
            CompletedReplaceSearchUrl: () => [route, []],
            ChangedSearchInput: ({ value }) => {
                if (route._tag !== "RoutingPeople") {
                    return [route, []]
                }

                const search_text = Option.fromNullishOr(value || null)

                return [
                    RoutingPeopleRoute({ searchText: search_text }),
                    [replaceSearchUrl(search_text, people_href)],
                ]
            },
        })
    )
