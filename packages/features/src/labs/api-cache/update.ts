import { Array, HashMap, Match as M, Option } from "effect"
import { AsyncData, Command } from "foldkit"
import { Tabs } from "@foldkit/ui"
import { modifyFields } from "foldkit/struct"
import {
    FetchApiCachePostDetail,
    FetchApiCachePosts,
    FetchApiCacheStats,
} from "./cache.ts"
import { GotApiCacheTabsMessage, type ApiCacheMessage } from "./message.ts"
import { initialModel, type Model } from "./model.ts"
import {
    type ApiCacheTab,
    type PostDetailData,
    PostDetailData as PostDetailDataSchema,
    type PostsData,
    type StatsData,
} from "./query.ts"

type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<ApiCacheMessage>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()
const ApiCacheTabs = Tabs.create<ApiCacheTab>()

const setPostDetail = (postId: string, postDetail: PostDetailData) =>
    HashMap.set(postId, postDetail)

const applyPostsTransition = (
    model: Model,
    maybePosts: Option.Option<PostsData>
): UpdateReturn =>
    Option.match(maybePosts, {
        onNone: () => [model, []],
        onSome: (posts) => [
            modifyFields(model, { posts: () => posts }),
            [FetchApiCachePosts()],
        ],
    })

const applyStatsTransition = (
    model: Model,
    maybeStats: Option.Option<StatsData>
): UpdateReturn =>
    Option.match(maybeStats, {
        onNone: () => [model, []],
        onSome: (stats) => [
            modifyFields(model, { stats: () => stats }),
            [FetchApiCacheStats()],
        ],
    })

const activateTab = (model: Model, activeTab: ApiCacheTab): UpdateReturn => {
    const nextModel = modifyFields(model, { activeTab: () => activeTab })

    return M.value(activeTab).pipe(
        withUpdateReturn,
        M.when("Posts", () =>
            applyPostsTransition(
                nextModel,
                AsyncData.loadIfMissing(nextModel.posts)
            )
        ),
        M.when("Stats", () =>
            applyStatsTransition(
                nextModel,
                AsyncData.loadIfMissing(nextModel.stats)
            )
        ),
        M.exhaustive
    )
}

export const init = (): UpdateReturn => [initialModel(), [FetchApiCachePosts()]]

export const update = (model: Model, message: ApiCacheMessage): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            GotApiCacheTabsMessage: ({
                message: tabsMessage,
            }): UpdateReturn => {
                const {
                    model: tabs,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = ApiCacheTabs.update(model.tabs, tabsMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const nextModel = modifyFields(model, { tabs: () => tabs })
                const mappedCommands = Command.mapMessages(
                    commands,
                    (message) => GotApiCacheTabsMessage({ message })
                )

                return Option.match(maybeOutMessage, {
                    onNone: (): UpdateReturn => [nextModel, mappedCommands],
                    onSome: M.type<Tabs.OutMessage<ApiCacheTab>>().pipe(
                        M.tagsExhaustive({
                            Selected: ({ value }): UpdateReturn => {
                                const [activatedModel, activationCommands] =
                                    activateTab(nextModel, value)
                                return [
                                    activatedModel,
                                    Array.appendAll(
                                        mappedCommands,
                                        activationCommands
                                    ),
                                ]
                            },
                        })
                    ),
                })
            },
            ClickedApiCachePost: ({ postId }): UpdateReturn => {
                const selectedModel = modifyFields(model, {
                    maybeSelectedPostId: () => Option.some(postId),
                })
                return Option.match(HashMap.get(model.postDetailById, postId), {
                    onNone: (): UpdateReturn => [
                        modifyFields(selectedModel, {
                            postDetailById: setPostDetail(
                                postId,
                                PostDetailDataSchema.Loading()
                            ),
                        }),
                        [FetchApiCachePostDetail({ postId })],
                    ],
                    onSome: (): UpdateReturn => [selectedModel, []],
                })
            },
            ClickedApiCacheBackToPosts: () => [
                modifyFields(model, { maybeSelectedPostId: () => Option.none() }),
                [],
            ],
            ClickedApiCacheInvalidatePosts: () =>
                applyPostsTransition(
                    model,
                    AsyncData.revalidateOrLoad(model.posts)
                ),
            ClickedApiCacheRetryPosts: () =>
                applyPostsTransition(
                    model,
                    AsyncData.revalidateOrLoad(model.posts)
                ),
            ClickedApiCacheRetryPostDetail: ({ postId }) => [
                modifyFields(model, {
                    postDetailById: setPostDetail(
                        postId,
                        PostDetailDataSchema.Loading()
                    ),
                }),
                [FetchApiCachePostDetail({ postId })],
            ],
            ClickedApiCacheRefreshStats: () =>
                applyStatsTransition(
                    model,
                    AsyncData.revalidateOrLoad(model.stats)
                ),
            ClickedApiCacheRetryStats: () =>
                applyStatsTransition(
                    model,
                    AsyncData.revalidateOrLoad(model.stats)
                ),
            TickedApiCacheRevalidateStats: () =>
                applyStatsTransition(model, AsyncData.revalidate(model.stats)),
            SettledApiCacheFetchPosts: ({ result }) => [
                modifyFields(model, { posts: AsyncData.settle(result) }),
                [],
            ],
            SettledApiCacheFetchPostDetail: ({ postId, result }) => [
                modifyFields(model, {
                    postDetailById: HashMap.modify(
                        postId,
                        AsyncData.settle(result)
                    ),
                }),
                [],
            ],
            SettledApiCacheFetchStats: ({ result }) => [
                modifyFields(model, { stats: AsyncData.settle(result) }),
                [],
            ],
        })
    )
