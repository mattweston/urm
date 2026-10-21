import { sql } from "drizzle-orm"
import {
    bigint,
    boolean,
    check,
    index,
    pgTable,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { contacts } from "./contacts.ts"

export const contact_email_addresses = pgTable(
    "contact_email_addresses",
    {
        id: text("id").primaryKey(),
        contact_id: text("contact_id")
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        email: text("email").notNull(),
        is_primary: boolean("is_primary").notNull(),
        verified_at: bigint("verified_at", { mode: "number" }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => [
        uniqueIndex("contact_email_addresses_email_unique").on(table.email),
        uniqueIndex("contact_email_addresses_primary_unique")
            .on(table.contact_id)
            .where(sql`${table.is_primary}`),
        index("contact_email_addresses_contact_updated_idx").on(
            table.contact_id,
            table.updated_at,
            table.id
        ),
        check(
            "contact_email_addresses_email_normalized",
            sql`${table.email} = lower(btrim(${table.email}))`
        ),
    ]
)

export type ContactEmailAddress = typeof contact_email_addresses.$inferSelect
export type NewContactEmailAddress = typeof contact_email_addresses.$inferInsert
