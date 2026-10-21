/**
 * # Grid
 *
 * Bare `display: grid` wrapper — bring your own `grid-cols-*`/`gap-*` via `class`.
 */
import { type Html, inertHtml } from "foldkit/html"

type GridProps = Readonly<{
    class?: string
    children?: ReadonlyArray<Html | string>
}>

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

export const Grid = (props: GridProps): Html => {
    const h = inertHtml

    return h.div(
        [h.Class(joinClassName("grid", props.class))],
        props.children ?? []
    )
}
