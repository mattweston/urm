import { Option, Schema as S } from "effect"
import { Calendar } from "foldkit"
import { describe, expect, test } from "vitest"

import {
    SocialAccount,
    SocialAnalyticsSnapshot,
    SocialPost,
} from "@urm/contracts/social"
import { DomainId } from "../domains/domain-record.ts"
import { Image } from "../design/records.ts"

import * as DesktopSocial from "./submodel.ts"

const domain_id = S.decodeUnknownSync(DomainId)(
    "j1700000000000000000000000000001"
)
const social_template_id = "j8700000000000000000000000000001"
const account = S.decodeUnknownSync(SocialAccount)({
    account_id: "facebook-account-1",
    platform: "facebook",
    username: "urm-studio",
    display_name: "URM Studio",
    avatar_url: null,
    active: true,
    synced_at: 1,
})
const post = S.decodeUnknownSync(SocialPost)({
    post_id: "post-1",
    status: "draft",
    content: "A test-mode post",
    account_ids: ["facebook-account-1"],
    media_ids: [],
    media_urls: [],
    platforms: [],
    scheduled_for: null,
    error_message: null,
    test_mode: true,
    template_source: null,
    pending_draft_edit: false,
    created_at: 2,
})
const stored_url =
    "https://fly.storage.tigris.dev/urm-dev/domains/j1700000000000000000000000000001/gallery/social-image"
const image = S.decodeUnknownSync(Image)({
    _creationTime: 1,
    _id: "ja700000000000000000000000000001",
    domain_id,
    url: stored_url,
    alt: "Social image",
    text: "",
    category: "Editorial",
    order_position: 0,
    updated_at: 1,
})
const post_with_media = S.decodeUnknownSync(SocialPost)({
    ...post,
    media_urls: [stored_url],
})
const analytics_snapshot = S.decodeUnknownSync(SocialAnalyticsSnapshot)({
    period: "7d",
    platform: "facebook",
    account_id: account.account_id,
    post_count: 1,
    metrics: {
        impressions: 100,
        reach: 80,
        likes: 10,
        comments: 2,
        shares: 1,
        saves: 3,
        clicks: 4,
        views: 50,
        engagement: 20,
    },
    follower_growth: 5,
    daily: [],
    platform_breakdown: [],
    top_posts: [],
    warning: null,
    updated_at: 3,
})

