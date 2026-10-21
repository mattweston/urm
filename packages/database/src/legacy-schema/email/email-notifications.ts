/*
 * Email notifications schema
 */

import { sql } from "drizzle-orm"
import {
    bigint,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core"
import { contacts } from "../contacts/index.ts"
import { domains } from "../domains/index.ts"
import { platform_newsletter_sends } from "./platform-newsletter.ts"

export const email_type = pgEnum("email_type", [
    "order_confirmation",
    "order_shipped",
    "order_delivered",
    "payment_success",
    "payment_failed",
    "test_email",
])

export const email_status = pgEnum("email_status", [
    "queued",
    "sent",
    "delivered",
    "bounced",
    "complained",
    "failed",
])

export const email_notifications = pgTable("email_notifications", {
    // Primary key
    id: varchar("id", { length: 255 }).primaryKey(),

    // Email identity (Resend email ID)
    email_id: varchar("email_id", { length: 255 }).notNull(),

    // Recipient info
    to: varchar("to", { length: 255 }).notNull(),
    from: varchar("from", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),

    // Email type
    type: email_type("type").notNull(),

    // Related entities
    order_id: varchar("order_id", { length: 255 }),
    customer_id: varchar("customer_id", { length: 255 }),

    // Status
    status: email_status("status").notNull().default("queued"),

    // Error info
    error_message: varchar("error_message", { length: 1000 }),

    // Timestamps
    created_at: integer("created_at").notNull(),
    updated_at: integer("updated_at").notNull(),
})

export const email_deliveries = pgTable(
    "email_deliveries",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        domain_id: uuid("domain_id").references(() => domains.id, {
            onDelete: "cascade",
        }),
        template_id: varchar("template_id", { length: 255 }).notNull(),
        purpose: varchar("purpose", { length: 255 }).notNull(),
        provider: varchar("provider", { length: 255 }).notNull(),
        provider_message_id: varchar("provider_message_id", { length: 255 }),
        provider_status: varchar("provider_status", { length: 255 }),
        status: varchar("status", { length: 64 }).notNull().default("queued"),
        newsletter_send_id: uuid("newsletter_send_id").references(
            () => email_newsletter_sends.id,
            { onDelete: "set null" }
        ),
        platform_newsletter_send_id: uuid(
            "platform_newsletter_send_id"
        ).references(() => platform_newsletter_sends.id, {
            onDelete: "set null",
        }),
        contact_id: varchar("contact_id", { length: 255 }).references(
            () => contacts.id,
            { onDelete: "set null" }
        ),
        to_hash: varchar("to_hash", { length: 64 }).notNull(),
        to_domain: varchar("to_domain", { length: 255 }),
        subject: varchar("subject", { length: 500 }).notNull(),
        error_class: varchar("error_class", { length: 255 }),
        error_message: varchar("error_message", { length: 1000 }),
        idempotency_key: varchar("idempotency_key", { length: 255 }),
        metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        queued_at: bigint("queued_at", { mode: "number" }),
        sent_at: bigint("sent_at", { mode: "number" }),
        failed_at: bigint("failed_at", { mode: "number" }),
        skipped_at: bigint("skipped_at", { mode: "number" }),
    },
    (table) => ({
        status_created: index("email_deliveries_status_created_idx").on(
            table.status,
            table.created_at
        ),
        purpose_created: index("email_deliveries_purpose_created_idx").on(
            table.purpose,
            table.created_at
        ),
        newsletter_send_created: index(
            "email_deliveries_newsletter_send_created_idx"
        ).on(table.newsletter_send_id, table.created_at),
        platform_newsletter_send_created: index(
            "email_deliveries_platform_newsletter_send_created_idx"
        ).on(table.platform_newsletter_send_id, table.created_at),
        contact_created: index("email_deliveries_contact_created_idx").on(
            table.contact_id,
            table.created_at
        ),
        to_hash_created: index("email_deliveries_to_hash_created_idx").on(
            table.to_hash,
            table.created_at
        ),
        domain_created: index("email_deliveries_domain_created_idx").on(
            table.domain_id,
            table.created_at
        ),
        idempotency_unique: uniqueIndex(
            "email_deliveries_idempotency_key_unique"
        ).on(table.idempotency_key),
    })
)

