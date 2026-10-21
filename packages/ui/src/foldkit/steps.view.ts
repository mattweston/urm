import { inertHtml as h, type Html } from "foldkit/html"

export type StepsProps = Readonly<{
    class?: string
    items: ReadonlyArray<ReadonlyArray<Html | string>>
}>

export const StepsContainer = (
    props: Readonly<{
        class?: string
        children: ReadonlyArray<Html | string>
    }>
): Html =>
    h.div([h.Class(`documentation-steps ${props.class ?? ""}`)], props.children)

export const Steps = (props: StepsProps): Html =>
    StepsContainer({
        class: props.class ?? "",
        children: [
            h.ol(
                [],
                props.items.map((children) => h.li([], children))
            ),
        ],
    })
