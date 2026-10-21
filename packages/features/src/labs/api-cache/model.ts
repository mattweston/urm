import { HashMap, Option, Schema as S } from "effect"
import { Tabs } from "@foldkit/ui"
import { ApiCacheTab, PostDetailData, PostsData, StatsData } from "./query.ts"

export const Model = S.Struct({
    posts: PostsData.schema,
    postDetailById: S.HashMap(S.String, PostDetailData.schema),
    stats: StatsData.schema,
    maybeSelectedPostId: S.Option(S.String),
    tabs: Tabs.Model,
    activeTab: ApiCacheTab,
})
export type Model = typeof Model.Type

export const initialModel = (): Model => ({
    posts: PostsData.Loading(),
    postDetailById: HashMap.empty(),
    stats: StatsData.Idle(),
    maybeSelectedPostId: Option.none(),
    tabs: Tabs.init({ id: "api-cache-tabs" }),
    activeTab: "Posts",
})
