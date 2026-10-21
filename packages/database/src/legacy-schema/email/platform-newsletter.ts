import {
    index,
    pgEnum,
    pgTable,
    uniqueIndex,
    uuid,
    varchar,
    bigint,
    integer,
} from "drizzle-orm/pg-core"
import { contacts } from "../contacts/index.ts"

export const platform_newsletter_subscriber_status = pgEnum(
    "platform_newsletter_subscriber_status",
    ["pending", "subscribed", "unsubscribed", "suppressed"]
)

export const platform_newsletter_token_purpose = pgEnum(
    "platform_newsletter_token_purpose",
    ["confirm", "unsubscribe"]
)

export const platform_newsletter_subscribers = pgTable(
    "platform_newsletter_subscribers",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        email: varchar("email", { length: 255 }).notNull(),
        name: varchar("name", { length: 255 }),
        list_key: varchar("list_key", { length: 255 })
            .notNull()
            .default("newsletter"),
        status: platform_newsletter_subscriber_status("status")
            .notNull()
            .default("pending"),
        source: varchar("source", { length: 255 }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        confirmed_at: bigint("confirmed_at", { mode: "number" }),
        unsubscribed_at: bigint("unsubscribed_at", { mode: "number" }),
    },
    (table) => ({
        email_list: uniqueIndex(
            "platform_newsletter_subscribers_email_list_unique"
        ).on(table.email, table.list_key),
        list_status: index(
            "platform_newsletter_subscribers_list_status_idx"
        ).on(table.list_key, table.status),
    })
)

export const platform_newsletter_tokens = pgTable(
    "platform_newsletter_tokens",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        subscriber_id: uuid("subscriber_id")
            .notNull()
            .references(() => platform_newsletter_subscribers.id, {
                onDelete: "cascade",
            }),
        purpose: platform_newsletter_token_purpose("purpose").notNull(),
        token_hash: varchar("token_hash", { length: 64 }).notNull(),
        expires_at: bigint("expires_at", { mode: "number" }).notNull(),
        consumed_at: bigint("consumed_at", { mode: "number" }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
    },
    (table) => ({
        hash: uniqueIndex("platform_newsletter_tokens_hash_unique").on(
            table.token_hash
        ),
        subscriber_purpose_created: index(
            "platform_newsletter_tokens_subscriber_purpose_created_idx"
        ).on(table.subscriber_id, table.purpose, table.created_at),
    })
)

export const platform_newsletter_sends = pgTable(
    "platform_newsletter_sends",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: varchar("name", { length: 255 }).notNull(),
        subject: varchar("subject", { length: 500 }).notNull(),
        status: varchar("status", { length: 64 }).notNull().default("queued"),
        created_by_contact_id: varchar("created_by_contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "restrict" }),
        approved_subscriber_count: integer("approved_subscriber_count")
            .notNull()
            .default(0),
        sent_count: integer("sent_count").notNull().default(0),
        failed_count: integer("failed_count").notNull().default(0),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        completed_at: bigint("completed_at", { mode: "number" }),
    },
    (table) => ({
        status_created: index(
            "platform_newsletter_sends_status_created_idx"
        ).on(table.status, table.created_at),
    })
)

export type PlatformNewsletterSubscriber =
    typeof platform_newsletter_subscribers.$inferSelect
export type NewPlatformNewsletterSubscriber =
    typeof platform_newsletter_subscribers.$inferInsert
export type PlatformNewsletterToken =
    typeof platform_newsletter_tokens.$inferSelect
export type NewPlatformNewsletterToken =
    typeof platform_newsletter_tokens.$inferInsert
export type PlatformNewsletterSend =
    typeof platform_newsletter_sends.$inferSelect
export type NewPlatformNewsletterSend =
    typeof platform_newsletter_sends.$inferInsert
