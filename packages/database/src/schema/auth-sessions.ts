import {
    bigint,
    index,
    pgEnum,
    pgTable,
    text,
    uniqueIndex,
    varchar,
} from "drizzle-orm/pg-core"
import { users } from "./users.ts"

export const auth_session_provider_status = pgEnum(
    "auth_session_provider_status",
    ["active", "expired", "revoked", "unknown"]
)

export const auth_sessions = pgTable(
    "auth_sessions",
    {
        id: text("id").primaryKey(),
        provider_session_id: varchar("provider_session_id", {
            length: 1024,
        }).notNull(),
        user_id: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        last_seen_at: bigint("last_seen_at", { mode: "number" }).notNull(),
        expires_at: bigint("expires_at", { mode: "number" }),
        revoked_at: bigint("revoked_at", { mode: "number" }),
        verified_at: bigint("verified_at", { mode: "number" }),
        provider_status: auth_session_provider_status("provider_status"),
    },
    (table) => [
        uniqueIndex("auth_sessions_provider_session_unique").on(
            table.provider_session_id
        ),
        index("auth_sessions_last_seen_idx").on(table.last_seen_at, table.id),
        index("auth_sessions_user_last_seen_idx").on(
            table.user_id,
            table.last_seen_at,
            table.id
        ),
    ]
)

export type AuthSession = typeof auth_sessions.$inferSelect
export type NewAuthSession = typeof auth_sessions.$inferInsert
