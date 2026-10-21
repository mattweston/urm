/**
 * # Issue labels schema
 */

import {
    pgTable,
    varchar,
    bigint,
    text,
    uuid,
    index,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"

export const issue_labels = pgTable(
    "issue_labels",
    {
        // Primary key - external ID
        id: varchar("id", { length: 255 }).primaryKey(),

        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),

        // Label definition
        name: varchar("name", { length: 255 }).notNull(),
        color: varchar("color", { length: 50 }).notNull(),
        description: text("description"),

        // Timestamps
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => ({
        domain_updated: index("issue_labels_domain_updated_idx").on(
            table.domain_id,
            table.updated_at
        ),
    })
)

export type IssueLabel = typeof issue_labels.$inferSelect
export type NewIssueLabel = typeof issue_labels.$inferInsert
