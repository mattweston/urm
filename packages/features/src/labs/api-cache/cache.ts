import { Clock, Effect, Schema as S, pipe } from "effect"
import { Command } from "foldkit"

import { fetchPostDetail, fetchPosts, fetchStats } from "./data.ts"
import { FetchedPostDetail, FetchedPosts, FetchedStats } from "./query.ts"
import {
    SettledApiCacheFetchPostDetail,
    SettledApiCacheFetchPosts,
    SettledApiCacheFetchStats,
} from "./message.ts"

export const FetchApiCachePosts = Command.define("FetchApiCachePosts", {
    messages: [SettledApiCacheFetchPosts],
    execute: pipe(
        Effect.gen(function* () {
            const posts = yield* fetchPosts
            const fetchedAt = yield* Clock.currentTimeMillis
            return FetchedPosts.make({ posts, fetchedAt })
        }),
        Effect.result,
        Effect.map((result) => SettledApiCacheFetchPosts({ result }))
    ),
})

export const FetchApiCachePostDetail = Command.define(
    "FetchApiCachePostDetail",
    {
        args: { postId: S.String },
        messages: [SettledApiCacheFetchPostDetail],
        execute: ({ postId }) =>
            pipe(
                Effect.gen(function* () {
                    const detail = yield* fetchPostDetail(postId)
                    const fetchedAt = yield* Clock.currentTimeMillis
                    return FetchedPostDetail.make({ detail, fetchedAt })
                }),
                Effect.result,
                Effect.map((result) =>
                    SettledApiCacheFetchPostDetail({ postId, result })
                )
            ),
    }
)

export const FetchApiCacheStats = Command.define("FetchApiCacheStats", {
    messages: [SettledApiCacheFetchStats],
    execute: pipe(
        Effect.gen(function* () {
            const stats = yield* fetchStats
            const fetchedAt = yield* Clock.currentTimeMillis
            return FetchedStats.make({ stats, fetchedAt })
        }),
        Effect.result,
        Effect.map((result) => SettledApiCacheFetchStats({ result }))
    ),
})
