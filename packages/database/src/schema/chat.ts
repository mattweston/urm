import { bigint, index, jsonb, pgTable, text } from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
import { users } from "./users.ts"
export const chat_messages = pgTable(
    "chat_messages",
    {
        id: text().primaryKey(),
        domain_id: text()
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        author_kind: text().notNull(),
        author_user_id: text().references(() => users.id, {
            onDelete: "restrict",
        }),
        author_name: text().notNull(),
        body: text().notNull(),
        mentions: jsonb().notNull(),
        mentioned_user_ids: jsonb().notNull(),
        created_at: bigint({ mode: "number" }).notNull(),
    },
    (table) => [
        index("chat_messages_domain_created_idx").on(
            table.domain_id,
            table.created_at,
            table.id
        ),
    ]
)
