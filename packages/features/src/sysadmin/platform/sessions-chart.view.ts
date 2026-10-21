import { type Html, inertHtml as h } from "foldkit/html"
import { chart_card, type Datum } from "../../charting/bar-chart.view.ts"
import type { SessionItem, SessionStatus } from "./app.model.ts"

const statuses: ReadonlyArray<
    Readonly<{
        status: SessionStatus
        label: string
        color: string
    }>
> = [
    { status: "active", label: "Active", color: "var(--chart-1)" },
    { status: "expired", label: "Expired", color: "var(--chart-2)" },
    { status: "revoked", label: "Revoked", color: "var(--chart-4)" },
    { status: "unknown", label: "Unknown", color: "var(--muted-foreground)" },
]

const day_ms = 86_400_000

export const sessions_daily_data = (
    sessions: ReadonlyArray<SessionItem>,
    as_of: number
): ReadonlyArray<Datum> => {
    const last_day = Math.floor(as_of / day_ms) * day_ms
    return Array.from({ length: 7 }, (_, index) => {
        const start = last_day - (6 - index) * day_ms
        return {
            label: new Date(start).toISOString().slice(5, 10),
            value: sessions.filter((session) => {
                const created_at = session.created_at.getTime()
                return (
                    created_at >= start &&
                    created_at < start + day_ms &&
                    created_at <= as_of
                )
            }).length,
            color: "var(--chart-1)",
        }
    })
}

export const sessions_chart_view = (
    sessions: ReadonlyArray<SessionItem>,
    has_more: boolean,
    as_of: number | undefined
): Html => {
    const data = statuses.map((item) => ({
        ...item,
        value: sessions.filter((session) => session.status === item.status)
            .length,
    }))
    const sample_note = has_more
        ? " Recent sample only; totals are incomplete."
        : ""
    const status_time =
        as_of === undefined
            ? ""
            : ` Status as of ${new Date(as_of).toISOString().replace("T", " ").replace(".000Z", " UTC").replace("Z", " UTC")}.`
    return h.div(
        [h.Class("mb-6 grid gap-6 lg:grid-cols-2")],
        [
            chart_card(
                "Sessions by status",
                "Sessions matching the current scope and status filter." +
                    status_time +
                    sample_note,
                data
            ),
            ...(as_of === undefined
                ? []
                : [
                      chart_card(
                          "Sessions created per day",
                          `Seven UTC calendar days ending ${new Date(as_of).toISOString().slice(0, 10)}; the final day is partial. Counts follow the current scope and status filter.` +
                              sample_note,
                          sessions_daily_data(sessions, as_of),
                          true
                      ),
                  ]),
        ]
    )
}
