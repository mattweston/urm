import { assert, describe, it } from "@effect/vitest"
import { afterEach, vi } from "vitest"
import { Effect, Layer, Redacted } from "effect"
import { CloudflareEmailConfig } from "@urm/env/server"
import {
    CloudflareRestEmailTransportLive,
    DemoEmailTransportLive,
    EmailTransport,
} from "../src/transport.ts"

const configLayer = Layer.succeed(
    CloudflareEmailConfig,
    CloudflareEmailConfig.of({
        enabled: false,
        accountId: "",
        apiToken: Redacted.make(""),
        from: "",
        transport: "rest",
        smtpHost: "smtp.mx.cloudflare.net",
        smtpPort: 465,
    })
)

const cloudflare_rest_transport_layer = CloudflareRestEmailTransportLive.pipe(
    Layer.provide(configLayer)
)

afterEach(() => vi.unstubAllGlobals())

describe("@urm/email - EmailTransport", () => {
    it.effect("never sends email from the demo transport", () =>
        Effect.gen(function* () {
            const transport = yield* EmailTransport
            const result = yield* transport.send({
                to: "person@example.com",
                subject: "Subject",
                text: "Body",
            })

            assert.deepStrictEqual(result, {
                status: "skipped",
                reason: "disabled",
            })
        }).pipe(Effect.provide(DemoEmailTransportLive))
    )

    it.effect(
        "provides Cloudflare REST as the default transport implementation",
        () =>
            Effect.gen(function* () {
                const transport = yield* EmailTransport
                const result = yield* transport.send({
                    to: "person@example.com",
                    subject: "Subject",
                    text: "Body",
                })

                assert.deepStrictEqual(result, {
                    status: "skipped",
                    reason: "disabled",
                })
            }).pipe(Effect.provide(cloudflare_rest_transport_layer))
    )

    it("does not resend after an uncertain REST network failure", async () => {
        const send_request = vi.fn(() =>
            Promise.reject(new Error("Connection closed after submission"))
        )
        vi.stubGlobal("fetch", send_request)
        const enabled_config = Layer.succeed(
            CloudflareEmailConfig,
            CloudflareEmailConfig.of({
                enabled: true,
                accountId: "test-account",
                apiToken: Redacted.make("test-token"),
                from: "mail@example.com",
                transport: "rest",
                smtpHost: "smtp.mx.cloudflare.net",
                smtpPort: 465,
            })
        )
        const transport = CloudflareRestEmailTransportLive.pipe(
            Layer.provide(enabled_config)
        )
        const result = await Effect.runPromise(
            Effect.gen(function* () {
                const email = yield* EmailTransport
                return yield* Effect.result(
                    email.send({
                        to: "person@example.com",
                        subject: "Subject",
                        text: "Body",
                    })
                )
            }).pipe(Effect.provide(transport))
        )
        assert.strictEqual(result._tag, "Failure")
        assert.strictEqual(send_request.mock.calls.length, 1)
    })
})
