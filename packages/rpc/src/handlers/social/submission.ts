import { createHash } from "node:crypto"
import { Cause, Context, Effect, Layer, Schema } from "effect"
import { requiresImageUrlProxy } from "@urm/utils/media"
import { putPublicUploadObject, readUploadObject } from "@urm/utils/upload"
import { ZernioProvider, ZernioProviderError } from "./provider.ts"
import {
    SocialStore,
    type ReservePostInput,
    type SocialPrincipal,
    type UpdateDraftInput,
} from "./store.ts"

export class SocialSubmissionError extends Schema.TaggedError<SocialSubmissionError>()(
    "SocialSubmissionError",
    { message: Schema.String, uncertain: Schema.Boolean }
) {}

const private_media_key = (stored_url: string, domain_id: string) => {
    const prefix = `/api/uploads/${encodeURIComponent(domain_id)}/media/`
    const image_id = stored_url.startsWith(prefix)
        ? stored_url.slice(prefix.length)
        : ""
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        image_id
    )
        ? `domains/${encodeURIComponent(domain_id)}/media/images/${image_id}`
        : null
}

const media_url = Effect.fn("Social.publicMediaUrl")(function* (
    stored_url: string,
    domain_id: string
) {
    const key = private_media_key(stored_url, domain_id)
    if (key !== null) {
        return yield* Effect.tryPromise({
            try: async (signal) => {
                const image = await readUploadObject(key, signal)
                const digest = createHash("sha256")
                    .update(image.bytes)
                    .digest("hex")
                const public_url = await putPublicUploadObject(
                    `public/social-images/${digest}`,
                    image.bytes,
                    image.content_type || "image/jpeg",
                    signal
                )
                const check = await fetch(public_url, {
                    method: "HEAD",
                    signal,
                })
                if (!check.ok)
                    throw new Error("Published image is not publicly readable")
                return public_url
            },
            catch: () =>
                new SocialSubmissionError({
                    message:
                        "The selected image is not publicly reachable. Check storage access and try again.",
                    uncertain: false,
                }),
        })
    }
    if (
        requiresImageUrlProxy(stored_url) ||
        stored_url.startsWith("/api/uploads/")
    )
        return yield* Effect.fail(
            new SocialSubmissionError({
                message:
                    "This image uses an older private URL. Reupload it to Media before posting.",
                uncertain: false,
            })
        )
    if (stored_url.startsWith("https://")) return stored_url
    return yield* Effect.fail(
        new SocialSubmissionError({
            message: "The selected image is unavailable",
            uncertain: false,
        })
    )
})

const provider_status = (
    status: string
):
    | "draft"
    | "scheduled"
    | "published"
    | "partial"
    | "failed"
    | "cancelled"
    | "submitting" =>
    status === "publishing"
        ? "submitting"
        : status === "draft" ||
            status === "scheduled" ||
            status === "published" ||
            status === "partial" ||
            status === "failed" ||
            status === "cancelled"
          ? status
          : "submitting"

