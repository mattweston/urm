/**
 * # Contacts schema
 *
 * Deep module: Simple interface, exported table and types
 */

import { sql } from "drizzle-orm"
import {
    boolean,
    integer,
    pgTable,
    uniqueIndex,
    varchar,
    bigint,
} from "drizzle-orm/pg-core"

export const contacts = pgTable(
    "contacts",
    {
        // Primary key - external ID for compatibility
        id: varchar("id", { length: 255 }).primaryKey(),

        // Contact info
        name: varchar("name", { length: 255 }).notNull(),
        email: varchar("email", { length: 255 }),
        tel: varchar("tel", { length: 50 }),
        title: varchar("title", { length: 255 }),
        company: varchar("company", { length: 255 }),
        image: varchar("image", { length: 2048 }),
        email_verified: boolean("email_verified").notNull().default(false),
        is_test_contact: boolean("is_test_contact").notNull().default(false),

        // Timestamps
        created_at: bigint("created_at", { mode: "number" })
            .notNull()
            .default(0),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        deleted_at: integer("deleted_at"),
    },
    (table) => ({
        unique_email: uniqueIndex("contacts_email_unique")
            .on(table.email)
            .where(
                sql`${table.email} is not null and ${table.deleted_at} is null`
            ),
    })
)

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
