import * as Ui from "@foldkit/ui"
import { Effect, Match as M, Option, Schema as S } from "effect"
import { Calendar, Command, Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import {
    ContentTemplateDescription,
    ContentTemplateName,
    ContentTemplateSource,
    ContentTemplateTags,
} from "@urm/domain/schemas/content-templates"

import {
    date_picker_backdrop_class,
    date_picker_calendar_view,
    date_picker_panel_class,
    date_picker_trigger_class,
    date_picker_trigger_content,
} from "@urm/ui/foldkit/date-picker.view.ts"
import * as TimePicker from "@urm/ui/foldkit/time-picker.ts"

import { chart_card } from "../charting/bar-chart.view.ts"
import { line_chart_card } from "../charting/line-chart.view.ts"
import { content_item_href } from "../content/route.ts"
import { bookmark_url_field_view } from "../content/bookmarks/bookmark-url-field.view.ts"
import type { LinkSuggestion } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"

/** A social account connected to the active workspace. */
export const Account = S.Struct({
    account_id: S.String,
    platform: S.String,
    username: S.String,
    display_name: S.optional(S.String),
    avatar_url: S.optional(S.String),
    active: S.Boolean,
    synced_at: S.Number,
})
/** The decoded social account type. */
export type Account = typeof Account.Type

/** An image from the active workspace media library. */
export const MediaImage = S.Struct({
    image_id: S.String,
    url: S.String,
    alt: S.String,
    width: S.optional(S.Number),
    height: S.optional(S.Number),
})
/** The decoded composer image type. */
export type MediaImage = typeof MediaImage.Type

const PostStatus = S.Literals([
    "pending",
    "submitting",
    "draft",
    "scheduled",
    "published",
    "partial",
    "failed",
    "cancelled",
])

const PublicationMode = S.Literals(["draft", "publish_now", "schedule"])
type PublicationMode = typeof PublicationMode.Type
const LivePublicationMode = S.Literals(["publish_now", "schedule"])
type LivePublicationMode = typeof LivePublicationMode.Type
const SocialTemplateContent = S.Trimmed.check(
    S.isMinLength(1),
    S.isMaxLength(5_000)
)

const PostPlatform = S.Struct({
    platform: S.String,
    account_id: S.String,
    status: S.String,
    published_url: S.optional(S.String),
    error_message: S.optional(S.String),
})

/** A provider-backed social post visible to the active workspace. */
export const Post = S.Struct({
    post_id: S.String,
    status: PostStatus,
    content: S.String,
    account_ids: S.Array(S.String),
    media_ids: S.Array(S.String),
    media_urls: S.Array(S.String),
    platforms: S.Array(PostPlatform),
    scheduled_for: S.NullOr(S.Number),
    error_message: S.NullOr(S.String),
    pending_draft_edit: S.Boolean,
    test_mode: S.Boolean,
    template_source: S.NullOr(ContentTemplateSource),
    created_at: S.Number,
})
/** The decoded social post type. */
export type Post = typeof Post.Type

export const AnalyticsPeriod = S.Literals(["7d", "30d", "90d"])
export type AnalyticsPeriod = typeof AnalyticsPeriod.Type

export const AnalyticsPlatform = S.Literals(["all", "facebook", "instagram"])
export type AnalyticsPlatform = typeof AnalyticsPlatform.Type

const AnalyticsMetrics = S.Struct({
    impressions: S.Number,
    reach: S.Number,
    likes: S.Number,
    comments: S.Number,
    shares: S.Number,
    saves: S.Number,
    clicks: S.Number,
    views: S.Number,
    engagement: S.Number,
})

const AnalyticsDailyPoint = S.Struct({
    date: S.String,
    post_count: S.Number,
    metrics: AnalyticsMetrics,
})

const AnalyticsPlatformBreakdown = S.Struct({
    platform: S.String,
    post_count: S.Number,
    metrics: AnalyticsMetrics,
})

const AnalyticsTopPost = S.Struct({
    post_id: S.String,
    platform: S.String,
    content: S.String,
    published_at: S.NullOr(S.String),
    post_url: S.NullOr(S.String),
    metrics: AnalyticsMetrics,
})

export const AnalyticsSnapshot = S.Struct({
    period: AnalyticsPeriod,
    platform: AnalyticsPlatform,
    account_id: S.NullOr(S.String),
    post_count: S.Number,
    metrics: AnalyticsMetrics,
    follower_growth: S.Number,
    daily: S.Array(AnalyticsDailyPoint),
    platform_breakdown: S.Array(AnalyticsPlatformBreakdown),
    top_posts: S.Array(AnalyticsTopPost),
    warning: S.NullOr(S.String),
    updated_at: S.Number,
})
export type AnalyticsSnapshot = typeof AnalyticsSnapshot.Type

const AccountsState = S.Union([
    S.TaggedStruct("Loading", {}),
    S.TaggedStruct("Ready", { accounts: S.Array(Account) }),
    S.TaggedStruct("Failed", { error: S.String }),
])

const PostsState = S.Union([
    S.TaggedStruct("Loading", {}),
    S.TaggedStruct("Ready", { posts: S.Array(Post) }),
    S.TaggedStruct("Failed", { error: S.String }),
])

const MediaState = S.Union([
    S.TaggedStruct("Loading", {}),
    S.TaggedStruct("Ready", { images: S.Array(MediaImage) }),
    S.TaggedStruct("Failed", { error: S.String }),
])

const AnalyticsState = S.Union([
    S.TaggedStruct("Loading", {}),
    S.TaggedStruct("Ready", { snapshot: S.NullOr(AnalyticsSnapshot) }),
    S.TaggedStruct("Failed", { error: S.String }),
])

const OperationState = S.Union([
    S.TaggedStruct("Idle", {}),
    S.TaggedStruct("Syncing", {}),
    S.TaggedStruct("Connecting", { platform: S.String }),
    S.TaggedStruct("Submitting", { publication_mode: PublicationMode }),
    S.TaggedStruct("Cancelling", { post_id: S.String }),
    S.TaggedStruct("Deleting", { post_id: S.String }),
    S.TaggedStruct("Checking", { post_id: S.String }),
    S.TaggedStruct("ReadyToConnect", {
        platform: S.String,
        auth_url: S.String,
    }),
    S.TaggedStruct("Succeeded", { message: S.String }),
    S.TaggedStruct("Failed", { error: S.String }),
])

/** State for the Social connected-accounts screen. */
export const Model = S.Struct({
    bookmark_url: S.String,
    bookmark_error: S.String,
    accounts: AccountsState,
    posts: PostsState,
    media: MediaState,
    unavailable_media_ids: S.Array(S.String),
    analytics: AnalyticsState,
    analytics_period: AnalyticsPeriod,
    analytics_platform: AnalyticsPlatform,
    analytics_account_id: S.NullOr(S.String),
    analytics_refreshing: S.Boolean,
    analytics_error: S.NullOr(S.String),
    content: S.String,
    schedule_date_picker: Ui.DatePicker.Model,
    schedule_date: S.Option(Calendar.CalendarDate),
    schedule_time_picker: TimePicker.Model,
    selected_account_ids: S.Array(S.String),
    selected_media_ids: S.Array(S.String),
    editing_post_id: S.NullOr(S.String),
    creation_template_id: S.NullOr(S.String),
    pending_publication: S.NullOr(LivePublicationMode),
    pending_publish_post_id: S.NullOr(S.String),
    pending_delete_post_id: S.NullOr(S.String),
    checked_post: S.NullOr(
        S.Struct({ post_id: S.String, status: S.String, resolved: S.Boolean })
    ),
    template_name: S.String,
    template_description: S.String,
    template_tags: S.String,
    template_save_status: S.Literals(["idle", "saving"]),
    template_feedback: S.String,
    operation: OperationState,
})
/** The Social connected-accounts Model. */
export type Model = typeof Model.Type

/** Records a request to refresh connected accounts. */
export const ClickedSyncAccounts = taggedStruct("ClickedSyncAccounts")
export const ChangedBookmarkUrl = taggedStruct("ChangedBookmarkUrl", {
    value: S.String,
})
export const InsertedBookmarkUrl = taggedStruct("InsertedBookmarkUrl")
/** Records a request to begin an account OAuth flow. */
export const ClickedConnectAccount = taggedStruct("ClickedConnectAccount", {
    platform: S.String,
})
/** Carries the latest reactive account snapshot. */
export const LoadedAccounts = taggedStruct("LoadedAccounts", {
    accounts: S.Array(Account),
})
/** Reports a reactive account query failure. */
export const FailedLoadingAccounts = taggedStruct("FailedLoadingAccounts", {
    error: S.String,
})
/** Reports a completed account refresh. */
export const SucceededSyncAccounts = taggedStruct("SucceededSyncAccounts", {
    accounts: S.Array(Account),
})
/** Reports a failed account refresh. */
export const FailedSyncAccounts = taggedStruct("FailedSyncAccounts", {
    error: S.String,
})
/** Carries the provider URL for the requested account connection. */
export const SucceededConnectAccount = taggedStruct("SucceededConnectAccount", {
    auth_url: S.String,
})
/** Reports a failed account connection request. */
export const FailedConnectAccount = taggedStruct("FailedConnectAccount", {
    error: S.String,
})
/** Updates the post composer text. */
export const ChangedPostContent = taggedStruct("ChangedPostContent", {
    value: S.String,
})
/** Seeds a new unsaved composer from portable organization template content. */
export const SelectedSocialTemplate = taggedStruct("SelectedSocialTemplate", {
    template_id: S.String,
    content: SocialTemplateContent,
})
/** Updates reusable-template catalog metadata without changing post delivery. */
export const ChangedSocialTemplateMetadata = taggedStruct(
    "ChangedSocialTemplateMetadata",
    {
        field: S.Literals(["name", "description", "tags"]),
        value: S.String,
    }
)
/** Saves the current portable caption as an organization template. */
export const SubmittedSocialTemplate = taggedStruct("SubmittedSocialTemplate")
export const SucceededSaveSocialTemplate = taggedStruct(
    "SucceededSaveSocialTemplate"
)
export const FailedSaveSocialTemplate = taggedStruct(
    "FailedSaveSocialTemplate",
    {
        error: S.String,
    }
)
/** Carries interaction from the Foldkit schedule date picker. */
export const GotScheduleDatePickerMessage = taggedStruct(
    "GotScheduleDatePickerMessage",
    {
        message: Ui.DatePicker.Message,
    }
)
/** Carries interaction from the schedule time picker. */
export const GotScheduleTimePickerMessage = taggedStruct(
    "GotScheduleTimePickerMessage",
    {
        message: TimePicker.Message,
    }
)
/** Clears both parts of the optional schedule. */
export const ClickedClearSchedule = taggedStruct("ClickedClearSchedule")
/** Includes or excludes an account from the post targets. */
export const ToggledPostAccount = taggedStruct("ToggledPostAccount", {
    account_id: S.String,
})
/** Includes or excludes a media-library image from the post. */
export const ToggledPostMedia = taggedStruct("ToggledPostMedia", {
    image_id: S.String,
})
/** Carries the latest media-library image snapshot. */
export const LoadedMedia = taggedStruct("LoadedMedia", {
    images: S.Array(MediaImage),
})
/** Reports a media-library query failure. */
export const FailedLoadingMedia = taggedStruct("FailedLoadingMedia", {
    error: S.String,
})
export const FailedLoadingMediaImage = taggedStruct("FailedLoadingMediaImage", {
    image_id: S.String,
})
/** Replaces stored media URLs with short-lived URLs resolved by the server. */
export const ResolvedMediaUrls = taggedStruct("ResolvedMediaUrls", {
    images: S.Array(
        S.Struct({
            stored_url: S.String,
            url: S.String,
        })
    ),
})
/** Reports a failure while resolving private media previews. */
export const FailedResolvingMediaUrls = taggedStruct(
    "FailedResolvingMediaUrls",
    {
        error: S.String,
    }
)
/** Submits the current composer as a provider draft. */
export const SubmittedPost = taggedStruct("SubmittedPost")
/** Opens a confirmation step for an immediate or scheduled live post. */
export const ClickedRequestPublication = taggedStruct(
    "ClickedRequestPublication",
    {
        publication_mode: LivePublicationMode,
    }
)
/** Closes the live-publication confirmation without submitting. */
export const ClickedCancelPublication = taggedStruct("ClickedCancelPublication")
/** Confirms that the current composer should be sent to live accounts. */
export const ClickedConfirmPublication = taggedStruct(
    "ClickedConfirmPublication"
)
/** Carries the latest reactive post snapshot. */
export const LoadedPosts = taggedStruct("LoadedPosts", { posts: S.Array(Post) })
/** Reports a reactive post query failure. */
export const FailedLoadingPosts = taggedStruct("FailedLoadingPosts", {
    error: S.String,
})
/** Carries the cached analytics snapshot for the selected filters. */
export const LoadedAnalytics = taggedStruct("LoadedAnalytics", {
    snapshot: S.NullOr(AnalyticsSnapshot),
})
/** Reports a reactive analytics query failure. */
export const FailedLoadingAnalytics = taggedStruct("FailedLoadingAnalytics", {
    error: S.String,
})
/** Changes the analytics reporting period. */
export const ChangedAnalyticsPeriod = taggedStruct("ChangedAnalyticsPeriod", {
    value: S.String,
})
/** Changes the analytics platform filter. */
export const ChangedAnalyticsPlatform = taggedStruct(
    "ChangedAnalyticsPlatform",
    {
        value: S.String,
    }
)
/** Changes the analytics account filter; an empty value means all accounts. */
export const ChangedAnalyticsAccount = taggedStruct("ChangedAnalyticsAccount", {
    value: S.String,
})
/** Requests fresh analytics from Zernio. */
export const ClickedRefreshAnalytics = taggedStruct("ClickedRefreshAnalytics")
/** Reports a successful analytics refresh. */
export const SucceededRefreshAnalytics = taggedStruct(
    "SucceededRefreshAnalytics",
    {
        snapshot: AnalyticsSnapshot,
    }
)
/** Reports a failed analytics refresh. */
export const FailedRefreshAnalytics = taggedStruct("FailedRefreshAnalytics", {
    error: S.String,
})
/** Loads a saved provider draft back into the composer. */
export const ClickedEditPost = taggedStruct("ClickedEditPost", {
    post_id: S.String,
})
/** Leaves edit mode without changing the saved draft. */
export const ClickedDiscardPostEdit = taggedStruct("ClickedDiscardPostEdit")
/** Reports successful provider-draft submission. */
export const SucceededSchedulePost = taggedStruct("SucceededSchedulePost", {
    post_id: S.String,
})
/** Reports failed provider-draft submission. */
export const FailedSchedulePost = taggedStruct("FailedSchedulePost", {
    error: S.String,
})
/** Reports a successfully updated provider draft. */
export const SucceededUpdatePost = taggedStruct("SucceededUpdatePost", {
    post_id: S.String,
})
/** Reports a failed provider-draft update. */
export const FailedUpdatePost = taggedStruct("FailedUpdatePost", {
    error: S.String,
})
/** Requests cancellation of a pending provider post. */
export const ClickedCancelPost = taggedStruct("ClickedCancelPost", {
    post_id: S.String,
})
export const ClickedRequestDeletePost = taggedStruct(
    "ClickedRequestDeletePost",
    { post_id: S.String }
)
export const ClickedCancelDeletePost = taggedStruct("ClickedCancelDeletePost")
export const ClickedConfirmDeletePost = taggedStruct("ClickedConfirmDeletePost")
export const SucceededDeletePost = taggedStruct("SucceededDeletePost", {
    post_id: S.String,
})
export const FailedDeletePost = taggedStruct("FailedDeletePost", {
    error: S.String,
})
export const ClickedCheckPostStatus = taggedStruct("ClickedCheckPostStatus", {
    post_id: S.String,
})
export const ClickedRequestPublishDraft = taggedStruct(
    "ClickedRequestPublishDraft",
    { post_id: S.String }
)
export const ClickedCancelPublishDraft = taggedStruct(
    "ClickedCancelPublishDraft"
)
export const ClickedConfirmPublishDraft = taggedStruct(
    "ClickedConfirmPublishDraft"
)
export const SucceededPublishDraft = taggedStruct("SucceededPublishDraft", {
    post_id: S.String,
    status: S.String,
    resolved: S.Boolean,
})
export const FailedPublishDraft = taggedStruct("FailedPublishDraft", {
    error: S.String,
})
export const ClickedRetryDraftEdit = taggedStruct("ClickedRetryDraftEdit", {
    post_id: S.String,
})
export const SucceededCheckPostStatus = taggedStruct(
    "SucceededCheckPostStatus",
    { post_id: S.String, status: S.String, resolved: S.Boolean }
)
export const FailedCheckPostStatus = taggedStruct("FailedCheckPostStatus", {
    error: S.String,
})
/** Reports successful cancellation. */
export const SucceededCancelPost = taggedStruct("SucceededCancelPost", {
    post_id: S.String,
})
/** Reports failed cancellation. */
export const FailedCancelPost = taggedStruct("FailedCancelPost", {
    error: S.String,
})

/** All Messages handled by the Social connected-accounts screen. */
export const Message = S.Union([
    ChangedBookmarkUrl,
    InsertedBookmarkUrl,
    ClickedSyncAccounts,
    ClickedConnectAccount,
    LoadedAccounts,
    FailedLoadingAccounts,
    SucceededSyncAccounts,
    FailedSyncAccounts,
    SucceededConnectAccount,
    FailedConnectAccount,
    ChangedPostContent,
    SelectedSocialTemplate,
    ChangedSocialTemplateMetadata,
    SubmittedSocialTemplate,
    SucceededSaveSocialTemplate,
    FailedSaveSocialTemplate,
    GotScheduleDatePickerMessage,
    GotScheduleTimePickerMessage,
    ClickedClearSchedule,
    ToggledPostAccount,
    ToggledPostMedia,
    LoadedMedia,
    FailedLoadingMedia,
    FailedLoadingMediaImage,
    ResolvedMediaUrls,
    FailedResolvingMediaUrls,
    SubmittedPost,
    ClickedRequestPublication,
    ClickedCancelPublication,
    ClickedConfirmPublication,
    LoadedPosts,
    FailedLoadingPosts,
    LoadedAnalytics,
    FailedLoadingAnalytics,
    ChangedAnalyticsPeriod,
    ChangedAnalyticsPlatform,
    ChangedAnalyticsAccount,
    ClickedRefreshAnalytics,
    SucceededRefreshAnalytics,
    FailedRefreshAnalytics,
    ClickedEditPost,
    ClickedDiscardPostEdit,
    SucceededSchedulePost,
    FailedSchedulePost,
    SucceededUpdatePost,
    FailedUpdatePost,
    ClickedCancelPost,
    ClickedRequestDeletePost,
    ClickedCancelDeletePost,
    ClickedConfirmDeletePost,
    SucceededDeletePost,
    FailedDeletePost,
    ClickedCheckPostStatus,
    ClickedRequestPublishDraft,
    ClickedCancelPublishDraft,
    ClickedConfirmPublishDraft,
    SucceededPublishDraft,
    FailedPublishDraft,
    ClickedRetryDraftEdit,
    SucceededCheckPostStatus,
    FailedCheckPostStatus,
    SucceededCancelPost,
    FailedCancelPost,
])
/** The Social connected-accounts Message union. */
export type Message = typeof Message.Type

const SyncSocialAccounts = Command.define("SyncSocialAccounts", {
    messages: [SucceededSyncAccounts, FailedSyncAccounts],
    execute: Effect.succeed(
        FailedSyncAccounts({
            error: "No social persistence adapter installed",
        })
    ),
})
const CheckSocialPostStatus = Command.define("CheckSocialPostStatus", {
    args: { post_id: S.String },
    messages: [SucceededCheckPostStatus, FailedCheckPostStatus],
    execute: () =>
        Effect.succeed(
            FailedCheckPostStatus({
                error: "No social persistence adapter installed",
            })
        ),
})
const PublishSocialDraft = Command.define("PublishSocialDraft", {
    args: { post_id: S.String },
    messages: [SucceededPublishDraft, FailedPublishDraft],
    execute: () =>
        Effect.succeed(
            FailedPublishDraft({
                error: "No social persistence adapter installed",
            })
        ),
})
const RetrySocialDraftEdit = Command.define("RetrySocialDraftEdit", {
    args: { post_id: S.String },
    messages: [SucceededUpdatePost, FailedUpdatePost],
    execute: () =>
        Effect.succeed(
            FailedUpdatePost({
                error: "No social persistence adapter installed",
            })
        ),
})

const ConnectSocialAccount = Command.define("ConnectSocialAccount", {
    args: { platform: S.String },
    messages: [SucceededConnectAccount, FailedConnectAccount],
    execute: () =>
        Effect.succeed(
            FailedConnectAccount({
                error: "No social persistence adapter installed",
            })
        ),
})

const ScheduleSocialPost = Command.define("ScheduleSocialPost", {
    args: {
        account_ids: S.Array(S.String),
        media_ids: S.Array(S.String),
        content: S.String,
        scheduled_for: S.NullOr(S.Number),
        publication_mode: PublicationMode,
        template_id: S.NullOr(S.String),
    },
    messages: [SucceededSchedulePost, FailedSchedulePost],
    execute: () =>
        Effect.succeed(
            FailedSchedulePost({
                error: "No social persistence adapter installed",
            })
        ),
})

const UpdateSocialPost = Command.define("UpdateSocialPost", {
    args: {
        post_id: S.String,
        account_ids: S.Array(S.String),
        media_ids: S.Array(S.String),
        content: S.String,
        scheduled_for: S.NullOr(S.Number),
        publication_mode: PublicationMode,
    },
    messages: [SucceededUpdatePost, FailedUpdatePost],
    execute: () =>
        Effect.succeed(
            FailedUpdatePost({
                error: "No social persistence adapter installed",
            })
        ),
})

const SaveSocialTemplate = Command.define("SaveSocialTemplate", {
    args: {
        name: ContentTemplateName,
        description: ContentTemplateDescription,
        tags: ContentTemplateTags,
        content: SocialTemplateContent,
    },
    messages: [SucceededSaveSocialTemplate, FailedSaveSocialTemplate],
    execute: () =>
        Effect.succeed(
            FailedSaveSocialTemplate({
                error: "No social template persistence adapter installed",
            })
        ),
})

const CancelSocialPost = Command.define("CancelSocialPost", {
    args: { post_id: S.String },
    messages: [SucceededCancelPost, FailedCancelPost],
    execute: () =>
        Effect.succeed(
            FailedCancelPost({
                error: "No social persistence adapter installed",
            })
        ),
})
const DeleteSocialPost = Command.define("DeleteSocialPost", {
    args: { post_id: S.String },
    messages: [SucceededDeletePost, FailedDeletePost],
    execute: () =>
        Effect.succeed(
            FailedDeletePost({
                error: "No social persistence adapter installed",
            })
        ),
})

const RefreshSocialAnalytics = Command.define("RefreshSocialAnalytics", {
    args: {
        period: AnalyticsPeriod,
        platform: AnalyticsPlatform,
        account_id: S.NullOr(S.String),
    },
    messages: [SucceededRefreshAnalytics, FailedRefreshAnalytics],
    execute: () =>
        Effect.succeed(
            FailedRefreshAnalytics({
                error: "No social analytics adapter installed",
            })
        ),
})

type Commands = ReadonlyArray<Command.Command<Message>>
/** The result returned by the Social update function. */
export type UpdateReturn = readonly [Model, Commands]

/** Creates the initial Social connected-accounts Model. */
export const init = (): Model => {
    const today = Effect.runSync(Calendar.today.local)

    return {
        accounts: { _tag: "Loading" },
        bookmark_url: "",
        bookmark_error: "",
        posts: { _tag: "Loading" },
        media: { _tag: "Loading" },
        unavailable_media_ids: [],
        analytics: { _tag: "Loading" },
        analytics_period: "30d",
        analytics_platform: "all",
        analytics_account_id: null,
        analytics_refreshing: false,
        analytics_error: null,
        content: "",
        schedule_date_picker: Ui.DatePicker.init({
            id: "social-schedule-date",
            today,
            minDate: today,
            maxDate: Calendar.addYears(today, 1),
        }),
        schedule_date: Option.none(),
        schedule_time_picker: TimePicker.init({ id: "social-schedule-time" }),
        selected_account_ids: [],
        selected_media_ids: [],
        editing_post_id: null,
        creation_template_id: null,
        pending_publication: null,
        pending_publish_post_id: null,
        pending_delete_post_id: null,
        checked_post: null,
        template_name: "",
        template_description: "Reusable social post template.",
        template_tags: "",
        template_save_status: "idle",
        template_feedback: "",
        operation: { _tag: "Idle" },
    }
}

const is_busy = (model: Model): boolean =>
    model.operation._tag === "Syncing" ||
    model.operation._tag === "Connecting" ||
    model.operation._tag === "Submitting" ||
    model.operation._tag === "Cancelling" ||
    model.operation._tag === "Deleting" ||
    model.operation._tag === "Checking"

const local_schedule_parts = (
    timestamp: number | null
): Readonly<{
    date: Option.Option<Calendar.CalendarDate>
    time: string
}> => {
    if (timestamp === null) return { date: Option.none(), time: "" }
    const date = new Date(timestamp)
    const maybe_date = S.decodeUnknownOption(Calendar.CalendarDate)({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
    })
    const time = `${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes()
    ).padStart(2, "0")}`
    return { date: maybe_date, time }
}

const schedule_timestamp = (model: Model): number | null =>
    Option.match(model.schedule_date, {
        onNone: () => null,
        onSome: (date) => {
            const time = Option.getOrNull(
                TimePicker.value(model.schedule_time_picker)
            )
            if (time === null) return null
            const match = /^(\d{2}):(\d{2})$/.exec(time)
            if (match === null) return null
            const hours = Number(match[1])
            const minutes = Number(match[2])
            const timestamp = new Date(
                date.year,
                date.month - 1,
                date.day,
                hours,
                minutes
            ).getTime()
            return Number.isFinite(timestamp) ? timestamp : null
        },
    })

const media_location = (url: string): string => {
    try {
        const parsed = new URL(url)
        return `${parsed.origin}${parsed.pathname}`
    } catch {
        return url.split("?", 1)[0] ?? url
    }
}

const selected_media_for_post = (
    model: Model,
    post: Post
): ReadonlyArray<string> => {
    if (post.media_ids.length > 0) return post.media_ids
    if (model.media._tag !== "Ready") return []
    const post_locations = new Set(post.media_urls.map(media_location))

    return model.media.images
        .filter((image) => post_locations.has(media_location(image.url)))
        .map((image) => image.image_id)
}

const template_tags = (value: string): ReadonlyArray<string> =>
    value
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

const composer_error = (
    model: Model,
    publication_mode: PublicationMode
): string | null => {
    if (model.content.trim() === "")
        return publication_mode === "draft"
            ? "Write some content before creating a draft."
            : "Write some content before publishing."
    if (model.selected_account_ids.length === 0)
        return "Select at least one connected account."
    const scheduled_for = schedule_timestamp(model)
    if (
        Option.isSome(model.schedule_date) &&
        TimePicker.is_empty(model.schedule_time_picker)
    )
        return "Choose a time for the selected schedule date."
    if (Option.isSome(model.schedule_date) && scheduled_for === null)
        return "Choose a valid schedule time."
    if (publication_mode === "schedule" && scheduled_for === null)
        return "Choose a future time before scheduling."
    if (scheduled_for !== null && scheduled_for <= Date.now())
        return "Scheduled time must be in the future."
    return null
}

const submit_post = (
    model: Model,
    publication_mode: PublicationMode
): UpdateReturn => {
    const error = composer_error(model, publication_mode)
    if (error !== null)
        return [
            {
                ...model,
                pending_publication: null,
                operation: { _tag: "Failed", error },
            },
            [],
        ]

    const scheduled_for = schedule_timestamp(model)
    const command_args = {
        account_ids: model.selected_account_ids,
        media_ids: model.selected_media_ids,
        content: model.content.trim(),
        scheduled_for:
            publication_mode === "publish_now" ? null : scheduled_for,
        publication_mode,
    }

    return [
        {
            ...model,
            pending_publication: null,
            operation: { _tag: "Submitting", publication_mode },
        },
        [
            model.editing_post_id === null
                ? ScheduleSocialPost({
                      ...command_args,
                      template_id: model.creation_template_id,
                  })
                : UpdateSocialPost({
                      post_id: model.editing_post_id,
                      ...command_args,
                  }),
        ],
    ]
}

const clear_composer = (model: Model): Model => ({
    ...model,
    content: "",
    bookmark_url: "",
    bookmark_error: "",
    schedule_date: Option.none(),
    schedule_time_picker: TimePicker.clear(model.schedule_time_picker),
    selected_account_ids: [],
    selected_media_ids: [],
    editing_post_id: null,
    creation_template_id: null,
    pending_publication: null,
})

/** Applies a Social connected-accounts Message. */
export const update = (model: Model, message: Message): UpdateReturn => {
    switch (message._tag) {
        case "ClickedSyncAccounts":
            return is_busy(model)
                ? [model, []]
                : [
                      { ...model, operation: { _tag: "Syncing" } },
                      [SyncSocialAccounts()],
                  ]
        case "ClickedConnectAccount":
            return is_busy(model)
                ? [model, []]
                : [
                      {
                          ...model,
                          operation: {
                              _tag: "Connecting",
                              platform: message.platform,
                          },
                      },
                      [ConnectSocialAccount({ platform: message.platform })],
                  ]
        case "LoadedAccounts":
            return [
                {
                    ...model,
                    accounts: { _tag: "Ready", accounts: message.accounts },
                },
                [],
            ]
        case "FailedLoadingAccounts":
            return [
                {
                    ...model,
                    accounts: { _tag: "Failed", error: message.error },
                },
                [],
            ]
        case "SucceededSyncAccounts":
            return [
                {
                    ...model,
                    accounts: {
                        _tag: "Ready",
                        accounts: message.accounts,
                    },
                    operation: {
                        _tag: "Succeeded",
                        message: "Connected accounts refreshed.",
                    },
                },
                [],
            ]
        case "ChangedPostContent":
            return [
                {
                    ...model,
                    content: message.value,
                    pending_publication: null,
                    template_feedback: "",
                },
                [],
            ]
        case "ChangedBookmarkUrl":
            return is_busy(model)
                ? [model, []]
                : [
                      {
                          ...model,
                          bookmark_url: message.value,
                          bookmark_error: "",
                      },
                      [],
                  ]
        case "InsertedBookmarkUrl": {
            if (is_busy(model)) return [model, []]
            let href: string
            try {
                const url = new URL(model.bookmark_url.trim())
                if (
                    (url.protocol !== "https:" && url.protocol !== "http:") ||
                    url.username !== "" ||
                    url.password !== ""
                )
                    return [
                        {
                            ...model,
                            bookmark_error:
                                "Choose an HTTP or HTTPS URL without embedded credentials.",
                        },
                        [],
                    ]
                href = url.href
            } catch {
                return [
                    {
                        ...model,
                        bookmark_error:
                            "Choose a Bookmark or enter a valid HTTP or HTTPS URL.",
                    },
                    [],
                ]
            }
            const content =
                model.content.trimEnd() === ""
                    ? href
                    : `${model.content.trimEnd()}\n\n${href}`
            if (content.length > 5000)
                return [
                    {
                        ...model,
                        bookmark_error:
                            "This URL would exceed the 5,000-character caption limit.",
                    },
                    [],
                ]
            return [
                {
                    ...model,
                    content,
                    bookmark_url: "",
                    bookmark_error: "",
                    pending_publication: null,
                    template_feedback: "",
                },
                [],
            ]
        }
        case "SelectedSocialTemplate":
            return [
                {
                    ...model,
                    content: message.content,
                    bookmark_url: "",
                    bookmark_error: "",
                    schedule_date: Option.none(),
                    schedule_time_picker: TimePicker.clear(
                        model.schedule_time_picker
                    ),
                    selected_account_ids: [],
                    selected_media_ids: [],
                    editing_post_id: null,
                    creation_template_id: message.template_id,
                    pending_publication: null,
                    template_feedback:
                        "Template loaded. Select delivery settings before saving or publishing.",
                    operation: { _tag: "Idle" },
                },
                [],
            ]
        case "ChangedSocialTemplateMetadata":
            return [
                {
                    ...model,
                    template_name:
                        message.field === "name"
                            ? message.value
                            : model.template_name,
                    template_description:
                        message.field === "description"
                            ? message.value
                            : model.template_description,
                    template_tags:
                        message.field === "tags"
                            ? message.value
                            : model.template_tags,
                    template_save_status: "idle",
                    template_feedback: "",
                },
                [],
            ]
        case "SubmittedSocialTemplate": {
            if (is_busy(model) || model.template_save_status === "saving")
                return [model, []]
            const name = S.decodeUnknownOption(ContentTemplateName)(
                model.template_name.trim()
            )
            const description = S.decodeUnknownOption(
                ContentTemplateDescription
            )(model.template_description.trim())
            const tags = S.decodeUnknownOption(ContentTemplateTags)(
                template_tags(model.template_tags)
            )
            const content = S.decodeUnknownOption(SocialTemplateContent)(
                model.content
            )
            if (
                Option.isNone(name) ||
                Option.isNone(description) ||
                Option.isNone(tags) ||
                Option.isNone(content)
            ) {
                return [
                    {
                        ...model,
                        template_feedback:
                            "Enter post content and a template name, with no more than 12 tags of 40 characters each.",
                    },
                    [],
                ]
            }
            return [
                {
                    ...model,
                    template_save_status: "saving",
                    template_feedback: "",
                },
                [
                    SaveSocialTemplate({
                        name: name.value,
                        description: description.value,
                        tags: tags.value,
                        content: content.value,
                    }),
                ],
            ]
        }
        case "SucceededSaveSocialTemplate":
            return [
                {
                    ...model,
                    template_name: "",
                    template_description: "Reusable social post template.",
                    template_tags: "",
                    template_save_status: "idle",
                    template_feedback: "Template saved.",
                },
                [],
            ]
        case "FailedSaveSocialTemplate":
            return [
                {
                    ...model,
                    template_save_status: "idle",
                    template_feedback: `Could not save template: ${message.error}`,
                },
                [],
            ]
        case "GotScheduleDatePickerMessage": {
            const {
                model: schedule_date_picker,
                commands = [],
                outMessage: maybe_out_value,
            } = Ui.DatePicker.update(
                model.schedule_date_picker,
                message.message
            )
            const maybe_out = Option.fromUndefinedOr(maybe_out_value)

            const schedule = M.value(maybe_out).pipe(
                M.tag("Some", ({ value }) =>
                    M.value(value).pipe(
                        M.tag("SelectedDate", ({ date }) => ({
                            date: Option.some(date),
                            time_picker: model.schedule_time_picker,
                        })),
                        M.tag("ClearedDate", () => ({
                            date: Option.none<Calendar.CalendarDate>(),
                            time_picker: TimePicker.clear(
                                model.schedule_time_picker
                            ),
                        })),
                        M.orElse(() => ({
                            date: model.schedule_date,
                            time_picker: model.schedule_time_picker,
                        }))
                    )
                ),
                M.orElse(() => ({
                    date: model.schedule_date,
                    time_picker: model.schedule_time_picker,
                }))
            )

            return [
                {
                    ...model,
                    schedule_date_picker,
                    schedule_date: schedule.date,
                    schedule_time_picker: schedule.time_picker,
                    pending_publication: null,
                },
                Command.mapMessages(commands, (child_message) =>
                    GotScheduleDatePickerMessage({
                        message: child_message,
                    })
                ),
            ]
        }
        case "GotScheduleTimePickerMessage":
            return [
                {
                    ...model,
                    schedule_time_picker: TimePicker.update(
                        model.schedule_time_picker,
                        message.message
                    ),
                    pending_publication: null,
                },
                [],
            ]
        case "ClickedClearSchedule": {
            const { model: schedule_date_picker, commands = [] } =
                Ui.DatePicker.close(model.schedule_date_picker)
            return [
                {
                    ...model,
                    schedule_date_picker,
                    schedule_date: Option.none(),
                    schedule_time_picker: TimePicker.clear(
                        model.schedule_time_picker
                    ),
                    pending_publication: null,
                },
                Command.mapMessages(commands, (child_message) =>
                    GotScheduleDatePickerMessage({
                        message: child_message,
                    })
                ),
            ]
        }
        case "ToggledPostAccount":
            return [
                {
                    ...model,
                    selected_account_ids: model.selected_account_ids.includes(
                        message.account_id
                    )
                        ? model.selected_account_ids.filter(
                              (account_id) => account_id !== message.account_id
                          )
                        : [...model.selected_account_ids, message.account_id],
                    pending_publication: null,
                },
                [],
            ]
        case "ToggledPostMedia":
            if (model.unavailable_media_ids.includes(message.image_id))
                return [model, []]
            return [
                {
                    ...model,
                    selected_media_ids: model.selected_media_ids.includes(
                        message.image_id
                    )
                        ? model.selected_media_ids.filter(
                              (image_id) => image_id !== message.image_id
                          )
                        : model.selected_media_ids.length >= 10
                          ? model.selected_media_ids
                          : [...model.selected_media_ids, message.image_id],
                    pending_publication: null,
                },
                [],
            ]
        case "LoadedMedia":
            return [
                {
                    ...model,
                    media: { _tag: "Ready", images: message.images },
                    selected_media_ids: model.selected_media_ids.filter(
                        (image_id) =>
                            message.images.some(
                                (image) => image.image_id === image_id
                            ) && !model.unavailable_media_ids.includes(image_id)
                    ),
                },
                [],
            ]
        case "FailedLoadingMediaImage":
            return [
                {
                    ...model,
                    unavailable_media_ids: model.unavailable_media_ids.includes(
                        message.image_id
                    )
                        ? model.unavailable_media_ids
                        : [...model.unavailable_media_ids, message.image_id],
                    selected_media_ids: model.selected_media_ids.filter(
                        (id) => id !== message.image_id
                    ),
                    pending_publication: null,
                },
                [],
            ]
        case "FailedLoadingMedia":
            return [
                {
                    ...model,
                    media: { _tag: "Failed", error: message.error },
                },
                [],
            ]
        case "ResolvedMediaUrls": {
            const resolved_urls = new Map(
                message.images.map(({ stored_url, url }) => [stored_url, url])
            )

            return [
                {
                    ...model,
                    media:
                        model.media._tag === "Ready"
                            ? {
                                  _tag: "Ready",
                                  images: model.media.images.map((image) => ({
                                      ...image,
                                      url:
                                          resolved_urls.get(image.url) ??
                                          image.url,
                                  })),
                              }
                            : model.media,
                    posts:
                        model.posts._tag === "Ready"
                            ? {
                                  _tag: "Ready",
                                  posts: model.posts.posts.map((post) => ({
                                      ...post,
                                      media_urls: post.media_urls.map(
                                          (url) => resolved_urls.get(url) ?? url
                                      ),
                                  })),
                              }
                            : model.posts,
                },
                [],
            ]
        }
        case "FailedResolvingMediaUrls":
            return [
                {
                    ...model,
                    operation: {
                        _tag: "Failed",
                        error: `Could not load image previews: ${message.error}`,
                    },
                },
                [],
            ]
        case "SubmittedPost": {
            if (is_busy(model)) return [model, []]
            return submit_post(model, "draft")
        }
        case "ClickedRequestPublication": {
            if (is_busy(model)) return [model, []]
            const error = composer_error(model, message.publication_mode)
            return error === null
                ? [
                      {
                          ...model,
                          pending_publication: message.publication_mode,
                          operation: { _tag: "Idle" },
                      },
                      [],
                  ]
                : [
                      {
                          ...model,
                          pending_publication: null,
                          operation: { _tag: "Failed", error },
                      },
                      [],
                  ]
        }
        case "ClickedCancelPublication":
            return [
                {
                    ...model,
                    pending_publication: null,
                    operation: { _tag: "Idle" },
                },
                [],
            ]
        case "ClickedConfirmPublication":
            return model.pending_publication === null || is_busy(model)
                ? [model, []]
                : submit_post(model, model.pending_publication)
        case "LoadedPosts":
            return [
                model.editing_post_id !== null &&
                !is_busy(model) &&
                !message.posts.some(
                    (post) =>
                        post.post_id === model.editing_post_id &&
                        post.status === "draft"
                )
                    ? clear_composer({
                          ...model,
                          posts: { _tag: "Ready", posts: message.posts },
                      })
                    : {
                          ...model,
                          posts: { _tag: "Ready", posts: message.posts },
                      },
                [],
            ]
        case "FailedLoadingPosts":
            return [
                {
                    ...model,
                    posts: { _tag: "Failed", error: message.error },
                },
                [],
            ]
        case "LoadedAnalytics":
            return [
                {
                    ...model,
                    analytics: {
                        _tag: "Ready",
                        snapshot: message.snapshot,
                    },
                },
                [],
            ]
        case "FailedLoadingAnalytics":
            return [
                {
                    ...model,
                    analytics: { _tag: "Failed", error: message.error },
                },
                [],
            ]
        case "ChangedAnalyticsPeriod": {
            if (
                message.value !== "7d" &&
                message.value !== "30d" &&
                message.value !== "90d"
            )
                return [model, []]
            return [
                {
                    ...model,
                    analytics: { _tag: "Loading" },
                    analytics_period: message.value,
                    analytics_error: null,
                },
                [],
            ]
        }
        case "ChangedAnalyticsPlatform": {
            if (
                message.value !== "all" &&
                message.value !== "facebook" &&
                message.value !== "instagram"
            )
                return [model, []]
            return [
                {
                    ...model,
                    analytics: { _tag: "Loading" },
                    analytics_platform: message.value,
                    analytics_account_id: null,
                    analytics_error: null,
                },
                [],
            ]
        }
        case "ChangedAnalyticsAccount":
            return [
                {
                    ...model,
                    analytics: { _tag: "Loading" },
                    analytics_account_id:
                        message.value === "" ? null : message.value,
                    analytics_error: null,
                },
                [],
            ]
        case "ClickedRefreshAnalytics":
            return model.analytics_refreshing
                ? [model, []]
                : [
                      {
                          ...model,
                          analytics_refreshing: true,
                          analytics_error: null,
                      },
                      [
                          RefreshSocialAnalytics({
                              period: model.analytics_period,
                              platform: model.analytics_platform,
                              account_id: model.analytics_account_id,
                          }),
                      ],
                  ]
        case "SucceededRefreshAnalytics":
            if (
                message.snapshot.period !== model.analytics_period ||
                message.snapshot.platform !== model.analytics_platform ||
                message.snapshot.account_id !== model.analytics_account_id
            )
                return [
                    {
                        ...model,
                        analytics_refreshing: false,
                    },
                    [],
                ]
            return [
                {
                    ...model,
                    analytics: {
                        _tag: "Ready",
                        snapshot: message.snapshot,
                    },
                    analytics_refreshing: false,
                    analytics_error: null,
                },
                [],
            ]
        case "FailedRefreshAnalytics":
            return [
                {
                    ...model,
                    analytics_refreshing: false,
                    analytics_error: message.error,
                },
                [],
            ]
        case "ClickedEditPost": {
            if (is_busy(model) || model.posts._tag !== "Ready")
                return [model, []]
            const post = model.posts.posts.find(
                (candidate) => candidate.post_id === message.post_id
            )
            if (post === undefined || post.status !== "draft")
                return [model, []]
            const schedule = local_schedule_parts(post.scheduled_for)

            return [
                {
                    ...model,
                    content: post.content,
                    bookmark_url: "",
                    bookmark_error: "",
                    schedule_date_picker: Option.match(schedule.date, {
                        onNone: () => model.schedule_date_picker,
                        onSome: (date) =>
                            Ui.DatePicker.focusDate(
                                model.schedule_date_picker,
                                date
                            ),
                    }),
                    schedule_date: schedule.date,
                    schedule_time_picker: TimePicker.set_value(
                        model.schedule_time_picker,
                        schedule.time
                    ),
                    selected_account_ids: post.account_ids,
                    selected_media_ids: selected_media_for_post(model, post),
                    editing_post_id: post.post_id,
                    creation_template_id: null,
                    pending_publication: null,
                    operation: { _tag: "Idle" },
                },
                [],
            ]
        }
        case "ClickedDiscardPostEdit":
            return [
                {
                    ...clear_composer(model),
                    operation: is_busy(model)
                        ? model.operation
                        : { _tag: "Idle" },
                },
                [],
            ]
        case "SucceededSchedulePost": {
            const submitted_mode =
                model.operation._tag === "Submitting"
                    ? model.operation.publication_mode
                    : "draft"
            return [
                {
                    ...model,
                    content: "",
                    bookmark_url: "",
                    bookmark_error: "",
                    schedule_date: Option.none(),
                    schedule_time_picker: TimePicker.clear(
                        model.schedule_time_picker
                    ),
                    selected_account_ids: [],
                    selected_media_ids: [],
                    editing_post_id: null,
                    creation_template_id: null,
                    pending_publication: null,
                    operation: {
                        _tag: "Succeeded",
                        message:
                            submitted_mode === "draft"
                                ? "Draft created in Zernio."
                                : submitted_mode === "schedule"
                                  ? "Post scheduled for live delivery."
                                  : "Post submitted for live publishing.",
                    },
                },
                [],
            ]
        }
        case "SucceededUpdatePost": {
            const updated_mode =
                model.operation._tag === "Submitting"
                    ? model.operation.publication_mode
                    : "draft"
            return [
                {
                    ...model,
                    content: "",
                    bookmark_url: "",
                    bookmark_error: "",
                    schedule_date: Option.none(),
                    schedule_time_picker: TimePicker.clear(
                        model.schedule_time_picker
                    ),
                    selected_account_ids: [],
                    selected_media_ids: [],
                    editing_post_id: null,
                    creation_template_id: null,
                    pending_publication: null,
                    operation: {
                        _tag: "Succeeded",
                        message:
                            updated_mode === "draft"
                                ? "Draft changes saved."
                                : updated_mode === "schedule"
                                  ? "Draft scheduled for live delivery."
                                  : "Draft submitted for live publishing.",
                    },
                },
                [],
            ]
        }
        case "FailedUpdatePost":
            return [
                {
                    ...model,
                    operation: { _tag: "Failed", error: message.error },
                },
                [],
            ]
        case "FailedSchedulePost":
            return [
                {
                    ...model,
                    operation: { _tag: "Failed", error: message.error },
                },
                [],
            ]
        case "ClickedCancelPost":
            return is_busy(model)
                ? [model, []]
                : [
                      {
                          ...model,
                          operation: {
                              _tag: "Cancelling",
                              post_id: message.post_id,
                          },
                      },
                      [CancelSocialPost({ post_id: message.post_id })],
                  ]
        case "ClickedRequestDeletePost":
            return is_busy(model) ||
                model.posts._tag !== "Ready" ||
                !model.posts.posts.some(
                    (post) =>
                        post.post_id === message.post_id &&
                        post.status !== "pending" &&
                        post.status !== "submitting"
                )
                ? [model, []]
                : [{ ...model, pending_delete_post_id: message.post_id }, []]
        case "ClickedCancelDeletePost":
            return [{ ...model, pending_delete_post_id: null }, []]
        case "ClickedConfirmDeletePost":
            return model.pending_delete_post_id === null || is_busy(model)
                ? [model, []]
                : [
                      {
                          ...model,
                          pending_delete_post_id: null,
                          operation: {
                              _tag: "Deleting",
                              post_id: model.pending_delete_post_id,
                          },
                      },
                      [
                          DeleteSocialPost({
                              post_id: model.pending_delete_post_id,
                          }),
                      ],
                  ]
        case "SucceededDeletePost":
            return [
                {
                    ...(model.editing_post_id === message.post_id
                        ? clear_composer(model)
                        : model),
                    posts:
                        model.posts._tag === "Ready"
                            ? {
                                  _tag: "Ready",
                                  posts: model.posts.posts.filter(
                                      (post) => post.post_id !== message.post_id
                                  ),
                              }
                            : model.posts,
                    operation: {
                        _tag: "Succeeded",
                        message: "Post deleted from URM.",
                    },
                },
                [],
            ]
        case "FailedDeletePost":
            return [
                {
                    ...model,
                    operation: { _tag: "Failed", error: message.error },
                },
                [],
            ]
        case "ClickedCheckPostStatus":
            return is_busy(model)
                ? [model, []]
                : [
                      {
                          ...model,
                          checked_post: null,
                          operation: {
                              _tag: "Checking",
                              post_id: message.post_id,
                          },
                      },
                      [CheckSocialPostStatus({ post_id: message.post_id })],
                  ]
        case "ClickedRequestPublishDraft":
            return is_busy(model) ||
                model.posts._tag !== "Ready" ||
                !model.posts.posts.some(
                    (post) =>
                        post.post_id === message.post_id &&
                        post.status === "draft" &&
                        !post.pending_draft_edit
                )
                ? [model, []]
                : [{ ...model, pending_publish_post_id: message.post_id }, []]
        case "ClickedCancelPublishDraft":
            return [{ ...model, pending_publish_post_id: null }, []]
        case "ClickedConfirmPublishDraft":
            return model.pending_publish_post_id === null || is_busy(model)
                ? [model, []]
                : [
                      {
                          ...model,
                          operation: {
                              _tag: "Submitting",
                              publication_mode: "publish_now",
                          },
                          pending_publish_post_id: null,
                      },
                      [
                          PublishSocialDraft({
                              post_id: model.pending_publish_post_id,
                          }),
                      ],
                  ]
        case "SucceededPublishDraft":
            return [
                {
                    ...(model.editing_post_id === message.post_id
                        ? clear_composer(model)
                        : model),
                    operation: {
                        _tag: "Succeeded",
                        message: message.resolved
                            ? `Draft ${message.status}.`
                            : "Publishing requested. Check status shortly.",
                    },
                },
                [],
            ]
        case "FailedPublishDraft":
            return [
                {
                    ...model,
                    operation: { _tag: "Failed", error: message.error },
                },
                [],
            ]
        case "ClickedRetryDraftEdit":
            return is_busy(model)
                ? [model, []]
                : [
                      {
                          ...model,
                          operation: {
                              _tag: "Submitting",
                              publication_mode: "draft",
                          },
                      },
                      [RetrySocialDraftEdit({ post_id: message.post_id })],
                  ]
        case "SucceededCheckPostStatus":
            return [
                {
                    ...model,
                    checked_post: {
                        post_id: message.post_id,
                        status: message.status,
                        resolved: message.resolved,
                    },
                    operation: {
                        _tag: "Succeeded",
                        message: message.resolved
                            ? `Post status: ${message.status}.`
                            : `Post status: ${message.status}. Zernio has not confirmed a final result yet.`,
                    },
                },
                [],
            ]
        case "FailedCheckPostStatus":
            return [
                {
                    ...model,
                    operation: { _tag: "Failed", error: message.error },
                },
                [],
            ]
        case "SucceededCancelPost":
            return [
                {
                    ...model,
                    operation: {
                        _tag: "Succeeded",
                        message: "Post cancelled.",
                    },
                },
                [],
            ]
        case "FailedCancelPost":
            return [
                {
                    ...model,
                    operation: { _tag: "Failed", error: message.error },
                },
                [],
            ]
        case "FailedSyncAccounts":
            return [
                {
                    ...model,
                    operation: { _tag: "Failed", error: message.error },
                },
                [],
            ]
        case "SucceededConnectAccount": {
            const platform =
                model.operation._tag === "Connecting"
                    ? model.operation.platform
                    : "social"

            return [
                {
                    ...model,
                    operation: {
                        _tag: "ReadyToConnect",
                        platform,
                        auth_url: message.auth_url,
                    },
                },
                [],
            ]
        }
        case "FailedConnectAccount":
            return [
                {
                    ...model,
                    operation: { _tag: "Failed", error: message.error },
                },
                [],
            ]
    }
}

const panel_class =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
const button_class =
    "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 [box-shadow:var(--shadow-control)]"
const primary_button_class =
    "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 [box-shadow:var(--shadow-primary)]"
const field_class =
    "h-10 w-full rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
const schedule_date_picker_anchor: Ui.DatePicker.ViewInputs["anchor"] = {
    placement: "bottom-start",
    gap: 4,
    padding: 8,
}

const platform_label = (platform: string): string => {
    const normalized = platform.replace(/[-_]/g, " ")
    return `${normalized.slice(0, 1).toUpperCase()}${normalized.slice(1)}`
}

const account_name = (account: Account): string =>
    account.display_name ?? account.username

const account_card = (account: Account, h: HtmlBuilder<Message>): Html =>
    h.keyed("li")(
        account.account_id,
        [h.Class(panel_class)],
        [
            h.div(
                [h.Class("flex items-center gap-4")],
                [
                    account.avatar_url === undefined
                        ? h.div(
                              [
                                  h.Class(
                                      "flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
                                  ),
                                  h.Attribute("aria-hidden", "true"),
                              ],
                              [platform_label(account.platform).slice(0, 1)]
                          )
                        : h.img([
                              h.Src(account.avatar_url),
                              h.Alt(""),
                              h.Width("48"),
                              h.Height("48"),
                              h.Class(
                                  "size-12 shrink-0 rounded-full border border-border object-cover"
                              ),
                          ]),
                    h.div(
                        [h.Class("min-w-0 flex-1")],
                        [
                            h.h3(
                                [h.Class("truncate font-semibold")],
                                [account_name(account)]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "truncate text-sm text-muted-foreground"
                                    ),
                                ],
                                [
                                    `${platform_label(account.platform)} · @${account.username}`,
                                ]
                            ),
                        ]
                    ),
                    h.span(
                        [
                            h.Class(
                                account.active
                                    ? "rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success"
                                    : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                            ),
                        ],
                        [account.active ? "Connected" : "Disconnected"]
                    ),
                ]
            ),
        ]
    )

