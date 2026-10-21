import { sql } from "drizzle-orm"
import {
    bigint,
    check,
    index,
    pgTable,
    text,
    uniqueIndex,
    varchar,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.ts"
import { organization_member_role } from "./organization-members.ts"
import { users } from "./users.ts"

export const organization_invitations = pgTable(
    "organization_invitations",
    {
        id: text("id").primaryKey(),
        organization_id: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        email: text("email").notNull(),
        role: organization_member_role("role").notNull(),
        token_hash: varchar("token_hash", { length: 64 }).notNull(),
        invited_by_user_id: text("invited_by_user_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        expires_at: bigint("expires_at", { mode: "number" }).notNull(),
        consumed_at: bigint("consumed_at", { mode: "number" }),
        revoked_at: bigint("revoked_at", { mode: "number" }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => [
        index("organization_invitations_organization_email_idx").on(
            table.organization_id,
            table.email
        ),
        index("organization_invitations_organization_created_idx").on(
            table.organization_id,
            table.created_at,
            table.id
        ),
        index("organization_invitations_invited_by_idx").on(
            table.invited_by_user_id
        ),
        uniqueIndex("organization_invitations_token_hash_unique").on(
            table.token_hash
        ),
        check(
            "organization_invitations_token_hash_format",
            sql`${table.token_hash} ~ '^[a-f0-9]{64}$'`
        ),
    ]
)

export type OrganizationInvitation =
    typeof organization_invitations.$inferSelect
export type NewOrganizationInvitation =
    typeof organization_invitations.$inferInsert
