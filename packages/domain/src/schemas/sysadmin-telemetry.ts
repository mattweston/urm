import { Schema } from "effect"

const Metadata = Schema.Record(Schema.String, Schema.String)
const Scope = {
    organization_id: Schema.NullOr(Schema.String),
    domain_id: Schema.NullOr(Schema.String),
    actor_user_id: Schema.NullOr(Schema.String),
}

export const SysadminAuditEvent = Schema.Struct({
    id: Schema.String,
    ...Scope,
    action: Schema.String,
    entity_type: Schema.String,
    entity_id: Schema.NullOr(Schema.String),
    result: Schema.Literals(["succeeded", "failed", "blocked"]),
    reason_class: Schema.NullOr(Schema.String),
    trace_id: Schema.NullOr(Schema.String),
    request_id: Schema.NullOr(Schema.String),
    metadata: Metadata,
    created_at: Schema.Number,
})
export const SysadminLog = Schema.Struct({
    id: Schema.String,
    ...Scope,
    level: Schema.Literals(["debug", "info", "warning", "error"]),
    message: Schema.String,
    source: Schema.String,
    trace_id: Schema.NullOr(Schema.String),
    span_id: Schema.NullOr(Schema.String),
    session_id: Schema.NullOr(Schema.String),
    request_id: Schema.NullOr(Schema.String),
    metadata: Metadata,
    created_at: Schema.Number,
})
export const SysadminSpan = Schema.Struct({
    ...Scope,
    span_id: Schema.String,
    trace_id: Schema.String,
    parent_span_id: Schema.NullOr(Schema.String),
    name: Schema.String,
    kind: Schema.String,
    status: Schema.Literals(["started", "ok", "error"]),
    started_at: Schema.Number,
    ended_at: Schema.NullOr(Schema.Number),
    created_at: Schema.Number,
    attributes: Metadata,
})
export const SysadminAccountTelemetry = Schema.Struct({
    id: Schema.String,
    events: Schema.Array(SysadminAuditEvent),
    logs: Schema.Array(SysadminLog),
    errors: Schema.Array(SysadminLog),
    spans: Schema.Array(SysadminSpan),
    has_more: Schema.Boolean,
    scope_name: Schema.String,
    can_view_all: Schema.Boolean,
})
export type SysadminAccountTelemetry = typeof SysadminAccountTelemetry.Type
