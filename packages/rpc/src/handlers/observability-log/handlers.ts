/**
 * # Observability Log RPC Handlers
 *
 * Effect RPC handlers for querying observability logs.
 *
 * Uses direct DB access for listing logs with
 * filtering by level, source, trace_id, contact_id, session_id, and date range.
 */

import { Effect } from "effect"
import { and, desc, eq, gte, lte, count as countFn } from "drizzle-orm"
import { ObservabilityLogRpcs } from "@urm/contracts/observability-log"
import { DB, schema } from "@urm/database"
import type { ObservabilityLogItem } from "@urm/domain/schemas/observability-log"
import { databaseError } from "../errors.ts"

const ObservabilityLogRpcHandlersLive = Effect.gen(function* () {
    const db = yield* DB

    return ObservabilityLogRpcs.of({
        "observability-log.list": ({
            level,
            source,
            trace_id,
            contact_id,
            session_id,
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
                        eq(schema.observability_logs.domain_id, domain_id)
                    )
                }

                if (level !== undefined) {
                    conditions.push(eq(schema.observability_logs.level, level))
                }

                if (source !== undefined) {
                    conditions.push(
                        eq(schema.observability_logs.source, source)
                    )
                }

                if (trace_id !== undefined) {
                    conditions.push(
                        eq(schema.observability_logs.trace_id, trace_id)
                    )
                }

                if (contact_id !== undefined) {
                    conditions.push(
                        eq(schema.observability_logs.contact_id, contact_id)
                    )
                }

                if (session_id !== undefined) {
                    conditions.push(
                        eq(schema.observability_logs.session_id, session_id)
                    )
                }

                if (date_from !== undefined) {
                    conditions.push(
                        gte(schema.observability_logs.created_at, date_from)
                    )
                }

                if (date_to !== undefined) {
                    conditions.push(
                        lte(schema.observability_logs.created_at, date_to)
                    )
                }

                const where =
                    conditions.length > 0 ? and(...conditions) : undefined

                const totalResult = yield* db
                    .select({ count: countFn() })
                    .from(schema.observability_logs)
                    .where(where)

                const total = Number(totalResult[0]?.count ?? 0)

                const rows = yield* db
                    .select()
                    .from(schema.observability_logs)
                    .where(where)
                    .orderBy(desc(schema.observability_logs.created_at))
                    .limit(limit ?? 50)
                    .offset(offset ?? 0)

                const items: ReadonlyArray<ObservabilityLogItem> = rows.map(
                    (row) => ({
                        id: row.id,
                        level: row.level as ObservabilityLogItem["level"],
                        message: row.message,
                        source: row.source ?? undefined,
                        trace_id: row.trace_id ?? undefined,
                        span_id: row.span_id ?? undefined,
                        contact_id: row.contact_id ?? undefined,
                        session_id: row.session_id ?? undefined,
                        domain_id: row.domain_id ?? undefined,
                        request_id: row.request_id ?? undefined,
                        metadata:
                            row.metadata as ObservabilityLogItem["metadata"],
                        created_at: row.created_at,
                    })
                )

                return { items, total }
            }).pipe(
                Effect.mapError(
                    databaseError("Failed to fetch observability logs")
                )
            ),
    })
})

export const ObservabilityLogRpcLive = ObservabilityLogRpcs.toLayer(
    ObservabilityLogRpcHandlersLive
)
