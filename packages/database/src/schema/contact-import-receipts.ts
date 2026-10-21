import { bigint, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
import { auth_accounts } from "./auth.ts"

export const contact_import_receipts = pgTable(
    "contact_import_receipts",
    {
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "cascade" }),
        source_id: text("source_id").notNull(),
        payload_hash: text("payload_hash").notNull(),
        imported: integer("imported").notNull(),
        account_id: text("account_id")
            .notNull()
            .references(() => auth_accounts.id),
        completed_at: bigint("completed_at", { mode: "number" }).notNull(),
    },
    (table) => [primaryKey({ columns: [table.domain_id, table.source_id] })]
)