const accounts_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    switch (model.accounts._tag) {
        case "Loading":
            return h.p(
                [h.Class("text-sm text-muted-foreground")],
                ["Loading connected accounts…"]
            )
        case "Failed":
            return h.div(
                [
                    h.Attribute("role", "alert"),
                    h.Class(
                        "rounded-[var(--radius-surface)] border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
                    ),
                ],
                [model.accounts.error]
            )
        case "Ready":
            return model.accounts.accounts.length === 0
                ? h.div(
                      [
                          h.Class(
                              "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-card p-8 text-center"
                          ),
                      ],
                      [
                          h.h3(
                              [h.Class("font-semibold text-foreground")],
                              ["No accounts found"]
                          ),
                          h.p(
                              [
                                  h.Class(
                                      "mx-auto mt-2 max-w-xl text-sm text-muted-foreground"
                                  ),
                              ],
                              [
                                  "Connect an account through URM, then refresh to import it from Zernio.",
                              ]
                          ),
                      ]
                  )
                : h.ul(
                      [h.Class("grid gap-4 md:grid-cols-2")],
                      model.accounts.accounts.map((account) =>
                          account_card(account, h)
                      )
                  )
    }
}

const operation_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    switch (model.operation._tag) {
        case "Idle":
            return h.empty
        case "Syncing":
            return h.p(
                [h.Class("text-sm text-muted-foreground")],
                ["Refreshing connected accounts…"]
            )
        case "Connecting":
            return h.p(
                [h.Class("text-sm text-muted-foreground")],
                [`Preparing ${platform_label(model.operation.platform)}…`]
            )
        case "Submitting":
            return h.p(
                [
                    h.Attribute("aria-live", "polite"),
                    h.Class("text-sm text-muted-foreground"),
                ],
                [
                    model.operation.publication_mode === "draft"
                        ? model.editing_post_id === null
                            ? "Creating provider draft…"
                            : "Saving draft changes…"
                        : model.operation.publication_mode === "schedule"
                          ? "Scheduling live post…"
                          : "Submitting live post…",
                ]
            )
        case "Cancelling":
            return h.p(
                [
                    h.Attribute("aria-live", "polite"),
                    h.Class("text-sm text-muted-foreground"),
                ],
                ["Cancelling post…"]
            )
        case "Deleting":
            return h.p(
                [
                    h.Attribute("aria-live", "polite"),
                    h.Class("text-sm text-muted-foreground"),
                ],
                ["Deleting post…"]
            )
        case "Checking":
            return h.p(
                [
                    h.Attribute("aria-live", "polite"),
                    h.Class("text-sm text-muted-foreground"),
                ],
                ["Checking provider status…"]
            )
        case "ReadyToConnect":
            return h.div(
                [
                    h.Attribute("aria-live", "polite"),
                    h.Class("flex flex-wrap items-center gap-3 text-sm"),
                ],
                [
                    h.span([], ["Your secure connection link is ready."]),
                    h.a(
                        [
                            h.Href(model.operation.auth_url),
                            h.Attribute("target", "_blank"),
                            h.Attribute("rel", "noopener noreferrer"),
                            h.Class(primary_button_class),
                        ],
                        [
                            `Continue to ${platform_label(model.operation.platform)}`,
                        ]
                    ),
                ]
            )
        case "Succeeded":
            return h.p(
                [
                    h.Attribute("aria-live", "polite"),
                    h.Class("text-sm text-success"),
                ],
                [model.operation.message]
            )
        case "Failed":
            return h.p(
                [
                    h.Attribute("role", "alert"),
                    h.Class("text-sm text-destructive"),
                ],
                [model.operation.error]
            )
    }
}

