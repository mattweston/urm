import { Array, HashMap, Match as M, Option, pipe } from "effect"
import { AsyncData } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { Button, Tabs } from "@foldkit/ui"

import {
    ClickedApiCacheBackToPosts,
    ClickedApiCacheInvalidatePosts,
    ClickedApiCachePost,
    ClickedApiCacheRefreshStats,
    ClickedApiCacheRetryPostDetail,
    ClickedApiCacheRetryPosts,
    ClickedApiCacheRetryStats,
    type ApiCacheMessage,
} from "./message.ts"
import type { Post, PostDetail, Stats } from "./data.ts"
import {
    API_CACHE_TABS_ID,
    ApiCacheTab,
    PostDetailData,
    PostsData,
    StatsData,
    apiCacheTabValues,
    type PostDetailData as PostDetailDataType,
} from "./query.ts"

// The slices of state this demo owns in the host application's Model, handed
// to the view explicitly so the lab never reads the whole-world Model.
export type ApiCacheState = Readonly<{
    posts: PostsData
    postDetailById: HashMap.HashMap<string, PostDetailDataType>
    stats: StatsData
    maybeSelectedPostId: Option.Option<string>
    tabs: Tabs.Model
    activeTab: ApiCacheTab
}>

const formatFetchedAt = (fetchedAt: number): string =>
    new Date(fetchedAt).toLocaleTimeString()

const tabButtonClassName =
    "px-4 py-2 rounded-[var(--radius-control)] bg-card text-muted-foreground font-semibold border-(length:--control-border-width) border-border transition cursor-pointer data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:border-primary [box-shadow:var(--shadow-primary)]"

const toolbarButtonClassName =
    "px-3 py-1.5 bg-card text-foreground text-sm font-semibold rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border transition cursor-pointer hover:bg-muted data-[disabled]:opacity-50 data-[disabled]:cursor-default data-[disabled]:hover:bg-card [box-shadow:var(--shadow-control)]"

const loadingPanel = <ParentMessage>(
    text: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "bg-card border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] p-6 text-center text-muted-foreground"
            ),
        ],
        [text]
    )

const errorPanel = <ParentMessage>(
    error: string,
    retryMessage: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "bg-destructive/10 border-(length:--surface-border-width) border-destructive text-destructive rounded-[var(--radius-surface)] p-4 flex items-center justify-between gap-4"
            ),
        ],
        [
            h.p([], [error]),
            Button.view(
                {
                    onClick: retryMessage,
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    "shrink-0 px-3 py-1.5 bg-destructive text-destructive-foreground text-sm font-semibold rounded-[var(--radius-control)] transition cursor-pointer hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                ),
                            ],
                            ["Retry"]
                        ),
                },
                h
            ),
        ]
    )

const isPostDetailCached = (
    postDetailById: HashMap.HashMap<string, PostDetailDataType>,
    postId: string
): boolean =>
    Option.exists(HashMap.get(postDetailById, postId), AsyncData.hasData)

const postListItems = <ParentMessage>(
    posts: ReadonlyArray<Post>,
    postDetailById: HashMap.HashMap<string, PostDetailDataType>,
    toApiCacheMessage: (message: ApiCacheMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    Array.map(posts, (post) =>
        h.keyed("li")(
            post.id,
            [],
            [
                Button.view(
                    {
                        onClick: toApiCacheMessage(
                            ClickedApiCachePost({ postId: post.id })
                        ),
                        toView: (attributes) =>
                            h.button(
                                [
                                    ...attributes.button,
                                    h.Class(
                                        "w-full text-left bg-card border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] px-4 py-3 transition cursor-pointer hover:bg-muted flex items-center justify-between gap-4 [box-shadow:var(--shadow-surface)]"
                                    ),
                                ],
                                [
                                    h.div(
                                        [],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "font-semibold text-foreground"
                                                    ),
                                                ],
                                                [post.title]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [post.excerpt]
                                            ),
                                        ]
                                    ),
                                    isPostDetailCached(postDetailById, post.id)
                                        ? h.span(
                                              [
                                                  h.Class(
                                                      "shrink-0 text-xs font-semibold text-accent-foreground bg-accent rounded-full px-2 py-1 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                  ),
                                              ],
                                              ["Cached"]
                                          )
                                        : h.empty,
                                ]
                            ),
                    },
                    h
                ),
            ]
        )
    )

