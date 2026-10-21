import { Effect, Schema } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ConnectSocialAccount,
    CancelSocialPost,
    DeleteSocialPost,
    PublishSocialDraft,
    DomainSocialAccounts,
    DomainSocialPosts,
    DomainSocialTemplates,
    DomainSocialAnalytics,
    RefreshSocialAnalytics,
    ReconcileSocialPost,
    RetrySocialDraftEdit,
    SaveSocialTemplate,
    SubmitSocialPost,
    UpdateSocialDraft,
    SocialAccountsEntity,
    SocialPostsEntity,
    SocialTemplatesEntity,
    SocialAnalyticsEntity,
    SocialRemote,
    SyncSocialAccounts,
} from "@urm/contracts/social"
import { ZernioProviderError } from "./provider.ts"
import { SocialRepository } from "./repository.ts"
import { SocialSubmissionError } from "./submission.ts"
import {
    SocialStoreError,
    type SocialPrincipal,
    type StoredSocialAccount,
    type StoredSocialPost,
    type StoredSocialTemplate,
} from "./store.ts"

const terminal: Boundary = { _tag: "Terminal" }
const failure = (error?: unknown) =>
    new RemoteServerError({
        message:
            error instanceof SocialStoreError ||
            error instanceof ZernioProviderError ||
            error instanceof SocialSubmissionError
                ? error.message
                : "Social operation unavailable or access denied",
    })
const record = (
    domain_id: string,
    accounts: ReadonlyArray<StoredSocialAccount>
) => ({
    id: domain_id,
    accounts: accounts.map((account) => ({
        account_id: account.account_id,
        platform: account.platform,
        username: account.username,
        display_name: account.display_name,
        avatar_url: account.avatar_url,
        active: account.active,
        synced_at: account.synced_at,
    })),
})
const post_record = (
    domain_id: string,
    posts: ReadonlyArray<StoredSocialPost>
) => ({
    id: domain_id,
    posts: posts.map((post) => ({
        post_id: post.id,
        status: post.status,
        content: post.content,
        account_ids: post.account_ids,
        media_ids: post.media_ids,
        media_urls: post.media_urls,
        platforms: post.platforms,
        scheduled_for: post.scheduled_for,
        error_message: post.error_message,
        pending_draft_edit: post.pending_draft_edit,
        test_mode: post.test_mode,
        template_source: post.template_source,
        created_at: post.created_at,
    })),
})
const template_record = (
    domain_id: string,
    templates: ReadonlyArray<StoredSocialTemplate>
) => ({ id: domain_id, templates })
const analytics_key = (input: typeof DomainSocialAnalytics.Input.Type) =>
    JSON.stringify(input)
