import {
    pgTable,
    varchar,
    boolean,
    index,
    uniqueIndex,
    uuid,
    bigint,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"

export const customers = pgTable(
    "customers",
    {
        id: varchar("id", { length: 255 }).primaryKey(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        contactId: varchar("contact_id", { length: 255 }),
        email: varchar("email", { length: 255 }).notNull(),
        firstName: varchar("first_name", { length: 255 }),
        lastName: varchar("last_name", { length: 255 }),
        phone: varchar("phone", { length: 50 }),
        stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: bigint("created_at", { mode: "number" }).notNull(),
        updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
        deletedAt: bigint("deleted_at", { mode: "number" }),
    },
    (table) => ({
        domain_email: uniqueIndex("customers_domain_email_unique").on(
            table.domain_id,
            table.email
        ),
        domain_updated: index("customers_domain_updated_idx").on(
            table.domain_id,
            table.updatedAt
        ),
    })
)

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
