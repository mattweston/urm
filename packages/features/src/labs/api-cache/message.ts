import { Schema as S } from "effect"
import { Tabs } from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import { FetchedPostDetail, FetchedPosts, FetchedStats } from "./query.ts"

export const GotApiCacheTabsMessage = taggedStruct("GotApiCacheTabsMessage", {
    message: Tabs.Message,
})
export const ClickedApiCachePost = taggedStruct("ClickedApiCachePost", {
    postId: S.String,
})
export const ClickedApiCacheBackToPosts = taggedStruct(
    "ClickedApiCacheBackToPosts"
)
export const ClickedApiCacheInvalidatePosts = taggedStruct(
    "ClickedApiCacheInvalidatePosts"
)
export const ClickedApiCacheRetryPosts = taggedStruct(
    "ClickedApiCacheRetryPosts"
)
export const ClickedApiCacheRetryPostDetail = taggedStruct(
    "ClickedApiCacheRetryPostDetail",
    { postId: S.String }
)
export const ClickedApiCacheRefreshStats = taggedStruct(
    "ClickedApiCacheRefreshStats"
)
export const ClickedApiCacheRetryStats = taggedStruct(
    "ClickedApiCacheRetryStats"
)
export const TickedApiCacheRevalidateStats = taggedStruct(
    "TickedApiCacheRevalidateStats"
)
export const SettledApiCacheFetchPosts = taggedStruct(
    "SettledApiCacheFetchPosts",
    {
        result: S.Result(FetchedPosts, S.String),
    }
)
export const SettledApiCacheFetchPostDetail = taggedStruct(
    "SettledApiCacheFetchPostDetail",
    {
        postId: S.String,
        result: S.Result(FetchedPostDetail, S.String),
    }
)
export const SettledApiCacheFetchStats = taggedStruct(
    "SettledApiCacheFetchStats",
    {
        result: S.Result(FetchedStats, S.String),
    }
)

export const ApiCacheMessage = S.Union([
    GotApiCacheTabsMessage,
    ClickedApiCachePost,
    ClickedApiCacheBackToPosts,
    ClickedApiCacheInvalidatePosts,
    ClickedApiCacheRetryPosts,
    ClickedApiCacheRetryPostDetail,
    ClickedApiCacheRefreshStats,
    ClickedApiCacheRetryStats,
    TickedApiCacheRevalidateStats,
    SettledApiCacheFetchPosts,
    SettledApiCacheFetchPostDetail,
    SettledApiCacheFetchStats,
])
export type ApiCacheMessage = typeof ApiCacheMessage.Type
