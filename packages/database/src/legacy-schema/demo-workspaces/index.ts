/**
 * Isolated, disposable workspaces for the demo deployment.
 *
 * A workspace is owned by one demo-database contact and contains a fixed set
 * of private scenario domains. Production never provisions or reads these
 * records.
 */

import { sql } from "drizzle-orm"
import {
    pgEnum,
    pgTable,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core"
import { contacts } from "../contacts/index.ts"
import { domains } from "../domains/index.ts"
import { orgs } from "../organisations/index.ts"

export const demo_workspace_status = pgEnum("demo_workspace_status", [
    "active",
    "expired",
    "revoked",
])

export const demo_workspaces = pgTable(
    "demo_workspaces",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        contact_id: varchar("contact_id", { length: 255 })
            .notNull()
            .references(() => contacts.id, { onDelete: "cascade" }),
        org_id: uuid("org_id")
            .notNull()
            .references(() => orgs.id, { onDelete: "restrict" }),
        status: demo_workspace_status("status").notNull().default("active"),
        expires_at: timestamp("expires_at").notNull(),
        created_at: timestamp("created_at").notNull().defaultNow(),
        updated_at: timestamp("updated_at").notNull().defaultNow(),
    },
    (table) => ({
        unique_active_contact: uniqueIndex(
            "demo_workspaces_active_contact_unique"
        )
            .on(table.contact_id)
            .where(sql`${table.status} = 'active'`),
        unique_org: uniqueIndex("demo_workspaces_org_unique").on(table.org_id),
    })
)

export const demo_workspace_domains = pgTable(
    "demo_workspace_domains",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        workspace_id: uuid("workspace_id")
            .notNull()
            .references(() => demo_workspaces.id, { onDelete: "cascade" }),
        domain_id: uuid("domain_id")
            .notNull()
            .references(() => domains.id, { onDelete: "restrict" }),
        scenario: varchar("scenario", { length: 64 }).notNull(),
        created_at: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => ({
        unique_workspace_scenario: uniqueIndex(
            "demo_workspace_domains_workspace_scenario_unique"
        ).on(table.workspace_id, table.scenario),
        unique_domain: uniqueIndex("demo_workspace_domains_domain_unique").on(
            table.domain_id
        ),
    })
)

export type DemoWorkspace = typeof demo_workspaces.$inferSelect
export type NewDemoWorkspace = typeof demo_workspaces.$inferInsert
export type DemoWorkspaceDomain = typeof demo_workspace_domains.$inferSelect
export type NewDemoWorkspaceDomain = typeof demo_workspace_domains.$inferInsert
