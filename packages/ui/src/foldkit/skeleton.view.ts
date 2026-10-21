import { type Html, inertHtml } from "foldkit/html"

export type SkeletonProps = Readonly<{
    class?: string
}>

const join_class_name = (class_name?: string) =>
    class_name === undefined
        ? "block rounded-md bg-muted motion-safe:animate-pulse"
        : `block rounded-md bg-muted motion-safe:animate-pulse ${class_name}`

/** Decorative loading surface. The caller owns the layout and loading status. */
export const Skeleton = (props: SkeletonProps = {}): Html => {
    const h = inertHtml

    return h.span([h.AriaHidden(true), h.Class(join_class_name(props.class))])
}