export const submit_social_post = Effect.fn("Social.submitPost")(function* (
    principal: SocialPrincipal,
    input: ReservePostInput
) {
    const store = yield* SocialStore
    const provider = yield* ZernioProvider
    const reserved = yield* store.reserve_post(principal, input)
    if (!(yield* store.claim_post(principal, reserved.post.id))) {
        return {
            post_id: reserved.post.id,
            status: reserved.post.status,
            duplicate: true,
        }
    }
    const profile_id = yield* store.load_profile(principal)
    if (profile_id === null) {
        yield* store.record_provider_rejection(
            principal.domain_id,
            reserved.post.id,
            "The Social profile is no longer connected"
        )
        return yield* Effect.fail(
            new SocialSubmissionError({
                message: "The Social profile is no longer connected",
                uncertain: false,
            })
        )
    }
    const media_urls = yield* Effect.forEach(reserved.post.media_urls, (url) =>
        media_url(url, principal.domain_id)
    ).pipe(
        Effect.catch((error) =>
            store
                .record_provider_rejection(
                    principal.domain_id,
                    reserved.post.id,
                    error.message
                )
                .pipe(Effect.flatMap(() => Effect.fail(error)))
        )
    )
    const outcome = yield* provider
        .create_post({
            request_id: reserved.post.id,
            local_post_id: reserved.post.id,
            content: reserved.post.content,
            platforms: reserved.post.platforms.map((target) => ({
                platform: target.platform,
                account_id: target.account_id,
            })),
            media_urls,
            mode: input.publication_mode,
            scheduled_for: reserved.post.scheduled_for,
        })
        .pipe(Effect.exit)
    if (outcome._tag === "Failure") {
        const failure = outcome.cause.reasons.find(Cause.isFailReason)?.error
        const message =
            failure instanceof ZernioProviderError
                ? failure.message
                : "Zernio did not confirm the post"
        const status =
            failure instanceof ZernioProviderError ? failure.status : null
        const definitive =
            status !== null && status >= 400 && status < 500 && status !== 429
        if (definitive)
            yield* store.record_provider_rejection(
                principal.domain_id,
                reserved.post.id,
                message
            )
        else
            yield* store.record_uncertain_result(
                principal.domain_id,
                reserved.post.id
            )
        return yield* Effect.fail(
            new SocialSubmissionError({
                message: definitive
                    ? message
                    : "Zernio's response is uncertain. Check the post status before retrying.",
                uncertain: !definitive,
            })
        )
    }
    const post = outcome.value
    yield* store.record_provider_result(
        principal.domain_id,
        reserved.post.id,
        post._id,
        provider_status(post.status)
    )
    return {
        post_id: reserved.post.id,
        status: provider_status(post.status),
        duplicate: reserved.duplicate,
        profile_id,
    }
})

export const reconcile_social_post = Effect.fn("Social.reconcilePost")(
    function* (principal: SocialPrincipal, post_id: string) {
        const store = yield* SocialStore
        const provider = yield* ZernioProvider
        yield* store.authorize_write(principal)
        const post = yield* store.load_post(principal, post_id)
        const profile_id = yield* store.load_profile(principal)
        if (profile_id === null)
            return yield* Effect.fail(
                new SocialSubmissionError({
                    message: "The Social profile is no longer connected",
                    uncertain: false,
                })
            )
        if (
            post.provider_post_id !== null &&
            post.status === "submitting" &&
            (yield* store.has_pending_draft_edit(principal, post.id))
        )
            return { post_id: post.id, status: post.status, resolved: false }
        if (post.provider_post_id !== null) {
            const current = yield* provider.get_post(post.provider_post_id)
            if (
                post.status === "submitting" &&
                post.test_mode &&
                current.status === "draft"
            )
                return {
                    post_id: post.id,
                    status: post.status,
                    resolved: false,
                }
            if (post.status === "submitting" && post.test_mode) {
                const status = provider_status(current.status)
                yield* store.record_draft_publication(
                    principal.domain_id,
                    post.id,
                    current._id,
                    status === "draft" ? "submitting" : status
                )
            } else
                yield* store.refresh_provider_status(
                    principal.domain_id,
                    post.id,
                    current._id,
                    provider_status(current.status)
                )
            return {
                post_id: post.id,
                status: provider_status(current.status),
                resolved: current.status !== "publishing",
            }
        }
        if (post.status !== "submitting")
            return { post_id: post.id, status: post.status, resolved: true }
        const found = yield* provider.find_post_by_local_id(profile_id, post.id)
        if (found === null)
            return { post_id: post.id, status: post.status, resolved: false }
        yield* store.record_provider_result(
            principal.domain_id,
            post.id,
            found._id,
            provider_status(found.status)
        )
        return {
            post_id: post.id,
            status: provider_status(found.status),
            resolved: true,
        }
    }
)

