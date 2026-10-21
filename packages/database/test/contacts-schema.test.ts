/**
 * Contacts Schema Integration Tests
 *
 * Tests for Drizzle contacts table structure and type inference.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest"
import { getTableName } from "drizzle-orm"
import { contacts } from "../src/legacy-schema/contacts/index.ts"

describe("Contacts Schema Integration", () => {
    describe("Table Structure", () => {
        it("has correct table name", () => {
            expect(getTableName(contacts)).toBe("contacts")
        })

        it("has all required columns", () => {
            const columns = Object.keys(contacts)
            expect(columns).toContain("id")
            expect(columns).toContain("name")
            expect(columns).toContain("email")
            expect(columns).toContain("tel")
            expect(columns).toContain("title")
            expect(columns).toContain("company")
            expect(columns).toContain("image")
            expect(columns).toContain("email_verified")
            expect(columns).toContain("is_test_contact")
            expect(columns).toContain("created_at")
            expect(columns).toContain("updated_at")
            expect(columns).toContain("deleted_at")
        })

        it("id is primary key", () => {
            expect(contacts.id.primary).toBe(true)
        })

        it("name is not null", () => {
            expect(contacts.name.notNull).toBe(true)
        })

        it("updated_at is not null", () => {
            expect(contacts.updated_at.notNull).toBe(true)
        })
    })

    describe("Type Inference", () => {
        it("infers correct select type", () => {
            type SelectType = typeof contacts.$inferSelect

            const mockContact: SelectType = {
                id: "contact-123",
                name: "John Doe",
                email: "john@example.com",
                tel: "555-1234",
                title: "CEO",
                company: "Acme Corp",
                image: null,
                email_verified: false,
                is_test_contact: false,
                created_at: Date.now(),
                updated_at: Date.now(),
                deleted_at: null,
            }

            expect(mockContact).toBeDefined()
            expect(mockContact.name).toBe("John Doe")
        })

        it("infers correct insert type", () => {
            type InsertType = typeof contacts.$inferInsert

            const mockInsert: InsertType = {
                id: "contact-123",
                name: "John Doe",
                updated_at: Date.now(),
            }

            expect(mockInsert).toBeDefined()
            expect(mockInsert.name).toBe("John Doe")
        })

        it("optional fields can be omitted in insert", () => {
            type InsertType = typeof contacts.$inferInsert

            const minimalInsert: InsertType = {
                id: "contact-123",
                name: "Jane Doe",
                updated_at: Date.now(),
            }

            expect(minimalInsert.email).toBeUndefined()
            expect(minimalInsert.tel).toBeUndefined()
            expect(minimalInsert.deleted_at).toBeUndefined()
        })
    })
})