const active_accounts = (model: Model): ReadonlyArray<Account> =>
    model.accounts._tag === "Ready"
        ? model.accounts.accounts.filter((account) => account.active)
        : []

const media_picker_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    switch (model.media._tag) {
        case "Loading":
            return h.p(
                [h.Class("text-sm text-muted-foreground")],
                ["Loading media library…"]
            )
        case "Failed":
            return h.p(
                [
                    h.Attribute("role", "alert"),
                    h.Class("text-sm text-destructive"),
                ],
                [model.media.error]
            )
        case "Ready":
            return model.media.images.length === 0
                ? h.p(
                      [h.Class("text-sm text-muted-foreground")],
                      ["Add images to the Media library to attach them here."]
                  )
                : h.div(
                      [
                          h.Class(
                              "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
                          ),
                      ],
                      model.media.images.map((image) => {
                          const input_id = `social-post-media-${image.image_id}`
                          const checked = model.selected_media_ids.includes(
                              image.image_id
                          )
                          const selection_limit_reached =
                              model.selected_media_ids.length >= 10 && !checked
                          const unavailable =
                              model.unavailable_media_ids.includes(
                                  image.image_id
                              )

                          return h.label(
                              [
                                  h.For(input_id),
                                  h.Class(
                                      checked
                                          ? "relative grid min-h-12 cursor-pointer gap-2 rounded-[var(--radius-control)] border-2 border-primary bg-primary/5 p-2"
                                          : "relative grid min-h-12 cursor-pointer gap-2 rounded-[var(--radius-control)] border border-border bg-background p-2 hover:bg-accent"
                                  ),
                              ],
                              [
                                  ...(unavailable
                                      ? [
                                            h.p(
                                                [
                                                    h.Class(
                                                        "flex aspect-square items-center rounded-[calc(var(--radius-control)-0.25rem)] bg-muted p-2 text-xs text-destructive"
                                                    ),
                                                ],
                                                [
                                                    "Image unavailable. Reupload it in Media.",
                                                ]
                                            ),
                                        ]
                                      : [
                                            h.img([
                                                h.Src(image.url),
                                                h.Alt(image.alt),
                                                h.Loading("lazy"),
                                                h.OnError(
                                                    FailedLoadingMediaImage({
                                                        image_id:
                                                            image.image_id,
                                                    })
                                                ),
                                                h.Class(
                                                    "aspect-square w-full rounded-[calc(var(--radius-control)-0.25rem)] bg-muted object-cover"
                                                ),
                                            ]),
                                        ]),
                                  h.span(
                                      [
                                          h.Class(
                                              "line-clamp-2 text-xs text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          image.alt === ""
                                              ? "Untitled image"
                                              : image.alt,
                                      ]
                                  ),
                                  h.input([
                                      h.Id(input_id),
                                      h.Name("media_ids"),
                                      h.Type("checkbox"),
                                      h.Value(image.image_id),
                                      h.Checked(checked),
                                      h.Disabled(
                                          is_busy(model) ||
                                              selection_limit_reached ||
                                              unavailable
                                      ),
                                      h.OnClick(
                                          ToggledPostMedia({
                                              image_id: image.image_id,
                                          })
                                      ),
                                      h.AriaLabel(
                                          unavailable
                                              ? "Image unavailable. Reupload it in Media."
                                              : `${checked ? "Remove" : "Attach"} ${image.alt === "" ? "untitled image" : image.alt}`
                                      ),
                                      h.Class(
                                          "absolute start-3 top-3 size-5 accent-primary"
                                      ),
                                  ]),
                              ]
                          )
                      })
                  )
    }
}