export const publish_social_draft = Effect.fn("Social.publishDraft")(function* (
    principal: SocialPrincipal,
    post_id: string
) {
    const store = yield* SocialStore
    const provider = yield* ZernioProvider
    const claimed = yield* store.claim_draft_publish(principal, post_id)
    if (!claimed.claimed)
        return { post_id, status: "submitting", resolved: false }
    const post = claimed.post
    const provider_post_id = post.provider_post_id
    if (provider_post_id === null)
        return yield* Effect.fail(
            new SocialSubmissionError({
                message: "The saved draft is unavailable",
                uncertain: false,
            })
        )
    const media_urls = yield* Effect.forEach(post.media_urls, (url) =>
        media_url(url, principal.domain_id)
    ).pipe(
        Effect.catch((error) =>
            store
                .reject_draft_publication(
                    principal.domain_id,
                    post_id,
                    provider_post_id,
                    error.message
                )
                .pipe(Effect.flatMap(() => Effect.fail(error)))
        )
    )
    const outcome = yield* provider
        .update_post(provider_post_id, {
            request_id: `${post_id}:publish-draft`,
            local_post_id: post_id,
            content: post.content,
            platforms: post.platforms.map((target) => ({
                platform: target.platform,
                account_id: target.account_id,
            })),
            media_urls,
            mode: "publish_now",
            scheduled_for: null,
        })
        .pipe(Effect.exit)
    if (outcome._tag === "Failure") {
        const failure = outcome.cause.reasons.find(Cause.isFailReason)?.error
        const status =
            failure instanceof ZernioProviderError ? failure.status : null
        const definitive =
            status !== null && status >= 400 && status < 500 && status !== 429
        if (definitive)
            yield* store.reject_draft_publication(
                principal.domain_id,
                post_id,
                provider_post_id,
                failure instanceof ZernioProviderError
                    ? failure.message
                    : "Zernio rejected the draft"
            )
        return yield* Effect.fail(
            new SocialSubmissionError({
                message: definitive
                    ? failure instanceof ZernioProviderError
                        ? failure.message
                        : "Zernio rejected the draft"
                    : "Zernio's response is uncertain. Check the draft status before trying again.",
                uncertain: !definitive,
            })
        )
    }
    if (outcome.value.status === "draft")
        return { post_id, status: "submitting", resolved: false }
    const status = provider_status(outcome.value.status)
    yield* store.record_draft_publication(
        principal.domain_id,
        post_id,
        outcome.value._id,
        status === "draft" ? "submitting" : status
    )
    return { post_id, status, resolved: status !== "submitting" }
})

export const cancel_social_post = Effect.fn("Social.cancelPost")(function* (
    principal: SocialPrincipal,
    post_id: string
) {
    const store = yield* SocialStore
    yield* store.authorize_write(principal)
    const post = yield* store.load_post(principal, post_id)
    if (post.status === "cancelled")
        return { post_id, status: "cancelled", cancelled: false }
    if (post.status !== "draft" && post.status !== "scheduled")
        return yield* Effect.fail(
            new SocialSubmissionError({
                message:
                    "Only saved drafts or scheduled posts can be cancelled",
                uncertain: false,
            })
        )
    if (post.provider_post_id === null)
        return yield* Effect.fail(
            new SocialSubmissionError({
                message: "Wait for the post to finish saving before cancelling",
                uncertain: false,
            })
        )
    const provider = yield* ZernioProvider
    yield* provider
        .delete_post(post.provider_post_id)
        .pipe(
            Effect.catch((error) =>
                error.status === 404 ? Effect.void : Effect.fail(error)
            )
        )
    yield* store
        .mark_cancelled(principal, post_id, post.provider_post_id)
        .pipe(
            Effect.catch((error) =>
                store
                    .load_post(principal, post_id)
                    .pipe(
                        Effect.flatMap((current) =>
                            current.status === "cancelled"
                                ? Effect.void
                                : Effect.fail(error)
                        )
                    )
            )
        )
    return { post_id, status: "cancelled", cancelled: true }
})

export const delete_social_post = Effect.fn("Social.deletePost")(function* (
    principal: SocialPrincipal,
    post_id: string
) {
    const store = yield* SocialStore
    yield* store.authorize_write(principal)
    const post = yield* store.load_post(principal, post_id)
    if (
        post.status !== "draft" &&
        post.status !== "scheduled" &&
        post.status !== "failed" &&
        post.status !== "published" &&
        post.status !== "partial" &&
        post.status !== "cancelled"
    )
        return yield* Effect.fail(
            new SocialSubmissionError({
                message:
                    "Wait for this post's status to settle before deleting it",
                uncertain: false,
            })
        )
    if (
        post.status === "draft" ||
        post.status === "scheduled" ||
        post.status === "failed"
    ) {
        if (post.provider_post_id !== null) {
            const provider = yield* ZernioProvider
            yield* provider
                .delete_post(post.provider_post_id)
                .pipe(
                    Effect.catch((error) =>
                        error.status === 404 ? Effect.void : Effect.fail(error)
                    )
                )
        }
    }
    yield* store.delete_post(principal, post_id, post.status)
    return { post_id }
})

