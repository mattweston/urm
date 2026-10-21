import {
    bigint,
    index,
    pgEnum,
    pgTable,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.ts"
import { users } from "./users.ts"

export const organization_member_role = pgEnum("organization_member_role", [
    "owner",
    "admin",
    "sysadmin",
    "member",
])
export const organization_member_status = pgEnum("organization_member_status", [
    "active",
    "suspended",
])

export const organization_members = pgTable(
    "organization_members",
    {
        id: text("id").primaryKey(),
        organization_id: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        user_id: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        role: organization_member_role("role").notNull(),
        status: organization_member_status("status").notNull(),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (table) => [
        uniqueIndex("organization_members_organization_user_unique").on(
            table.organization_id,
            table.user_id
        ),
        index("organization_members_organization_updated_idx").on(
            table.organization_id,
            table.updated_at,
            table.id
        ),
        index("organization_members_organization_status_idx").on(
            table.organization_id,
            table.status
        ),
        index("organization_members_user_status_idx").on(
            table.user_id,
            table.status
        ),
    ]
)

export type OrganizationMember = typeof organization_members.$inferSelect
export type NewOrganizationMember = typeof organization_members.$inferInsert
