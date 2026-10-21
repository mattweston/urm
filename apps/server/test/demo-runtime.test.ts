import { ConfigProvider, Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { EmailTransport } from "@urm/email"
import {
    isDemoAllowedOrigin,
    runtimeCapabilities,
} from "../src/demo-runtime.ts"
import { RuntimeEmailTransportLive } from "../src/runtime-email-transport.ts"

const demo_config_live = ConfigProvider.layer(
    ConfigProvider.fromUnknown({
        NODE_ENV: "development",
        IS_DEMO: true,
        DATABASE_URL_DEV: "postgresql://localhost/primary",
        DATABASE_URL_DEMO: "postgresql://localhost/demo",
    })
)

describe("demo runtime safeguards", () => {
    it("disables storage effects only for demo processes", () => {
        expect(runtimeCapabilities(true)).toEqual({
            uploads_enabled: false,
            storage_proxy_enabled: false,
            upload_bucket_configuration_enabled: false,
        })
        expect(runtimeCapabilities(false).uploads_enabled).toBe(true)
    })

    it("accepts only isolated demo origins", () => {
        expect(isDemoAllowedOrigin("https://urm.urm.dev")).toBe(true)
        expect(isDemoAllowedOrigin("https://demo-marketing-abc.urm.dev")).toBe(
            true
        )
        expect(
            isDemoAllowedOrigin("https://urm.demo-marketing-abc.urm.dev")
        ).toBe(true)
        expect(isDemoAllowedOrigin("https://urm.dev")).toBe(false)
        expect(isDemoAllowedOrigin("https://customer.urm.dev")).toBe(false)
    })

    it("uses the no-send email transport in demo mode", async () => {
        const result = await Effect.runPromise(
            Effect.gen(function* () {
                const transport = yield* EmailTransport
                return yield* transport.send({
                    to: "recipient@example.test",
                    subject: "Demo message",
                    text: "This message must not leave the demo runtime.",
                })
            }).pipe(
                Effect.provide(
                    RuntimeEmailTransportLive.pipe(
                        Layer.provide(demo_config_live)
                    )
                )
            )
        )

        expect(result).toEqual({ status: "skipped", reason: "disabled" })
    })
})
