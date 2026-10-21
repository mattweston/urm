import { sql } from "drizzle-orm"
import {
    bigint,
    check,
    index,
    integer,
    pgTable,
    text,
    uniqueIndex,
} from "drizzle-orm/pg-core"
import { contacts } from "./contacts.ts"
import { users } from "./users.ts"

// The existing users key remains the tenancy principal during the cutover.
// Provider fields on users and provider auth_sessions are deprecated, retained data.
export const auth_accounts = pgTable(
    "auth_accounts",
    {
        id: text()
            .primaryKey()
            .references(() => users.id, { onDelete: "restrict" }),
        contact_id: text().references(() => contacts.id, {
            onDelete: "restrict",
        }),
        login_email: text().notNull(),
        created_at: bigint({ mode: "number" }).notNull(),
        updated_at: bigint({ mode: "number" }).notNull(),
        disabled_at: bigint({ mode: "number" }),
    },
    (table) => [
        uniqueIndex("auth_accounts_login_email_unique").on(table.login_email),
        uniqueIndex("auth_accounts_contact_unique").on(table.contact_id),
        check(
            "auth_accounts_normalized_email",
            sql`${table.login_email} = lower(trim(${table.login_email}))`
        ),
    ]
)

export const account_password_credentials = pgTable(
    "account_password_credentials",
    {
        account_id: text()
            .primaryKey()
            .references(() => auth_accounts.id, { onDelete: "cascade" }),
        password_hash: text().notNull(),
        salt: text().notNull(),
        algorithm: text().notNull().default("scrypt"),
        cost: integer().notNull(),
        block_size: integer().notNull(),
        parallelism: integer().notNull(),
        key_length: integer().notNull(),
        updated_at: bigint({ mode: "number" }).notNull(),
    },
    (table) => [
        check("account_password_scrypt", sql`${table.algorithm} = 'scrypt'`),
    ]
)

export const account_sessions = pgTable(
    "account_sessions",
    {
        id: text().primaryKey(),
        account_id: text()
            .notNull()
            .references(() => auth_accounts.id, { onDelete: "cascade" }),
        token_hash: text().notNull(),
        created_at: bigint({ mode: "number" }).notNull(),
        last_seen_at: bigint({ mode: "number" }).notNull(),
        expires_at: bigint({ mode: "number" }).notNull(),
        absolute_expires_at: bigint({ mode: "number" }).notNull(),
        revoked_at: bigint({ mode: "number" }),
    },
    (table) => [
        uniqueIndex("account_sessions_token_hash_unique").on(table.token_hash),
        index("account_sessions_account_idx").on(table.account_id),
        index("account_sessions_expiry_idx").on(table.expires_at),
        check(
            "account_sessions_expiry_bound",
            sql`${table.expires_at} <= ${table.absolute_expires_at}`
        ),
    ]
)

export const account_login_attempts = pgTable("account_login_attempts", {
    key: text().primaryKey(),
    window_start: bigint({ mode: "number" }).notNull(),
    attempts: integer().notNull(),
})
