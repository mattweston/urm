import { describe, expect, test } from "vitest"
import {
    ClickedCheckPostStatus,
    ClickedConfirmPublishDraft,
    ClickedRequestPublishDraft,
    ClickedRequestDeletePost,
    ClickedConfirmDeletePost,
    LoadedPosts,
    LoadedMedia,
    FailedLoadingMediaImage,
    ToggledPostMedia,
    SucceededPublishDraft,
    SucceededCheckPostStatus,
    type Model,
    type Post,
    init,
    update,
} from "./submodel.ts"

const draft: Post = {
    post_id: "post-one",
    status: "draft",
    content: "Test draft",
    account_ids: ["account-one"],
    media_ids: [],
    media_urls: [],
    platforms: [
        { platform: "facebook", account_id: "account-one", status: "draft" },
    ],
    scheduled_for: null,
    error_message: null,
    pending_draft_edit: false,
    test_mode: true,
    template_source: null,
    created_at: 1,
}

describe("Social draft publishing", () => {
    test("requires confirmation before issuing the publish command", () => {
        const initial: Model = {
            ...init(),
            posts: { _tag: "Ready", posts: [draft] },
        }
        const [requested, first_commands] = update(
            initial,
            ClickedRequestPublishDraft({ post_id: draft.post_id })
        )
        expect(requested.pending_publish_post_id).toBe(draft.post_id)
        expect(first_commands).toEqual([])
        const [confirmed, commands] = update(
            requested,
            ClickedConfirmPublishDraft()
        )
        expect(confirmed.pending_publish_post_id).toBe(null)
        expect(commands.map((command) => command.name)).toEqual([
            "PublishSocialDraft",
        ])
    })

    test("shows the provider status returned by Check status", () => {
        const [checking] = update(
            init(),
            ClickedCheckPostStatus({ post_id: draft.post_id })
        )
        expect(checking.operation._tag).toBe("Checking")
        const [checked] = update(
            checking,
            SucceededCheckPostStatus({
                post_id: draft.post_id,
                status: "failed",
                resolved: true,
            })
        )
        expect(checked.checked_post).toEqual({
            post_id: draft.post_id,
            status: "failed",
            resolved: true,
        })
    })

    test("clears an open editor when its draft is published", () => {
        const editing: Model = {
            ...init(),
            posts: { _tag: "Ready", posts: [draft] },
            editing_post_id: draft.post_id,
            content: draft.content,
        }
        const [published] = update(
            editing,
            SucceededPublishDraft({
                post_id: draft.post_id,
                status: "published",
                resolved: true,
            })
        )
        expect(published.editing_post_id).toBeNull()
        expect(published.content).toBe("")
        const [loaded] = update(
            editing,
            LoadedPosts({ posts: [{ ...draft, status: "published" }] })
        )
        expect(loaded.editing_post_id).toBeNull()
    })
})

describe("Social post deletion", () => {
    test("requires confirmation before deleting a saved draft", () => {
        const initial: Model = {
            ...init(),
            posts: { _tag: "Ready", posts: [draft] },
        }
        const [requested, initial_commands] = update(
            initial,
            ClickedRequestDeletePost({ post_id: draft.post_id })
        )
        expect(initial_commands).toEqual([])
        expect(requested.pending_delete_post_id).toBe(draft.post_id)
        const [deleting, commands] = update(
            requested,
            ClickedConfirmDeletePost()
        )
        expect(deleting.operation._tag).toBe("Deleting")
        expect(commands.map((command) => command.name)).toEqual([
            "DeleteSocialPost",
        ])
    })
})

describe("Social Media availability", () => {
    test("removes an unavailable image from the selection", () => {
        const [loaded] = update(
            init(),
            LoadedMedia({
                images: [
                    {
                        image_id: "missing",
                        url: "/image-url?url=missing",
                        alt: "Missing",
                    },
                ],
            })
        )
        const [selected] = update(
            loaded,
            ToggledPostMedia({ image_id: "missing" })
        )
        expect(selected.selected_media_ids).toEqual(["missing"])
        const [failed] = update(
            selected,
            FailedLoadingMediaImage({ image_id: "missing" })
        )
        expect(failed.selected_media_ids).toEqual([])
        expect(failed.unavailable_media_ids).toEqual(["missing"])
        const [retry] = update(
            failed,
            ToggledPostMedia({ image_id: "missing" })
        )
        expect(retry.selected_media_ids).toEqual([])
    })
})
