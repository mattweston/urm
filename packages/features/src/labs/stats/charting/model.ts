import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { ChartMode, PackageId, Period, Telemetry } from "./domain.ts"

export const TelemetryNotAsked = taggedStruct("TelemetryNotAsked")
export const TelemetryLoading = taggedStruct("TelemetryLoading")
export const TelemetryRefreshing = taggedStruct("TelemetryRefreshing", {
    data: Telemetry,
})
export const TelemetryFailure = taggedStruct("TelemetryFailure", {
    error: S.String,
    maybeData: S.Option(Telemetry),
})
export const TelemetryOk = taggedStruct("TelemetryOk", {
    data: Telemetry,
    warning: S.String,
})

export const TelemetryState = S.Union([
    TelemetryNotAsked,
    TelemetryLoading,
    TelemetryRefreshing,
    TelemetryFailure,
    TelemetryOk,
])
export type TelemetryState = typeof TelemetryState.Type

export const Model = S.Struct({
    telemetry: TelemetryState,
    chartMode: ChartMode,
    selectedPackageId: PackageId,
    period: Period,
    maybeChartHostId: S.Option(S.String),
    maybeChartError: S.Option(S.String),
    maybeSelectedDatumId: S.Option(S.String),
})
export type Model = typeof Model.Type
