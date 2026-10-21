import { Schema as S } from "effect"
import { AsyncData } from "foldkit"
import { AppRoute } from "./route.ts"

/** Shared by the commands that report it and the view that recognizes it. */
export const persistence_unavailable_error =
    "Sysadmin is not connected to a persistence adapter"

export const AuditEventItem = S.Struct({
    id: S.String,
    action: S.String,
    entity_type: S.String,
    entity_id: S.optional(S.String),
    result: S.String,
    reason_class: S.optional(S.String),
    user_id: S.optional(S.String),
    actor_user_id: S.optional(S.String),
    request_id: S.optional(S.String),
    created_at: S.Date,
})
export type AuditEventItem = typeof AuditEventItem.Type

export const AuditFilter = S.Struct({
    action: S.optional(S.String),
    result: S.optional(S.String),
    domain_id: S.optional(S.String),
})
export type AuditFilter = typeof AuditFilter.Type

export const LogLevel = S.Literals(["debug", "info", "warning", "error"])
export type LogLevel = typeof LogLevel.Type

export const LogItem = S.Struct({
    id: S.String,
    level: LogLevel,
    message: S.String,
    source: S.optional(S.String),
    trace_id: S.optional(S.String),
    span_id: S.optional(S.String),
    user_id: S.optional(S.String),
    session_id: S.optional(S.String),
    domain_id: S.optional(S.String),
    request_id: S.optional(S.String),
    metadata: S.optional(S.Record(S.String, S.Unknown)),
    created_at: S.Date,
})
export type LogItem = typeof LogItem.Type

export const LogFilter = S.Struct({
    level: S.optional(LogLevel),
    source: S.optional(S.String),
    domain_id: S.optional(S.String),
})
export type LogFilter = typeof LogFilter.Type

export const SpanStatus = S.Literals(["started", "ok", "error"])
export type SpanStatus = typeof SpanStatus.Type

export const SpanItem = S.Struct({
    span_id: S.String,
    trace_id: S.String,
    parent_span_id: S.optional(S.String),
    name: S.String,
    kind: S.String,
    status: SpanStatus,
    started_at: S.Date,
    ended_at: S.optional(S.Date),
    duration_ms: S.optional(S.Number),
    created_at: S.Date,
})
export type SpanItem = typeof SpanItem.Type

export const TraceFilter = S.Struct({
    trace_id: S.optional(S.String),
})
export type TraceFilter = typeof TraceFilter.Type

export const MetricItem = S.Struct({
    id: S.String,
    type: S.String,
    description: S.optional(S.String),
    attributes: S.optional(S.Record(S.String, S.String)),
    state: S.Record(S.String, S.Unknown),
})
export type MetricItem = typeof MetricItem.Type

export const SystemSnapshot = S.Struct({
    pid: S.Number,
    node_version: S.String,
    uptime_seconds: S.Number,
    rss_bytes: S.Number,
    heap_used_bytes: S.Number,
    heap_total_bytes: S.Number,
    external_bytes: S.Number,
    cpu_user_micros: S.Number,
    cpu_system_micros: S.Number,
    loadavg_1m: S.Number,
    loadavg_5m: S.Number,
    loadavg_15m: S.Number,
    free_memory_bytes: S.Number,
    total_memory_bytes: S.Number,
    cpu_count: S.Number,
    platform: S.String,
    arch: S.String,
})
export type SystemSnapshot = typeof SystemSnapshot.Type

export const SessionStatus = S.Literals([
    "active",
    "expired",
    "revoked",
    "unknown",
])
export type SessionStatus = typeof SessionStatus.Type

export const SessionItem = S.Struct({
    id: S.String,
    user_id: S.String,
    user_name: S.optional(S.String),
    user_email: S.optional(S.String),
    status: SessionStatus,
    created_at: S.Date,
    last_seen_at: S.optional(S.Date),
    expires_at: S.optional(S.Date),
    revoked_at: S.optional(S.Date),
    verified_at: S.optional(S.Date),
})
export type SessionItem = typeof SessionItem.Type

export const SessionsAsyncData = AsyncData.Schema(
    S.Array(SessionItem),
    S.String
)

export const SessionFilter = S.Struct({ status: S.optional(SessionStatus) })
export type SessionFilter = typeof SessionFilter.Type

export const Model = S.Struct({
    route: AppRoute,
    events: S.Array(AuditEventItem),
    total: S.Number,
    filter: AuditFilter,
    logs: S.Array(LogItem),
    logsTotal: S.Number,
    logFilter: LogFilter,
    spans: S.Array(SpanItem),
    spansTotal: S.Number,
    traceFilter: TraceFilter,
    errors: S.Array(LogItem),
    errorsTotal: S.Number,
    metrics: S.Array(MetricItem),
    system: S.NullOr(SystemSnapshot),
    process_scope_key: S.optional(S.String),
    sessions: SessionsAsyncData.schema,
    sessionsTotal: S.Number,
    telemetry_refresh: S.Number,
    telemetry_request_id: S.optional(S.String),
    telemetry_has_more: S.Boolean,
    telemetry_scope_name: S.String,
    telemetry_can_view_all: S.Boolean,
    telemetry_all_tenants: S.Boolean,
    session_as_of: S.optional(S.Number),
    session_request_id: S.optional(S.String),
    sessions_has_more: S.Boolean,
    sessions_scope_name: S.String,
    sessions_can_view_all: S.Boolean,
    sessions_all_tenants: S.Boolean,
    sessionFilter: SessionFilter,
    domainFilter: S.optional(S.String),
    pendingRoutes: S.Array(S.String),
    loadErrorsByRoute: S.Record(S.String, S.String),
    isLoading: S.Boolean,
    error: S.NullOr(S.String),
    isSidebarCollapsed: S.Boolean,
    isSidebarMobileOpen: S.Boolean,
    sidebarTooltipsRevision: S.Number,
})
export type Model = typeof Model.Type

export const initialModel = (route: AppRoute): Model => ({
    route,
    events: [],
    total: 0,
    filter: {},
    logs: [],
    logsTotal: 0,
    logFilter: {},
    spans: [],
    spansTotal: 0,
    traceFilter: {},
    errors: [],
    errorsTotal: 0,
    metrics: [],
    system: null,
    process_scope_key: undefined,
    sessions: SessionsAsyncData.Idle(),
    sessionsTotal: 0,
    telemetry_refresh: 0,
    telemetry_request_id: undefined,
    telemetry_has_more: false,
    telemetry_scope_name: "",
    telemetry_can_view_all: false,
    telemetry_all_tenants: false,
    session_as_of: undefined,
    session_request_id: undefined,
    sessions_has_more: false,
    sessions_scope_name: "",
    sessions_can_view_all: false,
    sessions_all_tenants: false,
    sessionFilter: {},
    pendingRoutes: [],
    loadErrorsByRoute: {},
    isLoading: true,
    error: null,
    isSidebarCollapsed: false,
    isSidebarMobileOpen: false,
    sidebarTooltipsRevision: 0,
})
