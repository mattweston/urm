/**
 * # Todo list items schema
 */

import {
    pgTable,
    varchar,
    boolean,
    integer,
    bigint,
    uuid,
    index,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"

export const todo_list_items = pgTable(
    "todo_list_items",
    {
        id: varchar("id", { length: 255 }).primaryKey(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        text: varchar("text", { length: 1000 }).notNull(),
        completed: boolean("completed").notNull().default(false),
        status: varchar("status", { length: 50 }).notNull(),
        priority: varchar("priority", { length: 50 }),
        order: integer("order").notNull().default(0),
        listId: varchar("list_id", { length: 255 }).notNull(),
        createdByContactId: varchar("created_by_contact_id", { length: 255 }),
        assigneeContactId: varchar("assignee_contact_id", { length: 255 }),
        relationshipType: varchar("relationship_type", { length: 64 }),
        updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
        createdAt: bigint("created_at", { mode: "number" }).notNull(),
    },
    (table) => ({
        domain_list_order: index("todo_list_items_domain_list_order_idx").on(
            table.domain_id,
            table.listId,
            table.order
        ),
    })
)

export type TodoListItem = typeof todo_list_items.$inferSelect
export type NewTodoListItem = typeof todo_list_items.$inferInsert