const composer_view = (
    model: Model,
    link_suggestions: ReadonlyArray<LinkSuggestion>,
    h: HtmlBuilder<Message>
): Html => {
    const accounts = active_accounts(model)
    const busy = is_busy(model)

    return h.form(
        [h.OnSubmit(SubmittedPost()), h.Class(`${panel_class} space-y-5`)],
        [
            h.div(
                [],
                [
                    h.h2(
                        [
                            h.Id("social-compose"),
                            h.Class("text-lg font-semibold"),
                        ],
                        [
                            model.editing_post_id === null
                                ? "Create a social post"
                                : "Edit social draft",
                        ]
                    ),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [
                            model.editing_post_id === null
                                ? "Save safely as a draft, publish now, or choose a time for live delivery."
                                : "Save changes to this draft. Create a new post for live delivery.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("space-y-2")],
                [
                    h.label(
                        [
                            h.For("social-post-content"),
                            h.Class("block text-sm font-medium"),
                        ],
                        ["Post content (required)"]
                    ),
                    h.textarea([
                        h.Id("social-post-content"),
                        h.Name("content"),
                        h.Value(model.content),
                        h.Required(true),
                        h.Maxlength(5_000),
                        h.Disabled(busy),
                        h.Attribute(
                            "aria-describedby",
                            "social-post-content-help"
                        ),
                        h.OnInput((value) => ChangedPostContent({ value })),
                        h.Class(
                            "min-h-36 w-full resize-y rounded-[var(--radius-control)] border border-border bg-background px-3 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        ),
                    ]),
                    h.p(
                        [
                            h.Id("social-post-content-help"),
                            h.Class("text-xs text-muted-foreground"),
                        ],
                        [
                            `${model.content.length.toLocaleString()} / 5,000 characters`,
                        ]
                    ),
                ]
            ),
            h.fieldset(
                [h.Disabled(busy), h.Class("grid gap-3")],
                [
                    h.legend([h.Class("sr-only")], ["Insert a link"]),
                    bookmark_url_field_view(
                        {
                            id: "social-bookmark-url",
                            form_id: "social-bookmark-form",
                            label: "Bookmark or URL",
                            value: model.bookmark_url,
                            suggestions: link_suggestions,
                            on_input: (value) => ChangedBookmarkUrl({ value }),
                        },
                        h
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(InsertedBookmarkUrl()),
                            h.Class(button_class),
                        ],
                        ["Insert URL into caption"]
                    ),
                    h.p(
                        [h.Class("text-xs text-muted-foreground")],
                        [
                            "The URL is added as caption text. Clickability depends on the social platform.",
                        ]
                    ),
                    ...(model.bookmark_error === ""
                        ? []
                        : [h.p([h.Role("alert")], [model.bookmark_error])]),
                ]
            ),
            h.fieldset(
                [h.Class("space-y-2")],
                [
                    h.legend(
                        [h.Class("text-sm font-medium")],
                        ["Accounts (select at least one)"]
                    ),
                    accounts.length === 0
                        ? h.p(
                              [h.Class("text-sm text-muted-foreground")],
                              ["Sync an active account before creating a post."]
                          )
                        : h.div(
                              [h.Class("grid gap-2 sm:grid-cols-2")],
                              accounts.map((account) => {
                                  const input_id = `social-post-account-${account.account_id}`
                                  const checked =
                                      model.selected_account_ids.includes(
                                          account.account_id
                                      )
                                  return h.label(
                                      [
                                          h.For(input_id),
                                          h.Class(
                                              "flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm transition hover:bg-accent"
                                          ),
                                      ],
                                      [
                                          h.input([
                                              h.Id(input_id),
                                              h.Name("account_ids"),
                                              h.Type("checkbox"),
                                              h.Value(account.account_id),
                                              h.Checked(checked),
                                              h.Disabled(busy),
                                              h.OnClick(
                                                  ToggledPostAccount({
                                                      account_id:
                                                          account.account_id,
                                                  })
                                              ),
                                              h.Class("size-4 accent-primary"),
                                          ]),
                                          h.span(
                                              [],
                                              [
                                                  `${account_name(account)} · ${platform_label(account.platform)}`,
                                              ]
                                          ),
                                      ]
                                  )
                              })
                          ),
                ]
            ),
            h.fieldset(
                [h.Class("space-y-2")],
                [
                    h.legend(
                        [h.Class("text-sm font-medium")],
                        ["Images (optional, up to 10)"]
                    ),
                    h.p(
                        [h.Class("text-xs text-muted-foreground")],
                        [
                            `${model.selected_media_ids.length} selected. Instagram posts require at least one image until video support is added.`,
                        ]
                    ),
                    media_picker_view(model, h),
                ]
            ),
            ...(model.editing_post_id === null
                ? [
                      h.div(
                          [h.Class("max-w-4xl space-y-2")],
                          [
                              h.div(
                                  [
                                      h.Class(
                                          "grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_auto_auto] lg:items-end"
                                      ),
                                  ],
                                  [
                                      h.div(
                                          [h.Class("space-y-1")],
                                          [
                                              h.label(
                                                  [
                                                      h.Id(
                                                          "social-schedule-date-label"
                                                      ),
                                                      h.For(
                                                          Ui.DatePicker.triggerId(
                                                              model
                                                                  .schedule_date_picker
                                                                  .id
                                                          )
                                                      ),
                                                      h.Class(
                                                          "block text-sm font-medium"
                                                      ),
                                                  ],
                                                  ["Schedule date (optional)"]
                                              ),
                                              h.submodel({
                                                  slotId: model
                                                      .schedule_date_picker.id,
                                                  model: model.schedule_date_picker,
                                                  view: Ui.DatePicker.view,
                                                  viewInputs: {
                                                      maybeSelectedDate:
                                                          model.schedule_date,
                                                      anchor: schedule_date_picker_anchor,
                                                      triggerContent: (
                                                          maybe_date
                                                      ) =>
                                                          date_picker_trigger_content(
                                                              maybe_date,
                                                              "Pick a date"
                                                          ),
                                                      toCalendarView:
                                                          date_picker_calendar_view,
                                                      isDisabled: busy,
                                                      ariaLabelledBy:
                                                          "social-schedule-date-label",
                                                      triggerClassName:
                                                          date_picker_trigger_class,
                                                      panelClassName:
                                                          date_picker_panel_class,
                                                      backdropClassName:
                                                          date_picker_backdrop_class,
                                                  },
                                                  toParentMessage: (message) =>
                                                      GotScheduleDatePickerMessage(
                                                          {
                                                              message,
                                                          }
                                                      ),
                                              }),
                                          ]
                                      ),
                                      h.div(
                                          [h.Class("space-y-1")],
                                          [
                                              h.submodel({
                                                  slotId: model
                                                      .schedule_time_picker.id,
                                                  model: model.schedule_time_picker,
                                                  view: TimePicker.view,
                                                  viewInputs: {
                                                      label: "Time",
                                                      is_disabled:
                                                          busy ||
                                                          Option.isNone(
                                                              model.schedule_date
                                                          ),
                                                      described_by:
                                                          "social-schedule-hint",
                                                  },
                                                  toParentMessage: (message) =>
                                                      GotScheduleTimePickerMessage(
                                                          {
                                                              message,
                                                          }
                                                      ),
                                              }),
                                          ]
                                      ),
                                      ...(Option.isNone(model.schedule_date)
                                          ? []
                                          : [
                                                h.button(
                                                    [
                                                        h.Type("button"),
                                                        h.Disabled(busy),
                                                        h.OnClick(
                                                            ClickedClearSchedule()
                                                        ),
                                                        h.Class(button_class),
                                                    ],
                                                    ["Clear"]
                                                ),
                                            ]),
                                  ]
                              ),
                              h.p(
                                  [
                                      h.Id("social-schedule-hint"),
                                      h.Class("text-xs text-muted-foreground"),
                                  ],
                                  [
                                      "Choose a date to enable time. Times use your device’s local timezone; Zernio shows the equivalent UTC time.",
                                  ]
                              ),
                          ]
                      ),
                  ]
                : []),
            h.div(
                [h.Class("flex flex-wrap justify-end gap-2")],
                [
                    ...(model.editing_post_id === null
                        ? []
                        : [
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.Disabled(busy),
                                      h.OnClick(ClickedDiscardPostEdit()),
                                      h.Class(button_class),
                                  ],
                                  ["Discard changes"]
                              ),
                          ]),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Disabled(busy || accounts.length === 0),
                            h.Class(button_class),
                        ],
                        [
                            busy
                                ? "Working…"
                                : model.editing_post_id === null
                                  ? "Save draft"
                                  : "Save draft changes",
                        ]
                    ),
                    ...(model.editing_post_id === null
                        ? [
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.Disabled(busy || accounts.length === 0),
                                      h.OnClick(
                                          ClickedRequestPublication({
                                              publication_mode: Option.isNone(
                                                  model.schedule_date
                                              )
                                                  ? "publish_now"
                                                  : "schedule",
                                          })
                                      ),
                                      h.Class(primary_button_class),
                                  ],
                                  [
                                      Option.isNone(model.schedule_date)
                                          ? "Publish now"
                                          : "Schedule post",
                                  ]
                              ),
                          ]
                        : []),
                ]
            ),
            ...(model.pending_publication === null
                ? []
                : [
                      h.div(
                          [
                              h.Attribute("role", "alert"),
                              h.Attribute("aria-live", "assertive"),
                              h.Class(
                                  "rounded-[var(--radius-control)] border border-warning/50 bg-warning/10 p-4"
                              ),
                          ],
                          [
                              h.p(
                                  [h.Class("text-sm font-semibold")],
                                  [
                                      model.pending_publication === "schedule"
                                          ? "Confirm scheduled publishing"
                                          : "Confirm publishing now",
                                  ]
                              ),
                              h.p(
                                  [
                                      h.Class(
                                          "mt-1 text-sm text-muted-foreground"
                                      ),
                                  ],
                                  [
                                      model.pending_publication === "schedule"
                                          ? `This will publish to ${model.selected_account_ids.length} selected account${model.selected_account_ids.length === 1 ? "" : "s"} at ${schedule_time_summary(schedule_timestamp(model) ?? 0)}.`
                                          : `This will send the post to ${model.selected_account_ids.length} selected account${model.selected_account_ids.length === 1 ? "" : "s"} immediately.`,
                                  ]
                              ),
                              h.div(
                                  [
                                      h.Class(
                                          "mt-3 flex flex-wrap justify-end gap-2"
                                      ),
                                  ],
                                  [
                                      h.button(
                                          [
                                              h.Type("button"),
                                              h.OnClick(
                                                  ClickedCancelPublication()
                                              ),
                                              h.Class(button_class),
                                          ],
                                          ["Go back"]
                                      ),
                                      h.button(
                                          [
                                              h.Type("button"),
                                              h.OnClick(
                                                  ClickedConfirmPublication()
                                              ),
                                              h.Class(primary_button_class),
                                          ],
                                          [
                                              model.pending_publication ===
                                              "schedule"
                                                  ? "Confirm schedule"
                                                  : "Confirm publish now",
                                          ]
                                      ),
                                  ]
                              ),
                          ]
                      ),
                  ]),
        ]
    )
}

