/**
 * Pool Configuration Tests
 *
 * @module @urm/db/test/config/pool-config
 */

import { describe, it, expect } from "@effect/vitest"
import {
    getPoolConfig,
    getPoolConfigSafe,
    getLoggingConfig,
    getDatabaseConfig,
} from "../../src/config/pool-config.js"
import type { Environment } from "../../src/config/environment.js"

describe("Pool Configuration", () => {
    describe("getPoolConfig", () => {
        it("should return dev config with 10 connections", () => {
            const config = getPoolConfig("development", false)
            expect(config.max_connections).toBe(10)
            expect(config.idle_timeout_ms).toBe(30_000)
            expect(config.connection_timeout_ms).toBe(5_000)
            expect(config.query_timeout_ms).toBeNull()
        })

        it("should return staging config with 15 connections", () => {
            const config = getPoolConfig("staging", false)
            expect(config.max_connections).toBe(15)
            expect(config.idle_timeout_ms).toBe(60_000)
            expect(config.connection_timeout_ms).toBe(10_000)
            expect(config.query_timeout_ms).toBe(30_000)
        })

        it("should return prod config with 25 connections", () => {
            const config = getPoolConfig("production", false)
            expect(config.max_connections).toBe(25)
            expect(config.idle_timeout_ms).toBe(120_000)
            expect(config.connection_timeout_ms).toBe(15_000)
            expect(config.query_timeout_ms).toBe(60_000)
        })

        it("should return demo config (mirrors staging)", () => {
            const demo_config = getPoolConfig("production", true)
            const staging_config = getPoolConfig("staging", false)
            expect(demo_config).toEqual(staging_config)
        })
    })

    describe("getPoolConfigSafe", () => {
        it("should return config for valid environment", () => {
            const config = getPoolConfigSafe("development", false)
            expect(config.max_connections).toBe(10)
        })

        it("should throw for invalid environment", () => {
            expect(() =>
                getPoolConfigSafe("invalid" as Environment, false)
            ).toThrow('Invalid environment: "invalid"')
        })
    })

    describe("getLoggingConfig", () => {
        it("should enable all logging in development", () => {
            const config = getLoggingConfig("development", false)
            expect(config.log_queries).toBe(true)
            expect(config.log_connections).toBe(true)
            expect(config.slow_query_threshold_ms).toBeNull()
        })

        it("should log only slow queries in staging", () => {
            const config = getLoggingConfig("staging", false)
            expect(config.log_queries).toBe(true)
            expect(config.log_connections).toBe(true)
            expect(config.slow_query_threshold_ms).toBe(1000)
        })

        it("should disable query logging in production", () => {
            const config = getLoggingConfig("production", false)
            expect(config.log_queries).toBe(false)
            expect(config.log_connections).toBe(false)
            expect(config.slow_query_threshold_ms).toBeNull()
        })

        it("should return demo config (mirrors staging)", () => {
            const demo_config = getLoggingConfig("production", true)
            const staging_config = getLoggingConfig("staging", false)
            expect(demo_config).toEqual(staging_config)
        })
    })

    describe("getDatabaseConfig", () => {
        it("should return complete config for development", () => {
            const config = getDatabaseConfig("development", false)
            expect(config.pool.max_connections).toBe(10)
            expect(config.logging.log_queries).toBe(true)
        })

        it("should return complete config for production", () => {
            const config = getDatabaseConfig("production", false)
            expect(config.pool.max_connections).toBe(25)
            expect(config.logging.log_queries).toBe(false)
        })
    })
})
