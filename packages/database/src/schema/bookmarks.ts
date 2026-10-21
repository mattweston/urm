import { bigint, index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"

export const bookmarks = pgTable(
    "bookmarks",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        href: text("href").notNull(),
        tags: text("tags").array().notNull(),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => [
        uniqueIndex("bookmarks_domain_href_unique").on(
            table.domain_id,
            table.href
        ),
        index("bookmarks_domain_title_idx").on(
            table.domain_id,
            table.title,
            table.id
        ),
    ]
)
