import { Array } from "effect"
import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"

/** The value as that many things: the most literal reading of a count. */
export const dots = (
    args: Readonly<{ value: number; label: string }>
): Html => {
    const h = inertHtml
    const total = Math.max(0, Math.round(args.value))

    if (total === 0) {
        return h.p(
            [h.Class("text-sm text-muted-foreground")],
            ["Nothing to draw — the variable is zero."]
        )
    }

    return h.div(
        [
            h.Class("flex flex-wrap gap-1.5"),
            h.Role("img"),
            h.AriaLabel(`${args.label}: ${total}`),
        ],
        Array.map(Array.range(1, total), (index) =>
            h.keyed("span")(
                String(index),
                [h.Class("size-4 rounded-full bg-primary")],
                []
            )
        )
    )
}

/** The value as a length, next to the largest it could be. */
export const bar = (
    args: Readonly<{
        value: number
        maximum: number
        label: string
    }>
): Html => {
    const h = inertHtml
    const fraction =
        args.maximum === 0
            ? 0
            : Math.min(1, Math.max(0, args.value / args.maximum))

    return h.div(
        [
            h.Class("h-4 w-full overflow-hidden rounded-full bg-muted"),
            h.Role("img"),
            h.AriaLabel(`${args.label}: ${args.value} of ${args.maximum}`),
        ],
        [
            h.div(
                [
                    h.Class(
                        "h-full rounded-full bg-primary transition-[width] duration-100"
                    ),
                    h.Style({ width: `${fraction * 100}%` }),
                ],
                []
            ),
        ]
    )
}

const CELL = 18

/** Two variables as the sides of a rectangle, and their product as its area. */
export const rectangle = (
    args: Readonly<{
        width: number
        height: number
        isSquare: boolean
    }>
): Html => {
    const h = inertHtml

    return h.div(
        [h.Class("flex items-end gap-4")],
        [
            h.div(
                [
                    h.Class(
                        args.isSquare
                            ? "rounded-md border-2 border-primary bg-primary/25 transition-all duration-100"
                            : "rounded-md border-2 border-primary/60 bg-primary/15 transition-all duration-100"
                    ),
                    h.Style({
                        width: `${args.width * CELL}px`,
                        height: `${args.height * CELL}px`,
                    }),
                    h.Role("img"),
                    h.AriaLabel(`Rectangle ${args.width} by ${args.height}`),
                ],
                []
            ),
            h.span(
                [h.Class("font-mono text-xs text-muted-foreground")],
                [`${args.width} × ${args.height}`]
            ),
        ]
    )
}

/** A boolean, read as the word it stands for. */
export const badge = (
    args: Readonly<{ isOn: boolean; text: string }>
): Html => {
    const h = inertHtml

    return h.span(
        [
            h.Class(
                args.isOn
                    ? "inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                    : "inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground [box-shadow:var(--shadow-control)]"
            ),
        ],
        [args.text]
    )
}
