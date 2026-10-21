import { type Html, inertHtml } from "foldkit/html"

type LabelProps = Readonly<{
    for: string
    class?: string
    children?: ReadonlyArray<Html | string>
}>

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

export const Label = (props: LabelProps): Html => {
    const h = inertHtml

    return h.label(
        [
            h.For(props.for),
            h.Class(
                joinClassName(
                    "text-sm font-medium leading-none text-foreground",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}
