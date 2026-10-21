/**
 * Migration Strategy Integration Tests
 *
 * @module @urm/db/test/migration-strategy.integration
 */

import { describe, it, expect } from "@effect/vitest"
import {
    getMigrationStrategy,
    type MigrationStrategy,
} from "../src/services/migrator-environment.js"

describe("Migration Strategy", () => {
    describe("getMigrationStrategy", () => {
        it("should return migrations for development", () => {
            const strategy = getMigrationStrategy("development")
            expect(strategy).toBe("migrations")
        })

        it("should return migrations for staging", () => {
            const strategy = getMigrationStrategy("staging")
            expect(strategy).toBe("migrations")
        })

        it("should return migrations for production", () => {
            const strategy = getMigrationStrategy("production")
            expect(strategy).toBe("migrations")
        })
    })

    describe("Strategy Types", () => {
        it("should have valid strategy values", () => {
            const strategies: MigrationStrategy[] = ["migrations", "skip"]

            strategies.forEach((strategy) => {
                expect(["migrations", "skip"]).toContain(strategy)
            })
        })
    })
})
