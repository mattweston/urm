import {
    bigint,
    boolean,
    index,
    pgEnum,
    pgTable,
    text,
    uniqueIndex,
    varchar,
} from "drizzle-orm/pg-core"
import { organizations } from "./organizations.ts"

export const user_auth_provider = pgEnum("user_auth_provider", ["workos"])
export const user_platform_role = pgEnum("user_platform_role", [
    "platform_sysadmin",
])

export const users = pgTable(
    "users",
    {
        id: text("id").primaryKey(),
        platform_role: user_platform_role("platform_role"),
        token_identifier: varchar("token_identifier", { length: 1024 }),
        auth_provider: user_auth_provider("auth_provider"),
        provider_subject: varchar("provider_subject", { length: 1024 }),
        personal_organization_id: text("personal_organization_id").references(
            () => organizations.id,
            { onDelete: "restrict" }
        ),
        name: varchar("name", { length: 255 }),
        email: text("email"),
        email_verified: boolean("email_verified"),
        image_url: varchar("image_url", { length: 2048 }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        last_seen_at: bigint("last_seen_at", { mode: "number" }),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (table) => [
        uniqueIndex("users_token_identifier_unique").on(table.token_identifier),
        uniqueIndex("users_auth_provider_subject_unique").on(
            table.auth_provider,
            table.provider_subject
        ),
        index("users_email_idx").on(table.email),
        index("users_personal_organization_idx").on(
            table.personal_organization_id
        ),
    ]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
