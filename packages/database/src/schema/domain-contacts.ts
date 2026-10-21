import {
    bigint,
    index,
    pgEnum,
    pgTable,
    text,
    uniqueIndex,
    varchar,
} from "drizzle-orm/pg-core"
import { contacts } from "./contacts.ts"
import { domains } from "./domains.ts"

export const domain_contact_status = pgEnum("domain_contact_status", [
    "active",
    "archived",
])

export const domain_contacts = pgTable(
    "domain_contacts",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        contact_id: text("contact_id")
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        status: domain_contact_status("status").notNull(),
        source: varchar("source", { length: 64 }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (table) => [
        uniqueIndex("domain_contacts_domain_contact_unique").on(
            table.domain_id,
            table.contact_id
        ),
        index("domain_contacts_domain_updated_idx").on(
            table.domain_id,
            table.updated_at,
            table.id
        ),
        index("domain_contacts_contact_updated_idx").on(
            table.contact_id,
            table.updated_at,
            table.id
        ),
    ]
)

export type DomainContact = typeof domain_contacts.$inferSelect
export type NewDomainContact = typeof domain_contacts.$inferInsert
