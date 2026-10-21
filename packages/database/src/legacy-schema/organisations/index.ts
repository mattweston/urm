/**
 * # Organisations Schema
 */

import { sql } from "drizzle-orm"
import {
    index,
    integer,
    pgEnum,
    pgTable,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core"
import { contacts } from "../contacts/index.ts"

export const org_contact_role = pgEnum("org_contact_role", [
    "owner",
    "admin",
    "member",
])

export const org_contact_status = pgEnum("org_contact_status", [
    "active",
    "suspended",
])

export const orgs = pgTable("orgs", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    kind: varchar("kind", { length: 64 }).notNull().default("customer"),
    max_domains: integer("max_domains").notNull().default(3),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
})

export const org_contacts = pgTable(
    "org_contacts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        org_id: uuid("org_id")
            .notNull()
            .references(() => orgs.id, { onDelete: "cascade" }),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        role: org_contact_role("role").notNull().default("member"),
        status: org_contact_status("status").notNull().default("active"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at").notNull().defaultNow(),
        deleted_at: timestamp("deleted_at"),
    },
    (table) => ({
        unique_org_contact: uniqueIndex("org_contacts_org_contact_unique")
            .on(table.org_id, table.contact_id)
            .where(sql`${table.deleted_at} is null`),
    })
)

/**
 * A single-use organisation invitation addressed to an email address.
 *
 * Invitations are separate from memberships so an invitation never creates a
 * contact or grants organisation/domain authority before acceptance.
 */
export const org_invitations = pgTable(
    "org_invitations",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        org_id: uuid("org_id")
            .notNull()
            .references(() => orgs.id, { onDelete: "cascade" }),
        email: varchar("email", { length: 255 }).notNull(),
        role: org_contact_role("role").notNull().default("member"),
        code_hash: varchar("code_hash", { length: 64 }).notNull(),
        invited_by_contact_id: varchar("invited_by_contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "restrict" }),
        expires_at: timestamp("expires_at").notNull(),
        consumed_at: timestamp("consumed_at"),
        revoked_at: timestamp("revoked_at"),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at").notNull().defaultNow(),
    },
    (table) => ({
        unique_pending_org_email: uniqueIndex(
            "org_invitations_pending_org_email_unique"
        )
            .on(table.org_id, table.email)
            .where(
                sql`${table.consumed_at} is null and ${table.revoked_at} is null`
            ),
        unique_code_hash: uniqueIndex("org_invitations_code_hash_unique").on(
            table.code_hash
        ),
        org_created: index("org_invitations_org_created_idx").on(
            table.org_id,
            table.created_at
        ),
    })
)

export type Org = typeof orgs.$inferSelect
export type NewOrg = typeof orgs.$inferInsert
export type OrgContact = typeof org_contacts.$inferSelect
export type NewOrgContact = typeof org_contacts.$inferInsert
export type OrgInvitation = typeof org_invitations.$inferSelect
export type NewOrgInvitation = typeof org_invitations.$inferInsert
