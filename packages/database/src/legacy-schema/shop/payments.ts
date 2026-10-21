import {
    pgTable,
    varchar,
    integer,
    pgEnum,
    text,
    bigint,
} from "drizzle-orm/pg-core"
import { orders } from "./orders.ts"

export const paymentStatusEnum = pgEnum("payment_status", [
    "pending",
    "processing",
    "succeeded",
    "failed",
    "cancelled",
])

export const payments = pgTable("payments", {
    id: varchar("id", { length: 255 }).primaryKey(),
    text: text("text").notNull(),
    stripeId: varchar("stripe_id", { length: 255 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", {
        length: 255,
    }),
    orderId: varchar("order_id", { length: 255 })
        .notNull()
        .references(() => orders.id, { onDelete: "cascade" }),
    messageId: varchar("message_id", { length: 255 }),
    amount: integer("amount"),
    currency: varchar("currency", { length: 10 }),
    status: paymentStatusEnum("status").notNull().default("pending"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
})

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
