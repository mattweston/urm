import { bigint, pgTable, uuid, varchar } from "drizzle-orm/pg-core"
import { domains } from "../domains/index.ts"
import { images } from "../media/images.ts"

export const marketing_appearance = pgTable("marketing_appearance", {
    // One appearance record per domain, never a platform-wide singleton.
    domain_id: uuid("domain_id")
        .primaryKey()
        .references(() => domains.id, { onDelete: "cascade" }),
    theme: varchar("theme", { length: 50 }).notNull().default("light"),
    font_preset: varchar("font_preset", { length: 50 })
        .notNull()
        .default("Theme"),
    background_image_id: varchar("background_image_id", {
        length: 255,
    }).references(() => images.id, { onDelete: "set null" }),
    updated_at: bigint("updated_at", { mode: "number" }).notNull(),
})

export type MarketingAppearance = typeof marketing_appearance.$inferSelect
export type NewMarketingAppearance = typeof marketing_appearance.$inferInsert
