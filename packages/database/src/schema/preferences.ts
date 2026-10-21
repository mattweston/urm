import { bigint, pgTable, primaryKey, text } from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
import { users } from "./users.ts"

export const appearance_preferences = pgTable("appearance_preferences", {
    profile_key: text("profile_key")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    theme: text("theme").notNull(),
    font: text("font").notNull(),
    code_font: text("code_font").notNull(),
    updated_at: bigint("updated_at", { mode: "number" }).notNull(),
})

export const spotify_preferences = pgTable("spotify_preferences", {
    profile_key: text("profile_key")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    playlist_id: text("playlist_id").notNull(),
    updated_at: bigint("updated_at", { mode: "number" }).notNull(),
})

export const sidebar_preferences = pgTable(
    "sidebar_preferences",
    {
        user_id: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        sidebar_order: text("sidebar_order").array().notNull(),
        hidden_modules: text("hidden_modules").array().notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.user_id, table.domain_id] }),
    ]
)
