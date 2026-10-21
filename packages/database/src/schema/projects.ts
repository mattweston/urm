import {
    pgTable,
    text,
    bigint,
    doublePrecision,
    index,
    uniqueIndex,
    foreignKey,
} from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
export const projects = pgTable(
    "projects",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        slug: text("slug").notNull(),
        status: text("status").notNull(),
        order: doublePrecision("order").notNull(),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (t) => [
        uniqueIndex("projects_domain_slug_unique").on(t.domain_id, t.slug),
        uniqueIndex("projects_domain_id_unique").on(t.domain_id, t.id),
        index("projects_domain_order_idx").on(t.domain_id, t.order, t.id),
    ]
)
export const tasks = pgTable(
    "tasks",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id").notNull(),
        project_id: text("project_id").notNull(),
        title: text("title").notNull(),
        status: text("status").notNull(),
        order: doublePrecision("order").notNull(),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (t) => [
        foreignKey({
            columns: [t.domain_id, t.project_id],
            foreignColumns: [projects.domain_id, projects.id],
        }).onDelete("cascade"),
        index("tasks_project_order_idx").on(
            t.domain_id,
            t.project_id,
            t.order,
            t.id
        ),
    ]
)
