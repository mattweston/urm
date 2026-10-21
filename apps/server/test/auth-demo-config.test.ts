import { ConfigProvider, Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { AuthConfig, AuthConfigLive } from "@urm/env/server"

const load_auth_config = (config: Readonly<Record<string, string | boolean>>) =>
    Effect.runPromise(
        Effect.gen(function* () {
            return yield* AuthConfig
        }).pipe(
            Effect.provide(
                AuthConfigLive.pipe(
                    Layer.provide(
                        ConfigProvider.layer(ConfigProvider.fromUnknown(config))
                    )
                )
            )
        )
    )

const base_config = {
    AUTH_SECRET: "test-auth-secret",
    GOOGLE_CLIENT_ID: "production-client-id",
    GOOGLE_CLIENT_SECRET: "production-client-secret",
}

describe("demo Google OAuth configuration", () => {
    it("uses the production Google credentials outside demo mode", async () => {
        const config = await load_auth_config(base_config)

        expect(config.googleClientId).toBe("production-client-id")
    })

    it("uses distinct demo Google credentials in demo mode", async () => {
        const config = await load_auth_config({
            ...base_config,
            IS_DEMO: true,
            GOOGLE_DEMO_CLIENT_ID: "demo-client-id",
            GOOGLE_DEMO_CLIENT_SECRET: "demo-client-secret",
        })

        expect(config.googleClientId).toBe("demo-client-id")
    })

    it("refuses to start a demo deployment without dedicated Google credentials", async () => {
        await expect(
            load_auth_config({ ...base_config, IS_DEMO: true })
        ).rejects.toThrow(
            "Demo deployments require GOOGLE_DEMO_CLIENT_ID and GOOGLE_DEMO_CLIENT_SECRET"
        )
    })
})
