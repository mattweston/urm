import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { ChartMode, PackageId, Period, Telemetry } from "./domain.ts"

export const SelectedChartMode = taggedStruct("SelectedChartMode", {
    chartMode: ChartMode,
})
export const SelectedPackage = taggedStruct("SelectedPackage", {
    packageId: PackageId,
})
export const SelectedPeriod = taggedStruct("SelectedPeriod", { period: Period })
export const ClickedRefresh = taggedStruct("ClickedRefresh")
export const ClickedRetry = taggedStruct("ClickedRetry")
export const ClickedChartDatum = taggedStruct("ClickedChartDatum", {
    datumId: S.String,
})
export const SucceededFetchTelemetry = taggedStruct("SucceededFetchTelemetry", {
    telemetry: Telemetry,
})
export const FetchedSampleTelemetry = taggedStruct("FetchedSampleTelemetry", {
    telemetry: Telemetry,
    warning: S.String,
})
export const FailedFetchTelemetry = taggedStruct("FailedFetchTelemetry", {
    error: S.String,
})
export const SucceededMountChart = taggedStruct("SucceededMountChart", {
    hostId: S.String,
})
export const FailedMountChart = taggedStruct("FailedMountChart", {
    reason: S.String,
})
export const CompletedSyncChart = taggedStruct("CompletedSyncChart")
export const FailedSyncChart = taggedStruct("FailedSyncChart", {
    reason: S.String,
})

export const Message = S.Union([
    SelectedChartMode,
    SelectedPackage,
    SelectedPeriod,
    ClickedRefresh,
    ClickedRetry,
    ClickedChartDatum,
    SucceededFetchTelemetry,
    FetchedSampleTelemetry,
    FailedFetchTelemetry,
    SucceededMountChart,
    FailedMountChart,
    CompletedSyncChart,
    FailedSyncChart,
])
export type Message = typeof Message.Type
