import { Effect, Layer, Option, Schema as S } from "effect"
import { FetchHttpClient, HttpClient } from "effect/unstable/http"
import { Command } from "foldkit"
import { getChart } from "./chart-host.ts"
import { ChartMode, PackageId, Period, Telemetry } from "./domain.ts"
import { makeChartOption } from "./echarts.ts"
import { sampleTelemetry } from "./fixture.ts"
import { GitHubApiLive } from "./github-api.ts"
import {
    CompletedSyncChart,
    FailedFetchTelemetry,
    FailedSyncChart,
    FetchedSampleTelemetry,
    SucceededFetchTelemetry,
} from "./message.ts"
import { NpmApiLive } from "./npm-api.ts"
import { fetchRawTelemetry, transformTelemetry } from "./telemetry.ts"

// CONSTANT

const RATE_LIMITED_STATUSES: ReadonlyArray<number> = [403, 429]
const sampleTelemetryWarning =
    "Live telemetry is unavailable (API rate limit). Showing sample data."
const unavailableTelemetryWarning =
    "Live telemetry is unavailable. Showing sample data."

// COMMAND

const telemetryLayer = Layer.mergeAll(GitHubApiLive, NpmApiLive).pipe(
    Layer.provide(FetchHttpClient.layer)
)

const FetchTelemetrySuccess = S.Union([
    SucceededFetchTelemetry,
    FetchedSampleTelemetry,
])

const isRateLimited = (error: unknown): boolean =>
    error instanceof Error &&
    RATE_LIMITED_STATUSES.some((status) =>
        error.message.includes(`HTTP ${status}`)
    )

const fetchLiveTelemetry = Effect.gen(function* () {
    const telemetry = yield* fetchRawTelemetry.pipe(
        Effect.map(transformTelemetry),
        Effect.provideService(HttpClient.TracerPropagationEnabled, false),
        Effect.provide(telemetryLayer)
    )

    return SucceededFetchTelemetry({ telemetry })
})

export const FetchTelemetry = Command.define("FetchTelemetry", {
    messages: [FetchTelemetrySuccess, FailedFetchTelemetry],
    execute: fetchLiveTelemetry.pipe(
        Effect.catch((error) =>
            Effect.succeed(
                FetchedSampleTelemetry({
                    telemetry: sampleTelemetry,
                    warning: isRateLimited(error)
                        ? sampleTelemetryWarning
                        : unavailableTelemetryWarning,
                })
            )
        )
    ),
})

export const SyncChart = Command.define("SyncChart", {
    args: {
        hostId: S.String,
        telemetry: Telemetry,
        chartMode: ChartMode,
        selectedPackageId: PackageId,
        period: Period,
        maybeSelectedDatumId: S.Option(S.String),
    },
    messages: [CompletedSyncChart, FailedSyncChart],
    execute: (args) =>
        Option.match(getChart(args.hostId), {
            onNone: () =>
                Effect.succeed(
                    FailedSyncChart({
                        reason: `Could not find a live chart for hostId ${args.hostId}.`,
                    })
                ),
            onSome: (chart) =>
                Effect.sync(() => {
                    try {
                        chart.setOption(makeChartOption(args), true)
                        return CompletedSyncChart()
                    } catch (error) {
                        return FailedSyncChart({
                            reason:
                                error instanceof Error
                                    ? error.message
                                    : `${error}`,
                        })
                    }
                }),
        }),
})
