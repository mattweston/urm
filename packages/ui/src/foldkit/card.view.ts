/**
 * # Card
 *
 * Presentational card family (Card/CardHeader/CardTitle/...). Pure layout —
 * no messages. `class` is appended after the base classes.
 */
import { type Html, inertHtml } from "foldkit/html"

type WithClassProps = Readonly<{
    class?: string
    children?: ReadonlyArray<Html | string>
}>

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

export const Card = (props: WithClassProps): Html => {
    const h = inertHtml

    return h.div(
        [
            h.Class(
                joinClassName(
                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-card)]",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}

export const CardHeader = (props: WithClassProps): Html => {
    const h = inertHtml

    return h.div(
        [
            h.Class(
                joinClassName(
                    "flex flex-col space-y-1.5 border-b-(length:--surface-divider-width) border-border p-6",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}

export const CardTitle = (props: WithClassProps): Html => {
    const h = inertHtml

    return h.h3(
        [
            h.Class(
                joinClassName(
                    "text-lg leading-none [font-family:var(--surface-title-font-family)] [font-weight:var(--surface-title-font-weight)] [letter-spacing:var(--surface-title-letter-spacing)] [text-transform:var(--surface-title-text-transform)]",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}

export const CardDescription = (props: WithClassProps): Html => {
    const h = inertHtml

    return h.p(
        [h.Class(joinClassName("text-sm text-muted-foreground", props.class))],
        props.children ?? []
    )
}

export const CardContent = (props: WithClassProps): Html => {
    const h = inertHtml

    return h.div(
        [
            h.Class(
                joinClassName(
                    "p-6 pt-[var(--surface-divider-gap)]",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}

export const CardFooter = (props: WithClassProps): Html => {
    const h = inertHtml

    return h.div(
        [
            h.Class(
                joinClassName(
                    "flex items-center border-t-(length:--surface-divider-width) border-border p-6 pt-[var(--surface-divider-gap)]",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}
