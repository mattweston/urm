import {
    pgTable,
    text,
    bigint,
    integer,
    boolean,
    jsonb,
    index,
    uniqueIndex,
    foreignKey,
} from "drizzle-orm/pg-core"
import { domains } from "./domains.ts"
export const events = pgTable(
    "events",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id),
        title: text("title").notNull(),
        description: text("description").notNull(),
        date: bigint("date", { mode: "number" }).notNull(),
        start_time: text("start_time").notNull(),
        end_time: text("end_time").notNull(),
        venue_name: text("venue_name").notNull(),
        venue_url: text("venue_url").notNull(),
        latitude: text("latitude").notNull(),
        longitude: text("longitude").notNull(),
        tickets_url: text("tickets_url").notNull(),
        image_url: text("image_url").notNull(),
        published: boolean("published").notNull(),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => [
        uniqueIndex("events_domain_id_unique").on(table.domain_id, table.id),
        index("events_domain_date_idx").on(
            table.domain_id,
            table.date,
            table.id
        ),
    ]
)
export const event_menu_items = pgTable(
    "event_menu_items",
    {
        id: text("id").primaryKey(),
        domain_id: text("domain_id")
            .notNull()
            .references(() => domains.id),
        event_id: text("event_id").notNull(),
        title: text("title").notNull(),
        description: text("description").notNull(),
        content: text("content").notNull(),
        price: integer("price").notNull(),
        category: text("category").notNull(),
        served_at: jsonb("served_at").notNull(),
        slug: text("slug").notNull(),
        image_url: text("image_url").notNull(),
        dietary_labels: text("dietary_labels").notNull(),
        allergens: text("allergens").notNull(),
        published: boolean("published").notNull(),
        order_position: integer("order_position").notNull(),
        created_at: bigint("created_at", { mode: "number" }).notNull(),
        updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.domain_id, table.event_id],
            foreignColumns: [events.domain_id, events.id],
        }).onDelete("cascade"),
        index("event_menu_items_domain_order_idx").on(
            table.domain_id,
            table.order_position,
            table.id
        ),
    ]
)
