import { Array, Effect, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import { Remote } from "foldkit-remote"
import * as Social from "@urm/features/social/submodel"
import {
    content_item_id_for_path,
    is_content_edit_requested,
} from "@urm/features/content"
import { requiresImageUrlProxy } from "@urm/utils/media"
import {
    CancelSocialPost as CancelSocialPostMutation,
    DeleteSocialPost as DeleteSocialPostMutation,
    ConnectSocialAccount as ConnectSocialAccountMutation,
    RefreshSocialAnalytics as RefreshSocialAnalyticsMutation,
    ReconcileSocialPost as ReconcileSocialPostMutation,
    PublishSocialDraft as PublishSocialDraftMutation,
    RetrySocialDraftEdit as RetrySocialDraftEditMutation,
    SaveSocialTemplate as SaveSocialTemplateMutation,
    SubmitSocialPost as SubmitSocialPostMutation,
    SyncSocialAccounts as SyncSocialAccountsMutation,
    UpdateSocialDraft as UpdateSocialDraftMutation,
    SocialAccount as StoredSocialAccount,
    SocialPost as StoredSocialPost,
    SocialAnalyticsSnapshot as StoredSocialAnalyticsSnapshot,
} from "@urm/contracts/social"
import { Image as StoredImage } from "@urm/contracts/media"
import {
    ContentTemplateDescription,
    ContentTemplateName,
    ContentTemplateTags,
} from "@urm/domain/schemas/content-templates"
import { ContactsApi } from "../contacts/api.ts"
import {
    check_social_session,
    load_social_accounts,
    load_social_data,
} from "./api.ts"

export const Model = Social.Model
export type Model = Social.Model
export const Message = Social.Message
export type Message = Social.Message

type Commands = ReadonlyArray<Command.Command<Message, never, ContactsApi>>
export type UpdateReturn = readonly [Model, Commands]

const ConnectSocialAccountArgs = S.Struct({
    platform: S.Literals(["facebook", "instagram"]),
})
const ScheduleSocialPostArgs = S.Struct({
    account_ids: S.Array(S.String),
    media_ids: S.Array(S.String),
    content: S.String,
    scheduled_for: S.NullOr(S.Number),
    publication_mode: S.Literals(["draft", "publish_now", "schedule"]),
    template_id: S.NullOr(S.String),
})
const CancelSocialPostArgs = S.Struct({ post_id: S.String })
const UpdateSocialPostArgs = S.Struct({
    post_id: S.String,
    account_ids: S.Array(S.String),
    media_ids: S.Array(S.String),
    content: S.String,
    scheduled_for: S.NullOr(S.Number),
    publication_mode: S.Literals(["draft", "publish_now", "schedule"]),
})
const RefreshSocialAnalyticsArgs = S.Struct({
    period: StoredSocialAnalyticsSnapshot.fields.period,
    platform: StoredSocialAnalyticsSnapshot.fields.platform,
    account_id: S.NullOr(S.String),
})
const SaveSocialTemplateArgs = S.Struct({
    name: ContentTemplateName,
    description: ContentTemplateDescription,
    tags: ContentTemplateTags,
    content: S.Trimmed.check(S.isMinLength(1), S.isMaxLength(5_000)),
})

const ConnectDesktopSocialAccount = Command.define(
    "ConnectDesktopSocialAccount",
    {
        args: {
            domain_id: S.String,
            platform: ConnectSocialAccountArgs.fields.platform,
        },
        messages: [Social.SucceededConnectAccount, Social.FailedConnectAccount],
        execute: ({ domain_id, platform }) =>
            Effect.gen(function* () {
                const api = yield* check_social_session(domain_id, true)
                const result = yield* Remote.mutate(
                    ConnectSocialAccountMutation,
                    { domain_id, platform },
                    crypto.randomUUID()
                ).pipe(Effect.provide(api.remote(domain_id)))
                return Social.SucceededConnectAccount({
                    auth_url: result.output.auth_url,
                })
            }).pipe(
                Effect.catch((error) =>
                    Effect.succeed(
                        Social.FailedConnectAccount({
                            error: globalThis.String(error),
                        })
                    )
                )
            ),
    }
)

const SyncDesktopSocialAccounts = Command.define("SyncDesktopSocialAccounts", {
    args: { domain_id: S.String },
    messages: [Social.SucceededSyncAccounts, Social.FailedSyncAccounts],
    execute: ({ domain_id }) =>
        Effect.gen(function* () {
            const api = yield* check_social_session(domain_id, true)
            yield* Remote.mutate(
                SyncSocialAccountsMutation,
                { domain_id },
                crypto.randomUUID()
            ).pipe(Effect.provide(api.remote(domain_id)))
            const accounts = yield* load_social_accounts(domain_id)
            return Social.SucceededSyncAccounts({
                accounts: Array.map(accounts, to_feature_account),
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Social.FailedSyncAccounts({
                        error: globalThis.String(error),
                    })
                )
            )
        ),
})

const ScheduleDesktopSocialPost = Command.define("ScheduleDesktopSocialPost", {
    args: {
        domain_id: S.String,
        ...ScheduleSocialPostArgs.fields,
        idempotency_key: S.String,
    },
    messages: [Social.SucceededSchedulePost, Social.FailedSchedulePost],
    execute: (input) =>
        Effect.gen(function* () {
            const api = yield* check_social_session(input.domain_id, true)
            const result = yield* Remote.mutate(
                SubmitSocialPostMutation,
                input,
                input.idempotency_key
            ).pipe(Effect.provide(api.remote(input.domain_id)))
            return Social.SucceededSchedulePost({
                post_id: result.output.post_id,
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Social.FailedSchedulePost({
                        error: globalThis.String(error),
                    })
                )
            )
        ),
})

const CancelDesktopSocialPost = Command.define("CancelDesktopSocialPost", {
    args: { domain_id: S.String, post_id: S.String },
    messages: [Social.SucceededCancelPost, Social.FailedCancelPost],
    execute: ({ domain_id, post_id }) =>
        Effect.gen(function* () {
            const api = yield* check_social_session(domain_id, true)
            const result = yield* Remote.mutate(
                CancelSocialPostMutation,
                { domain_id, post_id },
                crypto.randomUUID()
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Social.SucceededCancelPost({
                post_id: result.output.post_id,
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Social.FailedCancelPost({ error: globalThis.String(error) })
                )
            )
        ),
})

const DeleteDesktopSocialPost = Command.define("DeleteDesktopSocialPost", {
    args: { domain_id: S.String, post_id: S.String },
    messages: [Social.SucceededDeletePost, Social.FailedDeletePost],
    execute: ({ domain_id, post_id }) =>
        Effect.gen(function* () {
            const api = yield* check_social_session(domain_id, true)
            const result = yield* Remote.mutate(
                DeleteSocialPostMutation,
                { domain_id, post_id },
                crypto.randomUUID()
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Social.SucceededDeletePost({
                post_id: result.output.post_id,
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Social.FailedDeletePost({ error: globalThis.String(error) })
                )
            )
        ),
})

const CheckDesktopSocialPostStatus = Command.define(
    "CheckDesktopSocialPostStatus",
    {
        args: { domain_id: S.String, post_id: S.String },
        messages: [
            Social.SucceededCheckPostStatus,
            Social.FailedCheckPostStatus,
        ],
        execute: ({ domain_id, post_id }) =>
            Effect.gen(function* () {
                const api = yield* check_social_session(domain_id, true)
                const result = yield* Remote.mutate(
                    ReconcileSocialPostMutation,
                    { domain_id, post_id },
                    crypto.randomUUID()
                ).pipe(Effect.provide(api.remote(domain_id)))
                return Social.SucceededCheckPostStatus({
                    post_id,
                    status: result.output.status,
                    resolved: result.output.resolved,
                })
            }).pipe(
                Effect.catch((error) =>
                    Effect.succeed(
                        Social.FailedCheckPostStatus({
                            error: globalThis.String(error),
                        })
                    )
                )
            ),
    }
)

const PublishDesktopSocialDraft = Command.define("PublishDesktopSocialDraft", {
    args: { domain_id: S.String, post_id: S.String },
    messages: [Social.SucceededPublishDraft, Social.FailedPublishDraft],
    execute: ({ domain_id, post_id }) =>
        Effect.gen(function* () {
            const api = yield* check_social_session(domain_id, true)
            const result = yield* Remote.mutate(
                PublishSocialDraftMutation,
                { domain_id, post_id },
                crypto.randomUUID()
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Social.SucceededPublishDraft({
                post_id,
                status: result.output.status,
                resolved: result.output.resolved,
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Social.FailedPublishDraft({
                        error: globalThis.String(error),
                    })
                )
            )
        ),
})

const RetryDesktopSocialDraftEdit = Command.define(
    "RetryDesktopSocialDraftEdit",
    {
        args: { domain_id: S.String, post_id: S.String },
        messages: [Social.SucceededUpdatePost, Social.FailedUpdatePost],
        execute: ({ domain_id, post_id }) =>
            Effect.gen(function* () {
                const api = yield* check_social_session(domain_id, true)
                const result = yield* Remote.mutate(
                    RetrySocialDraftEditMutation,
                    { domain_id, post_id },
                    crypto.randomUUID()
                ).pipe(Effect.provide(api.remote(domain_id)))
                return Social.SucceededUpdatePost({
                    post_id: result.output.post_id,
                })
            }).pipe(
                Effect.catch((error) =>
                    Effect.succeed(
                        Social.FailedUpdatePost({
                            error: globalThis.String(error),
                        })
                    )
                )
            ),
    }
)

const UpdateDesktopSocialPost = Command.define("UpdateDesktopSocialPost", {
    args: { domain_id: S.String, ...UpdateSocialPostArgs.fields },
    messages: [Social.SucceededUpdatePost, Social.FailedUpdatePost],
    execute: ({
        domain_id,
        post_id,
        account_ids,
        media_ids,
        content,
        publication_mode,
    }) =>
        publication_mode !== "draft"
            ? Effect.succeed(
                  Social.FailedUpdatePost({
                      error: "Save this draft before scheduling or publishing it.",
                  })
              )
            : Effect.gen(function* () {
                  const api = yield* check_social_session(domain_id, true)
                  const result = yield* Remote.mutate(
                      UpdateSocialDraftMutation,
                      { domain_id, post_id, account_ids, media_ids, content },
                      crypto.randomUUID()
                  ).pipe(Effect.provide(api.remote(domain_id)))
                  return Social.SucceededUpdatePost({
                      post_id: result.output.post_id,
                  })
              }).pipe(
                  Effect.catch((error) =>
                      Effect.succeed(
                          Social.FailedUpdatePost({
                              error: globalThis.String(error),
                          })
                      )
                  )
              ),
})

const RefreshDesktopSocialAnalytics = Command.define(
    "RefreshDesktopSocialAnalytics",
    {
        args: { domain_id: S.String, ...RefreshSocialAnalyticsArgs.fields },
        messages: [
            Social.SucceededRefreshAnalytics,
            Social.FailedRefreshAnalytics,
        ],
        execute: ({ domain_id, period, platform, account_id }) =>
            Effect.gen(function* () {
                const api = yield* check_social_session(domain_id, true)
                yield* Remote.mutate(
                    RefreshSocialAnalyticsMutation,
                    { domain_id, period, platform, account_id },
                    crypto.randomUUID()
                ).pipe(Effect.provide(api.remote(domain_id)))
                const data = yield* load_social_data(
                    domain_id,
                    period,
                    platform,
                    account_id
                )
                if (data.analytics === null)
                    return Social.FailedRefreshAnalytics({
                        error: "Analytics were not returned",
                    })
                return Social.SucceededRefreshAnalytics({
                    snapshot: to_feature_analytics(data.analytics),
                })
            }).pipe(
                Effect.catch((error) =>
                    Effect.succeed(
                        Social.FailedRefreshAnalytics({
                            error: globalThis.String(error),
                        })
                    )
                )
            ),
    }
)

const SaveDesktopSocialTemplate = Command.define("SaveDesktopSocialTemplate", {
    args: {
        domain_id: S.String,
        template_id: S.NullOr(S.String),
        expected_revision: S.Number,
        ...SaveSocialTemplateArgs.fields,
    },
    messages: [
        Social.SucceededSaveSocialTemplate,
        Social.FailedSaveSocialTemplate,
    ],
    execute: (input) =>
        Effect.gen(function* () {
            const api = yield* check_social_session(input.domain_id, true)
            yield* Remote.mutate(
                SaveSocialTemplateMutation,
                input,
                crypto.randomUUID()
            ).pipe(Effect.provide(api.remote(input.domain_id)))
            return Social.SucceededSaveSocialTemplate()
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Social.FailedSaveSocialTemplate({
                        error: globalThis.String(error),
                    })
                )
            )
        ),
})

const to_feature_account = (
    account: typeof StoredSocialAccount.Type
): Social.Account => ({
    account_id: account.account_id,
    platform: account.platform,
    username: account.username,
    ...(account.display_name === null
        ? {}
        : { display_name: account.display_name }),
    ...(account.avatar_url === null ? {} : { avatar_url: account.avatar_url }),
    active: account.active,
    synced_at: account.synced_at,
})

const preview_url = (url: string): string =>
    requiresImageUrlProxy(url)
        ? `/image-url?url=${encodeURIComponent(url)}`
        : url

const to_feature_post = (post: typeof StoredSocialPost.Type): Social.Post => ({
    post_id: post.post_id,
    status: post.status,
    content: post.content,
    account_ids: post.account_ids,
    media_ids: post.media_ids,
    media_urls: post.media_urls.map(preview_url),
    platforms: post.platforms,
    scheduled_for: post.scheduled_for,
    error_message: post.error_message,
    pending_draft_edit: post.pending_draft_edit,
    test_mode: post.test_mode,
    template_source: post.template_source,
    created_at: post.created_at,
})

const to_feature_analytics = (
    snapshot: typeof StoredSocialAnalyticsSnapshot.Type
): Social.AnalyticsSnapshot => ({
    period: snapshot.period,
    platform: snapshot.platform,
    account_id: snapshot.account_id,
    post_count: snapshot.post_count,
    metrics: snapshot.metrics,
    follower_growth: snapshot.follower_growth,
    daily: snapshot.daily,
    platform_breakdown: snapshot.platform_breakdown,
    top_posts: snapshot.top_posts,
    warning: snapshot.warning,
    updated_at: snapshot.updated_at,
})

const translate_command = (
    active_domain_id: Option.Option<string>,
    command: Command.Command<Message>
): Commands => {
    if (command.name === "SyncSocialAccounts") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) => [SyncDesktopSocialAccounts({ domain_id })],
        })
    }

    if (command.name === "ConnectSocialAccount") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(ConnectSocialAccountArgs)(
                        command.args
                    ),
                    {
                        onNone: () => [],
                        onSome: ({ platform }) => [
                            ConnectDesktopSocialAccount({
                                domain_id,
                                platform,
                            }),
                        ],
                    }
                ),
        })
    }

    if (command.name === "ScheduleSocialPost") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(ScheduleSocialPostArgs)(command.args),
                    {
                        onNone: () => [],
                        onSome: ({
                            account_ids,
                            media_ids,
                            content,
                            scheduled_for,
                            publication_mode,
                            template_id,
                        }) => [
                            ScheduleDesktopSocialPost({
                                domain_id,
                                account_ids,
                                media_ids,
                                content,
                                scheduled_for,
                                publication_mode,
                                idempotency_key: `social:${globalThis.crypto.randomUUID()}`,
                                template_id,
                            }),
                        ],
                    }
                ),
        })
    }

    if (command.name === "CancelSocialPost") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(CancelSocialPostArgs)(command.args),
                    {
                        onNone: () => [],
                        onSome: ({ post_id }) => [
                            CancelDesktopSocialPost({ domain_id, post_id }),
                        ],
                    }
                ),
        })
    }

    if (command.name === "DeleteSocialPost") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(CancelSocialPostArgs)(command.args),
                    {
                        onNone: () => [],
                        onSome: ({ post_id }) => [
                            DeleteDesktopSocialPost({ domain_id, post_id }),
                        ],
                    }
                ),
        })
    }

    if (command.name === "CheckSocialPostStatus") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(CancelSocialPostArgs)(command.args),
                    {
                        onNone: () => [],
                        onSome: ({ post_id }) => [
                            CheckDesktopSocialPostStatus({
                                domain_id,
                                post_id,
                            }),
                        ],
                    }
                ),
        })
    }

    if (command.name === "PublishSocialDraft") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(CancelSocialPostArgs)(command.args),
                    {
                        onNone: () => [],
                        onSome: ({ post_id }) => [
                            PublishDesktopSocialDraft({ domain_id, post_id }),
                        ],
                    }
                ),
        })
    }

    if (command.name === "RetrySocialDraftEdit") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(CancelSocialPostArgs)(command.args),
                    {
                        onNone: () => [],
                        onSome: ({ post_id }) => [
                            RetryDesktopSocialDraftEdit({ domain_id, post_id }),
                        ],
                    }
                ),
        })
    }

    if (command.name === "UpdateSocialPost") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(UpdateSocialPostArgs)(command.args),
                    {
                        onNone: () => [],
                        onSome: ({
                            post_id,
                            account_ids,
                            media_ids,
                            content,
                            scheduled_for,
                            publication_mode,
                        }) => [
                            UpdateDesktopSocialPost({
                                domain_id,
                                post_id,
                                account_ids,
                                media_ids,
                                content,
                                scheduled_for,
                                publication_mode,
                            }),
                        ],
                    }
                ),
        })
    }

    if (command.name === "RefreshSocialAnalytics") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(RefreshSocialAnalyticsArgs)(
                        command.args
                    ),
                    {
                        onNone: () => [],
                        onSome: ({ period, platform, account_id }) => [
                            RefreshDesktopSocialAnalytics({
                                domain_id,
                                period,
                                platform,
                                account_id,
                            }),
                        ],
                    }
                ),
        })
    }

    if (command.name === "SaveSocialTemplate") {
        return Option.match(active_domain_id, {
            onNone: () => [],
            onSome: (domain_id) =>
                Option.match(
                    S.decodeUnknownOption(SaveSocialTemplateArgs)(command.args),
                    {
                        onNone: () => [],
                        onSome: (args) => [
                            SaveDesktopSocialTemplate({
                                domain_id,
                                template_id: null,
                                expected_revision: 0,
                                ...args,
                            }),
                        ],
                    }
                ),
        })
    }

    return [command]
}