const load = Effect.fn("Social.remoteAccounts")(function* (
    principal: SocialPrincipal
) {
    const repository = yield* SocialRepository
    return record(
        principal.domain_id,
        yield* repository.load_accounts(principal)
    )
})
export const SocialServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<SocialPrincipal, SocialRepository>(
            SocialAccountsEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        if (ids.some((id) => id !== principal.domain_id))
                            return yield* Effect.fail(failure())
                        return ids.length === 0
                            ? []
                            : [
                                  {
                                      id: principal.domain_id,
                                      values: yield* load(principal),
                                  },
                              ]
                    }).pipe(Effect.mapError(failure)),
            }
        ),
        RemoteServer.entity<SocialPrincipal, SocialRepository>(
            SocialPostsEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        if (ids.some((id) => id !== principal.domain_id))
                            return yield* Effect.fail(failure())
                        if (ids.length === 0) return []
                        const repository = yield* SocialRepository
                        return [
                            {
                                id: principal.domain_id,
                                values: post_record(
                                    principal.domain_id,
                                    yield* repository.load_posts(principal)
                                ),
                            },
                        ]
                    }).pipe(Effect.mapError(failure)),
            }
        ),
        RemoteServer.entity<SocialPrincipal, SocialRepository>(
            SocialTemplatesEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        if (ids.some((id) => id !== principal.domain_id))
                            return yield* Effect.fail(failure())
                        if (ids.length === 0) return []
                        const repository = yield* SocialRepository
                        return [
                            {
                                id: principal.domain_id,
                                values: template_record(
                                    principal.domain_id,
                                    yield* repository.load_templates(principal)
                                ),
                            },
                        ]
                    }).pipe(Effect.mapError(failure)),
            }
        ),
        RemoteServer.entity<SocialPrincipal, SocialRepository>(
            SocialAnalyticsEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.forEach(ids, (id) =>
                        Effect.gen(function* () {
                            const parsed = yield* Effect.try(() =>
                                JSON.parse(id)
                            )
                            const input = yield* Schema.decodeUnknownEffect(
                                DomainSocialAnalytics.Input
                            )(parsed)
                            if (input.domain_id !== principal.domain_id)
                                return yield* Effect.fail(failure())
                            const repository = yield* SocialRepository
                            return {
                                id,
                                values: {
                                    id,
                                    snapshot: yield* repository.load_analytics(
                                        principal,
                                        input.period,
                                        input.platform,
                                        input.account_id
                                    ),
                                },
                            }
                        })
                    ).pipe(Effect.mapError(failure)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            DomainSocialAccounts,
            ({
                input,
                principal,
            }: {
                input: typeof DomainSocialAccounts.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    yield* load(principal)
                    return {
                        edges: [
                            {
                                entity: SocialAccountsEntity.name,
                                id: input.domain_id,
                                key: entityKey(
                                    SocialAccountsEntity.name,
                                    input.domain_id
                                ),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.query(
            DomainSocialPosts,
            ({
                input,
                principal,
            }: {
                input: typeof DomainSocialPosts.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    yield* repository.load_posts(principal)
                    return {
                        edges: [
                            {
                                entity: SocialPostsEntity.name,
                                id: input.domain_id,
                                key: entityKey(
                                    SocialPostsEntity.name,
                                    input.domain_id
                                ),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.query(
            DomainSocialTemplates,
            ({
                input,
                principal,
            }: {
                input: typeof DomainSocialTemplates.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    yield* repository.load_templates(principal)
                    return {
                        edges: [
                            {
                                entity: SocialTemplatesEntity.name,
                                id: input.domain_id,
                                key: entityKey(
                                    SocialTemplatesEntity.name,
                                    input.domain_id
                                ),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.query(
            DomainSocialAnalytics,
            ({
                input,
                principal,
            }: {
                input: typeof DomainSocialAnalytics.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    yield* repository.load_analytics(
                        principal,
                        input.period,
                        input.platform,
                        input.account_id
                    )
                    const id = analytics_key(input)
                    return {
                        edges: [
                            {
                                entity: SocialAnalyticsEntity.name,
                                id,
                                key: entityKey(SocialAnalyticsEntity.name, id),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
    mutations: [
        RemoteServer.mutation(
            SyncSocialAccounts,
            ({
                input,
                principal,
            }: {
                input: typeof SyncSocialAccounts.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    const accounts = yield* repository.sync_accounts(principal)
                    return {
                        output: { domain_id: principal.domain_id },
                        entities: [
                            Entity.patch(
                                SocialAccountsEntity.ref(principal.domain_id),
                                record(principal.domain_id, accounts)
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            ConnectSocialAccount,
            ({
                input,
                principal,
            }: {
                input: typeof ConnectSocialAccount.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    const connection = yield* repository.connect_account(
                        principal,
                        input.platform
                    )
                    return {
                        output: { auth_url: connection.auth_url },
                        entities: [],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            SaveSocialTemplate,
            ({
                input,
                principal,
            }: {
                input: typeof SaveSocialTemplate.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    const saved = yield* repository.save_template(principal, {
                        template_id: input.template_id,
                        expected_revision: input.expected_revision,
                        name: input.name,
                        description: input.description,
                        tags: input.tags,
                        content: input.content,
                    })
                    const templates =
                        yield* repository.load_templates(principal)
                    return {
                        output: { template_id: saved.id },
                        entities: [
                            Entity.patch(
                                SocialTemplatesEntity.ref(principal.domain_id),
                                template_record(principal.domain_id, templates)
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            RefreshSocialAnalytics,
            ({
                input,
                principal,
            }: {
                input: typeof RefreshSocialAnalytics.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    const snapshot = yield* repository.refresh_analytics(
                        principal,
                        input.period,
                        input.platform,
                        input.account_id
                    )
                    const id = analytics_key(input)
                    return {
                        output: { domain_id: principal.domain_id },
                        entities: [
                            Entity.patch(SocialAnalyticsEntity.ref(id), {
                                id,
                                snapshot,
                            }),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            SubmitSocialPost,
            ({
                input,
                principal,
            }: {
                input: typeof SubmitSocialPost.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    const result = yield* repository.submit_post(principal, {
                        idempotency_key: input.idempotency_key,
                        account_ids: input.account_ids,
                        media_ids: input.media_ids,
                        content: input.content,
                        scheduled_for: input.scheduled_for,
                        publication_mode: input.publication_mode,
                        template_id: input.template_id,
                    })
                    const posts = yield* repository.load_posts(principal)
                    return {
                        output: {
                            post_id: result.post_id,
                            status: result.status,
                        },
                        entities: [
                            Entity.patch(
                                SocialPostsEntity.ref(principal.domain_id),
                                post_record(principal.domain_id, posts)
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            PublishSocialDraft,
            ({
                input,
                principal,
            }: {
                input: typeof PublishSocialDraft.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    const result = yield* repository.publish_draft(
                        principal,
                        input.post_id
                    )
                    const posts = yield* repository.load_posts(principal)
                    return {
                        output: result,
                        entities: [
                            Entity.patch(
                                SocialPostsEntity.ref(principal.domain_id),
                                post_record(principal.domain_id, posts)
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            DeleteSocialPost,
            ({
                input,
                principal,
            }: {
                input: typeof DeleteSocialPost.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    const result = yield* repository.delete_post(
                        principal,
                        input.post_id
                    )
                    const posts = yield* repository.load_posts(principal)
                    return {
                        output: result,
                        entities: [
                            Entity.patch(
                                SocialPostsEntity.ref(principal.domain_id),
                                post_record(principal.domain_id, posts)
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            CancelSocialPost,
            ({
                input,
                principal,
            }: {
                input: typeof CancelSocialPost.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    const result = yield* repository.cancel_post(
                        principal,
                        input.post_id
                    )
                    const posts = yield* repository.load_posts(principal)
                    return {
                        output: {
                            post_id: result.post_id,
                            status: result.status,
                        },
                        entities: [
                            Entity.patch(
                                SocialPostsEntity.ref(principal.domain_id),
                                post_record(principal.domain_id, posts)
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            UpdateSocialDraft,
            ({
                input,
                principal,
            }: {
                input: typeof UpdateSocialDraft.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    const result = yield* repository.update_draft(
                        principal,
                        input.post_id,
                        {
                            account_ids: input.account_ids,
                            media_ids: input.media_ids,
                            content: input.content,
                        }
                    )
                    const posts = yield* repository.load_posts(principal)
                    return {
                        output: {
                            post_id: result.post_id,
                            status: result.status,
                        },
                        entities: [
                            Entity.patch(
                                SocialPostsEntity.ref(principal.domain_id),
                                post_record(principal.domain_id, posts)
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            ReconcileSocialPost,
            ({
                input,
                principal,
            }: {
                input: typeof ReconcileSocialPost.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    const result = yield* repository.reconcile_post(
                        principal,
                        input.post_id
                    )
                    const posts = yield* repository.load_posts(principal)
                    return {
                        output: result,
                        entities: [
                            Entity.patch(
                                SocialPostsEntity.ref(principal.domain_id),
                                post_record(principal.domain_id, posts)
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            RetrySocialDraftEdit,
            ({
                input,
                principal,
            }: {
                input: typeof RetrySocialDraftEdit.Input.Type
                principal: SocialPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    const repository = yield* SocialRepository
                    const result = yield* repository.retry_draft_edit(
                        principal,
                        input.post_id
                    )
                    const posts = yield* repository.load_posts(principal)
                    return {
                        output: result,
                        entities: [
                            Entity.patch(
                                SocialPostsEntity.ref(principal.domain_id),
                                post_record(principal.domain_id, posts)
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(SocialRemote, SocialServer)