export const email_newsletter_sends = pgTable(
    "email_newsletter_sends",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 255 }).notNull(),
        template_id: varchar("template_id", { length: 255 }).notNull(),
        subject: varchar("subject", { length: 500 }).notNull(),
        status: varchar("status", { length: 64 }).notNull().default("queued"),
        created_by_contact_id: varchar("created_by_contact_id", {
            length: 255,
        }).references(() => contacts.id, { onDelete: "set null" }),
        approved_contact_count: integer("approved_contact_count")
            .notNull()
            .default(0),
        queued_count: integer("queued_count").notNull().default(0),
        sent_count: integer("sent_count").notNull().default(0),
        failed_count: integer("failed_count").notNull().default(0),
        skipped_count: integer("skipped_count").notNull().default(0),
        metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        started_at: bigint("started_at", { mode: "number" }),
        completed_at: bigint("completed_at", { mode: "number" }),
    },
    (table) => ({
        status_created: index("email_newsletter_sends_status_created_idx").on(
            table.status,
            table.created_at
        ),
        creator_created: index("email_newsletter_sends_creator_created_idx").on(
            table.created_by_contact_id,
            table.created_at
        ),
        domain_status_created: index(
            "email_newsletter_sends_domain_status_created_idx"
        ).on(table.domain_id, table.status, table.created_at),
    })
)

export const email_subscriptions = pgTable(
    "email_subscriptions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        list_key: varchar("list_key", { length: 255 })
            .notNull()
            .default("newsletter"),
        status: varchar("status", { length: 64 })
            .notNull()
            .default("subscribed"),
        source: varchar("source", { length: 255 }),
        metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        subscribed_at: bigint("subscribed_at", { mode: "number" }),
        unsubscribed_at: bigint("unsubscribed_at", { mode: "number" }),
    },
    (table) => ({
        domain_contact_list: uniqueIndex(
            "email_subscriptions_domain_contact_list_unique"
        ).on(table.domain_id, table.contact_id, table.list_key),
        domain_list_status: index(
            "email_subscriptions_domain_list_status_idx"
        ).on(table.domain_id, table.list_key, table.status),
    })
)

export const email_unsubscribe_tokens = pgTable(
    "email_unsubscribe_tokens",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        list_key: varchar("list_key", { length: 255 })
            .notNull()
            .default("newsletter"),
        purpose: varchar("purpose", { length: 64 })
            .notNull()
            .default("unsubscribe"),
        token_hash: varchar("token_hash", { length: 64 }).notNull(),
        expires_at: bigint("expires_at", { mode: "number" }),
        consumed_at: bigint("consumed_at", { mode: "number" }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
    },
    (table) => ({
        hash_unique: uniqueIndex("email_unsubscribe_tokens_hash_unique").on(
            table.token_hash
        ),
        contact_list_created: index(
            "email_unsubscribe_tokens_contact_list_created_idx"
        ).on(
            table.domain_id,
            table.contact_id,
            table.list_key,
            table.purpose,
            table.created_at
        ),
    })
)

export type EmailNotification = typeof email_notifications.$inferSelect
export type NewEmailNotification = typeof email_notifications.$inferInsert
export type EmailDelivery = typeof email_deliveries.$inferSelect
export type NewEmailDelivery = typeof email_deliveries.$inferInsert
export type EmailNewsletterSend = typeof email_newsletter_sends.$inferSelect
export type NewEmailNewsletterSend = typeof email_newsletter_sends.$inferInsert
export type EmailSubscription = typeof email_subscriptions.$inferSelect
export type NewEmailSubscription = typeof email_subscriptions.$inferInsert
export type EmailUnsubscribeToken = typeof email_unsubscribe_tokens.$inferSelect
export type NewEmailUnsubscribeToken =
    typeof email_unsubscribe_tokens.$inferInsert
