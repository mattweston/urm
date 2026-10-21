/**
 * # Studio RPC Handlers
 *
 * Effect RPC handlers for the studio observability tabs.
 *
 * - `studio.trace-spans`: trace spans from the DB with filtering by
 *   trace_id, name, and status.
 * - `studio.system-snapshot`: current process and host stats.
 * - `studio.metrics-snapshot`: snapshot of the Effect metric registry.
 * - `studio.sessions`: auth sessions with contact info and derived status.
 */

import os from "node:os"
import { Effect, Metric } from "effect"
import {
    and,
    desc,
    eq,
    gt,
    isNotNull,
    isNull,
    lte,
    count as countFn,
    inArray,
    type SQL,
} from "drizzle-orm"
import { StudioOrganisationRpcs, StudioRpcs } from "@urm/contracts/sysadmin"
import { AuthenticatedRequestContext } from "@urm/contracts/auth-legacy"
import { AuthorizationError } from "@urm/domain/errors"
import { DB, schema } from "@urm/database"
import { StudioSessionsFilter } from "@urm/domain/schemas/studio"
import type {
    StudioMetricSnapshot,
    StudioSessionItem,
    StudioSessionStatus,
    StudioSpanItem,
    StudioSpanStatus,
    StudioSystemSnapshot,
} from "@urm/domain/schemas/studio"
import { databaseError } from "../errors.ts"

const toSpanStatus = (value: string): StudioSpanStatus =>
    value === "ok" ? "ok" : value === "error" ? "error" : "started"

export const systemSnapshot = (): StudioSystemSnapshot => {
    const memory = process.memoryUsage()
    const cpu = process.cpuUsage()
    const [loadavg_1m, loadavg_5m, loadavg_15m] = os.loadavg()

    return {
        pid: process.pid,
        node_version: process.version,
        uptime_seconds: process.uptime(),
        rss_bytes: memory.rss,
        heap_used_bytes: memory.heapUsed,
        heap_total_bytes: memory.heapTotal,
        external_bytes: memory.external,
        cpu_user_micros: cpu.user,
        cpu_system_micros: cpu.system,
        loadavg_1m: loadavg_1m ?? 0,
        loadavg_5m: loadavg_5m ?? 0,
        loadavg_15m: loadavg_15m ?? 0,
        free_memory_bytes: os.freemem(),
        total_memory_bytes: os.totalmem(),
        cpu_count: os.cpus().length,
        platform: os.platform(),
        arch: os.arch(),
    }
}

// Histogram boundaries and empty-state min/max contain +/-Infinity, which is
// not representable in JSON, so non-finite numbers become null.
const finiteOrNull = (value: number): number | null =>
    Number.isFinite(value) ? value : null

const metricState = (
    snapshot: Metric.Metric.Snapshot
): Record<string, unknown> => {
    switch (snapshot.type) {
        case "Counter":
            return { count: Number(snapshot.state.count) }
        case "Gauge":
            return { value: Number(snapshot.state.value) }
        case "Frequency":
            return {
                occurrences: Object.fromEntries(snapshot.state.occurrences),
            }
        case "Histogram":
            return {
                count: snapshot.state.count,
                min: finiteOrNull(snapshot.state.min),
                max: finiteOrNull(snapshot.state.max),
                sum: snapshot.state.sum,
                buckets: snapshot.state.buckets.map(([boundary, count]) => ({
                    boundary: finiteOrNull(boundary),
                    count,
                })),
            }
        case "Summary":
            return {
                count: snapshot.state.count,
                min: finiteOrNull(snapshot.state.min),
                max: finiteOrNull(snapshot.state.max),
                sum: snapshot.state.sum,
                quantiles: snapshot.state.quantiles.map(
                    ([quantile, value]) => ({
                        quantile,
                        value: value === undefined ? null : finiteOrNull(value),
                    })
                ),
            }
    }
}

