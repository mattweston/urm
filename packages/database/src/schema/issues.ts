import {
    pgTable,
    text,
    bigint,
    doublePrecision,
    index,
} from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
export const issues = pgTable(
    "issues",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        content: text("content"),
        status: text("status").notNull(),
        priority: text("priority"),
        assignee_id: text("assignee_id"),
        order_position: doublePrecision("order_position").notNull(),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => [
        index("issues_domain_order_idx").on(
            table.domain_id,
            table.order_position,
            table.id
        ),
    ]
)
