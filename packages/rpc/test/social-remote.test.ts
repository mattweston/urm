import { Effect, Layer } from "effect"
import { REMOTE_PROTOCOL_VERSION } from "foldkit-remote"
import { RemoteServer } from "foldkit-remote-server"
import { describe, expect, it } from "vitest"
import { SocialRepository } from "../src/handlers/social/repository.ts"
import { SocialServer } from "../src/handlers/social/remote.ts"

const principal = {
    account_id: "account-one",
    contact_id: null,
    session_id: "session-one",
    domain_id: "domain-one",
}
const accounts = [
    {
        domain_id: "domain-one",
        account_id: "provider-one",
        provider_profile_id: "profile-one",
        platform: "facebook",
        username: "example",
        display_name: null,
        avatar_url: null,
        active: true,
        synced_at: 1,
    },
]
const repository = Layer.succeed(
    SocialRepository,
    SocialRepository.of({
        load_accounts: () => Effect.succeed(accounts),
        load_posts: () => Effect.succeed([]),
        load_templates: () => Effect.succeed([]),
        save_template: () =>
            Effect.succeed({
                id: "template-one",
                organization_id: "org-one",
                name: "Template",
                description: "",
                tags: [],
                content: "Hello",
                revision: 1,
                created_by_user_id: "account-one",
                updated_by_user_id: "account-one",
                created_at: 1,
                updated_at: 1,
            }),
        load_analytics: () => Effect.succeed(null),
        refresh_analytics: () =>
            Effect.succeed({
                period: "7d",
                platform: "all",
                account_id: null,
                post_count: 0,
                metrics: {
                    impressions: 0,
                    reach: 0,
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    saves: 0,
                    clicks: 0,
                    views: 0,
                    engagement: 0,
                },
                follower_growth: 0,
                daily: [],
                platform_breakdown: [],
                top_posts: [],
                warning: null,
                updated_at: 1,
            }),
        sync_accounts: () => Effect.succeed(accounts),
        connect_account: () =>
            Effect.succeed({
                auth_url: "https://zernio.com/connect/example",
                profile_id: "profile-one",
            }),
        submit_post: () =>
            Effect.succeed({
                post_id: "post-one",
                status: "draft",
                duplicate: false,
                profile_id: "profile-one",
            }),
        publish_draft: () =>
            Effect.succeed({
                post_id: "post-one",
                status: "published",
                resolved: true,
            }),
        cancel_post: () =>
            Effect.succeed({
                post_id: "post-one",
                status: "cancelled",
                cancelled: true,
            }),
        delete_post: () => Effect.succeed({ post_id: "post-one" }),
        update_draft: () =>
            Effect.succeed({ post_id: "post-one", status: "draft" }),
        reconcile_post: () =>
            Effect.succeed({
                post_id: "post-one",
                status: "draft",
                resolved: true,
            }),
        retry_draft_edit: () =>
            Effect.succeed({ post_id: "post-one", status: "draft" }),
    })
)
const handlers = RemoteServer.handlers(SocialServer, principal)

describe("Social Remote account boundary", () => {
    it("reads accounts only for the active workspace", async () => {
        const read = await Effect.runPromise(
            handlers
                .FoldkitRemoteRead({
                    version: REMOTE_PROTOCOL_VERSION,
                    requests: [
                        {
                            entity: "SocialAccounts",
                            id: "domain-one",
                            fields: ["id", "accounts"],
                        },
                    ],
                })
                .pipe(Effect.provide(repository))
        )
        expect(JSON.stringify(read)).toContain("provider-one")
        const foreign = await Effect.runPromise(
            handlers
                .FoldkitRemoteRead({
                    version: REMOTE_PROTOCOL_VERSION,
                    requests: [
                        {
                            entity: "SocialAccounts",
                            id: "domain-two",
                            fields: ["id", "accounts"],
                        },
                    ],
                })
                .pipe(Effect.result, Effect.provide(repository))
        )
        expect(foreign._tag).toBe("Failure")
    })

    it("starts connection through a domain-scoped mutation", async () => {
        const connected = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "connect-one",
                    mutation: "ConnectSocialAccount",
                    input: {
                        domain_id: "domain-one",
                        platform: "facebook",
                    },
                })
                .pipe(Effect.provide(repository))
        )
        expect(JSON.stringify(connected)).toContain(
            "https://zernio.com/connect/example"
        )
        const foreign = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "connect-foreign",
                    mutation: "ConnectSocialAccount",
                    input: {
                        domain_id: "domain-two",
                        platform: "facebook",
                    },
                })
                .pipe(Effect.result, Effect.provide(repository))
        )
        expect(foreign._tag).toBe("Failure")
    })

    it("publishes a saved draft only within the active workspace", async () => {
        const published = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "publish-draft-one",
                    mutation: "PublishSocialDraft",
                    input: { domain_id: "domain-one", post_id: "post-one" },
                })
                .pipe(Effect.provide(repository))
        )
        expect(JSON.stringify(published)).toContain("published")
        const foreign = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "publish-draft-foreign",
                    mutation: "PublishSocialDraft",
                    input: { domain_id: "domain-two", post_id: "post-one" },
                })
                .pipe(Effect.result, Effect.provide(repository))
        )
        expect(foreign._tag).toBe("Failure")
    })

    it("deletes a post only within the active workspace", async () => {
        const deleted = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "delete-post-one",
                    mutation: "DeleteSocialPost",
                    input: { domain_id: "domain-one", post_id: "post-one" },
                })
                .pipe(Effect.provide(repository))
        )
        expect(JSON.stringify(deleted)).toContain("post-one")
        const foreign = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "delete-post-foreign",
                    mutation: "DeleteSocialPost",
                    input: { domain_id: "domain-two", post_id: "post-one" },
                })
                .pipe(Effect.result, Effect.provide(repository))
        )
        expect(foreign._tag).toBe("Failure")
    })

    it("saves templates only in the active workspace", async () => {
        const input = {
            domain_id: "domain-one",
            template_id: null,
            expected_revision: 0,
            name: "Template",
            description: "",
            tags: [],
            content: "Hello",
        }
        const saved = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "save-template",
                    mutation: "SaveSocialTemplate",
                    input,
                })
                .pipe(Effect.provide(repository))
        )
        expect(JSON.stringify(saved)).toContain("template-one")
        const foreign = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "foreign-template",
                    mutation: "SaveSocialTemplate",
                    input: { ...input, domain_id: "domain-two" },
                })
                .pipe(Effect.result, Effect.provide(repository))
        )
        expect(foreign._tag).toBe("Failure")
    })

    it("rejects post writes for a different workspace", async () => {
        const submitted = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "submit-draft",
                    mutation: "SubmitSocialPost",
                    input: {
                        domain_id: "domain-one",
                        idempotency_key: "draft-one",
                        account_ids: ["provider-one"],
                        media_ids: [],
                        content: "Hello",
                        scheduled_for: null,
                        publication_mode: "draft",
                        template_id: null,
                    },
                })
                .pipe(Effect.provide(repository))
        )
        expect(JSON.stringify(submitted)).toContain("post-one")
        const foreign = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "cancel-foreign",
                    mutation: "CancelSocialPost",
                    input: {
                        domain_id: "domain-two",
                        post_id: "post-one",
                    },
                })
                .pipe(Effect.result, Effect.provide(repository))
        )
        expect(foreign._tag).toBe("Failure")
    })
})
