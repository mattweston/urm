/**
 * Issues schema - Issue tracking
 *
 * Deep module: Simple interface, exported table and types
 */

import {
    pgTable,
    varchar,
    integer,
    text,
    bigint,
    pgEnum,
    uuid,
    index,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"

export const issueStatusEnum = pgEnum("issue_status", [
    "backlog",
    "todo",
    "in_progress",
    "done",
    "cancelled",
])

export const issuePriorityEnum = pgEnum("issue_priority", [
    "low",
    "medium",
    "high",
    "urgent",
])

export const issues = pgTable(
    "issues",
    {
        // Primary key - external ID
        id: varchar("id", { length: 255 }).primaryKey(),

        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),

        // Issue content
        title: varchar("title", { length: 500 }).notNull(),
        description: text("description"),
        content: text("content"),

        // Status and priority
        status: issueStatusEnum("status").notNull().default("backlog"),
        priority: issuePriorityEnum("priority"),
        labels: varchar("labels", { length: 1000 }),

        // Assignment
        assignee_id: varchar("assignee_id", { length: 255 }),

        // Ordering
        order_position: integer("order_position").notNull().default(0),

        // Timestamps
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (table) => ({
        domain_updated: index("issues_domain_updated_idx").on(
            table.domain_id,
            table.updated_at
        ),
    })
)

export type Issue = typeof issues.$inferSelect
export type NewIssue = typeof issues.$inferInsert
