import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { Message as SidebarTooltipMessageSchema } from "@foldkit/ui/tooltip"
import {
    AuditEventItem,
    LogItem,
    LogLevel,
    MetricItem,
    SessionItem,
    SessionStatus,
    SpanItem,
    SystemSnapshot,
} from "./app.model.ts"
import {
    ChangedUrl,
    ClickedLink,
    CompletedNavigateInternal,
    CompletedLoadExternal,
} from "./route.message.ts"

export const ClickedRefresh = taggedStruct("ClickedRefresh")
export const UpdatedFilterAction = taggedStruct("UpdatedFilterAction", {
    value: S.String,
})
export const UpdatedFilterResult = taggedStruct("UpdatedFilterResult", {
    value: S.String,
})
export const ClearedFilter = taggedStruct("ClearedFilter")
export const SucceededLoadAuditEvents = taggedStruct(
    "SucceededLoadAuditEvents",
    {
        events: S.Array(AuditEventItem),
        total: S.Number,
    }
)
export const FailedLoadAuditEvents = taggedStruct("FailedLoadAuditEvents", {
    error: S.String,
})

export const UpdatedLogFilterLevel = taggedStruct("UpdatedLogFilterLevel", {
    value: S.optional(LogLevel),
})
export const UpdatedLogFilterSource = taggedStruct("UpdatedLogFilterSource", {
    value: S.String,
})
export const ClearedLogFilter = taggedStruct("ClearedLogFilter")
export const SucceededLoadLogs = taggedStruct("SucceededLoadLogs", {
    logs: S.Array(LogItem),
    total: S.Number,
})
export const FailedLoadLogs = taggedStruct("FailedLoadLogs", {
    error: S.String,
})

export const UpdatedTraceFilterTraceId = taggedStruct(
    "UpdatedTraceFilterTraceId",
    {
        value: S.String,
    }
)
export const ClearedTraceFilter = taggedStruct("ClearedTraceFilter")
export const SucceededLoadSpans = taggedStruct("SucceededLoadSpans", {
    spans: S.Array(SpanItem),
    total: S.Number,
})
export const FailedLoadSpans = taggedStruct("FailedLoadSpans", {
    error: S.String,
})

export const SucceededLoadErrors = taggedStruct("SucceededLoadErrors", {
    logs: S.Array(LogItem),
    total: S.Number,
})
export const FailedLoadErrors = taggedStruct("FailedLoadErrors", {
    error: S.String,
})

export const SucceededLoadMetrics = taggedStruct("SucceededLoadMetrics", {
    metrics: S.Array(MetricItem),
    scope_key: S.optional(S.String),
})
export const FailedLoadMetrics = taggedStruct("FailedLoadMetrics", {
    error: S.String,
    scope_key: S.optional(S.String),
})

export const SucceededLoadSystem = taggedStruct("SucceededLoadSystem", {
    snapshot: SystemSnapshot,
    scope_key: S.optional(S.String),
})
export const FailedLoadSystem = taggedStruct("FailedLoadSystem", {
    error: S.String,
    scope_key: S.optional(S.String),
})

export const UpdatedSessionFilterStatus = taggedStruct(
    "UpdatedSessionFilterStatus",
    {
        value: S.optional(SessionStatus),
    }
)
export const UpdatedDomainFilter = taggedStruct("UpdatedDomainFilter", {
    value: S.optional(S.String),
})
export const RequestedSessions = taggedStruct("RequestedSessions", {
    as_of: S.Number,
    request_id: S.String,
})
export const UpdatedSessionScope = taggedStruct("UpdatedSessionScope", {
    all_tenants: S.Boolean,
})
export const SucceededLoadSessions = taggedStruct("SucceededLoadSessions", {
    as_of: S.optional(S.Number),
    request_id: S.optional(S.String),
    sessions: S.Array(SessionItem),
    total: S.Number,
    has_more: S.Boolean,
    scope_name: S.String,
    can_view_all: S.Boolean,
})
export const FailedLoadSessions = taggedStruct("FailedLoadSessions", {
    error: S.String,
    as_of: S.optional(S.Number),
    request_id: S.optional(S.String),
})

export const ToggledAppSidebarIsCollapsed = taggedStruct(
    "ToggledAppSidebarIsCollapsed"
)
export const ToggledAppSidebarMobileIsOpen = taggedStruct(
    "ToggledAppSidebarMobileIsOpen"
)
export const GotSidebarTooltipMessage = taggedStruct(
    "GotSidebarTooltipMessage",
    {
        tooltipId: S.String,
        message: SidebarTooltipMessageSchema,
    }
)

export const RequestedTelemetry = taggedStruct("RequestedTelemetry", {
    refresh: S.Number,
})
export const UpdatedTelemetryScope = taggedStruct("UpdatedTelemetryScope", {
    all_tenants: S.Boolean,
})
export const SucceededLoadTelemetry = taggedStruct("SucceededLoadTelemetry", {
    request_id: S.optional(S.String),
    events: S.Array(AuditEventItem),
    logs: S.Array(LogItem),
    errors: S.Array(LogItem),
    spans: S.Array(SpanItem),
    has_more: S.Boolean,
    scope_name: S.String,
    can_view_all: S.Boolean,
})
export const FailedLoadTelemetry = taggedStruct("FailedLoadTelemetry", {
    error: S.String,
    request_id: S.optional(S.String),
})

export const Message = S.Union([
    RequestedTelemetry,
    UpdatedTelemetryScope,
    SucceededLoadTelemetry,
    FailedLoadTelemetry,
    ClickedLink,
    ChangedUrl,
    CompletedNavigateInternal,
    CompletedLoadExternal,
    ClickedRefresh,
    UpdatedFilterAction,
    UpdatedFilterResult,
    ClearedFilter,
    SucceededLoadAuditEvents,
    FailedLoadAuditEvents,
    UpdatedLogFilterLevel,
    UpdatedLogFilterSource,
    ClearedLogFilter,
    SucceededLoadLogs,
    FailedLoadLogs,
    UpdatedTraceFilterTraceId,
    ClearedTraceFilter,
    SucceededLoadSpans,
    FailedLoadSpans,
    SucceededLoadErrors,
    FailedLoadErrors,
    SucceededLoadMetrics,
    FailedLoadMetrics,
    SucceededLoadSystem,
    FailedLoadSystem,
    UpdatedSessionFilterStatus,
    RequestedSessions,
    UpdatedSessionScope,
    UpdatedDomainFilter,
    SucceededLoadSessions,
    FailedLoadSessions,
    ToggledAppSidebarIsCollapsed,
    ToggledAppSidebarMobileIsOpen,
    GotSidebarTooltipMessage,
])
export type Message = typeof Message.Type
