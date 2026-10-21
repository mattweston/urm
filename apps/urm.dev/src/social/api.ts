import { Effect, Schema } from "effect"
import { defineMessageUnion } from "foldkit/message"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import {
    DomainSocialAccounts,
    DomainSocialAnalytics,
    DomainSocialPosts,
    DomainSocialTemplates,
    SocialAccountsEntity,
    SocialAccountsSummary,
    SocialAnalyticsEntity,
    SocialAnalyticsSummary,
    SocialPostsEntity,
    SocialPostsSummary,
    SocialTemplatesEntity,
    SocialTemplatesSummary,
} from "@urm/contracts/social"
import { DomainMedia, LibrarySummary, MediaLibrary } from "@urm/contracts/media"
import { AccountRequestError, ContactsApi } from "../contacts/api.ts"

const CacheModel = Schema.Struct({ remote: Remote.Model })
const Cache = Surface.application({
    Model: CacheModel,
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: typeof CacheModel.Type) => ({ model }),
})
const Data = Remote.make({
    model: Cache.model.remote,
    entities: [
        SocialAccountsEntity,
        SocialPostsEntity,
        SocialTemplatesEntity,
        SocialAnalyticsEntity,
        MediaLibrary,
    ],
    queries: [
        DomainSocialAccounts,
        DomainSocialPosts,
        DomainSocialTemplates,
        DomainSocialAnalytics,
        DomainMedia,
    ],
    mutations: [],
})

export const check_social_session = Effect.fn("Social.checkSession")(function* (
    domain_id: string,
    write: boolean
) {
    const api = yield* ContactsApi
    const session = yield* api.session()
    const workspace = session.domains.find((item) => item.id === domain_id)
    if (!workspace)
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message:
                    "Your account does not have access to this PostgreSQL workspace. Ask its owner to add you.",
            })
        )
    if (write && !workspace.can_write)
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message:
                    "Social changes require workspace owner, admin, or sysadmin access.",
            })
        )
    return api
})

export const load_social_accounts = Effect.fn("Social.loadRemoteAccounts")(
    function* (domain_id: string) {
        const api = yield* check_social_session(domain_id, false)
        const query = Data.query(
            DomainSocialAccounts,
            { domain_id },
            { select: SocialAccountsSummary, first: 1 }
        )
        const loaded = yield* Data.prefetch(
            { remote: Remote.initial },
            query
        ).pipe(Effect.provide(api.remote(domain_id)))
        const result = query.read(loaded)
        if (result._tag !== "Ready")
            return yield* Effect.fail(
                new AccountRequestError({
                    status: 503,
                    message: "Social accounts could not be loaded.",
                })
            )
        return result.value.items[0]?.accounts ?? []
    }
)

export const load_social_data = Effect.fn("Social.loadRemoteData")(function* (
    domain_id: string,
    period: typeof DomainSocialAnalytics.Input.Type.period,
    platform: typeof DomainSocialAnalytics.Input.Type.platform,
    account_id: string | null
) {
    const api = yield* check_social_session(domain_id, false)
    const accounts_query = Data.query(
        DomainSocialAccounts,
        { domain_id },
        { select: SocialAccountsSummary, first: 1 }
    )
    const posts_query = Data.query(
        DomainSocialPosts,
        { domain_id },
        { select: SocialPostsSummary, first: 1 }
    )
    const templates_query = Data.query(
        DomainSocialTemplates,
        { domain_id },
        { select: SocialTemplatesSummary, first: 1 }
    )
    const analytics_query = Data.query(
        DomainSocialAnalytics,
        { domain_id, period, platform, account_id },
        { select: SocialAnalyticsSummary, first: 1 }
    )
    const media_query = Data.query(
        DomainMedia,
        { domain_id },
        { select: LibrarySummary, first: 1 }
    )
    const layer = api.remote(domain_id)
    const accounts = yield* Data.prefetch(
        { remote: Remote.initial },
        accounts_query
    ).pipe(Effect.provide(layer))
    const posts = yield* Data.prefetch(
        { remote: Remote.initial },
        posts_query
    ).pipe(Effect.provide(layer))
    const templates = yield* Data.prefetch(
        { remote: Remote.initial },
        templates_query
    ).pipe(Effect.provide(layer))
    const analytics = yield* Data.prefetch(
        { remote: Remote.initial },
        analytics_query
    ).pipe(Effect.provide(layer))
    const media = yield* Data.prefetch(
        { remote: Remote.initial },
        media_query
    ).pipe(Effect.provide(layer))
    const account_result = accounts_query.read(accounts)
    const post_result = posts_query.read(posts)
    const template_result = templates_query.read(templates)
    const analytics_result = analytics_query.read(analytics)
    const media_result = media_query.read(media)
    if (
        account_result._tag !== "Ready" ||
        post_result._tag !== "Ready" ||
        template_result._tag !== "Ready" ||
        analytics_result._tag !== "Ready" ||
        media_result._tag !== "Ready"
    )
        return yield* Effect.fail(
            new AccountRequestError({
                status: 503,
                message:
                    "Social data could not be loaded. Refresh and try again.",
            })
        )
    return {
        accounts: account_result.value.items[0]?.accounts ?? [],
        posts: post_result.value.items[0]?.posts ?? [],
        templates: template_result.value.items[0]?.templates ?? [],
        analytics: analytics_result.value.items[0]?.snapshot ?? null,
        media: media_result.value.items[0]?.images ?? [],
    }
})

export const load_social_templates = Effect.fn("Social.loadRemoteTemplates")(
    function* (domain_id: string) {
        const api = yield* check_social_session(domain_id, false)
        const query = Data.query(
            DomainSocialTemplates,
            { domain_id },
            { select: SocialTemplatesSummary, first: 1 }
        )
        const loaded = yield* Data.prefetch(
            { remote: Remote.initial },
            query
        ).pipe(Effect.provide(api.remote(domain_id)))
        const result = query.read(loaded)
        if (result._tag !== "Ready")
            return yield* Effect.fail(
                new AccountRequestError({
                    status: 503,
                    message: "Social templates could not be loaded.",
                })
            )
        return result.value.items[0]?.templates ?? []
    }
)
