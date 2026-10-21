import { type Html, inertHtml } from "foldkit/html"

type WithClassProps = Readonly<{
    class?: string
    children?: ReadonlyArray<Html | string>
}>

type AvatarImageProps = Readonly<{
    src: string
    alt: string
    class?: string
}>

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

export const Avatar = (props: WithClassProps): Html => {
    const h = inertHtml

    return h.span(
        [
            h.Class(
                joinClassName(
                    "relative flex size-10 shrink-0 overflow-hidden rounded-full",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}

export const AvatarImage = (props: AvatarImageProps): Html => {
    const h = inertHtml

    return h.img([
        h.Src(props.src),
        h.Alt(props.alt),
        h.Class(
            joinClassName(
                "aspect-square size-full rounded-[inherit] object-cover [outline:1px_solid_var(--image-outline)] [-outline-offset:1px]",
                props.class
            )
        ),
    ])
}

export const AvatarFallback = (props: WithClassProps): Html => {
    const h = inertHtml

    return h.span(
        [
            h.Class(
                joinClassName(
                    "flex size-full items-center justify-center bg-muted text-muted-foreground",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}
