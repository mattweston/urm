import { Effect, Option, Schema as S } from "effect"
import { Navigation, Command } from "foldkit"
import { CompletedReplaceSearchUrl } from "./routing.message.ts"
import { routingPeopleHref } from "./routing.route.ts"

const ReplaceSearchUrl = Command.define("ReplaceSearchUrl", {
    args: { href: S.String },
    messages: [CompletedReplaceSearchUrl],
    execute: ({ href }) =>
        Navigation.replaceUrl(href).pipe(
            Effect.as(CompletedReplaceSearchUrl())
        ),
})

export const replaceSearchUrl = (
    search_text: Option.Option<string>,
    people_href: (value: Option.Option<string>) => string = routingPeopleHref
) => ReplaceSearchUrl({ href: people_href(search_text) })
