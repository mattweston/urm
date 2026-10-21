import { sql } from "drizzle-orm"
import {
    bigint,
    boolean,
    check,
    foreignKey,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
import { organizations } from "./organizations.ts"
import { users } from "./users.ts"

export const forms = pgTable(
    "forms",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        slug: text("slug").notNull(),
        status: text("status").notNull().default("draft"),
        submission_count: integer("submission_count").notNull().default(0),
        template_source: jsonb("template_source"),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (t) => [
        uniqueIndex("forms_domain_id_unique").on(t.domain_id, t.id),
        uniqueIndex("forms_domain_slug_unique").on(t.domain_id, t.slug),
        index("forms_domain_updated_idx").on(t.domain_id, t.updated_at, t.id),
        check("forms_status_check", sql`${t.status} IN ('draft','published')`),
        check("forms_submission_count_check", sql`${t.submission_count} >= 0`),
    ]
)

export const form_fields = pgTable(
    "form_fields",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id").notNull(),
        form_id: text("form_id").notNull(),
        component_id: text("component_id").notNull(),
        kind: text("kind").notNull(),
        href: text("href"),
        name: text("name").notNull(),
        label: text("label").notNull(),
        description: text("description").notNull(),
        placeholder: text("placeholder").notNull(),
        required: boolean("required").notNull(),
        options: jsonb("options").notNull(),
        order_position: integer("order_position").notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (t) => [
        foreignKey({
            columns: [t.domain_id, t.form_id],
            foreignColumns: [forms.domain_id, forms.id],
        }).onDelete("cascade"),
        uniqueIndex("form_fields_form_order_unique").on(
            t.form_id,
            t.order_position
        ),
        uniqueIndex("form_fields_form_component_unique").on(
            t.form_id,
            t.component_id
        ),
        index("form_fields_domain_form_idx").on(
            t.domain_id,
            t.form_id,
            t.order_position
        ),
        check(
            "form_fields_order_check",
            sql`${t.order_position} BETWEEN 0 AND 99`
        ),
    ]
)

export const form_templates = pgTable(
    "form_templates",
    {
        id: text("id").primaryKey(),
        organization_id: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        description: text("description").notNull(),
        tags: text("tags").array().notNull(),
        fields: jsonb("fields").notNull(),
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
    (t) => [
        index("form_templates_org_updated_idx").on(
            t.organization_id,
            t.updated_at,
            t.id
        ),
        check("form_templates_revision_check", sql`${t.revision} >= 1`),
    ]
)
