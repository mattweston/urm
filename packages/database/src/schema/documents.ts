import {
    bigint,
    index,
    integer,
    jsonb,
    pgTable,
    text,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.ts"
import { domains } from "./domains.ts"
import { users } from "./users.ts"

export const internal_documents = pgTable(
    "internal_documents",
    {
        id: text("id").primaryKey(),
        organization_id: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        domain_id: text("domain_id").references(() => domains.id, {
            onDelete: "cascade",
        }),
        title: text("title").notNull(),
        content: text("content").notNull(),
        content_type: text("content_type").notNull(),
        status: text("status").notNull(),
        template_source: jsonb("template_source"),
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
        index("internal_documents_scope_updated_idx").on(
            table.organization_id,
            table.domain_id,
            table.updated_at,
            table.id
        ),
    ]
)

export const internal_document_templates = pgTable(
    "internal_document_templates",
    {
        id: text("id").primaryKey(),
        organization_id: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        description: text("description").notNull(),
        tags: text("tags").array().notNull(),
        title: text("title").notNull(),
        content: text("content").notNull(),
        content_type: text("content_type").notNull(),
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
        index("internal_document_templates_org_updated_idx").on(
            table.organization_id,
            table.updated_at,
            table.id
        ),
    ]
)
