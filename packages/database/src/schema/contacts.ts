import {
    bigint,
    boolean,
    index,
    pgTable,
    text,
    varchar,
} from "drizzle-orm/pg-core"

export const contacts = pgTable(
    "contacts",
    {
        id: text("id").primaryKey(),
        name: varchar("name", { length: 255 }).notNull(),
        tel: varchar("tel", { length: 50 }),
        title: varchar("title", { length: 255 }),
        company: varchar("company", { length: 255 }),
        image: varchar("image", { length: 2048 }),
        is_test_contact: boolean("is_test_contact").notNull().default(false),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (table) => [index("contacts_updated_at_idx").on(table.updated_at, table.id)]
)

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
