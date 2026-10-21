import {
    pgTable,
    varchar,
    boolean,
    integer,
    index,
    uniqueIndex,
    uuid,
    bigint,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"
import { customers } from "./customers.ts"

export const carts = pgTable(
    "carts",
    {
        id: varchar("id", { length: 255 }).primaryKey(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        sessionId: varchar("session_id", { length: 255 }),
        customerId: varchar("customer_id", { length: 255 }).references(
            () => customers.id,
            { onDelete: "set null" }
        ),
        contactId: varchar("contact_id", { length: 255 }),
        currency: varchar("currency", { length: 10 }).notNull().default("USD"),
        totalItems: integer("total_items"),
        selectedItems: integer("selected_items"),
        totalValue: integer("total_value"),
        selectedValue: integer("selected_value"),
        lastActivity: bigint("last_activity", { mode: "number" }),
        isAbandoned: boolean("is_abandoned").default(false),
        abandonedAt: bigint("abandoned_at", { mode: "number" }),
        createdAt: bigint("created_at", { mode: "number" }).notNull(),
        updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => ({
        domain_session: index("carts_domain_session_idx").on(
            table.domain_id,
            table.sessionId
        ),
        domain_session_unique: uniqueIndex("carts_domain_session_unique").on(
            table.domain_id,
            table.sessionId
        ),
    })
)

export type Cart = typeof carts.$inferSelect
export type NewCart = typeof carts.$inferInsert
