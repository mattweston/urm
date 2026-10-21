/**
 * # Demo Database Seeding Utilities
 *
 * Provides functions to generate and insert fake demo data.
 * Used by UI buttons to add 10/50/100/1000/10000 rows (max 50,000).
 */

import { faker } from "@faker-js/faker"
import { sql } from "drizzle-orm"
import * as Effect from "effect/Effect"
import {
    DatabaseOperationError,
    databaseOperationError,
} from "../database-operation-error.ts"
import { contacts, type NewContact } from "../legacy-schema/contacts/index.ts"
import {
    todo_list_items,
    type NewTodoListItem,
} from "../legacy-schema/tasks/todo-list-items.ts"
import { DB } from "../services/database-service.ts"

const demoSeedError = (operation: string, cause?: unknown) =>
    databaseOperationError(operation, "Demo seed operation failed", cause)

/**
 * Maximum total rows allowed in demo database
 */
export const MAX_DEMO_ROWS = 50_000

/**
 * Batch size for inserts (PlanetScale-optimized)
 */
export const BATCH_SIZE = 1_000

/**
 * Generate a fake contact
 */
export const generateFakeContact = (_index: number): NewContact => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    email_verified: faker.datatype.boolean(0.7), // 70% verified
    image: faker.datatype.boolean(0.3) ? faker.image.avatar() : undefined,
    is_test_contact: false,
    created_at: Date.now(),
    updated_at: Date.now(),
    deleted_at: undefined,
})

/**
 * Generate a fake todo item
 */
export const generateFakeTodoItem = (
    index: number,
    contactIds: string[],
    domain_id: string
): NewTodoListItem => ({
    id: faker.string.uuid(),
    domain_id,
    text: faker.lorem.sentence({ min: 3, max: 10 }),
    completed: faker.datatype.boolean(0.3), // 30% completed
    status: faker.helpers.arrayElement([
        "todo",
        "in_progress",
        "done",
        "blocked",
        "archived",
    ]),
    priority: faker.helpers.arrayElement(["low", "medium", "high", "urgent"]),
    order: index,
    listId: faker.string.uuid(), // Each item gets its own list for simplicity
    createdByContactId: faker.helpers.arrayElement(contactIds),
    assigneeContactId: faker.helpers.arrayElement(contactIds),
    relationshipType: null,
    updatedAt: Date.now(),
    createdAt: faker.date.past({ years: 1 }).getTime(),
})

/**
 * Generate multiple fake contacts
 */
export const generateFakeContacts = (count: number): NewContact[] =>
    Array.from({ length: count }, (_, i) => generateFakeContact(i))

/**
 * Generate multiple fake todo items
 */
export const generateFakeTodos = (
    count: number,
    contactIds: string[],
    domain_id: string
): NewTodoListItem[] =>
    Array.from({ length: count }, (_, i) =>
        generateFakeTodoItem(i, contactIds, domain_id)
    )

/**
 * Chunk array into batches
 */
const chunkArray = <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size))
    }
    return chunks
}

/**
 * Count current rows in demo database
 */
export const countDemoRows = Effect.gen(function* () {
    const db = yield* DB

    const contact_count = yield* db
        .select({ count: sql`count(*)` })
        .from(contacts)
        .pipe(Effect.map((rows) => Number(rows[0]?.count ?? 0)))

    const todo_count = yield* db
        .select({ count: sql`count(*)` })
        .from(todo_list_items)
        .pipe(Effect.map((rows) => Number(rows[0]?.count ?? 0)))

    return {
        contacts: contact_count,
        todos: todo_count,
        total: contact_count + todo_count,
    }
}).pipe(Effect.mapError((cause) => demoSeedError("DemoSeed.countRows", cause)))

/**
 * Insert contacts in batches
 */
