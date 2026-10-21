import { bigint, index, pgTable, text, varchar } from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"

export const members = pgTable(
    "members",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        first: varchar("first", { length: 255 }).notNull(),
        last: varchar("last", { length: 255 }).notNull(),
        twitter: varchar("twitter", { length: 255 }),
        avatar: varchar("avatar", { length: 2048 }),
        notes: text("notes"),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
        deleted_at: bigint("deleted_at", { mode: "number" }),
    },
    (table) => [
        index("members_domain_updated_idx").on(
            table.domain_id,
            table.updated_at,
            table.id
        ),
    ]
)

export type Member = typeof members.$inferSelect
export type NewMember = typeof members.$inferInsert
