import { Effect, Redacted } from "effect"
import { describe, expect, it } from "vitest"
import { make_zernio_provider } from "../src/handlers/social/provider.ts"

describe("Zernio provider boundary", () => {
    it("scopes accounts and posts to the bound profile", async () => {
        const requests: Array<string> = []
        const fetcher = (input: Parameters<typeof fetch>[0]) => {
            const url = new URL(input.toString())
            requests.push(url.toString())
            if (url.pathname.endsWith("/accounts"))
                return Promise.resolve(
                    Response.json({
                        accounts: [
                            {
                                _id: "owned",
                                profileId: { _id: "profile-one" },
                                platform: "facebook",
                                username: "owned",
                                isActive: true,
                            },
                            {
                                _id: "other",
                                profileId: "profile-two",
                                platform: "facebook",
                                username: "other",
                                isActive: true,
                            },
                        ],
                    })
                )
            return Promise.resolve(Response.json({ posts: [] }))
        }
        const provider = make_zernio_provider(
            Redacted.make("test-api-key"),
            fetcher
        )
        const accounts = await Effect.runPromise(
            provider.list_accounts("profile-one")
        )
        const posts = await Effect.runPromise(
            provider.list_posts("profile-one")
        )
        expect(accounts.map((account) => account._id)).toEqual(["owned"])
        expect(posts).toEqual([])
        expect(requests).toEqual([
            "https://zernio.com/api/v1/accounts?profileId=profile-one&includeOverLimit=true",
            "https://zernio.com/api/v1/posts?profileId=profile-one&limit=50&sortBy=created-desc",
        ])
    })

    it("reuses the logical request id and accepts an existing post response", async () => {
        const requests: Array<{
            url: string
            request_id: string | null
            body: unknown
        }> = []
        const fetcher = (
            input: Parameters<typeof fetch>[0],
            init?: RequestInit
        ) => {
            requests.push({
                url: input.toString(),
                request_id: new Headers(init?.headers).get("x-request-id"),
                body: JSON.parse(String(init?.body)),
            })
            return Promise.resolve(
                Response.json({
                    existingPost: {
                        _id: "provider-post",
                        status: "draft",
                    },
                })
            )
        }
        const provider = make_zernio_provider(
            Redacted.make("test-api-key"),
            fetcher
        )
        const post = await Effect.runPromise(
            provider.create_post({
                request_id: "89c30410-a4ad-41e7-88e4-69b2b8d06436",
                local_post_id: "local-post",
                content: "Hello",
                platforms: [{ platform: "facebook", account_id: "account" }],
                media_urls: [],
                mode: "draft",
                scheduled_for: null,
            })
        )
        expect(post._id).toBe("provider-post")
        expect(requests).toEqual([
            {
                url: "https://zernio.com/api/v1/posts",
                request_id: "89c30410-a4ad-41e7-88e4-69b2b8d06436",
                body: {
                    content: "Hello",
                    platforms: [{ platform: "facebook", accountId: "account" }],
                    mediaItems: [],
                    metadata: { urmPostId: "local-post" },
                    isDraft: true,
                },
            },
        ])
    })

    it("promotes a saved draft using the provider update endpoint", async () => {
        let method: string | undefined
        let url = ""
        let body: unknown
        const provider = make_zernio_provider(
            Redacted.make("test-api-key"),
            (input, init) => {
                method = init?.method
                url = input.toString()
                body = JSON.parse(String(init?.body))
                return Promise.resolve(
                    Response.json({
                        post: { _id: "provider-post", status: "publishing" },
                    })
                )
            }
        )
        await Effect.runPromise(
            provider.update_post("provider-post", {
                request_id: "local-post:publish-draft",
                local_post_id: "local-post",
                content: "Hello",
                platforms: [{ platform: "facebook", account_id: "account" }],
                media_urls: ["https://example.com/image.jpg"],
                mode: "publish_now",
                scheduled_for: null,
            })
        )
        expect(method).toBe("PUT")
        expect(url).toBe("https://zernio.com/api/v1/posts/provider-post")
        expect(body).toMatchObject({
            isDraft: false,
            publishNow: true,
            mediaItems: [{ url: "https://example.com/image.jpg" }],
        })
    })

    it("sends an exact UTC instant for a scheduled post", async () => {
        let body: unknown
        const provider = make_zernio_provider(
            Redacted.make("test-api-key"),
            (_input, init) => {
                body = JSON.parse(String(init?.body))
                return Promise.resolve(
                    Response.json({
                        post: { _id: "scheduled-one", status: "scheduled" },
                    })
                )
            }
        )
        await Effect.runPromise(
            provider.create_post({
                request_id: "schedule-one",
                local_post_id: "local-schedule-one",
                content: "Hello",
                platforms: [{ platform: "facebook", account_id: "account" }],
                media_urls: [],
                mode: "schedule",
                scheduled_for: Date.parse("2026-09-23T14:35:00.000Z"),
            })
        )
        expect(body).toMatchObject({
            isDraft: false,
            scheduledFor: "2026-09-23T14:35:00.000Z",
        })
    })

    it("returns provider rejections without exposing the API key", async () => {
        const provider = make_zernio_provider(
            Redacted.make("secret-api-key"),
            () =>
                Promise.resolve(
                    Response.json(
                        { error: "This profile has reached its limit" },
                        { status: 403 }
                    )
                )
        )
        const error = await Effect.runPromise(
            provider.create_profile("Brand", "create-brand").pipe(Effect.flip)
        )
        expect(error.status).toBe(403)
        expect(error.message).toBe("This profile has reached its limit")
        expect(String(error)).not.toContain("secret-api-key")
    })

    it("uses an idempotency key when creating a profile", async () => {
        let idempotency_key: string | null = null
        const provider = make_zernio_provider(
            Redacted.make("test-api-key"),
            (_input, init) => {
                idempotency_key = new Headers(init?.headers).get(
                    "Idempotency-Key"
                )
                return Promise.resolve(
                    Response.json({
                        profile: { _id: "profile", name: "Brand" },
                    })
                )
            }
        )
        const profile_id = await Effect.runPromise(
            provider.create_profile("Brand", "urm:domain-one")
        )
        expect(profile_id).toBe("profile")
        expect(idempotency_key).toBe("urm:domain-one")
    })
})