export const update_social_draft = Effect.fn("Social.updateDraft")(function* (
    principal: SocialPrincipal,
    post_id: string,
    input: UpdateDraftInput
) {
    const store = yield* SocialStore
    const provider = yield* ZernioProvider
    const edit = yield* store.claim_draft_edit(principal, post_id, input)
    const provider_post_id = edit.post.provider_post_id
    if (provider_post_id === null)
        return yield* Effect.fail(
            new SocialSubmissionError({
                message: "The saved draft is unavailable",
                uncertain: false,
            })
        )
    const media_urls = yield* Effect.forEach(edit.media_urls, (url) =>
        media_url(url, principal.domain_id)
    ).pipe(
        Effect.catch((error) =>
            store
                .reject_draft_edit(principal, post_id, error.message)
                .pipe(Effect.flatMap(() => Effect.fail(error)))
        )
    )
    const outcome = yield* provider
        .update_post(provider_post_id, {
            request_id: `${post_id}:draft-edit`,
            local_post_id: post_id,
            content: edit.content,
            platforms: edit.platforms.map((target) => ({
                platform: target.platform,
                account_id: target.account_id,
            })),
            media_urls,
            mode: "draft",
            scheduled_for: null,
        })
        .pipe(Effect.exit)
    if (outcome._tag === "Failure") {
        const failure = outcome.cause.reasons.find(Cause.isFailReason)?.error
        const message =
            failure instanceof ZernioProviderError
                ? failure.message
                : "Zernio did not confirm the draft edit"
        const status =
            failure instanceof ZernioProviderError ? failure.status : null
        const definitive =
            status !== null && status >= 400 && status < 500 && status !== 429
        if (definitive)
            yield* store.reject_draft_edit(principal, post_id, message)
        return yield* Effect.fail(
            new SocialSubmissionError({
                message: definitive
                    ? message
                    : "Zernio's response is uncertain. Retry the same draft edit.",
                uncertain: !definitive,
            })
        )
    }
    if (
        outcome.value._id !== provider_post_id ||
        outcome.value.status !== "draft"
    )
        return yield* Effect.fail(
            new SocialSubmissionError({
                message:
                    "Zernio returned an unexpected draft status. Refresh before editing.",
                uncertain: true,
            })
        )
    yield* store.complete_draft_edit(principal, post_id, provider_post_id)
    return { post_id, status: "draft" }
})

export const retry_social_draft_edit = Effect.fn("Social.retryDraftEdit")(
    function* (principal: SocialPrincipal, post_id: string) {
        const store = yield* SocialStore
        const input = yield* store.load_pending_draft_edit(principal, post_id)
        return yield* update_social_draft(principal, post_id, input)
    }
)

export interface SocialSubmissionService {
    readonly submit_post: typeof submit_social_post
    readonly publish_draft: typeof publish_social_draft
    readonly reconcile_post: typeof reconcile_social_post
    readonly cancel_post: typeof cancel_social_post
    readonly delete_post: typeof delete_social_post
    readonly update_draft: typeof update_social_draft
    readonly retry_draft_edit: typeof retry_social_draft_edit
}
export class SocialSubmission extends Context.Service<
    SocialSubmission,
    SocialSubmissionService
>()("@urm/rpc/SocialSubmission") {}
export const SocialSubmissionLive = Layer.succeed(
    SocialSubmission,
    SocialSubmission.of({
        submit_post: submit_social_post,
        publish_draft: publish_social_draft,
        reconcile_post: reconcile_social_post,
        cancel_post: cancel_social_post,
        delete_post: delete_social_post,
        update_draft: update_social_draft,
        retry_draft_edit: retry_social_draft_edit,
    })
)
