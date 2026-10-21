import { sql } from "drizzle-orm"
import {
    bigint,
    boolean,
    foreignKey,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.ts"
import { domains, publication_status, publication_access } from "./domains.ts"
import { users } from "./users.ts"

export const subdomains = pgTable(
    "subdomains",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        slug: text("slug").notNull(),
        kind: text("kind").notNull(),
        status: publication_status("status").notNull(),
        access: publication_access("access").notNull(),
        expires_at: bigint("expires_at", { mode: "number" }),
        live_release_id: text("live_release_id"),
        live_deployment_id: text("live_deployment_id"),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => [
        uniqueIndex("subdomains_domain_slug_unique").on(
            table.domain_id,
            table.slug
        ),
        uniqueIndex("subdomains_domain_id_unique").on(
            table.domain_id,
            table.id
        ),
    ]
)

export const blog_posts = pgTable(
    "blog_posts",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        content: text("content").notNull(),
        content_type: text("content_type").notNull(),
        excerpt: text("excerpt"),
        seo_title: text("seo_title"),
        seo_description: text("seo_description"),
        editorial_state: text("editorial_state").notNull(),
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
        uniqueIndex("blog_posts_domain_id_unique").on(
            table.domain_id,
            table.id
        ),
        index("blog_posts_domain_updated_idx").on(
            table.domain_id,
            table.updated_at,
            table.id
        ),
    ]
)

export const publication_blog_posts = pgTable(
    "publication_blog_posts",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        subdomain_id: text("subdomain_id"),
        blog_post_id: text("blog_post_id").notNull(),
        slug: text("slug").notNull(),
        publication_state: text("publication_state").notNull(),
        published_at: bigint("published_at", { mode: "number" }),
        is_featured: boolean("is_featured").notNull(),
        order_position: integer("order_position").notNull(),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.domain_id, table.blog_post_id],
            foreignColumns: [blog_posts.domain_id, blog_posts.id],
        }),
        foreignKey({
            columns: [table.domain_id, table.subdomain_id],
            foreignColumns: [subdomains.domain_id, subdomains.id],
        }),
        uniqueIndex("publication_blog_root_slug_unique")
            .on(table.domain_id, table.slug)
            .where(sql`${table.subdomain_id} IS NULL`),
        uniqueIndex("publication_blog_subdomain_slug_unique")
            .on(table.domain_id, table.subdomain_id, table.slug)
            .where(sql`${table.subdomain_id} IS NOT NULL`),
        uniqueIndex("publication_blog_root_post_unique")
            .on(table.domain_id, table.blog_post_id)
            .where(sql`${table.subdomain_id} IS NULL`),
        uniqueIndex("publication_blog_subdomain_post_unique")
            .on(table.domain_id, table.subdomain_id, table.blog_post_id)
            .where(sql`${table.subdomain_id} IS NOT NULL`),
        index("publication_blog_owner_order_idx").on(
            table.domain_id,
            table.subdomain_id,
            table.order_position,
            table.id
        ),
    ]
)
export const blog_templates = pgTable(
    "blog_templates",
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
        excerpt: text("excerpt"),
        seo_title: text("seo_title"),
        seo_description: text("seo_description"),
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
        index("blog_templates_org_updated_idx").on(
            table.organization_id,
            table.updated_at,
            table.id
        ),
    ]
)
