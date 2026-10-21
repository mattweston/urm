import { pgTable, varchar, integer, json, bigint } from "drizzle-orm/pg-core"
import { carts } from "./carts.ts"

export const cart_items = pgTable("cart_items", {
    id: varchar("id", { length: 255 }).primaryKey(),
    cartId: varchar("cart_id", { length: 255 })
        .notNull()
        .references(() => carts.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 255 }).notNull(),
    productVariantId: varchar("product_variant_id", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    productName: varchar("product_name", { length: 500 }).notNull(),
    productSlug: varchar("product_slug", { length: 500 }).notNull(),
    productImageUrl: varchar("product_image_url", { length: 2048 }).notNull(),
    productPrice: integer("product_price").notNull(),
    variantName: varchar("variant_name", { length: 255 }).notNull(),
    variantOptions: json("variant_options")
        .$type<Record<string, string>>()
        .notNull()
        .default({}),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
})

export type CartItem = typeof cart_items.$inferSelect
export type NewCartItem = typeof cart_items.$inferInsert
