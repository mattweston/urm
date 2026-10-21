import { Effect, Schema as S } from "effect"
import { Command, Navigation } from "foldkit"
import type { Url } from "foldkit/url"
import { toString as urlToString } from "foldkit/url"
import { ChangedUrl, CompletedNavigateInternal } from "./route.message.ts"
import { issuesHref } from "./route.ts"

const NavigateInternal = Command.define("NavigateInternal", {
    args: { href: S.String },
    messages: [CompletedNavigateInternal],
    execute: ({ href }) =>
        Navigation.pushUrl(href).pipe(Effect.as(CompletedNavigateInternal())),
})

export const navigateInternal = (url: Url) =>
    NavigateInternal({ href: urlToString(url) })

const NavigateExternal = Command.define("NavigateExternal", {
    args: { href: S.String },
    messages: [CompletedNavigateInternal],
    execute: ({ href }) =>
        Navigation.load(href).pipe(Effect.as(CompletedNavigateInternal())),
})

export const loadExternal = (href: string) => NavigateExternal({ href })

export const navigateToIssuesIndex = () =>
    NavigateInternal({ href: issuesHref() })

export const onUrlChange = (url: Url) => ChangedUrl({ url })
