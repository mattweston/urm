/**
 * Environment Configuration Tests
 *
 * @module @urm/database/test/config/environment
 */

import { describe, it, expect } from "@effect/vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import {
    validateEnvironment,
    getDatabaseUrlEnvVar,
    getDemoDatabaseUrl,
    loadEnvironmentConfig,
    validateAllEnvVars,
} from "../../src/config/environment.js"

describe("Environment Configuration", () => {
    describe("validateEnvironment", () => {
        it.effect("should succeed for valid environments", () =>
            Effect.gen(function* () {
                const dev = yield* validateEnvironment("development")
                expect(dev).toBe("development")

                const staging = yield* validateEnvironment("staging")
                expect(staging).toBe("staging")

                const prod = yield* validateEnvironment("production")
                expect(prod).toBe("production")
            })
        )

        it.effect("should fail for invalid environment", () =>
            Effect.gen(function* () {
                const result = yield* validateEnvironment("invalid").pipe(
                    Effect.match({
                        onFailure: (error) => error,
                        onSuccess: () => null,
                    })
                )

                expect(result).not.toBeNull()
                expect(result?._tag).toBe("ConfigError")
                expect(result?.message).toContain("Invalid NODE_ENV")
            })
        )
    })

    describe("getDatabaseUrlEnvVar", () => {
        it("should return correct env var for development", () => {
            expect(getDatabaseUrlEnvVar("development")).toBe("DATABASE_URL_DEV")
        })

        it("should return correct env var for staging", () => {
            expect(getDatabaseUrlEnvVar("staging")).toBe("DATABASE_URL_STAGE")
        })

        it("should return correct env var for production", () => {
            expect(getDatabaseUrlEnvVar("production")).toBe("DATABASE_URL_PROD")
        })
    })

    describe("getDemoDatabaseUrl", () => {
        it.effect("should return None when DATABASE_URL_DEMO is not set", () =>
            Effect.gen(function* () {
                const result = yield* getDemoDatabaseUrl.pipe(
                    Effect.provide(
                        ConfigProvider.layer(ConfigProvider.fromUnknown({}))
                    )
                )

                expect(Option.isNone(result)).toBe(true)
            })
        )

        it.effect("should return Some when DATABASE_URL_DEMO is set", () =>
            Effect.gen(function* () {
                const test_url = "mysql://demo:test@localhost/demo"
                const result = yield* getDemoDatabaseUrl.pipe(
                    Effect.provide(
                        ConfigProvider.layer(
                            ConfigProvider.fromUnknown({
                                DATABASE_URL_DEMO: test_url,
                            })
                        )
                    )
                )

                expect(Option.isSome(result)).toBe(true)
                expect(Option.getOrUndefined(result)).toBe(test_url)
            })
        )
    })

    describe("loadEnvironmentConfig", () => {
        it.effect(
            "rejects a demo deployment that reuses its primary database",
            () =>
                Effect.gen(function* () {
                    const result = yield* loadEnvironmentConfig.pipe(
                        Effect.match({
                            onFailure: (error) => error,
                            onSuccess: () => null,
                        }),
                        Effect.provide(
                            ConfigProvider.layer(
                                ConfigProvider.fromUnknown({
                                    NODE_ENV: "development",
                                    IS_DEMO: true,
                                    DATABASE_URL_DEV:
                                        "postgresql://localhost/primary",
                                    DATABASE_URL_DEMO:
                                        "postgresql://localhost/primary",
                                })
                            )
                        )
                    )

                    expect(result?._tag).toBe("ConfigError")
                    expect(result?.message).toContain(
                        "different from the primary"
                    )
                })
        )
    })

    describe("validateAllEnvVars", () => {
        it.effect("should fail when required vars are missing", () =>
            Effect.gen(function* () {
                const result = yield* validateAllEnvVars.pipe(
                    Effect.match({
                        onFailure: (error) => error,
                        onSuccess: () => null,
                    }),
                    Effect.provide(
                        ConfigProvider.layer(ConfigProvider.fromUnknown({}))
                    )
                )

                expect(result).not.toBeNull()
                expect(result?._tag).toBe("ConfigError")
            })
        )
    })
})
