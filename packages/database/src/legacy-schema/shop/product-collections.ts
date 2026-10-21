import {
    pgTable,
    varchar,
    boolean,
    text,
    index,
    uniqueIndex,
    uuid,
    bigint,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"

export const product_collections = pgTable(
    "product_collections",
    {
        id: varchar("id", { length: 255 }).primaryKey(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 255 }).notNull(),
        slug: varchar("slug", { length: 500 }).notNull(),
        description: text("description"),
        imageUrl: varchar("image_url", { length: 2048 }),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: bigint("created_at", { mode: "number" }).notNull(),
        updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
        deletedAt: bigint("deleted_at", { mode: "number" }),
    },
    (table) => ({
        domain_slug: uniqueIndex("product_collections_domain_slug_unique").on(
            table.domain_id,
            table.slug
        ),
        domain_updated: index("product_collections_domain_updated_idx").on(
            table.domain_id,
            table.updatedAt
        ),
    })
)

export type ProductCollection = typeof product_collections.$inferSelect
export type NewProductCollection = typeof product_collections.$inferInsert
