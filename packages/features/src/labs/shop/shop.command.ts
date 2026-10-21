import { Effect, Schema as S } from "effect"
import { Command, Navigation } from "foldkit"
import { CompletedReplaceUrl } from "./shop.message.ts"

const ReplaceSearchUrl = Command.define("ReplaceSearchUrl", {
    args: { url: S.String },
    messages: [CompletedReplaceUrl],
    execute: ({ url }) =>
        Navigation.replaceUrl(url).pipe(Effect.as(CompletedReplaceUrl())),
})

export const replaceSearchUrl = (url: string) => ReplaceSearchUrl({ url })
