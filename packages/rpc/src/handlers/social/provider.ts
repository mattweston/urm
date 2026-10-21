import { Config, Context, Effect, Layer, Redacted, Schema } from "effect"

const base_url = "https://zernio.com/api"

export class ZernioProviderError extends Schema.TaggedErrorClass<ZernioProviderError>()(
    "ZernioProviderError",
    {
        operation: Schema.String,
        message: Schema.String,
        status: Schema.NullOr(Schema.Number),
    }
) {}

const ProviderErrorBody = Schema.Struct({
    error: Schema.optional(Schema.String),
    message: Schema.optional(Schema.String),
})
const ProviderProfile = Schema.Struct({
    _id: Schema.String,
    name: Schema.String,
    isDefault: Schema.optional(Schema.Boolean),
})
const ProfilesResponse = Schema.Struct({
    profiles: Schema.Array(ProviderProfile),
})
const ProviderProfileReference = Schema.Union([
    Schema.String,
    Schema.Struct({ _id: Schema.String }),
])
const ProviderAccount = Schema.Struct({
    _id: Schema.String,
    profileId: ProviderProfileReference,
    platform: Schema.String,
    username: Schema.String,
    displayName: Schema.optional(Schema.String),
    avatarUrl: Schema.optional(Schema.String),
    isActive: Schema.Boolean,
})
export type ProviderAccount = typeof ProviderAccount.Type
const ProviderPostStatus = Schema.Literals([
    "draft",
    "scheduled",
    "publishing",
    "published",
    "partial",
    "failed",
    "cancelled",
])
const ProviderPostPlatform = Schema.Struct({
    platform: Schema.String,
    accountId: Schema.Union([
        Schema.String,
        Schema.Struct({ _id: Schema.String }),
    ]),
    status: Schema.optional(Schema.String),
    platformPostUrl: Schema.optional(Schema.String),
    errorMessage: Schema.optional(Schema.String),
})
const ProviderPost = Schema.Struct({
    _id: Schema.String,
    status: ProviderPostStatus,
    content: Schema.optional(Schema.String),
    platforms: Schema.optional(Schema.Array(ProviderPostPlatform)),
    scheduledFor: Schema.optional(Schema.NullOr(Schema.String)),
    createdAt: Schema.optional(Schema.String),
    metadata: Schema.optional(
        Schema.Struct({ urmPostId: Schema.optional(Schema.String) })
    ),
})
export type ProviderPost = typeof ProviderPost.Type
const AccountsResponse = Schema.Struct({
    accounts: Schema.Array(ProviderAccount),
})
const PostsResponse = Schema.Struct({ posts: Schema.Array(ProviderPost) })
const ProfileResponse = Schema.Struct({ profile: ProviderProfile })
const ConnectResponse = Schema.Struct({ authUrl: Schema.String })
const PostResponse = Schema.Struct({
    post: Schema.optional(ProviderPost),
    existingPost: Schema.optional(ProviderPost),
})
const ProviderAnalyticsMetrics = Schema.Struct({
    impressions: Schema.optional(Schema.Number),
    reach: Schema.optional(Schema.Number),
    likes: Schema.optional(Schema.Number),
    comments: Schema.optional(Schema.Number),
    shares: Schema.optional(Schema.Number),
    saves: Schema.optional(Schema.Number),
    clicks: Schema.optional(Schema.Number),
    views: Schema.optional(Schema.Number),
})
const DailyAnalyticsResponse = Schema.Struct({
    dailyData: Schema.Array(
        Schema.Struct({
            date: Schema.String,
            postCount: Schema.Number,
            metrics: ProviderAnalyticsMetrics,
        })
    ),
    platformBreakdown: Schema.Array(
        Schema.Struct({
            platform: Schema.String,
            postCount: Schema.Number,
            ...ProviderAnalyticsMetrics.fields,
        })
    ),
})
export type DailyAnalyticsResponse = typeof DailyAnalyticsResponse.Type
const PostAnalyticsResponse = Schema.Struct({
    overview: Schema.Struct({ totalPosts: Schema.Number }),
    posts: Schema.Array(
        Schema.Struct({
            _id: Schema.String,
            content: Schema.optional(Schema.String),
            publishedAt: Schema.optional(Schema.NullOr(Schema.String)),
            analytics: ProviderAnalyticsMetrics,
            platform: Schema.optional(Schema.String),
            platformPostUrl: Schema.optional(Schema.NullOr(Schema.String)),
        })
    ),
})
export type PostAnalyticsResponse = typeof PostAnalyticsResponse.Type
const FollowerAnalyticsResponse = Schema.Struct({
    accounts: Schema.Array(
        Schema.Struct({
            _id: Schema.String,
            platform: Schema.String,
            growth: Schema.Number,
        })
    ),
})
export type FollowerAnalyticsResponse = typeof FollowerAnalyticsResponse.Type