const postsListView = <ParentMessage>(
    state: ApiCacheState,
    toApiCacheMessage: (message: ApiCacheMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isPending = AsyncData.isPending(state.posts)

    return h.div(
        [h.Class("flex flex-col gap-4")],
        [
            h.div(
                [h.Class("flex items-center justify-between")],
                [
                    h.h3(
                        [h.Class("text-lg font-semibold text-foreground")],
                        ["Posts"]
                    ),
                    Button.view(
                        {
                            onClick: toApiCacheMessage(
                                ClickedApiCacheInvalidatePosts()
                            ),
                            isDisabled: isPending,
                            toView: (attributes) =>
                                h.button(
                                    [
                                        ...attributes.button,
                                        h.Class(toolbarButtonClassName),
                                    ],
                                    [
                                        AsyncData.isRefreshing(state.posts)
                                            ? "Refreshing..."
                                            : "Invalidate",
                                    ]
                                ),
                        },
                        h
                    ),
                ]
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Open a post, go back, and open it again. The second visit renders instantly from the Model. Invalidate marks the list stale and refetches it while the current list stays on screen.",
                ]
            ),
            AsyncData.matchDataSplitEmpty(state.posts, {
                onIdle: () => loadingPanel("Loading posts...", h),
                onLoading: () => loadingPanel("Loading posts...", h),
                onFailure: (error) =>
                    errorPanel(
                        error,
                        toApiCacheMessage(ClickedApiCacheRetryPosts()),
                        h
                    ),
                onData: ({ posts }) =>
                    h.div(
                        [h.Class("flex flex-col gap-4")],
                        [
                            ...Option.match(AsyncData.getError(state.posts), {
                                onNone: () => [],
                                onSome: (error) => [
                                    errorPanel(
                                        error,
                                        toApiCacheMessage(
                                            ClickedApiCacheRetryPosts()
                                        ),
                                        h
                                    ),
                                ],
                            }),
                            h.ul(
                                [h.Class("flex flex-col gap-2")],
                                postListItems(
                                    posts,
                                    state.postDetailById,
                                    toApiCacheMessage,
                                    h
                                )
                            ),
                        ]
                    ),
            }),
        ]
    )
}

const postDetailCard = <ParentMessage>(
    detail: PostDetail,
    fetchedAt: number,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.article(
        [
            h.Class(
                "bg-card border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] p-6 flex flex-col gap-3"
            ),
        ],
        [
            h.h3(
                [h.Class("text-xl font-bold text-foreground")],
                [detail.title]
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [`By ${detail.author}`]
            ),
            h.p(
                [h.Class("text-card-foreground leading-relaxed")],
                [detail.body]
            ),
            h.p(
                [h.Class("text-xs text-muted-foreground")],
                [
                    `Fetched at ${formatFetchedAt(fetchedAt)}. Future visits render instantly from the Model.`,
                ]
            ),
        ]
    )

const postDetailView = <ParentMessage>(
    state: ApiCacheState,
    postId: string,
    toApiCacheMessage: (message: ApiCacheMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const postDetailData = Option.getOrElse(
        HashMap.get(state.postDetailById, postId),
        () => PostDetailData.Idle()
    )

    return h.div(
        [h.Class("flex flex-col gap-4")],
        [
            Button.view(
                {
                    onClick: toApiCacheMessage(ClickedApiCacheBackToPosts()),
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    "self-start text-sm font-semibold text-primary hover:underline cursor-pointer"
                                ),
                            ],
                            ["Back to posts"]
                        ),
                },
                h
            ),
            AsyncData.matchDataSplitEmpty(postDetailData, {
                onIdle: () => loadingPanel("Loading post...", h),
                onLoading: () => loadingPanel("Loading post...", h),
                onFailure: (error) =>
                    errorPanel(
                        error,
                        toApiCacheMessage(
                            ClickedApiCacheRetryPostDetail({ postId })
                        ),
                        h
                    ),
                onData: ({ detail, fetchedAt }) =>
                    h.div(
                        [h.Class("flex flex-col gap-4")],
                        [
                            ...Option.match(
                                AsyncData.getError(postDetailData),
                                {
                                    onNone: () => [],
                                    onSome: (error) => [
                                        errorPanel(
                                            error,
                                            toApiCacheMessage(
                                                ClickedApiCacheRetryPostDetail({
                                                    postId,
                                                })
                                            ),
                                            h
                                        ),
                                    ],
                                }
                            ),
                            postDetailCard(detail, fetchedAt, h),
                        ]
                    ),
            }),
        ]
    )
}

const postsTabView = <ParentMessage>(
    state: ApiCacheState,
    toApiCacheMessage: (message: ApiCacheMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(state.maybeSelectedPostId, {
        onNone: () =>
            h.section(
                [h.Class("flex flex-col gap-4")],
                [postsListView(state, toApiCacheMessage, h)]
            ),
        onSome: (postId) =>
            h.keyed("section")(
                postId,
                [h.Class("flex flex-col gap-4")],
                [postDetailView(state, postId, toApiCacheMessage, h)]
            ),
    })

const statCard = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "bg-card border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] p-4 flex flex-col gap-1"
            ),
        ],
        [
            h.div([h.Class("text-sm text-muted-foreground")], [label]),
            h.div([h.Class("text-2xl font-bold text-foreground")], [value]),
        ]
    )

