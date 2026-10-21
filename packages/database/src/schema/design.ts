import { sql } from "drizzle-orm"
import {
    bigint,
    check,
    index,
    integer,
    jsonb,
    pgTable,
    text,
} from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
import { organizations } from "./organizations.ts"
import { users } from "./users.ts"

export const logos = pgTable(
    "logos",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id").references(() => domains.id, {
            onDelete: "cascade",
        }),
        organization_id: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        scene: jsonb("scene").notNull(),
        revision: integer("revision").notNull(),
        created_by_user_id: text("created_by_user_id")
            .notNull()
            .references(() => users.id),
        updated_by_user_id: text("updated_by_user_id")
            .notNull()
            .references(() => users.id),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => [
        index("logos_domain_updated_idx").on(
            table.domain_id,
            table.updated_at,
            table.id
        ),
        index("logos_org_updated_idx").on(
            table.organization_id,
            table.updated_at,
            table.id
        ),
        check("logos_revision_check", sql`${table.revision} >= 1`),
        check("logos_name_length_check", sql`length(${table.name}) BETWEEN 1 AND 160`),
    ]
)

export const landing_templates = pgTable(
    "landing_templates",
    {
        id: text("id").primaryKey(),
        organization_id: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        description: text("description"),
        category: text("category"),
        tags: text("tags").array(),
        document: jsonb("document").notNull(),
        revision: integer("revision").notNull(),
        created_by_user_id: text("created_by_user_id")
            .notNull()
            .references(() => users.id),
        updated_by_user_id: text("updated_by_user_id")
            .notNull()
            .references(() => users.id),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => [
        index("landing_templates_org_updated_idx").on(
            table.organization_id,
            table.updated_at,
            table.id
        ),
        check("landing_templates_revision_check", sql`${table.revision} >= 1`),
    ]
)
