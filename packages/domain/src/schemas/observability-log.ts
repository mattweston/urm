import { Schema } from "effect"

export const LogLevel = Schema.Literals(["debug", "info", "warning", "error"])

export type LogLevel = Schema.Schema.Type<typeof LogLevel>

export const ObservabilityLogFilter = Schema.Struct({
    level: Schema.optional(LogLevel),
    source: Schema.optional(Schema.String),
    trace_id: Schema.optional(Schema.String),
    contact_id: Schema.optional(Schema.String),
    session_id: Schema.optional(Schema.String),
    domain_id: Schema.optional(Schema.String),
    date_from: Schema.optional(Schema.Date),
    date_to: Schema.optional(Schema.Date),
    limit: Schema.optional(Schema.Number),
    offset: Schema.optional(Schema.Number),
})

export type ObservabilityLogFilter = Schema.Schema.Type<
    typeof ObservabilityLogFilter
>

export const ObservabilityLogItem = Schema.Struct({
    id: Schema.String,
    level: LogLevel,
    message: Schema.String,
    source: Schema.optional(Schema.String),
    trace_id: Schema.optional(Schema.String),
    span_id: Schema.optional(Schema.String),
    contact_id: Schema.optional(Schema.String),
    session_id: Schema.optional(Schema.String),
    domain_id: Schema.optional(Schema.String),
    request_id: Schema.optional(Schema.String),
    metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
    created_at: Schema.Date,
})

export type ObservabilityLogItem = Schema.Schema.Type<
    typeof ObservabilityLogItem
>

export const ObservabilityLogList = Schema.Struct({
    items: Schema.Array(ObservabilityLogItem),
    total: Schema.Number,
})

export type ObservabilityLogList = Schema.Schema.Type<
    typeof ObservabilityLogList
>

export { DatabaseError } from "../errors.ts"
