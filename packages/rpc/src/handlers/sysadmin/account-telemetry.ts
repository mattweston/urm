import { sql, type SQL } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import type { AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/db/sql"
import {
    SysadminRemote,
    SysadminTelemetryEntity,
    SysadminTelemetryQuery,
} from "@urm/contracts/sysadmin"
import {
    SysadminAuditEvent,
    SysadminLog,
    SysadminSpan,
} from "@urm/domain/schemas/sysadmin-telemetry"
import { authorize_sysadmin_scope } from "./account-sessions.ts"

interface Principal extends AccountPrincipal {
    readonly domain_id: string
}
const Key = Schema.Struct({
    domain_id: Schema.String,
    all_tenants: Schema.Boolean,
    refresh: Schema.Number,
    action: Schema.optional(Schema.String),
    result: Schema.optional(Schema.String),
    level: Schema.optional(Schema.String),
    source: Schema.optional(Schema.String),
    trace_id: Schema.optional(Schema.String),
})
const denied = () =>
    new RemoteServerError({ message: "Sysadmin access denied" })
const query_error = (error: unknown) =>
    error instanceof RemoteServerError
        ? error
        : new RemoteServerError({ message: "Sysadmin telemetry unavailable" })
const key = (input: typeof Key.Type) => JSON.stringify(input)
const scoped = (all_tenants: boolean, organization_id: string): SQL =>
    all_tenants ? sql`true` : sql`organization_id=${organization_id}`
const matched = (column: SQL, value: string | undefined): SQL =>
    value === undefined ? sql`true` : sql`${column}=${value}`

const load = Effect.fn("Sysadmin.loadTelemetry")(function* (
    principal: Principal,
    input: typeof Key.Type
) {
    if (!Number.isFinite(input.refresh)) return yield* Effect.fail(denied())
    const access = yield* authorize_sysadmin_scope(principal, {
        domain_id: input.domain_id,
        all_tenants: input.all_tenants,
        as_of: Date.now(),
    })
    const scope = scoped(input.all_tenants, access.organization_id)
    const events = yield* query_rows(
        SysadminAuditEvent,
        sql`SELECT id,organization_id,domain_id,actor_user_id,action,
            entity_type,entity_id,result,reason_class,trace_id,request_id,
            metadata,created_at::float8 AS created_at
        FROM audit_events WHERE ${scope}
            AND ${matched(sql`action`, input.action)}
            AND ${matched(sql`result`, input.result)}
        ORDER BY created_at DESC,id DESC LIMIT 101`
    )
    const logs = yield* query_rows(
        SysadminLog,
        sql`SELECT id,organization_id,domain_id,actor_user_id,level,
            message,source,trace_id,span_id,session_id,request_id,
            metadata,created_at::float8 AS created_at
        FROM observability_logs WHERE ${scope}
            AND ${matched(sql`level`, input.level)}
            AND ${matched(sql`source`, input.source)}
        ORDER BY created_at DESC,id DESC LIMIT 101`
    )
    const errors = yield* query_rows(
        SysadminLog,
        sql`SELECT id,organization_id,domain_id,actor_user_id,level,
            message,source,trace_id,span_id,session_id,request_id,
            metadata,created_at::float8 AS created_at
        FROM observability_logs WHERE ${scope} AND level='error'
        ORDER BY created_at DESC,id DESC LIMIT 101`
    )
    const spans = yield* query_rows(
        SysadminSpan,
        sql`SELECT organization_id,domain_id,actor_user_id,span_id,trace_id,
            parent_span_id,name,kind,status,started_at::float8 AS started_at,
            ended_at::float8 AS ended_at,created_at::float8 AS created_at,
            attributes
        FROM observability_spans WHERE ${scope}
            AND ${matched(sql`trace_id`, input.trace_id)}
        ORDER BY created_at DESC,span_id DESC LIMIT 101`
    )
    return {
        id: key(input),
        events: events.slice(0, 100),
        logs: logs.slice(0, 100),
        errors: errors.slice(0, 100),
        spans: spans.slice(0, 100),
        has_more: [events, logs, errors, spans].some(
            (rows) => rows.length > 100
        ),
        scope_name: input.all_tenants ? "All tenants" : access.scope_name,
        can_view_all: access.can_view_all,
    }
})
const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        load: (principal: Principal, input: typeof Key.Type) =>
            load(principal, input).pipe(Effect.provideService(Sql, db)),
    }
})
export class SysadminTelemetryRepository extends Context.Service<
    SysadminTelemetryRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/SysadminTelemetryRepository") {}
export const SysadminTelemetryRepositoryLive = Layer.effect(
    SysadminTelemetryRepository,
    make
)
const terminal: Boundary = { _tag: "Terminal" }
export const SysadminTelemetryServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<Principal, SysadminTelemetryRepository>(
            SysadminTelemetryEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.forEach(ids, (id) =>
                        Effect.gen(function* () {
                            const parsed = yield* Effect.try(() =>
                                JSON.parse(id)
                            )
                            const input =
                                yield* Schema.decodeUnknownEffect(Key)(parsed)
                            const repository =
                                yield* SysadminTelemetryRepository
                            return {
                                id,
                                values: yield* repository.load(
                                    principal,
                                    input
                                ),
                            }
                        })
                    ).pipe(Effect.mapError(query_error)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            SysadminTelemetryQuery,
            ({
                input,
                principal,
            }: {
                input: typeof Key.Type
                principal: Principal
            }) =>
                Effect.gen(function* () {
                    const repository = yield* SysadminTelemetryRepository
                    yield* repository.load(principal, input)
                    const id = key(input)
                    return {
                        edges: [
                            {
                                entity: SysadminTelemetryEntity.name,
                                id,
                                key: entityKey(
                                    SysadminTelemetryEntity.name,
                                    id
                                ),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(query_error))
        ),
    ],
})
RemoteServer.validate(SysadminRemote, SysadminTelemetryServer)
export const sysadmin_telemetry_handlers = (principal: Principal) =>
    RemoteServer.handlers(SysadminTelemetryServer, principal)