export interface AnalyticsFilters {
    readonly profile_id: string
    readonly platform: "all" | "facebook" | "instagram"
    readonly account_id: string | null
    readonly from_date: string
    readonly to_date: string
}

export interface CreatePostInput {
    readonly request_id: string
    readonly local_post_id: string
    readonly content: string
    readonly platforms: ReadonlyArray<{
        readonly platform: string
        readonly account_id: string
    }>
    readonly media_urls: ReadonlyArray<string>
    readonly mode: "draft" | "publish_now" | "schedule"
    readonly scheduled_for: number | null
}

export interface ZernioProviderService {
    readonly get_daily_analytics: (
        filters: AnalyticsFilters
    ) => Effect.Effect<DailyAnalyticsResponse, ZernioProviderError>
    readonly get_post_analytics: (
        filters: AnalyticsFilters
    ) => Effect.Effect<PostAnalyticsResponse, ZernioProviderError>
    readonly get_follower_analytics: (
        filters: AnalyticsFilters,
        account_ids: ReadonlyArray<string>
    ) => Effect.Effect<FollowerAnalyticsResponse, ZernioProviderError>
    readonly list_profiles: () => Effect.Effect<
        ReadonlyArray<typeof ProviderProfile.Type>,
        ZernioProviderError
    >
    readonly create_profile: (
        name: string,
        idempotency_key: string
    ) => Effect.Effect<string, ZernioProviderError>
    readonly list_accounts: (
        profile_id: string
    ) => Effect.Effect<ReadonlyArray<ProviderAccount>, ZernioProviderError>
    readonly connect_account: (
        profile_id: string,
        platform: string
    ) => Effect.Effect<string, ZernioProviderError>
    readonly list_posts: (
        profile_id: string
    ) => Effect.Effect<ReadonlyArray<ProviderPost>, ZernioProviderError>
    readonly find_post_by_local_id: (
        profile_id: string,
        local_post_id: string
    ) => Effect.Effect<ProviderPost | null, ZernioProviderError>
    readonly get_post: (
        post_id: string
    ) => Effect.Effect<ProviderPost, ZernioProviderError>
    readonly create_post: (
        input: CreatePostInput
    ) => Effect.Effect<ProviderPost, ZernioProviderError>
    readonly update_post: (
        post_id: string,
        input: CreatePostInput
    ) => Effect.Effect<ProviderPost, ZernioProviderError>
    readonly delete_post: (
        post_id: string
    ) => Effect.Effect<void, ZernioProviderError>
}

export class ZernioProvider extends Context.Service<
    ZernioProvider,
    ZernioProviderService
>()("@urm/rpc/ZernioProvider") {}

type Fetcher = typeof fetch

const profile_id_of = (profile: typeof ProviderProfileReference.Type): string =>
    typeof profile === "string" ? profile : profile._id

const request_body = (input: CreatePostInput) => ({
    content: input.content,
    platforms: input.platforms.map((target) => ({
        platform: target.platform,
        accountId: target.account_id,
    })),
    mediaItems: input.media_urls.map((url) => ({ url })),
    metadata: { urmPostId: input.local_post_id },
    ...(input.mode === "draft"
        ? { isDraft: true }
        : input.mode === "publish_now"
          ? { isDraft: false, publishNow: true }
          : {
                isDraft: false,
                scheduledFor: new Date(input.scheduled_for ?? 0).toISOString(),
            }),
})

