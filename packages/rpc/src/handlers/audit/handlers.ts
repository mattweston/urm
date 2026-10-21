/**
 * # Audit RPC Handlers
 *
 * Effect RPC handlers for querying audit events.
 *
 * Uses direct DB access for listing audit events with
 * filtering by action, result, contact_id, and date range.
 */

import { Effect } from "effect"
import { and, desc, eq, gte, lte, count as countFn } from "drizzle-orm"
import { AuditRpcs } from "@urm/contracts/audit"
import { DB, schema } from "@urm/database"
import type { AuditEventItem } from "@urm/domain/schemas/audit"
import { databaseError } from "../errors.ts"

const AuditRpcHandlersLive = Effect.gen(function* () {
    const db = yield* DB

    return AuditRpcs.of({
        "audit.list": ({
            action,
            result,
            reason_class,
            contact_id,
            domain_id,
            date_from,
            date_to,
            limit,
            offset,
        }) =>
            Effect.gen(function* () {
                const conditions: Array<ReturnType<typeof eq>> = []

                if (domain_id !== undefined) {
                    conditions.push(
                        eq(schema.audit_events.domain_id, domain_id)
                    )
                }

                if (action !== undefined) {
                    conditions.push(eq(schema.audit_events.action, action))
                }

                if (result !== undefined) {
                    conditions.push(eq(schema.audit_events.result, result))
                }

                if (reason_class !== undefined) {
                    conditions.push(
                        eq(schema.audit_events.reason_class, reason_class)
                    )
                }

                if (contact_id !== undefined) {
                    conditions.push(
                        eq(schema.audit_events.contact_id, contact_id)
                    )
                }

                if (date_from !== undefined) {
                    conditions.push(
                        gte(schema.audit_events.created_at, date_from)
                    )
                }

                if (date_to !== undefined) {
                    conditions.push(
                        lte(schema.audit_events.created_at, date_to)
                    )
                }

                const where =
                    conditions.length > 0 ? and(...conditions) : undefined

                const totalResult = yield* db
                    .select({ count: countFn() })
                    .from(schema.audit_events)
                    .where(where)

                const total = Number(totalResult[0]?.count ?? 0)

                const rows = yield* db
                    .select()
                    .from(schema.audit_events)
                    .where(where)
                    .orderBy(desc(schema.audit_events.created_at))
                    .limit(limit ?? 50)
                    .offset(offset ?? 0)

                const items: ReadonlyArray<AuditEventItem> = rows.map(
                    (row) => ({
                        id: row.id,
                        action: row.action,
                        entity_type: row.entity_type,
                        entity_id: row.entity_id ?? undefined,
                        result: row.result,
                        reason_class: row.reason_class ?? undefined,
                        contact_id: row.contact_id ?? undefined,
                        actor_contact_id: row.actor_contact_id ?? undefined,
                        session_id: row.session_id ?? undefined,
                        request_id: row.request_id ?? undefined,
                        created_at: row.created_at,
                    })
                )

                return { items, total }
            }).pipe(
                Effect.mapError(databaseError("Failed to fetch audit events"))
            ),
    })
})

export const AuditRpcLive = AuditRpcs.toLayer(AuditRpcHandlersLive)
