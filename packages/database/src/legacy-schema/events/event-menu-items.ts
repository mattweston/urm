/**
 * # Event Menu Items Schema
 */

import {
    pgTable,
    varchar,
    boolean,
    bigint,
    text,
    pgEnum,
} from "drizzle-orm/pg-core"
import { events } from "./events.ts"

export const menuCategoryEnum = pgEnum("menu_category", [
    "appetizer",
    "main",
    "dessert",
    "drink",
    "special",
])

export const event_menu_items = pgTable("event_menu_items", {
    // Primary key - external ID
    id: varchar("id", { length: 255 }).primaryKey(),
    event_id: varchar("event_id", { length: 255 })
        .notNull()
        .references(() => events.id, { onDelete: "cascade" }),

    // Item info
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    content: text("content"),

    // Pricing
    price: bigint("price", { mode: "number" }).notNull(), // In cents

    // Category
    category: menuCategoryEnum("category").notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),

    // Media
    image_url: varchar("image_url", { length: 2048 }),

    // Dietary info
    dietary_labels: varchar("dietary_labels", { length: 500 }),
    allergens: varchar("allergens", { length: 500 }),

    // Status
    published: boolean("published").notNull().default(false),

    // Ordering
    order_position: bigint("order_position", { mode: "number" })
        .notNull()
        .default(0),

    // Timestamps
    updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    deleted_at: bigint("deleted_at", { mode: "number" }),
})

export type EventMenuItem = typeof event_menu_items.$inferSelect
export type NewEventMenuItem = typeof event_menu_items.$inferInsert
