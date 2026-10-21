import { Effect, Schema as S } from "effect"
import { Command, Navigation } from "foldkit"
import type { Url } from "foldkit/url"
import { toString as urlToString } from "foldkit/url"
import {
    ChangedUrl,
    CompletedLoadExternal,
    CompletedNavigateInternal,
} from "./route.message.ts"

const NavigateInternal = Command.define("NavigateInternal", {
    args: { href: S.String },
    messages: [CompletedNavigateInternal],
    execute: ({ href }) =>
        Navigation.pushUrl(href).pipe(Effect.as(CompletedNavigateInternal())),
})
const LoadExternal = Command.define("LoadExternal", {
    args: { href: S.String },
    messages: [CompletedLoadExternal],
    execute: ({ href }) =>
        Navigation.load(href).pipe(Effect.as(CompletedLoadExternal())),
})

export const navigateInternal = (url: Url) =>
    NavigateInternal({ href: urlToString(url) })

export const loadExternal = (href: string) => LoadExternal({ href })

export const onUrlChange = (url: Url) => ChangedUrl({ url })
