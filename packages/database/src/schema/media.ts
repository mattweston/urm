import {
    bigint,
    doublePrecision,
    index,
    pgTable,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
const timestamp = (name: string) => bigint(name, { mode: "number" }).notNull()
export const images = pgTable(
    "images",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        url: text("url").notNull(),
        alt: text("alt").notNull(),
        text: text("text").notNull(),
        width: doublePrecision("width"),
        height: doublePrecision("height"),
        category: text("category"),
        order_position: doublePrecision("order_position").notNull(),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
    },
    (table) => [
        index("images_domain_updated_idx").on(
            table.domain_id,
            table.updated_at,
            table.id
        ),
    ]
)
export const videos = pgTable(
    "videos",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        slug: text("slug").notNull(),
        title: text("title").notNull(),
        embed_url: text("embed_url").notNull(),
        thumbnail_src: text("thumbnail_src").notNull(),
        youtube_id: text("youtube_id"),
        order_position: doublePrecision("order_position").notNull(),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
    },
    (table) => [
        uniqueIndex("videos_domain_slug_unique").on(
            table.domain_id,
            table.slug
        ),
        index("videos_domain_order_idx").on(
            table.domain_id,
            table.order_position,
            table.id
        ),
    ]
)
export const tags = pgTable(
    "tags",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        color: text("color").notNull(),
        description: text("description"),
        kind: text("kind"),
        target_key: text("target_key"),
        deleted_at: bigint("deleted_at", { mode: "number" }),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
    },
    (table) => [
        uniqueIndex("tags_domain_name_unique").on(table.domain_id, table.name),
        index("tags_domain_updated_idx").on(
            table.domain_id,
            table.updated_at,
            table.id
        ),
    ]
)
export const entity_tags = pgTable(
    "entity_tags",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        entity_type: text("entity_type").notNull(),
        entity_id: text("entity_id").notNull(),
        tag_id: text("tag_id")
            .notNull()
            .references(() => tags.id, { onDelete: "cascade" }),
        created_at: timestamp("created_at"),
        updated_at: timestamp("updated_at"),
    },
    (table) => [
        uniqueIndex("entity_tags_link_unique").on(
            table.domain_id,
            table.entity_type,
            table.entity_id,
            table.tag_id
        ),
    ]
)
