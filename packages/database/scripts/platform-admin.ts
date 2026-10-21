#!/usr/bin/env tsx
/**
 * Performs an approved platform-admin role change against the primary
 * production database. This is an operator command, not an application route.
 *
 * Usage:
 *
 * ```sh
 * pnpm platform-admin grant <target-contact-id> <operator-contact-id> <change-reference> --confirm=grant:<target-contact-id>
 * pnpm platform-admin revoke <target-contact-id> <operator-contact-id> <change-reference> --confirm=revoke:<target-contact-id>
 * ```
 *
 * Run this only through a protected, manually approved production operations
 * workflow. Both contacts must already exist and be active. A change revokes
 * the target's active sessions so the next login receives the new authority.
 */

import { and, eq, isNull } from "drizzle-orm"
import { Cause, Effect } from "effect"
import {
    DB,
    DatabaseLive,
    databaseOperationError,
    loadEnvironmentConfig,
    schema,
} from "@urm/database"

type PlatformAdminOperation = "grant" | "revoke"

type PlatformAdminCommand = Readonly<{
    operation: PlatformAdminOperation
    target_contact_id: string
    operator_contact_id: string
    change_reference: string
}>

const isPlatformAdminOperation = (
    value: string | undefined
): value is PlatformAdminOperation => value === "grant" || value === "revoke"

const parseCommand = (
    args: ReadonlyArray<string>
): PlatformAdminCommand | undefined => {
    const [
        operation,
        target_contact_id,
        operator_contact_id,
        change_reference,
        confirmation,
        ...rest
    ] = args

    if (
        !isPlatformAdminOperation(operation) ||
        target_contact_id === undefined ||
        target_contact_id.length === 0 ||
        operator_contact_id === undefined ||
        operator_contact_id.length === 0 ||
        change_reference === undefined ||
        change_reference.length === 0 ||
        confirmation !== `--confirm=${operation}:${target_contact_id}` ||
        rest.length > 0
    ) {
        return undefined
    }

    return {
        operation,
        target_contact_id,
        operator_contact_id,
        change_reference,
    }
}

const findActiveContact = (contact_id: string) =>
    Effect.gen(function* () {
        const db = yield* DB
        const contacts = yield* db
            .select({ id: schema.contacts.id })
            .from(schema.contacts)
            .where(
                and(
                    eq(schema.contacts.id, contact_id),
                    isNull(schema.contacts.deleted_at)
                )
            )
            .limit(1)

        return contacts[0]
    })