const social_template_field_view = (
    id: string,
    label: string,
    field: "name" | "description" | "tags",
    value: string,
    maxlength: number,
    disabled: boolean,
    h: HtmlBuilder<Message>,
    required = false
): Html =>
    h.label(
        [h.For(id), h.Class("grid gap-1 text-sm font-medium")],
        [
            h.span([], [required ? `${label} (required)` : label]),
            h.input([
                h.Id(id),
                h.Name(field),
                h.Type("text"),
                h.Value(value),
                h.Maxlength(maxlength),
                h.Required(required),
                h.Disabled(disabled),
                h.OnInput((next_value) =>
                    ChangedSocialTemplateMetadata({
                        field,
                        value: next_value,
                    })
                ),
                h.Class(field_class),
            ]),
        ]
    )

const social_template_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const saving = model.template_save_status === "saving"
    const disabled = is_busy(model) || saving

    return h.form(
        [
            h.OnSubmit(SubmittedSocialTemplate()),
            h.Class(`${panel_class} mt-4 space-y-4`),
        ],
        [
            h.div(
                [],
                [
                    h.h2(
                        [
                            h.Id("social-save-template"),
                            h.Class("text-lg font-semibold"),
                        ],
                        ["Save as template"]
                    ),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [
                            "Only the caption is included. Accounts, images, schedule, and publishing settings stay with the post.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-4 sm:grid-cols-3")],
                [
                    social_template_field_view(
                        "social-template-name",
                        "Template name",
                        "name",
                        model.template_name,
                        160,
                        disabled,
                        h,
                        true
                    ),
                    social_template_field_view(
                        "social-template-description",
                        "Description",
                        "description",
                        model.template_description,
                        500,
                        disabled,
                        h
                    ),
                    social_template_field_view(
                        "social-template-tags",
                        "Tags (comma-separated)",
                        "tags",
                        model.template_tags,
                        500,
                        disabled,
                        h
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap items-center justify-between gap-3")],
                [
                    h.p(
                        [
                            h.AriaLive("polite"),
                            h.Class("min-h-5 text-sm text-muted-foreground"),
                        ],
                        [model.template_feedback]
                    ),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Disabled(disabled),
                            h.Class(button_class),
                        ],
                        [saving ? "Saving…" : "Save as template"]
                    ),
                ]
            ),
        ]
    )
}