export const make_zernio_provider = (
    api_key: Redacted.Redacted<string>,
    fetcher: Fetcher = fetch
): ZernioProviderService => {
    const request = Effect.fn("Zernio.request")(function* (
        operation: string,
        method: "GET" | "POST" | "PUT" | "DELETE",
        path: string,
        options?: {
            readonly query?: Readonly<Record<string, string>>
            readonly body?: unknown
            readonly request_id?: string
            readonly idempotency_key?: string
        }
    ) {
        const url = new URL(`${base_url}${path}`)
        for (const [key, value] of Object.entries(options?.query ?? {}))
            url.searchParams.set(key, value)
        const response = yield* Effect.tryPromise({
            try: (signal) =>
                fetcher(url, {
                    method,
                    signal,
                    headers: {
                        Authorization: `Bearer ${Redacted.value(api_key)}`,
                        Accept: "application/json",
                        ...(options?.body === undefined
                            ? {}
                            : { "Content-Type": "application/json" }),
                        ...(options?.request_id === undefined
                            ? {}
                            : { "x-request-id": options.request_id }),
                        ...(options?.idempotency_key === undefined
                            ? {}
                            : { "Idempotency-Key": options.idempotency_key }),
                    },
                    ...(options?.body === undefined
                        ? {}
                        : { body: JSON.stringify(options.body) }),
                }),
            catch: () =>
                new ZernioProviderError({
                    operation,
                    message:
                        "Zernio is unavailable; check the post status before retrying",
                    status: null,
                }),
        })
        const data =
            response.status === 204
                ? null
                : yield* Effect.tryPromise({
                      try: () => response.json(),
                      catch: () =>
                          new ZernioProviderError({
                              operation,
                              message: "Zernio returned an unreadable response",
                              status: response.status,
                          }),
                  })
        if (!response.ok) {
            const detail = Schema.decodeUnknownOption(ProviderErrorBody)(data)
            return yield* Effect.fail(
                new ZernioProviderError({
                    operation,
                    message:
                        detail._tag === "Some"
                            ? (detail.value.error ??
                              detail.value.message ??
                              `Zernio rejected the request (${response.status})`)
                            : `Zernio rejected the request (${response.status})`,
                    status: response.status,
                })
            )
        }
        return data
    })
    const invalid_response = (operation: string) =>
        new ZernioProviderError({
            operation,
            message: "Zernio returned an unexpected response",
            status: null,
        })
    const create_profile = Effect.fn("Zernio.createProfile")(function* (
        name: string,
        idempotency_key: string
    ) {
        const data = yield* request("create_profile", "POST", "/v1/profiles", {
            body: { name },
            idempotency_key,
        })
        const parsed = yield* Schema.decodeUnknownEffect(ProfileResponse)(
            data
        ).pipe(Effect.mapError(() => invalid_response("create_profile")))
        return parsed.profile._id
    })
    const list_profiles = Effect.fn("Zernio.listProfiles")(function* () {
        const data = yield* request("list_profiles", "GET", "/v1/profiles", {
            query: { includeOverLimit: "true" },
        })
        const parsed = yield* Schema.decodeUnknownEffect(ProfilesResponse)(
            data
        ).pipe(Effect.mapError(() => invalid_response("list_profiles")))
        return parsed.profiles
    })
    const analytics_query = (filters: AnalyticsFilters) => ({
        profileId: filters.profile_id,
        fromDate: filters.from_date,
        toDate: filters.to_date,
        ...(filters.platform === "all" ? {} : { platform: filters.platform }),
        ...(filters.account_id === null
            ? {}
            : { accountId: filters.account_id }),
    })
    const get_daily_analytics = Effect.fn("Zernio.dailyAnalytics")(function* (
        filters: AnalyticsFilters
    ) {
        const data = yield* request(
            "daily_analytics",
            "GET",
            "/v1/analytics/daily-metrics",
            {
                query: {
                    ...analytics_query(filters),
                    source: "all",
                    attribution: "received",
                },
            }
        )
        return yield* Schema.decodeUnknownEffect(DailyAnalyticsResponse)(
            data
        ).pipe(Effect.mapError(() => invalid_response("daily_analytics")))
    })
    const get_post_analytics = Effect.fn("Zernio.postAnalytics")(function* (
        filters: AnalyticsFilters
    ) {
        const data = yield* request("post_analytics", "GET", "/v1/analytics", {
            query: {
                ...analytics_query(filters),
                fromDate: filters.from_date.slice(0, 10),
                toDate: filters.to_date.slice(0, 10),
                source: "all",
                limit: "5",
                page: "1",
                sortBy: "engagement",
                order: "desc",
            },
        })
        return yield* Schema.decodeUnknownEffect(PostAnalyticsResponse)(
            data
        ).pipe(Effect.mapError(() => invalid_response("post_analytics")))
    })
    const get_follower_analytics = Effect.fn("Zernio.followerAnalytics")(
        function* (
            filters: AnalyticsFilters,
            account_ids: ReadonlyArray<string>
        ) {
            const data = yield* request(
                "follower_analytics",
                "GET",
                "/v1/accounts/follower-stats",
                {
                    query: {
                        profileId: filters.profile_id,
                        fromDate: filters.from_date.slice(0, 10),
                        toDate: filters.to_date.slice(0, 10),
                        granularity: "daily",
                        ...(account_ids.length === 0
                            ? {}
                            : { accountIds: account_ids.join(",") }),
                    },
                }
            )
            return yield* Schema.decodeUnknownEffect(FollowerAnalyticsResponse)(
                data
            ).pipe(
                Effect.mapError(() => invalid_response("follower_analytics"))
            )
        }
    )
    const list_accounts = Effect.fn("Zernio.listAccounts")(function* (
        profile_id: string
    ) {
        const data = yield* request("list_accounts", "GET", "/v1/accounts", {
            query: { profileId: profile_id, includeOverLimit: "true" },
        })
        const parsed = yield* Schema.decodeUnknownEffect(AccountsResponse)(
            data
        ).pipe(Effect.mapError(() => invalid_response("list_accounts")))
        return parsed.accounts.filter(
            (account) => profile_id_of(account.profileId) === profile_id
        )
    })
    const connect_account = Effect.fn("Zernio.connectAccount")(function* (
        profile_id: string,
        platform: string
    ) {
        const data = yield* request(
            "connect_account",
            "GET",
            `/v1/connect/${encodeURIComponent(platform)}`,
            { query: { profileId: profile_id } }
        )
        const parsed = yield* Schema.decodeUnknownEffect(ConnectResponse)(
            data
        ).pipe(Effect.mapError(() => invalid_response("connect_account")))
        return parsed.authUrl
    })
    const list_posts = Effect.fn("Zernio.listPosts")(function* (
        profile_id: string
    ) {
        const data = yield* request("list_posts", "GET", "/v1/posts", {
            query: {
                profileId: profile_id,
                limit: "50",
                sortBy: "created-desc",
            },
        })
        const parsed = yield* Schema.decodeUnknownEffect(PostsResponse)(
            data
        ).pipe(Effect.mapError(() => invalid_response("list_posts")))
        return parsed.posts
    })
    const find_post_by_local_id = Effect.fn("Zernio.findPostByLocalId")(
        function* (profile_id: string, local_post_id: string) {
            for (let page = 1; page <= 5; page++) {
                const data = yield* request(
                    "find_post_by_local_id",
                    "GET",
                    "/v1/posts",
                    {
                        query: {
                            profileId: profile_id,
                            limit: "100",
                            sortBy: "created-desc",
                            page: String(page),
                        },
                    }
                )
                const parsed = yield* Schema.decodeUnknownEffect(PostsResponse)(
                    data
                ).pipe(
                    Effect.mapError(() =>
                        invalid_response("find_post_by_local_id")
                    )
                )
                const found = parsed.posts.find(
                    (post) => post.metadata?.urmPostId === local_post_id
                )
                if (found) return found
                if (parsed.posts.length < 100) return null
            }
            return null
        }
    )
    const get_post = Effect.fn("Zernio.getPost")(function* (post_id: string) {
        const data = yield* request(
            "get_post",
            "GET",
            `/v1/posts/${encodeURIComponent(post_id)}`
        )
        const parsed = yield* Schema.decodeUnknownEffect(PostResponse)(
            data
        ).pipe(Effect.mapError(() => invalid_response("get_post")))
        if (!parsed.post)
            return yield* Effect.fail(
                new ZernioProviderError({
                    operation: "get_post",
                    message: "Zernio did not return the post",
                    status: null,
                })
            )
        return parsed.post
    })
    const create_post = Effect.fn("Zernio.createPost")(function* (
        input: CreatePostInput
    ) {
        const data = yield* request("create_post", "POST", "/v1/posts", {
            body: request_body(input),
            request_id: input.request_id,
        })
        const parsed = yield* Schema.decodeUnknownEffect(PostResponse)(
            data
        ).pipe(Effect.mapError(() => invalid_response("create_post")))
        const post = parsed.post ?? parsed.existingPost
        if (!post)
            return yield* Effect.fail(
                new ZernioProviderError({
                    operation: "create_post",
                    message: "Zernio did not return the submitted post",
                    status: null,
                })
            )
        return post
    })
    const update_post = Effect.fn("Zernio.updatePost")(function* (
        post_id: string,
        input: CreatePostInput
    ) {
        const data = yield* request(
            "update_post",
            "PUT",
            `/v1/posts/${encodeURIComponent(post_id)}`,
            { body: request_body(input) }
        )
        const parsed = yield* Schema.decodeUnknownEffect(PostResponse)(
            data
        ).pipe(Effect.mapError(() => invalid_response("update_post")))
        if (!parsed.post)
            return yield* Effect.fail(
                new ZernioProviderError({
                    operation: "update_post",
                    message: "Zernio did not return the updated post",
                    status: null,
                })
            )
        return parsed.post
    })
    const delete_post = Effect.fn("Zernio.deletePost")(function* (
        post_id: string
    ) {
        yield* request(
            "delete_post",
            "DELETE",
            `/v1/posts/${encodeURIComponent(post_id)}`
        )
    })
    return ZernioProvider.of({
        get_daily_analytics,
        get_post_analytics,
        get_follower_analytics,
        list_profiles,
        create_profile,
        list_accounts,
        connect_account,
        list_posts,
        find_post_by_local_id,
        get_post,
        create_post,
        update_post,
        delete_post,
    })
}

export const ZernioProviderLive = Layer.effect(
    ZernioProvider,
    Effect.gen(function* () {
        const api_key = yield* Config.redacted("ZERNIO_API_KEY")
        return make_zernio_provider(api_key)
    })
)