const insertContactsBatched = (
    contacts_to_insert: NewContact[]
): Effect.Effect<number, DatabaseOperationError, DB> =>
    Effect.gen(function* () {
        const db = yield* DB
        const batches = chunkArray(contacts_to_insert, BATCH_SIZE)
        let inserted = 0

        for (const batch of batches) {
            yield* db.insert(contacts).values(batch)
            inserted += batch.length
            yield* Effect.log(
                `Inserted ${inserted}/${contacts_to_insert.length} contacts`
            )
        }

        return inserted
    }).pipe(
        Effect.mapError((cause) =>
            demoSeedError("DemoSeed.insertContacts", cause)
        )
    )

/**
 * Insert todo items in batches
 */
const insertTodosBatched = (
    todos_to_insert: NewTodoListItem[]
): Effect.Effect<number, DatabaseOperationError, DB> =>
    Effect.gen(function* () {
        const db = yield* DB
        const batches = chunkArray(todos_to_insert, BATCH_SIZE)
        let inserted = 0

        for (const batch of batches) {
            yield* db.insert(todo_list_items).values(batch)
            inserted += batch.length
            yield* Effect.log(
                `Inserted ${inserted}/${todos_to_insert.length} todos`
            )
        }

        return inserted
    }).pipe(
        Effect.mapError((cause) => demoSeedError("DemoSeed.insertTodos", cause))
    )

/**
 * Add demo data to database
 */
export const addDemoData = (
    domain_id: string,
    contact_count: number,
    todo_count: number
): Effect.Effect<
    { contacts: number; todos: number },
    DatabaseOperationError,
    DB
> =>
    Effect.gen(function* () {
        // Check current count
        const current = yield* countDemoRows
        const requested_total = contact_count + todo_count

        if (current.total + requested_total > MAX_DEMO_ROWS) {
            const allowed = MAX_DEMO_ROWS - current.total
            return yield* Effect.fail(
                databaseOperationError(
                    "DemoSeed.addData",
                    `Cannot add ${requested_total} rows. ` +
                        `Current: ${current.total}, Max: ${MAX_DEMO_ROWS}, ` +
                        `Allowed: ${allowed}`
                )
            )
        }

        yield* Effect.log(
            `Adding ${contact_count} contacts and ${todo_count} todos...`
        )

        const fake_contacts = generateFakeContacts(contact_count)
        const contact_ids = fake_contacts.map((contact) => contact.id)

        const inserted_contacts = yield* insertContactsBatched(fake_contacts)

        const fake_todos = generateFakeTodos(todo_count, contact_ids, domain_id)
        const inserted_todos = yield* insertTodosBatched(fake_todos)

        yield* Effect.log(
            `Demo data added: ${inserted_contacts} contacts, ${inserted_todos} todos`
        )

        return {
            contacts: inserted_contacts,
            todos: inserted_todos,
        }
    })

/**
 * Clear all demo data
 */
export const clearDemoData = Effect.gen(function* () {
    const db = yield* DB

    yield* Effect.log("Clearing demo data...")

    // Delete in reverse order of FK dependencies
    yield* db.delete(todo_list_items)
    yield* db.delete(contacts)

    yield* Effect.log("Demo data cleared")

    return { cleared: true }
}).pipe(Effect.mapError((cause) => demoSeedError("DemoSeed.clearData", cause)))

/**
 * Predefined insert amounts for UI buttons
 */
export const INSERT_AMOUNTS = [10, 50, 100, 1000, 10000] as const

/**
 * Add demo data with preset amounts
 *
 * Ratio: 10% contacts, 90% todos
 */
export const addDemoDataPreset = (
    domain_id: string,
    amount: (typeof INSERT_AMOUNTS)[number]
): Effect.Effect<
    { contacts: number; todos: number },
    DatabaseOperationError,
    DB
> => {
    const contact_count = Math.max(1, Math.floor(amount * 0.1))
    const todo_count = amount - contact_count

    return addDemoData(domain_id, contact_count, todo_count)
}