const statsCards = <ParentMessage>(
    stats: Stats,
    fetchedAt: number,
    isRefreshing: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-col gap-3")],
        [
            h.div(
                [h.Class("grid grid-cols-1 sm:grid-cols-3 gap-4")],
                [
                    statCard("Active users", `${stats.activeUsers}`, h),
                    statCard(
                        "Requests per second",
                        `${stats.requestsPerSecond}`,
                        h
                    ),
                    statCard(
                        "Cache hit rate",
                        `${stats.cacheHitRatePercent}%`,
                        h
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex items-center gap-3 text-sm text-muted-foreground"
                    ),
                ],
                [
                    h.span([], [`Updated at ${formatFetchedAt(fetchedAt)}`]),
                    ...(isRefreshing
                        ? [
                              h.span(
                                  [h.Class("text-primary font-semibold")],
                                  ["Refreshing"]
                              ),
                          ]
                        : []),
                ]
            ),
        ]
    )

const statsTabView = <ParentMessage>(
    state: ApiCacheState,
    toApiCacheMessage: (message: ApiCacheMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isPending = AsyncData.isPending(state.stats)

    return h.div(
        [h.Class("flex flex-col gap-4")],
        [
            h.div(
                [h.Class("flex items-center justify-between")],
                [
                    h.h3(
                        [h.Class("text-lg font-semibold text-foreground")],
                        ["Stats"]
                    ),
                    Button.view(
                        {
                            onClick: toApiCacheMessage(
                                ClickedApiCacheRefreshStats()
                            ),
                            isDisabled: isPending,
                            toView: (attributes) =>
                                h.button(
                                    [
                                        ...attributes.button,
                                        h.Class(toolbarButtonClassName),
                                    ],
                                    [isPending ? "Refreshing..." : "Refresh"]
                                ),
                        },
                        h
                    ),
                ]
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Stats refetch every 5 seconds while this tab is open. The old numbers stay on screen while the new ones load.",
                ]
            ),
            AsyncData.matchDataSplitEmpty(state.stats, {
                onIdle: () => loadingPanel("Loading stats...", h),
                onLoading: () => loadingPanel("Loading stats...", h),
                onFailure: (error) =>
                    errorPanel(
                        error,
                        toApiCacheMessage(ClickedApiCacheRetryStats()),
                        h
                    ),
                onData: ({ stats, fetchedAt }) =>
                    h.div(
                        [h.Class("flex flex-col gap-4")],
                        [
                            ...Option.match(AsyncData.getError(state.stats), {
                                onNone: () => [],
                                onSome: (error) => [
                                    errorPanel(
                                        error,
                                        toApiCacheMessage(
                                            ClickedApiCacheRetryStats()
                                        ),
                                        h
                                    ),
                                ],
                            }),
                            statsCards(
                                stats,
                                fetchedAt,
                                AsyncData.isRefreshing(state.stats),
                                h
                            ),
                        ]
                    ),
            }),
        ]
    )
}

const ApiCacheTabs = Tabs.create<ApiCacheTab>()

export const view = <ParentMessage>(
    state: ApiCacheState,
    toApiCacheMessage: (message: ApiCacheMessage) => ParentMessage,
    toTabsMessage: (message: Tabs.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["API cache"]
            ),
            h.submodel({
                slotId: API_CACHE_TABS_ID,
                model: state.tabs,
                view: ApiCacheTabs.view,
                viewInputs: {
                    tabs: apiCacheTabValues,
                    selectedValue: state.activeTab,
                    ariaLabel: "API cache sections",
                    toView: ({ tablist, tabs }) =>
                        h.div(
                            [h.Class("flex flex-col gap-6")],
                            [
                                h.div(
                                    [...tablist, h.Class("flex gap-2")],
                                    Array.map(tabs, (tabInfo) =>
                                        h.keyed("button")(
                                            tabInfo.value,
                                            [
                                                ...tabInfo.tab,
                                                h.Class(tabButtonClassName),
                                            ],
                                            [tabInfo.value]
                                        )
                                    )
                                ),
                                ...pipe(
                                    tabs,
                                    Array.filter((tabInfo) => tabInfo.isActive),
                                    Array.map((tabInfo) =>
                                        h.keyed("div")(
                                            tabInfo.value,
                                            [
                                                ...tabInfo.panel,
                                                h.Class("flex flex-col gap-4"),
                                            ],
                                            [
                                                M.value(tabInfo.value).pipe(
                                                    M.when("Posts", () =>
                                                        postsTabView(
                                                            state,
                                                            toApiCacheMessage,
                                                            h
                                                        )
                                                    ),
                                                    M.when("Stats", () =>
                                                        statsTabView(
                                                            state,
                                                            toApiCacheMessage,
                                                            h
                                                        )
                                                    ),
                                                    M.exhaustive
                                                ),
                                            ]
                                        )
                                    )
                                ),
                            ]
                        ),
                },
                toParentMessage: toTabsMessage,
            }),
        ]
    )