const post_date_formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
})
const utc_date_formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
})
const schedule_time_summary = (timestamp: number): string => {
    const instant = new Date(timestamp)
    return `${post_date_formatter.format(instant)} on your device (${utc_date_formatter.format(instant)} UTC in Zernio)`
}

const can_cancel_post = (post: Post): boolean =>
    post.status === "draft" || post.status === "scheduled"

const can_delete_post = (post: Post): boolean =>
    post.status !== "pending" && post.status !== "submitting"

const can_check_post = (post: Post): boolean =>
    post.status === "submitting" || post.status === "scheduled"

const can_edit_post = (post: Post): boolean => post.status === "draft"

const content_social_post_href = (post_id: string): string =>
    `${content_item_href("social", post_id)}?mode=edit`

const post_card = (post: Post, model: Model, h: HtmlBuilder<Message>): Html =>
    h.keyed("li")(
        post.post_id,
        [h.Class(`${panel_class} space-y-3`)],
        [
            h.div(
                [h.Class("flex flex-wrap items-center justify-between gap-2")],
                [
                    h.div(
                        [h.Class("flex flex-wrap items-center gap-2")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize"
                                    ),
                                ],
                                [post.status]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        post.test_mode
                                            ? "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                                            : "rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success"
                                    ),
                                ],
                                [
                                    post.test_mode
                                        ? "Draft mode"
                                        : "Live delivery",
                                ]
                            ),
                        ]
                    ),
                    h.time(
                        [h.Class("text-xs text-muted-foreground")],
                        [
                            post.scheduled_for === null
                                ? post_date_formatter.format(
                                      new Date(post.created_at)
                                  )
                                : `Scheduled: ${schedule_time_summary(post.scheduled_for)}`,
                        ]
                    ),
                ]
            ),
            h.p(
                [h.Class("whitespace-pre-wrap text-sm leading-6")],
                [post.content]
            ),
            ...(post.media_urls.length === 0
                ? []
                : [
                      h.div(
                          [h.Class("grid grid-cols-3 gap-2 sm:grid-cols-5")],
                          post.media_urls.map((url) =>
                              h.keyed("img")(url, [
                                  h.Src(url),
                                  h.Alt("Attached post media"),
                                  h.Loading("lazy"),
                                  h.Class(
                                      "aspect-square w-full rounded-[var(--radius-control)] bg-muted object-cover"
                                  ),
                              ])
                          )
                      ),
                  ]),
            h.p(
                [h.Class("text-xs text-muted-foreground")],
                [
                    post.platforms.length === 0
                        ? `${post.account_ids.length} selected account${post.account_ids.length === 1 ? "" : "s"}`
                        : post.platforms
                              .map((platform) =>
                                  platform_label(platform.platform)
                              )
                              .join(", "),
                ]
            ),
            ...(post.error_message === null
                ? []
                : [
                      h.p(
                          [
                              h.Attribute("role", "alert"),
                              h.Class("text-sm text-destructive"),
                          ],
                          [post.error_message]
                      ),
                  ]),
            ...(can_edit_post(post) ||
            can_cancel_post(post) ||
            can_check_post(post) ||
            can_delete_post(post) ||
            post.status === "draft"
                ? [
                      h.div(
                          [h.Class("flex flex-wrap gap-2")],
                          [
                              ...(post.status === "draft" &&
                              !post.pending_draft_edit
                                  ? [
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.Disabled(is_busy(model)),
                                                h.OnClick(
                                                    ClickedRequestPublishDraft({
                                                        post_id: post.post_id,
                                                    })
                                                ),
                                                h.Class(button_class),
                                            ],
                                            ["Publish draft"]
                                        ),
                                    ]
                                  : []),
                              ...(can_edit_post(post)
                                  ? [
                                        is_busy(model)
                                            ? h.button(
                                                  [
                                                      h.Type("button"),
                                                      h.Disabled(true),
                                                      h.Class(button_class),
                                                  ],
                                                  ["Edit"]
                                              )
                                            : h.a(
                                                  [
                                                      h.Href(
                                                          content_social_post_href(
                                                              post.post_id
                                                          )
                                                      ),
                                                      h.Class(
                                                          `${button_class} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`
                                                      ),
                                                  ],
                                                  ["Edit"]
                                              ),
                                    ]
                                  : []),
                              ...(can_cancel_post(post)
                                  ? [
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.Disabled(is_busy(model)),
                                                h.OnClick(
                                                    ClickedCancelPost({
                                                        post_id: post.post_id,
                                                    })
                                                ),
                                                h.Class(button_class),
                                            ],
                                            [
                                                model.operation._tag ===
                                                    "Cancelling" &&
                                                model.operation.post_id ===
                                                    post.post_id
                                                    ? "Cancelling…"
                                                    : "Cancel",
                                            ]
                                        ),
                                    ]
                                  : []),
                              ...(can_delete_post(post)
                                  ? [
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.Disabled(is_busy(model)),
                                                h.OnClick(
                                                    ClickedRequestDeletePost({
                                                        post_id: post.post_id,
                                                    })
                                                ),
                                                h.Class(button_class),
                                            ],
                                            [
                                                post.status === "draft"
                                                    ? "Delete draft"
                                                    : post.status ===
                                                        "scheduled"
                                                      ? "Delete scheduled post"
                                                      : post.status === "failed"
                                                        ? "Delete failed post"
                                                        : "Remove from history",
                                            ]
                                        ),
                                    ]
                                  : []),
                              ...(can_check_post(post)
                                  ? [
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.Disabled(is_busy(model)),
                                                h.OnClick(
                                                    ClickedCheckPostStatus({
                                                        post_id: post.post_id,
                                                    })
                                                ),
                                                h.Class(button_class),
                                            ],
                                            ["Check status"]
                                        ),
                                    ]
                                  : []),
                              ...(post.pending_draft_edit
                                  ? [
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.Disabled(is_busy(model)),
                                                h.OnClick(
                                                    ClickedRetryDraftEdit({
                                                        post_id: post.post_id,
                                                    })
                                                ),
                                                h.Class(button_class),
                                            ],
                                            ["Retry draft save"]
                                        ),
                                    ]
                                  : []),
                          ]
                      ),
                  ]
                : []),
            ...(model.pending_publish_post_id === post.post_id
                ? [
                      h.div(
                          [
                              h.Class(
                                  "flex flex-wrap items-center gap-2 rounded-md border p-3"
                              ),
                          ],
                          [
                              h.p(
                                  [h.Class("w-full text-sm")],
                                  [
                                      "Publish this saved draft now to its selected accounts?",
                                  ]
                              ),
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.OnClick(ClickedConfirmPublishDraft()),
                                      h.Class(button_class),
                                  ],
                                  ["Confirm publish"]
                              ),
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.OnClick(ClickedCancelPublishDraft()),
                                      h.Class(button_class),
                                  ],
                                  ["Keep draft"]
                              ),
                          ]
                      ),
                  ]
                : []),
            ...(model.pending_delete_post_id === post.post_id
                ? [
                      h.div(
                          [h.Class("space-y-2 rounded-md border p-3")],
                          [
                              h.p(
                                  [h.Class("text-sm")],
                                  [
                                      post.status === "draft"
                                          ? "Delete this saved draft from Zernio and URM?"
                                          : post.status === "scheduled"
                                            ? "Cancel delivery and delete this scheduled post?"
                                            : post.status === "failed"
                                              ? "Delete this failed post from Zernio and URM?"
                                              : "Remove this post from URM history? Published posts remain live on Facebook or Instagram.",
                                  ]
                              ),
                              h.div(
                                  [h.Class("flex gap-2")],
                                  [
                                      h.button(
                                          [
                                              h.Type("button"),
                                              h.OnClick(
                                                  ClickedConfirmDeletePost()
                                              ),
                                              h.Class(button_class),
                                          ],
                                          ["Confirm delete"]
                                      ),
                                      h.button(
                                          [
                                              h.Type("button"),
                                              h.OnClick(
                                                  ClickedCancelDeletePost()
                                              ),
                                              h.Class(button_class),
                                          ],
                                          ["Keep post"]
                                      ),
                                  ]
                              ),
                          ]
                      ),
                  ]
                : []),
            ...(model.operation._tag === "Checking" &&
            model.operation.post_id === post.post_id
                ? [
                      h.p(
                          [h.Class("text-sm text-muted-foreground")],
                          ["Checking status…"]
                      ),
                  ]
                : []),
            ...(model.checked_post?.post_id === post.post_id
                ? [
                      h.p(
                          [h.Attribute("role", "status"), h.Class("text-sm")],
                          [
                              `Latest provider status: ${model.checked_post.status}${model.checked_post.resolved ? "" : " (still awaiting confirmation)"}`,
                          ]
                      ),
                  ]
                : []),
        ]
    )

