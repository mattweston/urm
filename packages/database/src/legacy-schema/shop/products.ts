import {
    pgTable,
    varchar,
    integer,
    boolean,
    index,
    text,
    uniqueIndex,
    uuid,
    json,
    bigint,
} from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"
import { images } from "../media/images.ts"

export const products = pgTable(
    "products",
    {
        id: varchar("id", { length: 255 }).primaryKey(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 500 }).notNull(),
        slug: varchar("slug", { length: 500 }).notNull(),
        tagline: varchar("tagline", { length: 500 }),
        description: text("description"),
        price: integer("price").notNull(),
        discount: integer("discount"),
        imageUrl: varchar("image_url", { length: 2048 }).notNull(),
        image_id: varchar("image_id", { length: 255 }).references(
            () => images.id,
            {
                onDelete: "set null",
            }
        ),
        images: json("images").$type<string[]>().notNull().default([]),
        collectionIds: json("collection_ids").$type<string[]>(),
        isActive: boolean("is_active").notNull().default(true),
        isFeatured: boolean("is_featured").default(false),
        createdAt: bigint("created_at", { mode: "number" }).notNull(),
        updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
        deletedAt: bigint("deleted_at", { mode: "number" }),
    },
    (table) => ({
        domain_slug: uniqueIndex("products_domain_slug_unique").on(
            table.domain_id,
            table.slug
        ),
        domain_updated: index("products_domain_updated_idx").on(
            table.domain_id,
            table.updatedAt
        ),
        image: index("products_image_id_idx").on(table.image_id),
    })
)

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
