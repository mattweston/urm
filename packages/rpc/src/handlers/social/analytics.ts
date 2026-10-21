import { Effect, Option } from "effect"
import { SocialAnalyticsSnapshot } from "@urm/contracts/social"
import { ZernioProvider } from "./provider.ts"
import { SocialStore, SocialStoreError, type SocialPrincipal } from "./store.ts"

interface ProviderMetrics {
    readonly impressions?: number | undefined
    readonly reach?: number | undefined
    readonly likes?: number | undefined
    readonly comments?: number | undefined
    readonly shares?: number | undefined
    readonly saves?: number | undefined
    readonly clicks?: number | undefined
    readonly views?: number | undefined
}
const metrics = (value: ProviderMetrics) => {
    const likes = value.likes ?? 0
    const comments = value.comments ?? 0
    const shares = value.shares ?? 0
    const saves = value.saves ?? 0
    const clicks = value.clicks ?? 0
    return {
        impressions: value.impressions ?? 0,
        reach: value.reach ?? 0,
        likes,
        comments,
        shares,
        saves,
        clicks,
        views: value.views ?? 0,
        engagement: likes + comments + shares + saves + clicks,
    }
}
const zero_metrics = () => metrics({})
const add_metrics = (
    left: ReturnType<typeof metrics>,
    right: ReturnType<typeof metrics>
) => ({
    impressions: left.impressions + right.impressions,
    reach: left.reach + right.reach,
    likes: left.likes + right.likes,
    comments: left.comments + right.comments,
    shares: left.shares + right.shares,
    saves: left.saves + right.saves,
    clicks: left.clicks + right.clicks,
    views: left.views + right.views,
    engagement: left.engagement + right.engagement,
})
const days = (period: typeof SocialAnalyticsSnapshot.Type.period) =>
    period === "7d" ? 7 : period === "30d" ? 30 : 90

export const refresh_social_analytics = Effect.fn("Social.refreshAnalytics")(
    function* (
        principal: SocialPrincipal,
        period: typeof SocialAnalyticsSnapshot.Type.period,
        platform: typeof SocialAnalyticsSnapshot.Type.platform,
        account_id: string | null
    ) {
        const store = yield* SocialStore
        yield* store.authorize_write(principal)
        const accounts = (yield* store.load_accounts(principal)).filter(
            (account) => account.active
        )
        if (accounts.length === 0)
            return yield* Effect.fail(
                new SocialStoreError({
                    message: "Connect and sync a social account first",
                })
            )
        const selected =
            account_id === null
                ? null
                : accounts.find((account) => account.account_id === account_id)
        if (account_id !== null && !selected)
            return yield* Effect.fail(
                new SocialStoreError({
                    message: "Select an active, connected social account",
                })
            )
        if (selected && platform !== "all" && selected.platform !== platform)
            return yield* Effect.fail(
                new SocialStoreError({
                    message:
                        "The selected account does not match the platform filter",
                })
            )
        const profile_id = yield* store.load_profile(principal)
        if (profile_id === null)
            return yield* Effect.fail(
                new SocialStoreError({
                    message: "Connect a Social profile first",
                })
            )
        const now = new Date()
        const start = new Date(now.getTime() - (days(period) - 1) * 86_400_000)
        const filters = {
            profile_id,
            platform,
            account_id,
            from_date: start.toISOString(),
            to_date: now.toISOString(),
        }
        const provider = yield* ZernioProvider
        const daily = yield* provider.get_daily_analytics(filters)
        const posts = yield* provider.get_post_analytics(filters)
        const matching = accounts
            .filter(
                (account) =>
                    (account_id === null ||
                        account.account_id === account_id) &&
                    (platform === "all" || account.platform === platform)
            )
            .map((account) => account.account_id)
        const follower_result = yield* provider
            .get_follower_analytics(filters, matching)
            .pipe(Effect.option)
        const points = daily.dailyData
            .slice(0, 90)
            .sort((left, right) => left.date.localeCompare(right.date))
            .map((point) => ({
                date: point.date,
                post_count: point.postCount,
                metrics: metrics(point.metrics),
            }))
        const snapshot: typeof SocialAnalyticsSnapshot.Type = {
            period,
            platform,
            account_id,
            post_count: posts.overview.totalPosts,
            metrics: points.reduce(
                (total, point) => add_metrics(total, point.metrics),
                zero_metrics()
            ),
            follower_growth: Option.isSome(follower_result)
                ? follower_result.value.accounts
                      .filter(
                          (account) =>
                              platform === "all" ||
                              account.platform === platform
                      )
                      .reduce((total, account) => total + account.growth, 0)
                : 0,
            daily: points,
            platform_breakdown: daily.platformBreakdown
                .slice(0, 16)
                .map((entry) => ({
                    platform: entry.platform,
                    post_count: entry.postCount,
                    metrics: metrics(entry),
                })),
            top_posts: posts.posts.slice(0, 5).map((post) => ({
                post_id: post._id,
                platform: post.platform ?? "unknown",
                content: post.content ?? "Untitled post",
                published_at: post.publishedAt ?? null,
                post_url: post.platformPostUrl ?? null,
                metrics: metrics(post.analytics),
            })),
            warning: Option.isSome(follower_result)
                ? null
                : "Follower growth requires Zernio Analytics access.",
            updated_at: Date.now(),
        }
        return yield* store.save_analytics(principal, snapshot)
    }
)