const posts_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    switch (model.posts._tag) {
        case "Loading":
            return h.p(
                [h.Class("text-sm text-muted-foreground")],
                ["Loading drafts…"]
            )
        case "Failed":
            return h.p(
                [
                    h.Attribute("role", "alert"),
                    h.Class("text-sm text-destructive"),
                ],
                [model.posts.error]
            )
        case "Ready":
            return model.posts.posts.length === 0
                ? h.p(
                      [h.Class("text-sm text-muted-foreground")],
                      ["No social drafts yet."]
                  )
                : h.ol(
                      [h.Class("grid gap-4 lg:grid-cols-2")],
                      model.posts.posts.map((post) => post_card(post, model, h))
                  )
    }
}

const compact_number = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
})

const full_number = new Intl.NumberFormat("en")

const analytics_metric_card = (
    label: string,
    value: number,
    detail: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.p([h.Class("text-sm text-muted-foreground")], [label]),
            h.p(
                [h.Class("mt-1 text-2xl font-semibold tabular-nums")],
                [compact_number.format(value)]
            ),
            h.p([h.Class("mt-1 text-xs text-muted-foreground")], [detail]),
        ]
    )

const platform_color = (platform: string): string =>
    platform === "facebook"
        ? "var(--chart-1)"
        : platform === "instagram"
          ? "var(--chart-2)"
          : "var(--chart-3)"

const top_posts_view = (
    snapshot: AnalyticsSnapshot,
    h: HtmlBuilder<Message>
): Html =>
    h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("p-5 pb-3")],
                [
                    h.h3([h.Class("font-semibold")], ["Top posts"]),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        ["Ranked by total engagement in this period."]
                    ),
                ]
            ),
            snapshot.top_posts.length === 0
                ? h.p(
                      [h.Class("px-5 pb-5 text-sm text-muted-foreground")],
                      ["No published posts have analytics for these filters."]
                  )
                : h.div(
                      [h.Class("overflow-x-auto")],
                      [
                          h.table(
                              [h.Class("w-full min-w-2xl text-left text-sm")],
                              [
                                  h.thead(
                                      [
                                          h.Class(
                                              "border-y border-border bg-muted/40"
                                          ),
                                      ],
                                      [
                                          h.tr(
                                              [],
                                              [
                                                  h.th(
                                                      [
                                                          h.Class(
                                                              "px-5 py-3 font-medium"
                                                          ),
                                                      ],
                                                      ["Post"]
                                                  ),
                                                  h.th(
                                                      [
                                                          h.Class(
                                                              "px-3 py-3 font-medium"
                                                          ),
                                                      ],
                                                      ["Platform"]
                                                  ),
                                                  h.th(
                                                      [
                                                          h.Class(
                                                              "px-3 py-3 text-right font-medium"
                                                          ),
                                                      ],
                                                      ["Reach"]
                                                  ),
                                                  h.th(
                                                      [
                                                          h.Class(
                                                              "px-3 py-3 text-right font-medium"
                                                          ),
                                                      ],
                                                      ["Engagement"]
                                                  ),
                                                  h.th(
                                                      [
                                                          h.Class(
                                                              "px-5 py-3 text-right font-medium"
                                                          ),
                                                      ],
                                                      ["Views"]
                                                  ),
                                              ]
                                          ),
                                      ]
                                  ),
                                  h.tbody(
                                      [],
                                      snapshot.top_posts.map((post) =>
                                          h.keyed("tr")(
                                              post.post_id,
                                              [
                                                  h.Class(
                                                      "border-b border-border last:border-0"
                                                  ),
                                              ],
                                              [
                                                  h.td(
                                                      [
                                                          h.Class(
                                                              "max-w-sm px-5 py-3"
                                                          ),
                                                      ],
                                                      [
                                                          post.post_url === null
                                                              ? h.span(
                                                                    [
                                                                        h.Class(
                                                                            "line-clamp-2"
                                                                        ),
                                                                    ],
                                                                    [
                                                                        post.content,
                                                                    ]
                                                                )
                                                              : h.a(
                                                                    [
                                                                        h.Href(
                                                                            post.post_url
                                                                        ),
                                                                        h.Target(
                                                                            "_blank"
                                                                        ),
                                                                        h.Rel(
                                                                            "noreferrer"
                                                                        ),
                                                                        h.Class(
                                                                            "line-clamp-2 font-medium underline-offset-4 hover:underline"
                                                                        ),
                                                                    ],
                                                                    [
                                                                        post.content,
                                                                    ]
                                                                ),
                                                      ]
                                                  ),
                                                  h.td(
                                                      [
                                                          h.Class(
                                                              "px-3 py-3 capitalize"
                                                          ),
                                                      ],
                                                      [post.platform]
                                                  ),
                                                  h.td(
                                                      [
                                                          h.Class(
                                                              "px-3 py-3 text-right tabular-nums"
                                                          ),
                                                      ],
                                                      [
                                                          full_number.format(
                                                              post.metrics.reach
                                                          ),
                                                      ]
                                                  ),
                                                  h.td(
                                                      [
                                                          h.Class(
                                                              "px-3 py-3 text-right tabular-nums"
                                                          ),
                                                      ],
                                                      [
                                                          full_number.format(
                                                              post.metrics
                                                                  .engagement
                                                          ),
                                                      ]
                                                  ),
                                                  h.td(
                                                      [
                                                          h.Class(
                                                              "px-5 py-3 text-right tabular-nums"
                                                          ),
                                                      ],
                                                      [
                                                          full_number.format(
                                                              post.metrics.views
                                                          ),
                                                      ]
                                                  ),
                                              ]
                                          )
                                      )
                                  ),
                              ]
                          ),
                      ]
                  ),
        ]
    )

