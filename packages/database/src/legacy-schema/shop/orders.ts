import {
    pgTable,
    varchar,
    integer,
    pgEnum,
    json,
    index,
    uniqueIndex,
    uuid,
    bigint,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { domains } from "../domains/index.ts"
import { customers } from "./customers.ts"

export const orderStatusEnum = pgEnum("order_status", [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
])

export type Address = {
    first_name?: string
    last_name?: string
    company?: string
    line1: string
    line2?: string
    city: string
    province: string
    country: string
    postal: string
    phone?: string
}

export const orders = pgTable(
    "orders",
    {
        id: varchar("id", { length: 255 }).primaryKey(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        number: integer("number")
            .notNull()
            .default(sql`nextval('orders_number_seq')`),
        sessionId: varchar("session_id", { length: 255 }),
        customerId: varchar("customer_id", { length: 255 }).references(
            () => customers.id,
            { onDelete: "set null" }
        ),
        email: varchar("customer_email", { length: 255 }).notNull(),
        currency: varchar("currency", { length: 10 }).notNull().default("USD"),
        subtotal: integer("subtotal").notNull(),
        taxAmount: integer("tax_amount"),
        shippingAmount: integer("shipping_amount"),
        discountAmount: integer("discount_amount"),
        totalPrice: integer("total").notNull(),
        billingAddress: json("billing_address").$type<Address>().notNull(),
        shippingAddress: json("shipping_address").$type<Address>().notNull(),
        status: orderStatusEnum("status").notNull().default("pending"),
        stripePaymentIntentId: varchar("stripe_payment_intent_id", {
            length: 255,
        }),
        stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
        stripeCheckoutSessionId: varchar("stripe_checkout_session_id", {
            length: 255,
        }),
        shippingTrackingNumber: varchar("shipping_tracking_number", {
            length: 255,
        }),
        shippingCarrier: varchar("shipping_carrier", { length: 100 }),
        shippedAt: bigint("shipped_at", { mode: "number" }),
        deliveredAt: bigint("delivered_at", { mode: "number" }),
        createdAt: bigint("created_at", { mode: "number" }).notNull(),
        updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
        deletedAt: bigint("deleted_at", { mode: "number" }),
    },
    (table) => ({
        domain_number: uniqueIndex("orders_domain_number_unique").on(
            table.domain_id,
            table.number
        ),
        domain_created: index("orders_domain_created_idx").on(
            table.domain_id,
            table.createdAt
        ),
        domain_session_created: index("orders_domain_session_created_idx").on(
            table.domain_id,
            table.sessionId,
            table.createdAt
        ),
    })
)

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
