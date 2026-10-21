import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import { ContentTemplateSource } from "@urm/domain/schemas/content-templates"

export const SocialAccount = Schema.Struct({
    account_id: Schema.String,
    platform: Schema.String,
    username: Schema.String,
    display_name: Schema.NullOr(Schema.String),
    avatar_url: Schema.NullOr(Schema.String),
    active: Schema.Boolean,
    synced_at: Schema.Number,
})
export const SocialAccountsRecord = Schema.Struct({
    id: Schema.String,
    accounts: Schema.Array(SocialAccount),
})
export const SocialAccountsEntity = Entity.make(
    "SocialAccounts",
    SocialAccountsRecord
)
export const SocialPost = Schema.Struct({
    post_id: Schema.String,
    status: Schema.Literals([
        "pending",
        "submitting",
        "draft",
        "scheduled",
        "published",
        "partial",
        "failed",
        "cancelled",
    ]),
    content: Schema.String,
    account_ids: Schema.Array(Schema.String),
    media_ids: Schema.Array(Schema.String),
    media_urls: Schema.Array(Schema.String),
    platforms: Schema.Array(
        Schema.Struct({
            platform: Schema.String,
            account_id: Schema.String,
            status: Schema.String,
            published_url: Schema.optional(Schema.String),
            error_message: Schema.optional(Schema.String),
        })
    ),
    scheduled_for: Schema.NullOr(Schema.Number),
    error_message: Schema.NullOr(Schema.String),
    pending_draft_edit: Schema.Boolean,
    test_mode: Schema.Boolean,
    template_source: Schema.NullOr(ContentTemplateSource),
    created_at: Schema.Number,
})
export const SocialPostsRecord = Schema.Struct({
    id: Schema.String,
    posts: Schema.Array(SocialPost),
})
export const SocialPostsEntity = Entity.make("SocialPosts", SocialPostsRecord)
export const SocialPostsSummary = SocialPostsEntity.select({
    id: true,
    posts: true,
})
export const DomainSocialPosts = Query.make("DomainSocialPosts", {
    Input: { domain_id: Schema.String },
    Result: SocialPostsEntity,
})
export const SocialTemplate = Schema.Struct({
    id: Schema.String,
    organization_id: Schema.String,
    name: Schema.String,
    description: Schema.String,
    tags: Schema.Array(Schema.String),
    content: Schema.String,
    revision: Schema.Number,
    created_by_user_id: Schema.String,
    updated_by_user_id: Schema.String,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const SocialAnalyticsMetrics = Schema.Struct({
    impressions: Schema.Number,
    reach: Schema.Number,
    likes: Schema.Number,
    comments: Schema.Number,
    shares: Schema.Number,
    saves: Schema.Number,
    clicks: Schema.Number,
    views: Schema.Number,
    engagement: Schema.Number,
})
export const SocialAnalyticsSnapshot = Schema.Struct({
    period: Schema.Literals(["7d", "30d", "90d"]),
    platform: Schema.Literals(["all", "facebook", "instagram"]),
    account_id: Schema.NullOr(Schema.String),
    post_count: Schema.Number,
    metrics: SocialAnalyticsMetrics,
    follower_growth: Schema.Number,
    daily: Schema.Array(
        Schema.Struct({
            date: Schema.String,
            post_count: Schema.Number,
            metrics: SocialAnalyticsMetrics,
        })
    ),
    platform_breakdown: Schema.Array(
        Schema.Struct({
            platform: Schema.String,
            post_count: Schema.Number,
            metrics: SocialAnalyticsMetrics,
        })
    ),
    top_posts: Schema.Array(
        Schema.Struct({
            post_id: Schema.String,
            platform: Schema.String,
            content: Schema.String,
            published_at: Schema.NullOr(Schema.String),
            post_url: Schema.NullOr(Schema.String),
            metrics: SocialAnalyticsMetrics,
        })
    ),
    warning: Schema.NullOr(Schema.String),
    updated_at: Schema.Number,
})
export const SocialTemplatesRecord = Schema.Struct({
    id: Schema.String,
    templates: Schema.Array(SocialTemplate),
})
export const SocialTemplatesEntity = Entity.make(
    "SocialTemplates",
    SocialTemplatesRecord
)
export const SocialTemplatesSummary = SocialTemplatesEntity.select({
    id: true,
    templates: true,
})
export const SocialAnalyticsRecord = Schema.Struct({
    id: Schema.String,
    snapshot: Schema.NullOr(SocialAnalyticsSnapshot),
})
export const SocialAnalyticsEntity = Entity.make(
    "SocialAnalytics",
    SocialAnalyticsRecord
)
export const SocialAnalyticsSummary = SocialAnalyticsEntity.select({
    id: true,
    snapshot: true,
})
export const DomainSocialAnalytics = Query.make("DomainSocialAnalytics", {
    Input: {
        domain_id: Schema.String,
        period: SocialAnalyticsSnapshot.fields.period,
        platform: SocialAnalyticsSnapshot.fields.platform,
        account_id: Schema.NullOr(Schema.String),
    },
    Result: SocialAnalyticsEntity,
})
export const DomainSocialTemplates = Query.make("DomainSocialTemplates", {
    Input: { domain_id: Schema.String },
    Result: SocialTemplatesEntity,
})
export const SocialAccountsSummary = SocialAccountsEntity.select({
    id: true,
    accounts: true,
})
export const DomainSocialAccounts = Query.make("DomainSocialAccounts", {
    Input: { domain_id: Schema.String },
    Result: SocialAccountsEntity,
})
export const SyncSocialAccounts = Mutation.make("SyncSocialAccounts", {
    Input: { domain_id: Schema.String },
    Output: { domain_id: Schema.String },
})
export const ConnectSocialAccount = Mutation.make("ConnectSocialAccount", {
    Input: {
        domain_id: Schema.String,
        platform: Schema.Literals(["facebook", "instagram"]),
    },
    Output: { auth_url: Schema.String },
})
export const SaveSocialTemplate = Mutation.make("SaveSocialTemplate", {
    Input: {
        domain_id: Schema.String,
        template_id: Schema.NullOr(Schema.String),
        expected_revision: Schema.Number,
        name: Schema.String,
        description: Schema.String,
        tags: Schema.Array(Schema.String),
        content: Schema.String,
    },
    Output: { template_id: Schema.String },
})
export const RefreshSocialAnalytics = Mutation.make("RefreshSocialAnalytics", {
    Input: {
        domain_id: Schema.String,
        period: SocialAnalyticsSnapshot.fields.period,
        platform: SocialAnalyticsSnapshot.fields.platform,
        account_id: Schema.NullOr(Schema.String),
    },
    Output: { domain_id: Schema.String },
})
export const SubmitSocialPost = Mutation.make("SubmitSocialPost", {
    Input: {
        domain_id: Schema.String,
        idempotency_key: Schema.String,
        account_ids: Schema.Array(Schema.String),
        media_ids: Schema.Array(Schema.String),
        content: Schema.String,
        scheduled_for: Schema.NullOr(Schema.Number),
        publication_mode: Schema.Literals(["draft", "publish_now", "schedule"]),
        template_id: Schema.NullOr(Schema.String),
    },
    Output: { post_id: Schema.String, status: Schema.String },
})
export const CancelSocialPost = Mutation.make("CancelSocialPost", {
    Input: { domain_id: Schema.String, post_id: Schema.String },
    Output: { post_id: Schema.String, status: Schema.String },
})
export const DeleteSocialPost = Mutation.make("DeleteSocialPost", {
    Input: { domain_id: Schema.String, post_id: Schema.String },
    Output: { post_id: Schema.String },
})
export const PublishSocialDraft = Mutation.make("PublishSocialDraft", {
    Input: { domain_id: Schema.String, post_id: Schema.String },
    Output: {
        post_id: Schema.String,
        status: Schema.String,
        resolved: Schema.Boolean,
    },
})
export const UpdateSocialDraft = Mutation.make("UpdateSocialDraft", {
    Input: {
        domain_id: Schema.String,
        post_id: Schema.String,
        account_ids: Schema.Array(Schema.String),
        media_ids: Schema.Array(Schema.String),
        content: Schema.String,
    },
    Output: { post_id: Schema.String, status: Schema.String },
})
export const ReconcileSocialPost = Mutation.make("ReconcileSocialPost", {
    Input: { domain_id: Schema.String, post_id: Schema.String },
    Output: {
        post_id: Schema.String,
        status: Schema.String,
        resolved: Schema.Boolean,
    },
})
export const RetrySocialDraftEdit = Mutation.make("RetrySocialDraftEdit", {
    Input: { domain_id: Schema.String, post_id: Schema.String },
    Output: { post_id: Schema.String, status: Schema.String },
})
export const SocialRemote = Remote.define({
    entities: [
        SocialAccountsEntity,
        SocialPostsEntity,
        SocialTemplatesEntity,
        SocialAnalyticsEntity,
    ],
    queries: [
        DomainSocialAccounts,
        DomainSocialPosts,
        DomainSocialTemplates,
        DomainSocialAnalytics,
    ],
    mutations: [
        SyncSocialAccounts,
        ConnectSocialAccount,
        SaveSocialTemplate,
        RefreshSocialAnalytics,
        SubmitSocialPost,
        CancelSocialPost,
        DeleteSocialPost,
        PublishSocialDraft,
        UpdateSocialDraft,
        ReconcileSocialPost,
        RetrySocialDraftEdit,
    ],
})
