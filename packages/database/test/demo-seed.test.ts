/**
 * Demo Seeding Utilities Tests
 *
 * @module @urm/db/test/demo-seed.test
 */

import { describe, it, expect } from "@effect/vitest"
import {
    generateFakeContact,
    generateFakeContacts,
    generateFakeTodoItem,
    generateFakeTodos,
    MAX_DEMO_ROWS,
    BATCH_SIZE,
    INSERT_AMOUNTS,
} from "../src/seeds/demo-seed.js"

describe("Demo Data Generation", () => {
    const domain_id = "00000000-0000-4000-8000-000000000001"

    describe("Contact Generation", () => {
        it("should generate a fake contact with required fields", () => {
            const contact = generateFakeContact(0)

            expect(contact.id).toBeDefined()
            expect(contact.email).toBeDefined()
            expect(contact.name).toBeDefined()
            expect(contact.updated_at).toBeDefined()
        })

        it("should generate unique contacts", () => {
            const contacts = generateFakeContacts(10)
            const ids = contacts.map((contact) => contact.id)
            const uniqueIds = new Set(ids)

            expect(uniqueIds.size).toBe(10)
        })
    })

    describe("Todo Generation", () => {
        it("should generate a fake todo item", () => {
            const contactIds = ["contact-1", "contact-2", "contact-3"]
            const todo = generateFakeTodoItem(0, contactIds, domain_id)

            expect(todo.id).toBeDefined()
            expect(todo.text).toBeDefined()
            expect(todo.status).toBeDefined()
            expect(todo.createdByContactId).toBeDefined()
            expect(contactIds).toContain(todo.createdByContactId)
            expect(todo.domain_id).toBe(domain_id)
        })

        it("should generate todos assigned to contacts", () => {
            const contactIds = ["contact-1", "contact-2"]
            const todos = generateFakeTodos(10, contactIds, domain_id)

            todos.forEach((todo) => {
                expect(contactIds).toContain(todo.assigneeContactId)
            })
        })

        it("should generate todos with valid statuses", () => {
            const contactIds = ["contact-1"]
            const todos = generateFakeTodos(20, contactIds, domain_id)
            const validStatuses = [
                "todo",
                "in_progress",
                "done",
                "blocked",
                "archived",
            ]

            todos.forEach((todo) => {
                expect(validStatuses).toContain(todo.status)
            })
        })

        it("should generate todos with valid priorities", () => {
            const contactIds = ["contact-1"]
            const todos = generateFakeTodos(20, contactIds, domain_id)
            const validPriorities = ["low", "medium", "high", "urgent"]

            todos.forEach((todo) => {
                expect(validPriorities).toContain(todo.priority)
            })
        })
    })
})

describe("Demo Constants", () => {
    it("should have correct max rows limit", () => {
        expect(MAX_DEMO_ROWS).toBe(50_000)
    })

    it("should have correct batch size", () => {
        expect(BATCH_SIZE).toBe(1_000)
    })

    it("should have correct insert amounts", () => {
        expect(INSERT_AMOUNTS).toEqual([10, 50, 100, 1000, 10000])
    })
})