describe("desktop social adapter", () => {
    test("maps canonical Social item routes to provider post ids", () => {
        expect(
            DesktopSocial.content_social_post_id_for_path(
                "/content/social/post-1"
            )
        ).toEqual(Option.some("post-1"))
        expect(
            Option.isNone(
                DesktopSocial.content_social_post_id_for_path(
                    "/content/web/post-1"
                )
            )
        ).toBe(true)
        expect(
            DesktopSocial.content_social_post_id_for_path("/content/social/new")
        ).toEqual(Option.some("new"))
    })

    test("opens the existing draft composer when canonical edit mode is requested", () => {
        const [loaded] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.loaded_posts([post]),
            Option.some(domain_id)
        )
        const [editing] = DesktopSocial.changed_content_url(
            loaded,
            "/content/social/post-1",
            "?mode=edit",
            Option.some(domain_id)
        )
        const [viewing] = DesktopSocial.changed_content_url(
            loaded,
            "/content/social/post-1",
            "",
            Option.some(domain_id)
        )

        expect(editing.editing_post_id).toBe(post.post_id)
        expect(editing.content).toBe(post.content)
        expect(viewing.editing_post_id).toBeNull()
    })

    test("leaving an edit route starts a new draft instead of editing the old one", () => {
        const [loaded] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.loaded_posts([post]),
            Option.some(domain_id)
        )
        const [editing] = DesktopSocial.changed_content_url(
            loaded,
            "/content/social/post-1",
            "?mode=edit",
            Option.some(domain_id)
        )
        const [fresh] = DesktopSocial.changed_content_url(
            editing,
            "/content/social/new",
            "",
            Option.some(domain_id)
        )
        expect(fresh.editing_post_id).toBeNull()
        expect(fresh.content).toBe("")
        const [saving, commands] = DesktopSocial.update(
            {
                ...fresh,
                content: "New post",
                selected_account_ids: [account.account_id],
            },
            DesktopSocial.Message.make({ _tag: "SubmittedPost" }),
            Option.some(domain_id)
        )
        expect(saving.operation._tag).toBe("Submitting")
        expect(commands.map((command) => command.name)).toEqual([
            "ScheduleDesktopSocialPost",
        ])
    })

    test("translates account sync to the active domain", () => {
        const [, commands] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.Message.make({ _tag: "ClickedSyncAccounts" }),
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("SyncDesktopSocialAccounts")
        expect(commands[0]?.args).toEqual({ domain_id })
    })

    test("translates Instagram connection to the active domain", () => {
        const [, commands] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.Message.make({
                _tag: "ClickedConnectAccount",
                platform: "instagram",
            }),
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("ConnectDesktopSocialAccount")
        expect(commands[0]?.args).toEqual({
            domain_id,
            platform: "instagram",
        })
    })

    test("maps a reactive account snapshot into the shared model", () => {
        const [model] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.loaded([
                {
                    ...account,
                    display_name: account.display_name ?? null,
                    avatar_url: account.avatar_url ?? null,
                },
            ]),
            Option.some(domain_id)
        )

        expect(model.accounts).toEqual({
            _tag: "Ready",
            accounts: [
                {
                    account_id: account.account_id,
                    platform: account.platform,
                    username: account.username,
                    display_name: account.display_name,
                    active: account.active,
                    synced_at: account.synced_at,
                },
            ],
        })
    })

    test("submits selected accounts as a provider draft", () => {
        const [with_account] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.Message.make({
                _tag: "ToggledPostAccount",
                account_id: account.account_id,
            }),
            Option.some(domain_id)
        )
        const [with_content] = DesktopSocial.update(
            with_account,
            DesktopSocial.Message.make({
                _tag: "ChangedPostContent",
                value: "A test-mode post",
            }),
            Option.some(domain_id)
        )
        const [, commands] = DesktopSocial.update(
            with_content,
            DesktopSocial.Message.make({ _tag: "SubmittedPost" }),
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("ScheduleDesktopSocialPost")
        expect(commands[0]?.args).toMatchObject({
            domain_id,
            account_ids: [account.account_id],
            media_ids: [],
            content: "A test-mode post",
            scheduled_for: null,
            publication_mode: "draft",
            template_id: null,
        })
        expect(commands[0]?.args?.idempotency_key).toMatch(/^social:/)
    })

    test("maps reactive provider drafts into the shared model", () => {
        const [model] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.loaded_posts([post]),
            Option.some(domain_id)
        )

        expect(model.posts).toEqual({
            _tag: "Ready",
            posts: [post],
        })
    })

    test("seeds a new unsaved composer without retaining delivery state", () => {
        const [loaded] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.loaded_posts([post]),
            Option.some(domain_id)
        )
        const [editing] = DesktopSocial.update(
            loaded,
            DesktopSocial.Message.make({
                _tag: "ClickedEditPost",
                post_id: post.post_id,
            }),
            Option.some(domain_id)
        )
        expect(editing.selected_account_ids).toEqual([account.account_id])
        const template_content = "A reusable caption"
        const [seeded, commands] = DesktopSocial.update(
            editing,
            DesktopSocial.selected_template(
                social_template_id,
                template_content
            ),
            Option.some(domain_id)
        )

        expect(seeded.content).toBe(template_content)
        expect(seeded.editing_post_id).toBeNull()
        expect(seeded.creation_template_id).toBe(social_template_id)
        expect(seeded.selected_account_ids).toEqual([])
        expect(seeded.selected_media_ids).toEqual([])
        expect(Option.isNone(seeded.schedule_date)).toBe(true)
        expect(seeded.pending_publication).toBeNull()
        expect(commands).toEqual([])

        const [with_account] = DesktopSocial.update(
            seeded,
            DesktopSocial.Message.make({
                _tag: "ToggledPostAccount",
                account_id: account.account_id,
            }),
            Option.some(domain_id)
        )
        const [, submit_commands] = DesktopSocial.update(
            with_account,
            DesktopSocial.Message.make({ _tag: "SubmittedPost" }),
            Option.some(domain_id)
        )
        expect(submit_commands[0]?.args).toMatchObject({
            template_id: social_template_id,
        })
    })

    test("saves portable caption content without provider delivery fields", () => {
        const [with_content] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.Message.make({
                _tag: "ChangedPostContent",
                value: "A reusable caption",
            }),
            Option.some(domain_id)
        )
        const [with_name] = DesktopSocial.update(
            with_content,
            DesktopSocial.Message.make({
                _tag: "ChangedSocialTemplateMetadata",
                field: "name",
                value: "Launch announcement",
            }),
            Option.some(domain_id)
        )
        const [, commands] = DesktopSocial.update(
            with_name,
            DesktopSocial.Message.make({
                _tag: "SubmittedSocialTemplate",
            }),
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("SaveDesktopSocialTemplate")
        expect(commands[0]?.args).toEqual({
            domain_id,
            template_id: null,
            expected_revision: 0,
            name: "Launch announcement",
            description: "Reusable social post template.",
            tags: [],
            content: "A reusable caption",
        })
        expect(commands[0]?.args).not.toHaveProperty("account_ids")
        expect(commands[0]?.args).not.toHaveProperty("media_ids")
        expect(commands[0]?.args).not.toHaveProperty("scheduled_for")
        expect(commands[0]?.args).not.toHaveProperty("publication_mode")
    })

    test("refreshes analytics for the selected filters", () => {
        const [with_period] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.Message.make({
                _tag: "ChangedAnalyticsPeriod",
                value: "7d",
            }),
            Option.some(domain_id)
        )
        const [with_platform] = DesktopSocial.update(
            with_period,
            DesktopSocial.Message.make({
                _tag: "ChangedAnalyticsPlatform",
                value: "facebook",
            }),
            Option.some(domain_id)
        )
        const [with_account] = DesktopSocial.update(
            with_platform,
            DesktopSocial.Message.make({
                _tag: "ChangedAnalyticsAccount",
                value: account.account_id,
            }),
            Option.some(domain_id)
        )
        const [refreshing, commands] = DesktopSocial.update(
            with_account,
            DesktopSocial.Message.make({ _tag: "ClickedRefreshAnalytics" }),
            Option.some(domain_id)
        )

        expect(refreshing.analytics_refreshing).toBe(true)
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("RefreshDesktopSocialAnalytics")
        expect(commands[0]?.args).toEqual({
            domain_id,
            period: "7d",
            platform: "facebook",
            account_id: account.account_id,
        })
    })

    test("maps a cached analytics snapshot into the shared model", () => {
        const [model] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.loaded_analytics(analytics_snapshot),
            Option.some(domain_id)
        )

        expect(model.analytics).toEqual({
            _tag: "Ready",
            snapshot: analytics_snapshot,
        })
    })

    test("loads and submits a saved draft as an update", () => {
        const [loaded] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.loaded_posts([post]),
            Option.some(domain_id)
        )
        const [editing] = DesktopSocial.update(
            loaded,
            DesktopSocial.Message.make({
                _tag: "ClickedEditPost",
                post_id: post.post_id,
            }),
            Option.some(domain_id)
        )
        const [changed] = DesktopSocial.update(
            editing,
            DesktopSocial.Message.make({
                _tag: "ChangedPostContent",
                value: "Updated test-mode post",
            }),
            Option.some(domain_id)
        )
        const [, commands] = DesktopSocial.update(
            changed,
            DesktopSocial.Message.make({ _tag: "SubmittedPost" }),
            Option.some(domain_id)
        )

        expect(editing.editing_post_id).toBe(post.post_id)
        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("UpdateDesktopSocialPost")
        expect(commands[0]?.args).toEqual({
            domain_id,
            post_id: post.post_id,
            account_ids: post.account_ids,
            media_ids: [],
            content: "Updated test-mode post",
            scheduled_for: null,
            publication_mode: "draft",
        })
    })

    test("requires confirmation before publishing immediately", () => {
        const [with_account] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.Message.make({
                _tag: "ToggledPostAccount",
                account_id: account.account_id,
            }),
            Option.some(domain_id)
        )
        const [with_content] = DesktopSocial.update(
            with_account,
            DesktopSocial.Message.make({
                _tag: "ChangedPostContent",
                value: "A live post",
            }),
            Option.some(domain_id)
        )
        const [confirming, request_commands] = DesktopSocial.update(
            with_content,
            DesktopSocial.Message.make({
                _tag: "ClickedRequestPublication",
                publication_mode: "publish_now",
            }),
            Option.some(domain_id)
        )

        expect(confirming.pending_publication).toBe("publish_now")
        expect(request_commands).toEqual([])

        const [, commands] = DesktopSocial.update(
            confirming,
            DesktopSocial.Message.make({
                _tag: "ClickedConfirmPublication",
            }),
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.name).toBe("ScheduleDesktopSocialPost")
        expect(commands[0]?.args).toMatchObject({
            domain_id,
            publication_mode: "publish_now",
            scheduled_for: null,
        })
    })

    test("requires confirmation before scheduling live delivery", () => {
        const future_date = new Date(Date.now() + 24 * 60 * 60 * 1_000)
        const schedule_date = S.decodeUnknownSync(Calendar.CalendarDate)({
            year: future_date.getFullYear(),
            month: future_date.getMonth() + 1,
            day: future_date.getDate(),
        })
        const schedule_time = `${String(future_date.getHours()).padStart(2, "0")}:${String(future_date.getMinutes()).padStart(2, "0")}`
        const [with_account] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.Message.make({
                _tag: "ToggledPostAccount",
                account_id: account.account_id,
            }),
            Option.some(domain_id)
        )
        const [with_content] = DesktopSocial.update(
            with_account,
            DesktopSocial.Message.make({
                _tag: "ChangedPostContent",
                value: "A scheduled post",
            }),
            Option.some(domain_id)
        )
        const [with_date] = DesktopSocial.update(
            with_content,
            DesktopSocial.Message.make({
                _tag: "GotScheduleDatePickerMessage",
                message: {
                    _tag: "RequestedSelectDate",
                    date: schedule_date,
                },
            }),
            Option.some(domain_id)
        )
        const [with_schedule_hour] = DesktopSocial.update(
            with_date,
            DesktopSocial.Message.make({
                _tag: "GotScheduleTimePickerMessage",
                message: {
                    _tag: "ChangedHour",
                    value: schedule_time.slice(0, 2),
                },
            }),
            Option.some(domain_id)
        )
        const [with_schedule] = DesktopSocial.update(
            with_schedule_hour,
            DesktopSocial.Message.make({
                _tag: "GotScheduleTimePickerMessage",
                message: {
                    _tag: "ChangedMinute",
                    value: schedule_time.slice(3, 5),
                },
            }),
            Option.some(domain_id)
        )
        const [confirming, request_commands] = DesktopSocial.update(
            with_schedule,
            DesktopSocial.Message.make({
                _tag: "ClickedRequestPublication",
                publication_mode: "schedule",
            }),
            Option.some(domain_id)
        )

        expect(confirming.pending_publication).toBe("schedule")
        expect(request_commands).toEqual([])

        const [, commands] = DesktopSocial.update(
            confirming,
            DesktopSocial.Message.make({
                _tag: "ClickedConfirmPublication",
            }),
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(1)
        expect(commands[0]?.args).toMatchObject({
            domain_id,
            publication_mode: "schedule",
        })
        expect(commands[0]?.args?.scheduled_for).toBeGreaterThan(Date.now())
    })

    test("accepts PostgreSQL media-library images without a legacy command", () => {
        const [model, commands] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.loaded_media([{ ...image, id: String(image._id) }]),
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(0)
        expect(model.media).toEqual({
            _tag: "Ready",
            images: [
                {
                    image_id: String(image._id),
                    url: `/image-url?url=${encodeURIComponent(stored_url)}`,
                    alt: image.alt,
                },
            ],
        })
    })

    test("shows private post media through the image URL endpoint", () => {
        const [loaded, commands] = DesktopSocial.update(
            DesktopSocial.init(),
            DesktopSocial.loaded_posts([post_with_media]),
            Option.some(domain_id)
        )

        expect(commands).toHaveLength(0)
        expect(loaded.posts).toEqual({
            _tag: "Ready",
            posts: [
                {
                    ...post_with_media,
                    media_urls: [
                        `/image-url?url=${encodeURIComponent(stored_url)}`,
                    ],
                },
            ],
        })
    })
})
