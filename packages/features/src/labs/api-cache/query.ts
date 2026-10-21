import { Duration, Schema as S } from "effect"
import { AsyncData } from "foldkit"

import { Post, PostDetail, Stats } from "./data.ts"

export const STATS_REFETCH_INTERVAL = Duration.seconds(5)

export const API_CACHE_TABS_ID = "api-cache-tabs"

export const FetchedPosts = S.Struct({
    posts: S.Array(Post),
    fetchedAt: S.Number,
})

export const FetchedPostDetail = S.Struct({
    detail: PostDetail,
    fetchedAt: S.Number,
})

export const FetchedStats = S.Struct({ stats: Stats, fetchedAt: S.Number })

export const PostsData = AsyncData.Schema(FetchedPosts, S.String)
export const PostDetailData = AsyncData.Schema(FetchedPostDetail, S.String)
export const StatsData = AsyncData.Schema(FetchedStats, S.String)

export type PostsData = typeof PostsData.schema.Type
export type PostDetailData = typeof PostDetailData.schema.Type
export type StatsData = typeof StatsData.schema.Type

export const ApiCacheTab = S.Literals(["Posts", "Stats"])
export type ApiCacheTab = typeof ApiCacheTab.Type

export const apiCacheTabValues: ReadonlyArray<ApiCacheTab> =
    ApiCacheTab.literals
