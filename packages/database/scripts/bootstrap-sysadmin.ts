#!/usr/bin/env tsx
/**
 * Grants a local-development contact platform-wide sysadmin access.
 *
 * Usage:
 *
 * ```sh
 * pnpm --filter @urm/database bootstrap:sysadmin your-email@example.com
 * ```
 *
 * The contact must already exist and be active — this grants access to an
 * account you can already sign in with, it does not create one.
 */

import { config } from "dotenv"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// Loaded before @urm/database, which reads its configuration at module scope: an
// import evaluated first would predate these values.
//
// The workspace root holds the real file; dotenv keeps the first value it sees,
// so it is read first and a package-local file can only fill gaps, never shadow
// it.
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, "../../../.env.local") })
config({ path: join(__dirname, "../.env.local") })

import { and, eq, isNull } from "drizzle-orm"
import { Cause, Effect } from "effect"
import {
    DB,
    DatabaseLive,
    databaseOperationError,
    loadEnvironmentConfig,
    schema,
} from "@urm/database"

const grantSysadmin = Effect.fn("BootstrapSysadmin.grant")(function* (
    email: string
) {
    const environment = yield* loadEnvironmentConfig

    if (environment.env !== "development") {
        return yield* Effect.fail(
            databaseOperationError(
                "BootstrapSysadmin.grant",
                "bootstrap-sysadmin is only available when NODE_ENV is development"
            )
        )
    }

    const db = yield* DB
    const contacts = yield* db
        .select({ id: schema.contacts.id })
        .from(schema.contacts)
        .where(
            and(
                eq(schema.contacts.email, email),
                isNull(schema.contacts.deleted_at)
            )
        )
        .limit(1)
    const contact = contacts[0]

    if (contact === undefined) {
        return yield* Effect.fail(
            databaseOperationError(
                "BootstrapSysadmin.grant",
                "No active contact exists for the supplied email address"
            )
        )
    }

    const platform_admin_rows = yield* db
        .select({ id: schema.platform_admin.id })
        .from(schema.platform_admin)
        .where(
            and(
                eq(schema.platform_admin.contact_id, contact.id),
                isNull(schema.platform_admin.deleted_at)
            )
        )
        .limit(1)
    const platform_admin_row = platform_admin_rows[0]

    if (platform_admin_row === undefined) {
        yield* db.insert(schema.platform_admin).values({
            contact_id: contact.id,
            role: "sysadmin",
            status: "active",
        })
    } else {
        yield* db
            .update(schema.platform_admin)
            .set({
                role: "sysadmin",
                status: "active",
                updated_at: new Date(),
            })
            .where(eq(schema.platform_admin.id, platform_admin_row.id))
    }

    return contact.id
})

const email = process.argv[2]?.trim()

if (email === undefined || email.length === 0) {
    console.error(
        "Usage: node_modules/.bin/tsx packages/db/scripts/bootstrap-sysadmin.ts you@example.com. pnpm --filter @urm/database bootstrap:sysadmin your-real-email@example.com"
    )
    process.exitCode = 1
} else {
    const program = grantSysadmin(email).pipe(Effect.provide(DatabaseLive))

    Effect.runPromiseExit(program).then((exit) => {
        if (exit._tag === "Success") {
            const contact_id = exit.value
            console.log(
                `Granted local sysadmin access to contact ${contact_id}`
            )
            return
        }

        console.error(Cause.pretty(exit.cause))
        process.exitCode = 1
    })
}
