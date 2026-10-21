/**
 * # Domains Schema
 *
 * TODO: generate effect schema from Drizzle schema
 */

import {
    pgTable,
    varchar,
    uuid,
    timestamp,
    pgEnum,
    uniqueIndex,
    boolean,
    index,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { contacts } from "../contacts/index.ts"
import { orgs } from "../organisations/index.ts"

export const domain_hostname_kind = pgEnum("domain_hostname_kind", [
    "apex",
    "www",
    "custom",
])

export const domain_hostname_status = pgEnum("domain_hostname_status", [
    "pending_dns",
    "pending_certificate",
    "active",
    "failed",
    "disabled",
])

export const platform_admin_role = pgEnum("platform_admin_role", [
    "sysadmin",
    "support",
    "viewer",
])

export const platform_admin_status = pgEnum("platform_admin_status", [
    "active",
    "suspended",
])

export const domain_admin_role = pgEnum("domain_admin_role", [
    "owner",
    "admin",
    "editor",
    "support",
    "viewer",
])

export const domain_admin_status = pgEnum("domain_admin_status", [
    "invited",
    "active",
    "suspended",
])

/**
 * Domains table - represents a tenant/workspace
 *
 * A domain is created by one contact, and admin access is scoped through
 * domain_admin.
 */
export const domains = pgTable("domains", {
    // Primary key
    id: uuid("id").primaryKey().defaultRandom(),

    // Every production tenant domain belongs to exactly one organisation.
    org_id: uuid("org_id")
        .notNull()
        .references(() => orgs.id, { onDelete: "restrict" }),

    // Domain identifier - unique name (e.g., "domain1", "acme")
    name: varchar("name", { length: 255 }).notNull().unique(),

    // Contact that created this domain.
    created_by_contact_id: varchar("created_by_contact_id", { length: 255 })
        .notNull()
        .references(() => contacts.id),

    // Timestamps
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),

    // Soft delete
    deleted_at: timestamp("deleted_at"),
})

export const platform_admin = pgTable(
    "platform_admin",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        role: platform_admin_role("role").notNull().default("sysadmin"),
        status: platform_admin_status("status").notNull().default("active"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at").notNull().defaultNow(),
        deleted_at: timestamp("deleted_at"),
    },
    (table) => ({
        unique_contact: uniqueIndex("platform_admin_contact_unique")
            .on(table.contact_id)
            .where(sql`${table.deleted_at} is null`),
    })
)

export const domain_contacts = pgTable(
    "domain_contacts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        status: varchar("status", { length: 64 }).notNull().default("active"),
        source: varchar("source", { length: 64 }),
        display_name: varchar("display_name", { length: 255 }),
        tel: varchar("tel", { length: 50 }),
        title: varchar("title", { length: 255 }),
        company: varchar("company", { length: 255 }),
        newsletter_status: varchar("newsletter_status", { length: 64 })
            .notNull()
            .default("not_subscribed"),
        first_seen_at: timestamp("first_seen_at"),
        last_seen_at: timestamp("last_seen_at"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at").notNull().defaultNow(),
        deleted_at: timestamp("deleted_at"),
    },
    (table) => ({
        unique_domain_contact: uniqueIndex(
            "domain_contacts_domain_contact_unique"
        )
            .on(table.domain_id, table.contact_id)
            .where(sql`${table.deleted_at} is null`),
    })
)

export const domain_admin = pgTable(
    "domain_admin",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        role: domain_admin_role("role").notNull().default("admin"),
        status: domain_admin_status("status").notNull().default("active"),
        invited_by_contact_id: varchar("invited_by_contact_id", {
            length: 255,
        }).references(() => contacts.id),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at").notNull().defaultNow(),
        deleted_at: timestamp("deleted_at"),
    },
    (table) => ({
        unique_domain_contact: uniqueIndex("domain_admin_domain_contact_unique")
            .on(table.domain_id, table.contact_id)
            .where(sql`${table.deleted_at} is null`),
    })
)

export const domain_visitors = pgTable(
    "domain_visitors",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        role: varchar("role", { length: 64 }).notNull().default("visitor"),
        status: varchar("status", { length: 64 }).notNull().default("active"),
        first_seen_at: timestamp("first_seen_at").notNull().defaultNow(),
        last_seen_at: timestamp("last_seen_at"),
        deleted_at: timestamp("deleted_at"),
    },
    (table) => ({
        unique_domain_contact: uniqueIndex(
            "domain_visitors_domain_contact_unique"
        )
            .on(table.domain_id, table.contact_id)
            .where(sql`${table.deleted_at} is null`),
    })
)

export const domain_customers = pgTable(
    "domain_customers",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        role: varchar("role", { length: 64 }).notNull().default("customer"),
        status: varchar("status", { length: 64 }).notNull().default("active"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at").notNull().defaultNow(),
        deleted_at: timestamp("deleted_at"),
    },
    (table) => ({
        unique_domain_contact: uniqueIndex(
            "domain_customers_domain_contact_unique"
        )
            .on(table.domain_id, table.contact_id)
            .where(sql`${table.deleted_at} is null`),
    })
)

export const domain_hostnames = pgTable(
    "domain_hostnames",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        hostname: varchar("hostname", { length: 255 }).notNull(),
        apex_hostname: varchar("apex_hostname", { length: 255 }).notNull(),
        kind: domain_hostname_kind("kind").notNull(),
        status: domain_hostname_status("status")
            .notNull()
            .default("pending_dns"),
        is_primary: boolean("is_primary").notNull().default(false),
        verification_token: varchar("verification_token", {
            length: 255,
        }).notNull(),
        verified_at: timestamp("verified_at"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at").notNull().defaultNow(),
        deleted_at: timestamp("deleted_at"),
    },
    (table) => ({
        unique_hostname: uniqueIndex("domain_hostnames_hostname_unique").on(
            table.hostname
        ),
    })
)

export const contact_submissions = pgTable(
    "contact_submissions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        message: varchar("message", { length: 5_000 }).notNull(),
        status: varchar("status", { length: 64 }).notNull().default("new"),
        source: varchar("source", { length: 64 })
            .notNull()
            .default("public_contact_form"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at").notNull().defaultNow(),
        read_at: timestamp("read_at"),
    },
    (table) => ({
        domain_status_created: index(
            "contact_submissions_domain_status_created_idx"
        ).on(table.domain_id, table.status, table.created_at),
        contact_created: index("contact_submissions_contact_created_idx").on(
            table.contact_id,
            table.created_at
        ),
    })
)

export type Domain = typeof domains.$inferSelect
export type NewDomain = typeof domains.$inferInsert

export type PlatformAdmin = typeof platform_admin.$inferSelect
export type NewPlatformAdmin = typeof platform_admin.$inferInsert

export type DomainContact = typeof domain_contacts.$inferSelect
export type NewDomainContact = typeof domain_contacts.$inferInsert

export type DomainAdmin = typeof domain_admin.$inferSelect
export type NewDomainAdmin = typeof domain_admin.$inferInsert

export type DomainVisitor = typeof domain_visitors.$inferSelect
export type NewDomainVisitor = typeof domain_visitors.$inferInsert

export type DomainCustomer = typeof domain_customers.$inferSelect
export type NewDomainCustomer = typeof domain_customers.$inferInsert

export type ContactSubmission = typeof contact_submissions.$inferSelect
export type NewContactSubmission = typeof contact_submissions.$inferInsert

export type DomainHostname = typeof domain_hostnames.$inferSelect
export type NewDomainHostname = typeof domain_hostnames.$inferInsert