export const toStudioMetric = (
    snapshot: Metric.Metric.Snapshot
): StudioMetricSnapshot => ({
    id: snapshot.id,
    type: snapshot.type,
    ...(snapshot.description === undefined
        ? {}
        : { description: snapshot.description }),
    ...(snapshot.attributes === undefined
        ? {}
        : { attributes: snapshot.attributes }),
    state: metricState(snapshot),
})

/*
 * One sessions query, used at both scopes. `scope` narrows which rows are
 * visible: the platform view passes none, the organisation view passes a
 * restriction derived from the caller's own memberships.
 */
const fetchSessions = (filter: typeof StudioSessionsFilter.Type, scope?: SQL) =>
    Effect.gen(function* () {
        const db = yield* DB
        const { status, limit, offset, domain_id } = filter
        const now = Date.now()
        const conditions: Array<SQL> = scope === undefined ? [] : [scope]

        if (domain_id !== undefined) {
            conditions.push(eq(schema.auth_sessions.domain_id, domain_id))
        }

        if (status === "revoked") {
            conditions.push(isNotNull(schema.auth_sessions.revoked_at))
        } else if (status === "active") {
            conditions.push(isNull(schema.auth_sessions.revoked_at))
            conditions.push(gt(schema.auth_sessions.expires_at, now))
        } else if (status === "expired") {
            conditions.push(isNull(schema.auth_sessions.revoked_at))
            conditions.push(lte(schema.auth_sessions.expires_at, now))
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined

        const totalResult = yield* db
            .select({ count: countFn() })
            .from(schema.auth_sessions)
            .where(where)

        const total = Number(totalResult[0]?.count ?? 0)

        const rows = yield* db
            .select({
                session: schema.auth_sessions,
                contact_name: schema.contacts.name,
                contact_email: schema.contacts.email,
            })
            .from(schema.auth_sessions)
            .leftJoin(
                schema.contacts,
                eq(schema.auth_sessions.contact_id, schema.contacts.id)
            )
            .where(where)
            .orderBy(desc(schema.auth_sessions.created_at))
            .limit(limit ?? 50)
            .offset(offset ?? 0)

        const toStatus = (
            session: (typeof rows)[number]["session"]
        ): StudioSessionStatus =>
            session.revoked_at !== null
                ? "revoked"
                : session.expires_at <= now
                  ? "expired"
                  : "active"

        const toDate = (millis: number | null): Date | undefined =>
            millis === null ? undefined : new Date(millis)

        const items: ReadonlyArray<StudioSessionItem> = rows.map(
            ({ session, contact_name, contact_email }) => ({
                id: session.id,
                contact_id: session.contact_id,
                contact_name: contact_name ?? undefined,
                contact_email: contact_email ?? undefined,
                status: toStatus(session),
                ip_address: session.ip_address ?? undefined,
                user_agent: session.user_agent ?? undefined,
                created_at: new Date(session.created_at),
                expires_at: new Date(session.expires_at),
                last_seen_at: toDate(session.last_seen_at),
                rotated_at: toDate(session.rotated_at),
                revoked_at: toDate(session.revoked_at),
                revoked_reason: session.revoked_reason ?? undefined,
                domain_id: session.domain_id ?? undefined,
            })
        )

        return { items, total }
    })

const StudioRpcHandlersLive = Effect.gen(function* () {
    const db = yield* DB

    return StudioRpcs.of({
        "studio.trace-spans": ({ trace_id, name, status, limit, offset }) =>
            Effect.gen(function* () {
                const conditions: Array<ReturnType<typeof eq>> = []

                if (trace_id !== undefined) {
                    conditions.push(
                        eq(schema.observability_spans.trace_id, trace_id)
                    )
                }

                if (name !== undefined) {
                    conditions.push(eq(schema.observability_spans.name, name))
                }

                if (status !== undefined) {
                    conditions.push(
                        eq(schema.observability_spans.status, status)
                    )
                }

                const where =
                    conditions.length > 0 ? and(...conditions) : undefined

                const totalResult = yield* db
                    .select({ count: countFn() })
                    .from(schema.observability_spans)
                    .where(where)

                const total = Number(totalResult[0]?.count ?? 0)

                const rows = yield* db
                    .select()
                    .from(schema.observability_spans)
                    .where(where)
                    .orderBy(desc(schema.observability_spans.started_at))
                    .limit(limit ?? 200)
                    .offset(offset ?? 0)

                const items: ReadonlyArray<StudioSpanItem> = rows.map(
                    (row) => ({
                        span_id: row.span_id,
                        trace_id: row.trace_id,
                        parent_span_id: row.parent_span_id ?? undefined,
                        name: row.name,
                        kind: row.kind,
                        status: toSpanStatus(row.status),
                        started_at: row.started_at,
                        ended_at: row.ended_at ?? undefined,
                        duration_ms: row.duration_ms ?? undefined,
                        attributes: row.attributes,
                        events: row.events,
                        created_at: row.created_at,
                    })
                )

                return { items, total }
            }).pipe(
                Effect.mapError(databaseError("Failed to fetch trace spans"))
            ),
        "studio.system-snapshot": () => Effect.sync(systemSnapshot),
        "studio.metrics-snapshot": () =>
            Effect.map(Metric.snapshot, (snapshots) => ({
                items: snapshots.map(toStudioMetric),
            })),
        "studio.sessions": (filter) =>
            fetchSessions(filter).pipe(
                Effect.mapError(databaseError("Failed to fetch sessions"))
            ),
    })
})

export const StudioRpcLive = StudioRpcs.toLayer(StudioRpcHandlersLive)

/*
 * Sessions for the caller's own organisations.
 *
 * The scope is a subquery over `org_contacts`, not a parameter: it selects the
 * contacts who share an active organisation with the caller, so a member cannot
 * widen it by asking. This group carries only AuthenticatedRpcMiddleware, which
 * checks that there is a caller but not who they may read — the restriction here
 * is what makes it tenant-safe.
 */
const StudioOrganisationRpcHandlersLive = Effect.gen(function* () {
    const db = yield* DB

    return StudioOrganisationRpcs.of({
        "studio.organisation.sessions": (filter) =>
            Effect.gen(function* () {
                const context = yield* AuthenticatedRequestContext

                const callerOrgs = db
                    .select({ org_id: schema.org_contacts.org_id })
                    .from(schema.org_contacts)
                    .where(
                        and(
                            eq(
                                schema.org_contacts.contact_id,
                                context.contactId
                            ),
                            eq(schema.org_contacts.status, "active"),
                            isNull(schema.org_contacts.deleted_at)
                        )
                    )

                const peers = db
                    .select({ contact_id: schema.org_contacts.contact_id })
                    .from(schema.org_contacts)
                    .where(
                        and(
                            inArray(schema.org_contacts.org_id, callerOrgs),
                            eq(schema.org_contacts.status, "active"),
                            isNull(schema.org_contacts.deleted_at)
                        )
                    )

                /* Checked, not trusted. Restricting to peer contacts alone
                   would not be enough: a contact who belongs to two
                   organisations would otherwise expose their sessions on the
                   other organisation's domain to this one. */
                if (filter.domain_id !== undefined) {
                    const permitted = yield* db
                        .select({ id: schema.domains.id })
                        .from(schema.domains)
                        .where(
                            and(
                                eq(schema.domains.id, filter.domain_id),
                                inArray(schema.domains.org_id, callerOrgs),
                                isNull(schema.domains.deleted_at)
                            )
                        )
                        .limit(1)

                    if (permitted[0] === undefined) {
                        return yield* Effect.fail(
                            new AuthorizationError({
                                message: "Not permitted for this domain",
                            })
                        )
                    }
                }

                return yield* fetchSessions(
                    filter,
                    inArray(schema.auth_sessions.contact_id, peers)
                )
            }).pipe(Effect.mapError(databaseError("Failed to fetch sessions"))),
    })
})

export const StudioOrganisationRpcLive = StudioOrganisationRpcs.toLayer(
    StudioOrganisationRpcHandlersLive
)