export const init = (): Model => Social.init()

export const clear = (): Model => init()

export const content_social_post_id_for_path = (
    pathname: string
): Option.Option<string> => {
    return Option.fromNullishOr(content_item_id_for_path(pathname, "social"))
}

export const changed_content_url = (
    model: Model,
    pathname: string,
    search: string,
    active_domain_id: Option.Option<string>
): UpdateReturn => {
    const post_id = content_social_post_id_for_path(pathname)
    const requested_edit =
        Option.isSome(post_id) &&
        is_content_edit_requested(search) &&
        model.editing_post_id !== post_id.value
    if (requested_edit)
        return update(
            model,
            Social.ClickedEditPost({ post_id: post_id.value }),
            active_domain_id
        )
    if (
        model.editing_post_id !== null &&
        (!Option.isSome(post_id) ||
            post_id.value !== model.editing_post_id ||
            !is_content_edit_requested(search))
    )
        return update(model, Social.ClickedDiscardPostEdit(), active_domain_id)
    return [model, []]
}

export const loaded = (
    accounts: ReadonlyArray<typeof StoredSocialAccount.Type>
): Message =>
    Social.LoadedAccounts({
        accounts: Array.map(accounts, to_feature_account),
    })

export const failed_loading = (error: string): Message =>
    Social.FailedLoadingAccounts({ error })

