import { assert, describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import { CloudflareEmailConfig } from "@urm/env/server"
import { sendCloudflareEmail } from "../src/cloudflare.ts"

const configLayer = (enabled: boolean) =>
    Layer.succeed(
        CloudflareEmailConfig,
        CloudflareEmailConfig.of({
            enabled,
            accountId: "account-id",
            apiToken: Redacted.make("api-token"),
            from: "welcome@example.com",
            transport: "rest",
            smtpHost: "smtp.mx.cloudflare.net",
            smtpPort: 465,
        })
    )

describe("@urm/email - Cloudflare sender", () => {
    it.effect("skips sends when disabled", () =>
        Effect.gen(function* () {
            const result = yield* sendCloudflareEmail({
                to: "person@example.com",
                subject: "Subject",
                text: "Body",
            }).pipe(Effect.provide(configLayer(false)))

            assert.deepStrictEqual(result, {
                status: "skipped",
                reason: "disabled",
            })
        })
    )

    it.effect("sends via Cloudflare Email Service REST API", () =>
        Effect.gen(function* () {
            const result = yield* sendCloudflareEmail(
                {
                    to: "person@example.com",
                    subject: "Subject",
                    text: "Body",
                    html: "<p>Body</p>",
                },
                (url, init) => {
                    assert.strictEqual(
                        url,
                        "https://api.cloudflare.com/client/v4/accounts/account-id/email/sending/send"
                    )
                    assert.deepStrictEqual(init.headers, {
                        Authorization: "Bearer api-token",
                        "Content-Type": "application/json",
                    })
                    assert.strictEqual(
                        init.body,
                        JSON.stringify({
                            to: "person@example.com",
                            from: "welcome@example.com",
                            subject: "Subject",
                            text: "Body",
                            html: "<p>Body</p>",
                        })
                    )

                    return Promise.resolve(
                        new Response(
                            JSON.stringify({
                                success: true,
                                errors: [],
                                messages: [],
                                result: {
                                    message_id: "cloudflare-message-1",
                                    delivered: ["person@example.com"],
                                    permanent_bounces: [],
                                    queued: [],
                                },
                            })
                        )
                    )
                }
            ).pipe(Effect.provide(configLayer(true)))

            assert.deepStrictEqual(result, {
                status: "sent",
                message_id: "cloudflare-message-1",
                delivered: ["person@example.com"],
                permanent_bounces: [],
                queued: [],
            })
        })
    )

    it.effect("passes named recipients, arrays, cc, bcc, and reply-to", () =>
        sendCloudflareEmail(
            {
                to: [
                    "plain@example.com",
                    { address: "jane@example.com", name: "Jane Doe" },
                ],
                cc: { address: "manager@example.com", name: "Manager" },
                bcc: ["archive@example.com"],
                from: {
                    address: "newsletter@example.com",
                    name: "Newsletter Team",
                },
                reply_to: "support@example.com",
                subject: "Subject",
                text: "Body",
            },
            (_url, init) => {
                assert.strictEqual(
                    init.body,
                    JSON.stringify({
                        to: [
                            "plain@example.com",
                            { address: "jane@example.com", name: "Jane Doe" },
                        ],
                        cc: { address: "manager@example.com", name: "Manager" },
                        bcc: ["archive@example.com"],
                        from: {
                            address: "newsletter@example.com",
                            name: "Newsletter Team",
                        },
                        reply_to: "support@example.com",
                        subject: "Subject",
                        text: "Body",
                    })
                )

                return Promise.resolve(
                    new Response(JSON.stringify({ success: true }))
                )
            }
        ).pipe(Effect.provide(configLayer(true)))
    )

    it("fails when Cloudflare returns a non-success HTTP status", async () => {
        await expect(
            Effect.runPromise(
                sendCloudflareEmail(
                    {
                        to: "person@example.com",
                        subject: "Subject",
                        text: "Body",
                    },
                    () =>
                        Promise.resolve(
                            new Response("Unavailable", { status: 503 })
                        )
                ).pipe(Effect.provide(configLayer(true)))
            )
        ).rejects.toThrow("Cloudflare email send failed: 503")
    })

    it("fails when Cloudflare rejects the send envelope or response body", async () => {
        const input = {
            to: "person@example.com",
            subject: "Subject",
            text: "Body",
        }

        await expect(
            Effect.runPromise(
                sendCloudflareEmail(input, () =>
                    Promise.resolve(
                        new Response(
                            JSON.stringify({
                                success: false,
                                errors: [{ message: "Recipient rejected" }],
                            })
                        )
                    )
                ).pipe(Effect.provide(configLayer(true)))
            )
        ).rejects.toThrow("Cloudflare email send was rejected")
        await expect(
            Effect.runPromise(
                sendCloudflareEmail(input, () =>
                    Promise.resolve(new Response("not-json"))
                ).pipe(Effect.provide(configLayer(true)))
            )
        ).rejects.toThrow()
        await expect(
            Effect.runPromise(
                sendCloudflareEmail(input, () =>
                    Promise.reject(new Error("Network unavailable"))
                ).pipe(Effect.provide(configLayer(true)))
            )
        ).rejects.toThrow("Network unavailable")
    })
})
