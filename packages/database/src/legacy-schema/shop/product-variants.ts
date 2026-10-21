import {
    pgTable,
    varchar,
    integer,
    boolean,
    json,
    bigint,
} from "drizzle-orm/pg-core"
import { products } from "./products.ts"

export const product_variants = pgTable("product_variants", {
    id: varchar("id", { length: 255 }).primaryKey(),
    productId: varchar("product_id", { length: 255 })
        .notNull()
        .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    stock: integer("stock").notNull().default(0),
    options: json("options")
        .$type<Record<string, string>>()
        .notNull()
        .default({}),
    priceOverride: integer("price_override"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
})

export type ProductVariant = typeof product_variants.$inferSelect
export type NewProductVariant = typeof product_variants.$inferInsert
