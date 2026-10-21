import { Array, Match as M, Option, pipe } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import { FetchTelemetry, SyncChart } from "./command.ts"
import type { Telemetry } from "./domain.ts"
import { type Message } from "./message.ts"
import {
    type Model,
    TelemetryFailure,
    TelemetryLoading,
    TelemetryOk,
    TelemetryRefreshing,
    type TelemetryState,
} from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const telemetryData = (telemetry: TelemetryState): Option.Option<Telemetry> =>
    M.value(telemetry).pipe(
        M.tagsExhaustive({
            TelemetryNotAsked: () => Option.none(),
            TelemetryLoading: () => Option.none(),
            TelemetryRefreshing: ({ data }) => Option.some(data),
            TelemetryFailure: ({ maybeData }) => maybeData,
            TelemetryOk: ({ data }) => Option.some(data),
        })
    )

const syncChart = (args: {
    maybeChartHostId: Model["maybeChartHostId"]
    telemetry: Model["telemetry"]
    chartMode: Model["chartMode"]
    selectedPackageId: Model["selectedPackageId"]
    period: Model["period"]
    maybeSelectedDatumId: Model["maybeSelectedDatumId"]
}): ReadonlyArray<Command.Command<Message>> =>
    pipe(
        args.maybeChartHostId,
        Option.flatMap((hostId) =>
            Option.map(telemetryData(args.telemetry), (telemetry) =>
                SyncChart({
                    hostId,
                    telemetry,
                    chartMode: args.chartMode,
                    selectedPackageId: args.selectedPackageId,
                    period: args.period,
                    maybeSelectedDatumId: args.maybeSelectedDatumId,
                })
            )
        ),
        Array.fromOption
    )

const refetchTelemetry = (model: Model): UpdateReturn =>
    M.value(model.telemetry).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            TelemetryNotAsked: () => [
                modifyFields(model, {
                    telemetry: () => TelemetryLoading(),
                }),
                [FetchTelemetry()],
            ],
            TelemetryLoading: () => [model, []],
            TelemetryRefreshing: () => [model, []],
            TelemetryFailure: ({ maybeData }) => [
                modifyFields(model, {
                    telemetry: () =>
                        Option.match(maybeData, {
                            onNone: () => TelemetryLoading(),
                            onSome: (data) => TelemetryRefreshing({ data }),
                        }),
                }),
                [FetchTelemetry()],
            ],
            TelemetryOk: ({ data }) => [
                modifyFields(model, {
                    telemetry: () => TelemetryRefreshing({ data }),
                }),
                [FetchTelemetry()],
            ],
        })
    )

const selectedControl = (
    model: Model,
    updateModel: (model: Model) => Model
): UpdateReturn => {
    const nextModel = updateModel(
        modifyFields(model, { maybeSelectedDatumId: () => Option.none() })
    )

    return [
        nextModel,
        syncChart({
            maybeChartHostId: nextModel.maybeChartHostId,
            telemetry: nextModel.telemetry,
            chartMode: nextModel.chartMode,
            selectedPackageId: nextModel.selectedPackageId,
            period: nextModel.period,
            maybeSelectedDatumId: nextModel.maybeSelectedDatumId,
        }),
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            SelectedChartMode: ({ chartMode }) =>
                selectedControl(model, (current) =>
                    modifyFields(current, { chartMode: () => chartMode })
                ),
            SelectedPeriod: ({ period }) =>
                selectedControl(model, (current) =>
                    modifyFields(current, { period: () => period })
                ),
            ClickedRefresh: () => refetchTelemetry(model),
            ClickedRetry: () => refetchTelemetry(model),
            ClickedChartDatum: ({ datumId }) => [
                modifyFields(model, {
                    maybeSelectedDatumId: () => Option.some(datumId),
                }),
                syncChart({
                    maybeChartHostId: model.maybeChartHostId,
                    telemetry: model.telemetry,
                    chartMode: model.chartMode,
                    selectedPackageId: model.selectedPackageId,
                    period: model.period,
                    maybeSelectedDatumId: Option.some(datumId),
                }),
            ],
            SucceededFetchTelemetry: ({ telemetry }) => {
                const nextModel = modifyFields(model, {
                    telemetry: () =>
                        TelemetryOk({ data: telemetry, warning: "" }),
                })
                return [
                    nextModel,
                    syncChart({
                        maybeChartHostId: nextModel.maybeChartHostId,
                        telemetry: nextModel.telemetry,
                        chartMode: nextModel.chartMode,
                        selectedPackageId: nextModel.selectedPackageId,
                        period: nextModel.period,
                        maybeSelectedDatumId: nextModel.maybeSelectedDatumId,
                    }),
                ]
            },
            FetchedSampleTelemetry: ({ telemetry, warning }) => {
                const nextModel = modifyFields(model, {
                    telemetry: () => TelemetryOk({ data: telemetry, warning }),
                })
                return [
                    nextModel,
                    syncChart({
                        maybeChartHostId: nextModel.maybeChartHostId,
                        telemetry: nextModel.telemetry,
                        chartMode: nextModel.chartMode,
                        selectedPackageId: nextModel.selectedPackageId,
                        period: nextModel.period,
                        maybeSelectedDatumId: nextModel.maybeSelectedDatumId,
                    }),
                ]
            },
            FailedFetchTelemetry: ({ error }) => [
                modifyFields(model, {
                    telemetry: () =>
                        TelemetryFailure({
                            error,
                            maybeData: telemetryData(model.telemetry),
                        }),
                }),
                [],
            ],
            SucceededMountChart: ({ hostId }) => [
                modifyFields(model, {
                    maybeChartHostId: () => Option.some(hostId),
                    maybeChartError: () => Option.none(),
                }),
                syncChart({
                    maybeChartHostId: Option.some(hostId),
                    telemetry: model.telemetry,
                    chartMode: model.chartMode,
                    selectedPackageId: model.selectedPackageId,
                    period: model.period,
                    maybeSelectedDatumId: model.maybeSelectedDatumId,
                }),
            ],
            FailedMountChart: ({ reason }) => [
                modifyFields(model, {
                    maybeChartError: () => Option.some(reason),
                }),
                [],
            ],
            CompletedSyncChart: () => [
                modifyFields(model, {
                    maybeChartError: () => Option.none(),
                }),
                [],
            ],
            FailedSyncChart: ({ reason }) => [
                modifyFields(model, {
                    maybeChartError: () => Option.some(reason),
                }),
                [],
            ],
            SelectedPackage: ({ packageId }) =>
                selectedControl(model, (current) =>
                    modifyFields(current, { selectedPackageId: () => packageId })
                ),
        })
    )
