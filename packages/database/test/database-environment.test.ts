/**
 * Database Environment Selector Integration Tests
 *
 * @module @urm/database/test/database-selector.integration
 */

import { describe, it, expect } from "@effect/vitest"
import * as Effect from "effect/Effect"

import {
    validateEnvironment,
    getDatabaseUrlEnvVar,
} from "../src/config/environment.js"
import { getPoolConfig, getLoggingConfig } from "../src/config/pool-config.js"
import {
    makeDatabaseDevLive,
    makePgClientDev,
} from "../src/services/database-dev.js"
import {
    makeDatabaseStageLive,
    makePgClientStage,
} from "../src/services/database-stage.js"
import {
    makeDatabaseProdLive,
    makePgClientProd,
} from "../src/services/database-prod.js"
import { MAX_DEMO_ROWS } from "../src/seeds/demo-seed.js"

describe("Database Environment Configuration", () => {
    describe("Environment Validation", () => {
        it.effect("should validate development environment", () =>
            Effect.gen(function* () {
                const result = yield* validateEnvironment("development")
                expect(result).toBe("development")
            })
        )

        it.effect("should validate staging environment", () =>
            Effect.gen(function* () {
                const result = yield* validateEnvironment("staging")
                expect(result).toBe("staging")
            })
        )

        it.effect("should validate production environment", () =>
            Effect.gen(function* () {
                const result = yield* validateEnvironment("production")
                expect(result).toBe("production")
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
            })
        )
    })

    describe("Database URL Environment Variables", () => {
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

    describe("Pool Configuration", () => {
        it("should return dev config with 10 connections", () => {
            const config = getPoolConfig("development", false)
            expect(config.max_connections).toBe(10)
            expect(config.query_timeout_ms).toBeNull()
        })

        it("should return staging config with 15 connections", () => {
            const config = getPoolConfig("staging", false)
            expect(config.max_connections).toBe(15)
            expect(config.query_timeout_ms).toBe(30_000)
        })

        it("should return prod config with 25 connections", () => {
            const config = getPoolConfig("production", false)
            expect(config.max_connections).toBe(25)
            expect(config.query_timeout_ms).toBe(60_000)
        })

        it("should return demo config mirroring staging", () => {
            const demo_config = getPoolConfig("production", true)
            const staging_config = getPoolConfig("staging", false)
            expect(demo_config).toEqual(staging_config)
        })
    })

    describe("Logging Configuration", () => {
        it("should enable all logging in development", () => {
            const config = getLoggingConfig("development", false)
            expect(config.log_queries).toBe(true)
            expect(config.slow_query_threshold_ms).toBeNull()
        })

        it("should log only slow queries in staging", () => {
            const config = getLoggingConfig("staging", false)
            expect(config.log_queries).toBe(true)
            expect(config.slow_query_threshold_ms).toBe(1000)
        })

        it("should disable query logging in production", () => {
            const config = getLoggingConfig("production", false)
            expect(config.log_queries).toBe(false)
        })
    })
})

describe("Database Layer Creation", () => {
    describe("Development Layer", () => {
        it("should create PgClient layer with dev config", () => {
            const layer = makePgClientDev("postgresql://test@localhost/db")
            expect(layer).toBeDefined()
        })

        it("should create database layer", () => {
            const layer = makeDatabaseDevLive("postgresql://test@localhost/db")
            expect(layer).toBeDefined()
        })
    })

    describe("Staging Layer", () => {
        it("should create PgClient layer with stage config", () => {
            const layer = makePgClientStage("postgresql://test@localhost/db")
            expect(layer).toBeDefined()
        })

        it("should create database layer", () => {
            const layer = makeDatabaseStageLive(
                "postgresql://test@localhost/db"
            )
            expect(layer).toBeDefined()
        })
    })

    describe("Production Layer", () => {
        it("should create PgClient layer with prod config", () => {
            const layer = makePgClientProd("postgresql://test@localhost/db")
            expect(layer).toBeDefined()
        })

        it("should create database layer", () => {
            const layer = makeDatabaseProdLive("postgresql://test@localhost/db")
            expect(layer).toBeDefined()
        })
    })
})

describe("Demo Database Constraints", () => {
    it("should have correct max rows limit", () => {
        expect(MAX_DEMO_ROWS).toBe(50_000)
    })
})