export const loaded_posts = (
    posts: ReadonlyArray<typeof StoredSocialPost.Type>
): Message => Social.LoadedPosts({ posts: Array.map(posts, to_feature_post) })

export const failed_loading_posts = (error: string): Message =>
    Social.FailedLoadingPosts({ error })

export const loaded_analytics = (
    snapshot: typeof StoredSocialAnalyticsSnapshot.Type | null
): Message =>
    Social.LoadedAnalytics({
        snapshot: snapshot === null ? null : to_feature_analytics(snapshot),
    })

export const failed_loading_analytics = (error: string): Message =>
    Social.FailedLoadingAnalytics({ error })

export const selected_template = (
    template_id: string,
    content: string
): Message => Social.SelectedSocialTemplate({ template_id, content })

export const loaded_media = (images: ReadonlyArray<StoredImage>): Message =>
    Social.LoadedMedia({
        images: Array.map(images, (image) => ({
            image_id: image.id,
            url: preview_url(image.url),
            alt: image.alt,
            ...(image.width === undefined ? {} : { width: image.width }),
            ...(image.height === undefined ? {} : { height: image.height }),
        })),
    })

export const failed_loading_media = (error: string): Message =>
    Social.FailedLoadingMedia({ error })

export const update = (
    model: Model,
    message: Message,
    active_domain_id: Option.Option<string>
): UpdateReturn => {
    const [next_model, commands] = Social.update(model, message)
    return [
        next_model,
        Array.flatMap(commands, (command) =>
            translate_command(active_domain_id, command)
        ),
    ]
}

export const view = Social.view
