import { Data, Effect, Option } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { removeChart, setChart } from "../chart-host.ts"
import type { Telemetry } from "../domain.ts"
import { registerEcharts, selectedDatumLabel } from "../echarts.ts"
import type { Message } from "../message.ts"
import { FailedMountChart, SucceededMountChart } from "../message.ts"
import type { Model } from "../model.ts"
import { formatInteger } from "./format.ts"

export const CHART_HOST_ID = "charting-chart"

const echarts = registerEcharts()

class ChartMountError extends Data.TaggedError("ChartMountError")<{
    readonly reason: string
}> {}

export const mountChart = (hostId: string) =>
    Mount.define("MountChart", {
        messages: [SucceededMountChart, FailedMountChart],
        execute: ({ element }) =>
            Effect.acquireRelease(
                Effect.gen(function* () {
                    if (!(element instanceof HTMLElement)) {
                        return {
                            message: FailedMountChart({
                                reason: "Chart host is not an HTMLElement.",
                            }),
                            cleanup: (): void => undefined,
                        }
                    }

                    return yield* Effect.try({
                        try: () => {
                            const chart = echarts.init(element, undefined, {
                                renderer: "canvas",
                            })
                            const resizeObserver = new ResizeObserver(() =>
                                chart.resize()
                            )
                            resizeObserver.observe(element)
                            const onWindowResize = () => chart.resize()
                            window.addEventListener("resize", onWindowResize)
                            setChart(hostId, chart)

                            return {
                                message: SucceededMountChart({ hostId }),
                                cleanup: (): void => {
                                    resizeObserver.disconnect()
                                    window.removeEventListener(
                                        "resize",
                                        onWindowResize
                                    )
                                    removeChart(hostId)
                                },
                            }
                        },
                        catch: (error) =>
                            new ChartMountError({
                                reason:
                                    error instanceof Error
                                        ? error.message
                                        : `Failed to mount chart: ${error}`,
                            }),
                    })
                }),
                ({ cleanup }) => Effect.sync(cleanup)
            ).pipe(
                Effect.catch((error) =>
                    Effect.succeed({
                        message: FailedMountChart({
                            reason: error.reason,
                        }),
                        cleanup: (): void => undefined,
                    })
                ),
                Effect.map(({ message }) => message)
            ),
    })()

export const chartPanelView = <ParentMessage>(
    model: Model,
    telemetry: Telemetry,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.section(
        [
            h.Class(
                "grid min-h-[32rem] self-start grid-rows-[minmax(0,1fr)_auto] rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"
            ),
        ],
        [
            h.div(
                [
                    h.Class("min-h-[26rem] w-full"),
                    h.AriaLabel("Adoption chart"),
                    h.OnMount(
                        Mount.mapMessage(
                            mountChart(CHART_HOST_ID),
                            toParentMessage
                        )
                    ),
                ],
                []
            ),
            chartFooterView(model, telemetry, h),
        ]
    )
}

export const chartFooterView = <ParentMessage>(
    model: Model,
    telemetry: Telemetry,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                "flex flex-col gap-3 border-t-(length:--surface-border-width) border-border px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
            ),
        ],
        [
            h.div(
                [],
                [
                    h.div(
                        [h.Class("font-medium text-zinc-900")],
                        [chartFooterLabel(model, telemetry)]
                    ),
                    h.div(
                        [h.Class("text-xs text-zinc-500")],
                        [
                            `Default branch: ${telemetry.repository.defaultBranch}`,
                        ]
                    ),
                ]
            ),
            chartStatusView(model, h),
        ]
    )
}

export const chartFooterLabel = (model: Model, telemetry: Telemetry): string =>
    Option.getOrElse(
        selectedDatumLabel(telemetry, model.maybeSelectedDatumId),
        () =>
            `${formatInteger(telemetry.repository.openIssues)} open issues, ${formatInteger(
                telemetry.repository.openPullRequests
            )} open pull requests`
    )

export const chartStatusView = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return Option.match(model.maybeChartError, {
        onNone: () =>
            h.keyed("div")(
                "ChartReady",
                [h.Class("text-xs font-medium text-emerald-700")],
                ["Chart ready"]
            ),
        onSome: (error) =>
            h.keyed("div")(
                "ChartError",
                [h.Class("max-w-md text-xs font-medium text-rose-700")],
                [error]
            ),
    })
}
