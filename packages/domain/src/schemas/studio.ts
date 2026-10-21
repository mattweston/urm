import { Schema } from "effect"

export const StudioSpanStatus = Schema.Literals(["started", "ok", "error"])

export type StudioSpanStatus = Schema.Schema.Type<typeof StudioSpanStatus>

export const StudioSpanEvent = Schema.Struct({
    name: Schema.String,
    at: Schema.Number,
    attributes: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
})

export type StudioSpanEvent = Schema.Schema.Type<typeof StudioSpanEvent>

export const StudioSpanItem = Schema.Struct({
    span_id: Schema.String,
    trace_id: Schema.String,
    parent_span_id: Schema.optional(Schema.String),
    name: Schema.String,
    kind: Schema.String,
    status: StudioSpanStatus,
    started_at: Schema.Date,
    ended_at: Schema.optional(Schema.Date),
    duration_ms: Schema.optional(Schema.Number),
    attributes: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
    events: Schema.optional(Schema.Array(StudioSpanEvent)),
    created_at: Schema.Date,
})

export type StudioSpanItem = Schema.Schema.Type<typeof StudioSpanItem>

export const StudioTraceSpansFilter = Schema.Struct({
    trace_id: Schema.optional(Schema.String),
    name: Schema.optional(Schema.String),
    status: Schema.optional(StudioSpanStatus),
    limit: Schema.optional(Schema.Number),
    offset: Schema.optional(Schema.Number),
})

export type StudioTraceSpansFilter = Schema.Schema.Type<
    typeof StudioTraceSpansFilter
>

export const StudioSpanList = Schema.Struct({
    items: Schema.Array(StudioSpanItem),
    total: Schema.Number,
})

export type StudioSpanList = Schema.Schema.Type<typeof StudioSpanList>

export const StudioSystemSnapshot = Schema.Struct({
    pid: Schema.Number,
    node_version: Schema.String,
    uptime_seconds: Schema.Number,
    rss_bytes: Schema.Number,
    heap_used_bytes: Schema.Number,
    heap_total_bytes: Schema.Number,
    external_bytes: Schema.Number,
    cpu_user_micros: Schema.Number,
    cpu_system_micros: Schema.Number,
    loadavg_1m: Schema.Number,
    loadavg_5m: Schema.Number,
    loadavg_15m: Schema.Number,
    free_memory_bytes: Schema.Number,
    total_memory_bytes: Schema.Number,
    cpu_count: Schema.Number,
    platform: Schema.String,
    arch: Schema.String,
})

export type StudioSystemSnapshot = Schema.Schema.Type<
    typeof StudioSystemSnapshot
>

export const StudioMetricType = Schema.Literals([
    "Counter",
    "Gauge",
    "Frequency",
    "Histogram",
    "Summary",
])

export type StudioMetricType = Schema.Schema.Type<typeof StudioMetricType>

export const StudioMetricSnapshot = Schema.Struct({
    id: Schema.String,
    type: StudioMetricType,
    description: Schema.optional(Schema.String),
    attributes: Schema.optional(Schema.Record(Schema.String, Schema.String)),
    state: Schema.Record(Schema.String, Schema.Unknown),
})

export type StudioMetricSnapshot = Schema.Schema.Type<
    typeof StudioMetricSnapshot
>

export const StudioMetricsList = Schema.Struct({
    items: Schema.Array(StudioMetricSnapshot),
})

export type StudioMetricsList = Schema.Schema.Type<typeof StudioMetricsList>

export const StudioSessionStatus = Schema.Literals([
    "active",
    "expired",
    "revoked",
])

export type StudioSessionStatus = Schema.Schema.Type<typeof StudioSessionStatus>

export const StudioSessionItem = Schema.Struct({
    id: Schema.String,
    contact_id: Schema.String,
    contact_name: Schema.optional(Schema.String),
    contact_email: Schema.optional(Schema.String),
    status: StudioSessionStatus,
    ip_address: Schema.optional(Schema.String),
    user_agent: Schema.optional(Schema.String),
    created_at: Schema.Date,
    expires_at: Schema.Date,
    last_seen_at: Schema.optional(Schema.Date),
    rotated_at: Schema.optional(Schema.Date),
    revoked_at: Schema.optional(Schema.Date),
    revoked_reason: Schema.optional(Schema.String),
    domain_id: Schema.optional(Schema.String),
})

export type StudioSessionItem = Schema.Schema.Type<typeof StudioSessionItem>

export const StudioSessionsFilter = Schema.Struct({
    status: Schema.optional(StudioSessionStatus),
    limit: Schema.optional(Schema.Number),
    offset: Schema.optional(Schema.Number),

    domain_id: Schema.optional(Schema.String),
})

export type StudioSessionsFilter = Schema.Schema.Type<
    typeof StudioSessionsFilter
>

export const StudioSessionList = Schema.Struct({
    items: Schema.Array(StudioSessionItem),
    total: Schema.Number,
})

export type StudioSessionList = Schema.Schema.Type<typeof StudioSessionList>

export { DatabaseError } from "../errors.ts"
