import { Schema } from "effect"
import { Entity, Query, Remote } from "foldkit-remote"
import { SysadminAccountSessions } from "@urm/domain/schemas/sysadmin-sessions"
import { SysadminAccountTelemetry } from "@urm/domain/schemas/sysadmin-telemetry"
import { SysadminProcessSnapshot } from "@urm/domain/schemas/sysadmin-process"

export const SysadminSessionsEntity = Entity.make(
    "SysadminSessions",
    SysadminAccountSessions
)
export const SysadminSessionsQuery = Query.make("SysadminSessionsQuery", {
    Input: {
        domain_id: Schema.String,
        all_tenants: Schema.Boolean,
        as_of: Schema.Number,
    },
    Result: SysadminSessionsEntity,
})
export const SysadminTelemetryEntity = Entity.make(
    "SysadminTelemetry",
    SysadminAccountTelemetry
)
export const SysadminTelemetryQuery = Query.make("SysadminTelemetryQuery", {
    Input: {
        domain_id: Schema.String,
        all_tenants: Schema.Boolean,
        refresh: Schema.Number,
        action: Schema.optional(Schema.String),
        result: Schema.optional(Schema.String),
        level: Schema.optional(Schema.String),
        source: Schema.optional(Schema.String),
        trace_id: Schema.optional(Schema.String),
    },
    Result: SysadminTelemetryEntity,
})
export const SysadminProcessEntity = Entity.make(
    "SysadminProcess",
    SysadminProcessSnapshot
)
export const SysadminProcessQuery = Query.make("SysadminProcessQuery", {
    Input: { domain_id: Schema.String, refresh: Schema.Number },
    Result: SysadminProcessEntity,
})
export const SysadminRemote = Remote.define({
    entities: [
        SysadminSessionsEntity,
        SysadminTelemetryEntity,
        SysadminProcessEntity,
    ],
    queries: [
        SysadminSessionsQuery,
        SysadminTelemetryQuery,
        SysadminProcessQuery,
    ],
})
