import {
    pgTable,
    varchar,
    integer,
    pgEnum,
    json,
    bigint,
} from "drizzle-orm/pg-core"
import { orders } from "./orders.ts"

export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
    "unfulfilled",
    "partial",
    "fulfilled",
    "cancelled",
])

export const order_items = pgTable("order_items", {
    id: varchar("id", { length: 255 }).primaryKey(),
    orderId: varchar("order_id", { length: 255 })
        .notNull()
        .references(() => orders.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 255 }).notNull(),
    productVariantId: varchar("product_variant_id", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    totalPrice: integer("total_price").notNull(),
    productName: varchar("product_name", { length: 500 }).notNull(),
    productSlug: varchar("product_slug", { length: 500 }).notNull(),
    productImageUrl: varchar("product_image_url", { length: 2048 }).notNull(),
    variantName: varchar("variant_name", { length: 255 }).notNull(),
    variantOptions: json("variant_options")
        .$type<Record<string, string>>()
        .notNull()
        .default({}),
    fulfillmentStatus: fulfillmentStatusEnum("fulfillment_status")
        .notNull()
        .default("unfulfilled"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
})

export type OrderItem = typeof order_items.$inferSelect
export type NewOrderItem = typeof order_items.$inferInsert