const analytics_snapshot_view = (
    snapshot: AnalyticsSnapshot,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> => [
    h.div(
        [h.Class("grid gap-3 sm:grid-cols-2 xl:grid-cols-4")],
        [
            analytics_metric_card(
                "Impressions",
                snapshot.metrics.impressions,
                `${snapshot.post_count} posts`,
                h
            ),
            analytics_metric_card(
                "Reach",
                snapshot.metrics.reach,
                "Unique audience where provided",
                h
            ),
            analytics_metric_card(
                "Engagement",
                snapshot.metrics.engagement,
                "Likes, comments, shares, saves and clicks",
                h
            ),
            analytics_metric_card(
                "Follower growth",
                snapshot.follower_growth,
                "Net change over the selected period",
                h
            ),
        ]
    ),
    line_chart_card(
        "Daily performance",
        "Engagement is attributed to the day it was received.",
        snapshot.daily.map((point) => point.date),
        [
            {
                label: "Impressions",
                color: "var(--chart-1)",
                values: snapshot.daily.map(
                    (point) => point.metrics.impressions
                ),
            },
            {
                label: "Reach",
                color: "var(--chart-2)",
                values: snapshot.daily.map((point) => point.metrics.reach),
            },
            {
                label: "Engagement",
                color: "var(--chart-3)",
                values: snapshot.daily.map((point) => point.metrics.engagement),
            },
        ]
    ),
    chart_card(
        "Platform comparison",
        "Reach by connected social platform.",
        snapshot.platform_breakdown.map((entry) => ({
            label: platform_label(entry.platform),
            value: entry.metrics.reach,
            color: platform_color(entry.platform),
        })),
        true
    ),
    top_posts_view(snapshot, h),
]

const analytics_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const accounts =
        model.accounts._tag === "Ready"
            ? model.accounts.accounts.filter(
                  (account) =>
                      account.active &&
                      (model.analytics_platform === "all" ||
                          account.platform === model.analytics_platform)
              )
            : []

    return h.div(
        [h.Class("space-y-4")],
        [
            h.div(
                [
                    h.Class(
                        "flex flex-col gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 sm:flex-row sm:items-end"
                    ),
                ],
                [
                    h.label(
                        [h.Class("grid gap-1 text-sm font-medium")],
                        [
                            "Period",
                            h.select(
                                [
                                    h.Value(model.analytics_period),
                                    h.OnChange((value) =>
                                        ChangedAnalyticsPeriod({ value })
                                    ),
                                    h.Class(field_class),
                                ],
                                [
                                    h.option([h.Value("7d")], ["Last 7 days"]),
                                    h.option(
                                        [h.Value("30d")],
                                        ["Last 30 days"]
                                    ),
                                    h.option(
                                        [h.Value("90d")],
                                        ["Last 90 days"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.label(
                        [h.Class("grid gap-1 text-sm font-medium")],
                        [
                            "Platform",
                            h.select(
                                [
                                    h.Value(model.analytics_platform),
                                    h.OnChange((value) =>
                                        ChangedAnalyticsPlatform({ value })
                                    ),
                                    h.Class(field_class),
                                ],
                                [
                                    h.option(
                                        [h.Value("all")],
                                        ["All platforms"]
                                    ),
                                    h.option(
                                        [h.Value("facebook")],
                                        ["Facebook"]
                                    ),
                                    h.option(
                                        [h.Value("instagram")],
                                        ["Instagram"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.label(
                        [
                            h.Class(
                                "grid min-w-56 flex-1 gap-1 text-sm font-medium"
                            ),
                        ],
                        [
                            "Account",
                            h.select(
                                [
                                    h.Value(model.analytics_account_id ?? ""),
                                    h.OnChange((value) =>
                                        ChangedAnalyticsAccount({ value })
                                    ),
                                    h.Class(field_class),
                                ],
                                [
                                    h.option([h.Value("")], ["All accounts"]),
                                    ...accounts.map((account) =>
                                        h.option(
                                            [h.Value(account.account_id)],
                                            [
                                                `${platform_label(account.platform)} · ${account.display_name ?? account.username}`,
                                            ]
                                        )
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(model.analytics_refreshing),
                            h.OnClick(ClickedRefreshAnalytics()),
                            h.Class(primary_button_class),
                        ],
                        [
                            model.analytics_refreshing
                                ? "Refreshing…"
                                : "Refresh analytics",
                        ]
                    ),
                ]
            ),
            ...(model.analytics_error === null
                ? []
                : [
                      h.div(
                          [
                              h.Attribute("role", "alert"),
                              h.Class(
                                  "rounded-[var(--radius-surface)] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                              ),
                          ],
                          [
                              h.p(
                                  [h.Class("font-medium")],
                                  ["Analytics refresh failed"]
                              ),
                              h.p([h.Class("mt-1")], [model.analytics_error]),
                              h.p(
                                  [h.Class("mt-2 text-xs")],
                                  [
                                      "Zernio analytics may require Analytics access on your plan and an API key with the analytics resource enabled.",
                                  ]
                              ),
                          ]
                      ),
                  ]),
            ...(model.analytics._tag === "Loading"
                ? [
                      h.p(
                          [
                              h.Attribute("role", "status"),
                              h.Class("text-sm text-muted-foreground"),
                          ],
                          ["Loading cached analytics…"]
                      ),
                  ]
                : model.analytics._tag === "Failed"
                  ? [
                        h.p(
                            [
                                h.Attribute("role", "alert"),
                                h.Class("text-sm text-destructive"),
                            ],
                            [model.analytics.error]
                        ),
                    ]
                  : model.analytics.snapshot === null
                    ? [
                          h.div(
                              [
                                  h.Class(
                                      "rounded-[var(--radius-surface)] border border-dashed border-border p-6 text-center"
                                  ),
                              ],
                              [
                                  h.p(
                                      [h.Class("font-medium")],
                                      ["No analytics snapshot yet"]
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "mt-1 text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          "Choose filters, then refresh to load data from Zernio.",
                                      ]
                                  ),
                              ]
                          ),
                      ]
                    : [
                          ...(model.analytics.snapshot.warning === null
                              ? []
                              : [
                                    h.p(
                                        [
                                            h.Attribute("role", "status"),
                                            h.Class(
                                                "rounded-[var(--radius-control)] bg-muted p-3 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [model.analytics.snapshot.warning]
                                    ),
                                ]),
                          h.p(
                              [h.Class("text-xs text-muted-foreground")],
                              [
                                  `Updated ${new Date(model.analytics.snapshot.updated_at).toLocaleString()}`,
                              ]
                          ),
                          ...analytics_snapshot_view(
                              model.analytics.snapshot,
                              h
                          ),
                      ]),
        ]
    )
}

/** Renders the Social connected-accounts screen. */
type ViewInputs = Readonly<{
    has_active_domain: boolean
    link_suggestions?: ReadonlyArray<LinkSuggestion>
}>

const content_view = (
    model: Model,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html => {
    const busy = is_busy(model)

    return h.main(
        [
            h.Class(
                "min-h-full bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8"
            ),
        ],
        [
            h.div(
                [h.Class("mx-auto w-full max-w-7xl space-y-6")],
                [
                    h.header(
                        [
                            h.Class(
                                "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("max-w-2xl")],
                                [
                                    h.h1(
                                        [
                                            h.Class(
                                                "text-2xl font-semibold tracking-tight text-balance"
                                            ),
                                        ],
                                        ["Social"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Create drafts safely, or explicitly confirm immediate and scheduled live publishing.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Disabled(
                                                !inputs.has_active_domain ||
                                                    busy
                                            ),
                                            h.OnClick(
                                                ClickedConnectAccount({
                                                    platform: "facebook",
                                                })
                                            ),
                                            h.Class(button_class),
                                        ],
                                        ["Connect Facebook"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Disabled(
                                                !inputs.has_active_domain ||
                                                    busy
                                            ),
                                            h.OnClick(
                                                ClickedConnectAccount({
                                                    platform: "instagram",
                                                })
                                            ),
                                            h.Class(button_class),
                                        ],
                                        ["Connect Instagram"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Disabled(
                                                !inputs.has_active_domain ||
                                                    busy
                                            ),
                                            h.OnClick(ClickedSyncAccounts()),
                                            h.Class(primary_button_class),
                                        ],
                                        [busy ? "Working…" : "Sync accounts"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    inputs.has_active_domain
                        ? operation_view(model, h)
                        : h.p(
                              [
                                  h.Attribute("role", "status"),
                                  h.Class(
                                      "rounded-[var(--radius-surface)] border border-border bg-muted p-4 text-sm text-muted-foreground"
                                  ),
                              ],
                              ["Select a workspace before managing accounts."]
                          ),
                    h.section(
                        [h.Attribute("aria-labelledby", "social-analytics")],
                        [
                            h.div(
                                [h.Class("mb-3")],
                                [
                                    h.h2(
                                        [
                                            h.Id("social-analytics"),
                                            h.Class("text-lg font-semibold"),
                                        ],
                                        ["Analytics"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-1 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Performance across published and externally synced posts.",
                                        ]
                                    ),
                                ]
                            ),
                            inputs.has_active_domain
                                ? analytics_view(model, h)
                                : h.empty,
                        ]
                    ),
                    h.section(
                        [h.Attribute("aria-labelledby", "social-compose")],
                        inputs.has_active_domain
                            ? [
                                  h.form(
                                      [
                                          h.Id("social-bookmark-form"),
                                          h.OnSubmit(InsertedBookmarkUrl()),
                                      ],
                                      []
                                  ),
                                  composer_view(
                                      model,
                                      inputs.link_suggestions ?? [],
                                      h
                                  ),
                                  social_template_view(model, h),
                              ]
                            : [h.empty]
                    ),
                    h.section(
                        [h.Attribute("aria-labelledby", "social-posts")],
                        [
                            h.h2(
                                [
                                    h.Id("social-posts"),
                                    h.Class("mb-3 text-lg font-semibold"),
                                ],
                                ["Recent drafts and posts"]
                            ),
                            inputs.has_active_domain
                                ? posts_view(model, h)
                                : h.empty,
                        ]
                    ),
                    h.section(
                        [h.Attribute("aria-labelledby", "social-accounts")],
                        [
                            h.h2(
                                [
                                    h.Id("social-accounts"),
                                    h.Class("mb-3 text-lg font-semibold"),
                                ],
                                ["Connected accounts"]
                            ),
                            inputs.has_active_domain
                                ? accounts_view(model, h)
                                : h.empty,
                        ]
                    ),
                ]
            ),
        ]
    )
}

/** Renders the Social connected-accounts screen as a Foldkit Submodel. */
export const view = Submodel.defineView<Model, Message, ViewInputs>(
    content_view
)
