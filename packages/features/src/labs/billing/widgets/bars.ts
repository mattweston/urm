import { Array } from "effect"
import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"

const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(Math.max(value, minimum), maximum)

export type MeterArgs = Readonly<{
    percent: number
    label: string
    /** Colours the fill red once the value passes the mark. */
    isOver: boolean
}>

/** One number against its limit, with the overshoot shown outside the track. */
export const meter = (args: MeterArgs): Html => {
    const h = inertHtml
    const inside = clamp(args.percent, 0, 100)

    return h.span(
        [
            h.Class(
                "inline-flex h-2.5 w-40 items-stretch overflow-hidden rounded-full bg-muted align-middle"
            ),
            h.Role("img"),
            h.AriaLabel(args.label),
        ],
        [
            h.span(
                [
                    h.Class(
                        args.isOver
                            ? "block rounded-full bg-destructive transition-[width] duration-100"
                            : "block rounded-full bg-primary transition-[width] duration-100"
                    ),
                    h.Style({ width: `${inside}%` }),
                ],
                []
            ),
        ]
    )
}

export type Segment = Readonly<{
    label: string
    value: number
    className: string
}>

export type StackedBarArgs = Readonly<{
    segments: ReadonlyArray<Segment>
    label: string
    format: (value: number) => string
}>

/** Where a derived total comes from, as proportions of itself. */
export const stackedBar = (args: StackedBarArgs): Html => {
    const h = inertHtml
    const total = Array.reduce(
        args.segments,
        0,
        (sum, segment) => sum + segment.value
    )

    return h.div(
        [h.Class("grid gap-2")],
        [
            h.div(
                [
                    h.Class("flex h-3 overflow-hidden rounded-full bg-muted"),
                    h.Role("img"),
                    h.AriaLabel(args.label),
                ],
                Array.map(args.segments, (segment) =>
                    h.keyed("span")(
                        segment.label,
                        [
                            h.Class(
                                `${segment.className} block transition-[width] duration-100`
                            ),
                            h.Style({
                                width:
                                    total === 0
                                        ? "0%"
                                        : `${(segment.value / total) * 100}%`,
                            }),
                        ],
                        []
                    )
                )
            ),
            h.div(
                [
                    h.Class(
                        "flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
                    ),
                ],
                Array.map(args.segments, (segment) =>
                    h.keyed("span")(
                        segment.label,
                        [h.Class("inline-flex items-center gap-1.5")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        `${segment.className} size-2 rounded-full`
                                    ),
                                ],
                                []
                            ),
                            `${segment.label} ${args.format(segment.value)}`,
                        ]
                    )
                )
            ),
        ]
    )
}
