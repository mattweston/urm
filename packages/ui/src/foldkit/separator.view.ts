import { type Html, inertHtml } from "foldkit/html"

type SeparatorProps = Readonly<{
    class?: string
}>

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

export const Separator = (props: SeparatorProps = {}): Html => {
    const h = inertHtml

    return h.hr([h.Class(joinClassName("border-border", props.class))])
}