const changePlatformAdmin = Effect.fn("PlatformAdminOperations.change")(
    function* (command: PlatformAdminCommand) {
        const environment = yield* loadEnvironmentConfig

        if (environment.env !== "production" || environment.is_demo) {
            return yield* Effect.fail(
                databaseOperationError(
                    "PlatformAdminOperations.change",
                    "platform-admin operations require the primary production database"
                )
            )
        }

        const target_contact = yield* findActiveContact(
            command.target_contact_id
        )
        if (target_contact === undefined) {
            return yield* Effect.fail(
                databaseOperationError(
                    "PlatformAdminOperations.change",
                    "Target contact is not active"
                )
            )
        }

        const operator_contact = yield* findActiveContact(
            command.operator_contact_id
        )
        if (operator_contact === undefined) {
            return yield* Effect.fail(
                databaseOperationError(
                    "PlatformAdminOperations.change",
                    "Operator contact is not active"
                )
            )
        }

        const db = yield* DB
        return yield* db.transaction((tx) =>
            Effect.gen(function* () {
                const platform_admin_rows = yield* tx
                    .select({
                        id: schema.platform_admin.id,
                        role: schema.platform_admin.role,
                        status: schema.platform_admin.status,
                    })
                    .from(schema.platform_admin)
                    .where(
                        and(
                            eq(
                                schema.platform_admin.contact_id,
                                target_contact.id
                            ),
                            isNull(schema.platform_admin.deleted_at)
                        )
                    )
                    .limit(1)
                const platform_admin_row = platform_admin_rows[0]
                const now = new Date()

                if (command.operation === "grant") {
                    const changed =
                        platform_admin_row === undefined ||
                        platform_admin_row.role !== "sysadmin" ||
                        platform_admin_row.status !== "active"
                    const platform_admin_id =
                        platform_admin_row === undefined
                            ? (yield* tx
                                  .insert(schema.platform_admin)
                                  .values({
                                      contact_id: target_contact.id,
                                      role: "sysadmin",
                                      status: "active",
                                  })
                                  .returning({
                                      id: schema.platform_admin.id,
                                  }))[0]?.id
                            : platform_admin_row.id

                    if (platform_admin_id === undefined) {
                        return yield* Effect.fail(
                            databaseOperationError(
                                "PlatformAdminOperations.change",
                                "Could not create platform-admin role"
                            )
                        )
                    }

                    if (platform_admin_row !== undefined && changed) {
                        yield* tx
                            .update(schema.platform_admin)
                            .set({
                                role: "sysadmin",
                                status: "active",
                                updated_at: now,
                            })
                            .where(
                                eq(schema.platform_admin.id, platform_admin_id)
                            )
                    }

                    const revoked_sessions = changed
                        ? yield* tx
                              .update(schema.auth_sessions)
                              .set({
                                  revoked_at: Date.now(),
                                  revoked_reason: "platform_admin_granted",
                                  updated_at: Date.now(),
                              })
                              .where(
                                  and(
                                      eq(
                                          schema.auth_sessions.contact_id,
                                          target_contact.id
                                      ),
                                      isNull(schema.auth_sessions.revoked_at)
                                  )
                              )
                              .returning({ id: schema.auth_sessions.id })
                        : []

                    yield* tx.insert(schema.audit_events).values({
                        action: "platform_admin.granted",
                        entity_type: "platform_admin",
                        entity_id: platform_admin_id,
                        actor_contact_id: operator_contact.id,
                        contact_id: target_contact.id,
                        result: "succeeded",
                        metadata: {
                            change_reference: command.change_reference,
                            role: "sysadmin",
                            changed,
                            revoked_session_count: revoked_sessions.length,
                        },
                    })

                    return {
                        changed,
                        revoked_session_count: revoked_sessions.length,
                    }
                }

                if (platform_admin_row === undefined) {
                    return yield* Effect.fail(
                        databaseOperationError(
                            "PlatformAdminOperations.change",
                            "Target contact has no platform-admin role"
                        )
                    )
                }

                const changed = platform_admin_row.status !== "suspended"
                if (changed) {
                    yield* tx
                        .update(schema.platform_admin)
                        .set({
                            status: "suspended",
                            updated_at: now,
                        })
                        .where(
                            eq(schema.platform_admin.id, platform_admin_row.id)
                        )
                }

                const revoked_sessions = yield* tx
                    .update(schema.auth_sessions)
                    .set({
                        revoked_at: Date.now(),
                        revoked_reason: "platform_admin_revoked",
                        updated_at: Date.now(),
                    })
                    .where(
                        and(
                            eq(
                                schema.auth_sessions.contact_id,
                                target_contact.id
                            ),
                            isNull(schema.auth_sessions.revoked_at)
                        )
                    )
                    .returning({ id: schema.auth_sessions.id })

                yield* tx.insert(schema.audit_events).values({
                    action: "platform_admin.revoked",
                    entity_type: "platform_admin",
                    entity_id: platform_admin_row.id,
                    actor_contact_id: operator_contact.id,
                    contact_id: target_contact.id,
                    result: "succeeded",
                    metadata: {
                        change_reference: command.change_reference,
                        changed,
                        revoked_session_count: revoked_sessions.length,
                    },
                })

                return {
                    changed,
                    revoked_session_count: revoked_sessions.length,
                }
            })
        )
    }
)

const command = parseCommand(process.argv.slice(2))

if (command === undefined) {
    console.error(
        "Usage: pnpm platform-admin <grant|revoke> <target-contact-id> <operator-contact-id> <change-reference> --confirm=<operation>:<target-contact-id>"
    )
    process.exitCode = 1
} else {
    const program = changePlatformAdmin(command).pipe(
        Effect.provide(DatabaseLive)
    )

    Effect.runPromiseExit(program).then((exit) => {
        if (exit._tag === "Success") {
            console.log(`Platform-admin ${command.operation} completed`)
            return
        }

        console.error(Cause.pretty(exit.cause))
        process.exitCode = 1
    })
}
